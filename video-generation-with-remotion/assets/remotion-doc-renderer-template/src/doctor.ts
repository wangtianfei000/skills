import {spawn} from 'node:child_process';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

type JsonLine = Record<string, unknown>;

const log = (line: JsonLine) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...line,
    }),
  );
};

const rendererRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const smokeTimeoutInMilliseconds = Number(process.env.REMOTION_SMOKE_TIMEOUT_MS || 180000);
const linuxFontInstallHint =
  'Install render fonts first. Ubuntu/Debian: apt-get update && apt-get install -y fontconfig fonts-noto-cjk fonts-noto-color-emoji && fc-cache -fv';

const smokeSceneSource = `
import React from 'react';
import {AbsoluteFill} from 'remotion';

export const meta = {
  width: 320,
  height: 240,
  fps: 10,
  durationInFrames: 10,
  title: 'Remotion deployment smoke test',
};

export function GeneratedScene() {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #111827, #2563eb)',
        color: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
        fontSize: 24,
        fontWeight: 700,
      }}
    >
      Remotion 中文与图标正常 🏕️ 🌿 🛡️
    </AbsoluteFill>
  );
}
`;

const checkFonts = () => {
  const fcMatch = spawnSync('fc-match', ['Noto Color Emoji'], {encoding: 'utf8'});
  if (fcMatch.error) {
    throw new Error(`fontconfig fc-match is not available. ${linuxFontInstallHint}`);
  }
  if (fcMatch.status !== 0) {
    throw new Error(`fontconfig fc-match failed: ${fcMatch.stderr || fcMatch.stdout}. ${linuxFontInstallHint}`);
  }
  const matched = `${fcMatch.stdout || ''} ${fcMatch.stderr || ''}`;
  log({type: 'doctor', phase: 'font_check', status: 'checked', query: 'Noto Color Emoji', matched: matched.trim()});
  if (!/NotoColorEmoji|Noto Color Emoji/i.test(matched)) {
    throw new Error(`Noto Color Emoji font not found; emoji icons may render as boxes. ${linuxFontInstallHint}`);
  }

  const cjkMatch = spawnSync('fc-match', ['Noto Sans CJK SC'], {encoding: 'utf8'});
  if (cjkMatch.status === 0) {
    log({
      type: 'doctor',
      phase: 'font_check',
      status: 'checked',
      query: 'Noto Sans CJK SC',
      matched: String(cjkMatch.stdout || '').trim(),
    });
  }
};

const runSmokeRender = async () => {
  const taskDir = mkdtempSync(resolve(tmpdir(), 'remotion-doc-renderer-smoke-'));
  const manifestPath = resolve(taskDir, 'manifest.json');
  const videoPath = resolve(taskDir, 'final.mp4');
  const coverPath = resolve(taskDir, 'cover.jpg');

  writeFileSync(resolve(taskDir, 'scene.generated.tsx'), smokeSceneSource, 'utf8');
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schema_version: 'remotion_task_manifest_v1',
        task_id: 'deployment-smoke-test',
        composition_id: 'GeneratedDocVideo',
        scene_module: 'scene.generated.tsx',
        output: {
          video_path: 'final.mp4',
          cover_path: 'cover.jpg',
          cover_frame: 1,
        },
        render: {
          codec: 'h264',
          pixel_format: 'yuv420p',
          concurrency: 1,
        },
        audio: {
          segments: [],
          bgmStaticPath: '',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  log({type: 'doctor', phase: 'smoke_render', status: 'started', manifest_path: manifestPath});
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [resolve(rendererRoot, 'dist/render.js'), '--manifest', manifestPath], {
      cwd: rendererRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      rejectPromise(new Error(`Smoke render timed out after ${smokeTimeoutInMilliseconds}ms`));
    }, smokeTimeoutInMilliseconds);
    child.stdout.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
      process.stderr.write(chunk);
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(stderr || `Smoke render exited with ${code}`));
    });
  });

  if (!existsSync(videoPath) || !existsSync(coverPath)) {
    throw new Error(`Smoke render did not create expected outputs: ${videoPath}, ${coverPath}`);
  }
  log({type: 'doctor', phase: 'smoke_render', status: 'ok', video_path: videoPath, cover_path: coverPath});
};

const run = async () => {
  checkFonts();
  await runSmokeRender();
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log({type: 'doctor', phase: 'failed', status: 'error', message});
  process.exit(1);
});
