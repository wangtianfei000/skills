import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {accessSync, constants, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

type RenderManifest = {
  schema_version?: string;
  task_id?: string;
  composition_id?: string;
  scene_module?: string;
  output?: {
    video_path?: string;
    cover_path?: string;
    cover_frame?: number;
  };
  render?: {
    codec?: 'h264';
    pixel_format?: 'yuv420p';
    concurrency?: number | string | null;
  };
  audio?: {
    segments?: Array<{
      id: string;
      staticPath: string;
      text?: string;
      from: number;
      durationInFrames: number;
      visualDurationInFrames?: number;
    }>;
    bgmStaticPath?: string;
  };
};

type JsonLine = Record<string, unknown>;

const compositionIdFallback = 'GeneratedDocVideo';
const rendererRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(rendererRoot, 'src');
const blocksModule = resolve(sourceRoot, 'blocks').replace(/\\/g, '/');
const chromeMode = process.env.REMOTION_CHROME_MODE === 'chrome-for-testing' ? 'chrome-for-testing' : 'headless-shell';
const browserTimeoutInMilliseconds = Number(process.env.REMOTION_BROWSER_TIMEOUT_MS || 60000);
const chromiumOptions = {
  enableMultiProcessOnLinux: process.env.REMOTION_ENABLE_MULTI_PROCESS_ON_LINUX === 'true',
};
const browserExecutableNames = new Set([
  'chrome-headless-shell',
  'headless_shell',
  'chrome',
  'chrome-headless-shell.exe',
  'headless_shell.exe',
  'chrome.exe',
]);

const log = (line: JsonLine) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...line,
    }),
  );
};

const onBrowserDownload = ({chromeMode: mode}: {chromeMode: 'chrome-for-testing' | 'headless-shell'}) => ({
  version: null,
  onProgress: (progress: {
    alreadyAvailable: boolean;
    percent: number;
    downloadedBytes: number;
    totalSizeInBytes: number;
  }) => {
    log({
      type: 'browser_download',
      chrome_mode: mode,
      already_available: progress.alreadyAvailable,
      progress: progress.percent,
      downloaded_bytes: progress.downloadedBytes,
      total_size_bytes: progress.totalSizeInBytes,
    });
  },
});

const fail = (message: string): never => {
  log({type: 'error', message});
  process.exitCode = 1;
  throw new Error(message);
};

const stringifyError = (error: unknown) => {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join('\n');
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    const json = JSON.stringify(error);
    if (json && json !== '{}') {
      return json;
    }
  } catch {
    // Fall through to String().
  }
  return String(error);
};

