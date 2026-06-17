#!/usr/bin/env node
import {existsSync, readFileSync} from 'node:fs';
import {dirname, isAbsolute, resolve} from 'node:path';
import ts from 'typescript';

const allowedBlocks = new Set([
  'HeroBlock',
  'CardGridBlock',
  'ComparisonBlock',
  'WorkflowBlock',
  'MetricCardsBlock',
  'CodeChatBlock',
  'TableBlock',
  'CtaBlock',
]);

const allowedImports = new Set(['react', 'remotion', '../blocks']);
const allowedRemotionImports = new Set([
  'AbsoluteFill',
  'Sequence',
  'interpolate',
  'spring',
  'useCurrentFrame',
  'useVideoConfig',
  'Easing',
]);

const bannedIdentifiers = new Set([
  'fetch',
  'eval',
  'Function',
  'XMLHttpRequest',
  'WebSocket',
  'localStorage',
  'sessionStorage',
  'document',
  'window',
  'process',
  'require',
]);

const getArg = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
};

const fail = (message, details = {}) => {
  console.error(JSON.stringify({valid: false, message, ...details}));
  process.exit(1);
};

const ok = (details = {}) => {
  console.log(JSON.stringify({valid: true, ...details}));
};

const sceneArg = getArg('--scene');
const manifestArg = getArg('--manifest');
if (!sceneArg || !manifestArg) {
  fail('Usage: node tools/validate-scene.js --scene <scene.generated.tsx> --manifest <manifest.json>');
}

const scenePath = resolve(sceneArg);
const manifestPath = resolve(manifestArg);
if (!existsSync(scenePath)) {
  fail(`Scene file not found: ${scenePath}`);
}
if (!existsSync(manifestPath)) {
  fail(`Manifest file not found: ${manifestPath}`);
}

const sourceText = readFileSync(scenePath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestDir = dirname(manifestPath);
const timeline = manifest.audio?.segments ?? [];
const timelinePairs = new Set(
  timeline.map((segment) => `${Number(segment.from)}:${Number(segment.visualDurationInFrames ?? segment.durationInFrames)}`),
);
const audioFiles = new Set((manifest.audio?.segments ?? []).map((segment) => segment.staticPath));
if (manifest.audio?.bgmStaticPath) {
  audioFiles.add(manifest.audio.bgmStaticPath);
}

for (const staticPath of audioFiles) {
  const fullPath = isAbsolute(staticPath) ? staticPath : resolve(manifestDir, staticPath);
  if (!existsSync(fullPath)) {
    fail(`Manifest asset not found: ${staticPath}`);
  }
}

const sourceFile = ts.createSourceFile(scenePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const errors = [];
const imports = [];
const exported = new Set();
const usedBlocks = new Set();
const usedPairs = new Set();
let usedTimedVisual = false;

const textOf = (node) => sourceText.slice(node.getStart(sourceFile), node.getEnd());

const objectPropertyNames = (node) => {
  const names = new Set();
  for (const prop of node.properties) {
    if (
      (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) &&
      ts.isIdentifier(prop.name)
    ) {
      names.add(prop.name.text);
    }
  }
  return names;
};

const checkTextLiteral = (node) => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (node.text.length > 500) {
      errors.push('Text literal exceeds 500 characters');
    }
    if (/https?:\/\//i.test(node.text) || /file:\/\//i.test(node.text)) {
      errors.push(`External or file URL is not allowed: ${node.text.slice(0, 80)}`);
    }
  }
};

const visit = (node) => {
  checkTextLiteral(node);

  if (ts.isImportDeclaration(node)) {
    const moduleName = node.moduleSpecifier;
    const name = ts.isStringLiteral(moduleName) ? moduleName.text : '';
    imports.push(name);
    if (!allowedImports.has(name)) {
      errors.push(`Only "react", "remotion", and "../blocks" imports are allowed, got "${name}"`);
    }
    if (name === 'remotion') {
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          if (!allowedRemotionImports.has(importedName)) {
            errors.push(`Remotion import "${importedName}" is not allowed`);
          }
        }
      }
    }
  }

  if (ts.isCallExpression(node)) {
    const expr = textOf(node.expression);
    if (expr === 'import') {
      errors.push('Dynamic import is not allowed');
    }
    if (['fetch', 'eval', 'require'].includes(expr)) {
      errors.push(`Call to ${expr} is not allowed`);
    }
    if (expr === 'spring') {
      const firstArg = node.arguments[0];
      if (!firstArg || !ts.isObjectLiteralExpression(firstArg)) {
        errors.push('spring() must be called with an object containing frame and fps');
      } else {
        const props = objectPropertyNames(firstArg);
        if (!props.has('frame') || !props.has('fps')) {
          errors.push('spring() must include both frame and fps, for example spring({frame, fps})');
        }
      }
    }
  }

  if (ts.isIdentifier(node) && bannedIdentifiers.has(node.text)) {
    errors.push(`Identifier "${node.text}" is not allowed`);
  }

  if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
    const modifiers = node.modifiers ?? [];
    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        exported.add(node.name.text);
      }
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            exported.add(declaration.name.text);
          }
        }
      }
    }
  }

  if (ts.isJsxOpeningLikeElement(node)) {
    const tag = textOf(node.tagName);
    if (tag === 'Sequence' || tag.endsWith('Block')) {
      usedTimedVisual = true;
      if (!allowedBlocks.has(tag)) {
        if (tag.endsWith('Block')) {
          errors.push(`Block "${tag}" is not in the whitelist`);
        }
      } else {
        usedBlocks.add(tag);
      }

      let from = null;
      let duration = null;
      for (const prop of node.attributes.properties) {
        if (!ts.isJsxAttribute(prop) || !prop.initializer || !ts.isIdentifier(prop.name)) {
          continue;
        }
        const propName = prop.name.text;
        const propText = textOf(prop.initializer);
        const numeric = propText.match(/^\{?(\d+)\}?$/);
        if (numeric && propName === 'from') {
          from = Number(numeric[1]);
        }
        if (numeric && propName === 'duration') {
          duration = Number(numeric[1]);
        }
        if (numeric && propName === 'durationInFrames') {
          duration = Number(numeric[1]);
        }
      }
      if (from === null || duration === null) {
        errors.push(`"${tag}" must use numeric from and duration/durationInFrames props from backend timeline`);
      } else {
        usedPairs.add(`${from}:${duration}`);
      }
    }
  }

  ts.forEachChild(node, visit);
};

visit(sourceFile);

for (const name of exported) {
  if (!['meta', 'GeneratedScene'].includes(name)) {
    errors.push(`Only meta and GeneratedScene may be exported, got "${name}"`);
  }
}
for (const required of ['meta', 'GeneratedScene']) {
  if (!exported.has(required)) {
    errors.push(`Missing export "${required}"`);
  }
}
if (!imports.includes('remotion') && !imports.includes('../blocks')) {
  errors.push('Scene must import Remotion primitives from "remotion" or fallback components from "../blocks"');
}
if (!usedTimedVisual) {
  errors.push('Scene must use at least one timed visual Sequence or whitelisted block');
}
for (const pair of usedPairs) {
  if (!timelinePairs.has(pair)) {
    errors.push(`Block timing ${pair} does not match manifest audio timeline`);
  }
}

if (errors.length > 0) {
  fail('Scene validation failed', {errors: [...new Set(errors)]});
}

ok({blocks: [...usedBlocks], timings: [...usedPairs]});