const isExecutableFile = (pathValue: string) => {
  try {
    const stat = statSync(pathValue);
    if (!stat.isFile()) {
      return false;
    }
    accessSync(pathValue, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const findBrowserExecutable = (dir: string, maxDepth = 4): string | null => {
  if (maxDepth < 0) {
    return null;
  }

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }

  for (const entry of entries) {
    const candidate = resolve(dir, entry);
    if (browserExecutableNames.has(entry) && isExecutableFile(candidate)) {
      return candidate;
    }
  }

  for (const entry of entries) {
    const candidate = resolve(dir, entry);
    try {
      if (statSync(candidate).isDirectory()) {
        const found = findBrowserExecutable(candidate, maxDepth - 1);
        if (found) {
          return found;
        }
      }
    } catch {
      // Ignore unreadable cache entries and keep searching.
    }
  }

  return null;
};

const resolveBrowserExecutable = () => {
  const configuredPath = process.env.REMOTION_BROWSER_EXECUTABLE?.trim();
  if (!configuredPath) {
    log({type: 'browser_executable', phase: 'resolve', source: 'remotion_cache'});
    return null;
  }

  const resolvedPath = resolve(configuredPath);
  if (!existsSync(resolvedPath)) {
    fail(`REMOTION_BROWSER_EXECUTABLE does not exist: ${resolvedPath}`);
  }

  const stat = statSync(resolvedPath);
  if (stat.isFile()) {
    if (!isExecutableFile(resolvedPath)) {
      fail(`REMOTION_BROWSER_EXECUTABLE is not executable: ${resolvedPath}`);
    }
    log({type: 'browser_executable', phase: 'resolve', source: 'file', path: resolvedPath});
    return resolvedPath;
  }

  if (stat.isDirectory()) {
    const found = findBrowserExecutable(resolvedPath);
    if (!found) {
      fail(`REMOTION_BROWSER_EXECUTABLE is a directory but no Chrome executable was found inside: ${resolvedPath}`);
    }
    log({
      type: 'browser_executable',
      phase: 'resolve',
      source: 'directory',
      configured_path: resolvedPath,
      path: found,
    });
    return found;
  }

  fail(`REMOTION_BROWSER_EXECUTABLE must be a file or directory: ${resolvedPath}`);
};

const getArg = (name: string) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
};

const resolveTaskPath = (manifestDir: string, pathValue: string) => {
  return isAbsolute(pathValue) ? resolve(pathValue) : resolve(manifestDir, pathValue);
};

const fontCssImportLines = () => {
  return [400, 700, 900]
    .map((weight) => {
      const cssPath = resolve(
        rendererRoot,
        'node_modules',
        '@fontsource',
        'noto-sans-sc',
        `${weight}.css`,
      ).replace(/\\/g, '/');
      return `import ${JSON.stringify(cssPath)};`;
    })
    .join('\n');
};

const writeRenderEntry = (taskDir: string, sceneModulePath: string, manifest: RenderManifest) => {
  const entryRoot = resolve(taskDir, '.remotion-entry');
  const generatedDir = resolve(entryRoot, 'generated');
  const entryPoint = resolve(entryRoot, 'index.tsx');
  const taskSceneCopy = resolve(generatedDir, 'scene.generated.tsx');

  mkdirSync(generatedDir, {recursive: true});

  const sceneSource = readFileSync(sceneModulePath, 'utf8');
  const audioManifest = JSON.stringify(manifest.audio ?? {segments: []});
  writeFileSync(taskSceneCopy, sceneSource);
  writeFileSync(
    resolve(entryRoot, 'blocks.tsx'),
    `export * from "${blocksModule}";\n`,
  );
  writeFileSync(
    entryPoint,
    `import React from 'react';
${fontCssImportLines()}
import {AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile} from 'remotion';
import {GeneratedScene, meta} from './generated/scene.generated';

const audio = ${audioManifest};

const AudioTracks: React.FC = () => {
  const segments = Array.isArray(audio.segments) ? audio.segments : [];
  return (
    <>
      {segments.map((segment) => (
        <Sequence
          key={segment.id}
          from={segment.from}
          durationInFrames={segment.durationInFrames}
        >
          <Audio src={staticFile(segment.staticPath)} volume={1} />
        </Sequence>
      ))}
      {audio.bgmStaticPath ? (
        <Audio
          src={staticFile(audio.bgmStaticPath)}
          volume={(frame) => {
            const hasNarration = segments.some((segment) => {
              return frame >= segment.from && frame < segment.from + segment.durationInFrames;
            });
            return hasNarration ? 0.035 : 0.08;
          }}
        />
      ) : null}
    </>
  );
};

const GeneratedDocVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#08111f', fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'}}>
      <GeneratedScene />
      <AudioTracks />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => {
  return (
    <Composition
      id="GeneratedDocVideo"
      component={GeneratedDocVideo}
      durationInFrames={meta.durationInFrames}
      fps={meta.fps}
      width={meta.width}
      height={meta.height}
      defaultProps={{}}
    />
  );
};

registerRoot(Root);
`,
  );

  return entryPoint;
};

const run = async () => {
  const manifestArg = getArg('--manifest') ?? fail('Missing required argument: --manifest <path>');

  const manifestPath = resolve(manifestArg);
  if (!existsSync(manifestPath)) {
    fail(`Manifest not found: ${manifestPath}`);
  }

  const manifestDir = dirname(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RenderManifest;
  const taskId = manifest.task_id ?? manifestDir.split(/[\\/]/).pop() ?? 'remotion-task';
  const sceneModule = manifest.scene_module ?? 'scene.generated.tsx';
  const sceneModulePath = resolveTaskPath(manifestDir, sceneModule);
  const videoPath = resolveTaskPath(manifestDir, manifest.output?.video_path ?? 'final.mp4');
  const coverPath = resolveTaskPath(manifestDir, manifest.output?.cover_path ?? 'cover.jpg');
  const compositionId = manifest.composition_id ?? compositionIdFallback;

  if (!existsSync(sceneModulePath)) {
    fail(`Scene module not found: ${sceneModulePath}`);
  }

  mkdirSync(dirname(videoPath), {recursive: true});
  mkdirSync(dirname(coverPath), {recursive: true});

  log({
    type: 'start',
    task_id: taskId,
    manifest_path: manifestPath,
    scene_module: sceneModulePath,
    video_path: videoPath,
    cover_path: coverPath,
  });

  const browserExecutable = resolveBrowserExecutable();
  const entryPoint = writeRenderEntry(manifestDir, sceneModulePath, manifest);
  log({type: 'progress', phase: 'entry', progress: 1, entry_point: entryPoint});

  const serveUrl = await bundle({
    entryPoint,
    publicDir: manifestDir,
    onProgress: (progress) => {
      log({type: 'progress', phase: 'bundle', progress: progress / 100});
    },
  });

  log({type: 'progress', phase: 'bundle', progress: 1});

  log({type: 'progress', phase: 'selecting_composition', progress: 1});
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    browserExecutable,
    chromeMode,
    chromiumOptions,
    timeoutInMilliseconds: browserTimeoutInMilliseconds,
    onBrowserDownload,
  });

  log({
    type: 'composition',
    id: composition.id,
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    duration_in_frames: composition.durationInFrames,
  });

  log({type: 'progress', phase: 'starting_render', progress: 1});
  await renderMedia({
    serveUrl,
    composition,
    codec: manifest.render?.codec ?? 'h264',
    pixelFormat: manifest.render?.pixel_format ?? 'yuv420p',
    outputLocation: videoPath,
    overwrite: true,
    concurrency: manifest.render?.concurrency ?? null,
    browserExecutable,
    chromeMode,
    chromiumOptions,
    timeoutInMilliseconds: browserTimeoutInMilliseconds,
    onBrowserDownload,
    onProgress: (progress) => {
      log({
        type: 'progress',
        phase: 'render',
        progress: progress.progress,
        rendered_frames: progress.renderedFrames,
        encoded_frames: progress.encodedFrames,
        encoded_done_in: progress.encodedDoneIn,
        rendered_done_in: progress.renderedDoneIn,
      });
    },
  });

  const coverFrame = Math.max(
    0,
    Math.min(manifest.output?.cover_frame ?? 120, composition.durationInFrames - 1),
  );

  await renderStill({
    serveUrl,
    composition,
    output: coverPath,
    frame: coverFrame,
    imageFormat: 'jpeg',
    overwrite: true,
    browserExecutable,
    chromeMode,
    chromiumOptions,
    timeoutInMilliseconds: browserTimeoutInMilliseconds,
    onBrowserDownload,
  });

  log({
    type: 'done',
    task_id: taskId,
    video_path: videoPath,
    cover_path: coverPath,
    cover_frame: coverFrame,
  });
};

run().catch((error: unknown) => {
  const message = stringifyError(error) || 'Unknown Remotion render error';
  log({type: 'error', message});
  process.exit(1);
});
