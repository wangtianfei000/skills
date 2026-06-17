import {chmodSync, copyFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

type JsonLine = Record<string, unknown>;

const testedVersion = '149.0.7790.0';
const timeoutMs = Number(process.env.REMOTION_BROWSER_DOWNLOAD_TIMEOUT_MS || 900000);
const rendererRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const downloadsRoot = resolve(rendererRoot, 'node_modules/.remotion/chrome-headless-shell');
const verbose = process.env.REMOTION_BROWSER_VERBOSE === '1';
const progressBuckets = [0, 0.25, 0.5, 0.75, 1];
const loggedProgressBuckets = new Set<number>();

const log = (line: JsonLine) => {
  console.log(JSON.stringify({timestamp: new Date().toISOString(), ...line}));
};

process.on('beforeExit', (code) => {
  log({type: 'browser_download', phase: 'process_before_exit', code});
});

process.on('exit', (code) => {
  log({type: 'browser_download', phase: 'process_exit', code});
});

process.on('uncaughtException', (error) => {
  log({type: 'browser_download', phase: 'uncaught_exception', status: 'error', message: error.message, stack: error.stack});
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : '';
  log({type: 'browser_download', phase: 'unhandled_rejection', status: 'error', message, stack});
  process.exit(1);
});

const platform = () => {
  if (os.platform() === 'linux') return os.arch() === 'arm64' ? 'linux-arm64' : 'linux64';
  if (os.platform() === 'darwin') return os.arch() === 'arm64' ? 'mac-arm64' : 'mac-x64';
  if (os.platform() === 'win32') return 'win64';
  throw new Error(`Unsupported platform: ${os.platform()}`);
};

const defaultDownloadUrl = (targetPlatform: string) => {
  return `https://registry.npmmirror.com/-/binary/chrome-for-testing/${testedVersion}/${targetPlatform}/chrome-headless-shell-${targetPlatform}.zip`;
};

const executableNames = new Set(['chrome-headless-shell', 'headless_shell', 'chrome-headless-shell.exe', 'chrome', 'chrome.exe']);

const walk = (dir: string, found: string[] = []) => {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, found);
    } else if (executableNames.has(entry)) {
      found.push(path);
    }
  }
  return found;
};

const tree = (dir: string, root = dir, rows: JsonLine[] = [], depth = 0) => {
  if (!existsSync(dir) || rows.length >= 120 || depth > 6) return rows;
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    rows.push({
      path: path.replace(root, '').replace(/^[/\\]/, ''),
      type: stat.isDirectory() ? 'dir' : 'file',
      size: stat.size,
    });
    if (stat.isDirectory()) tree(path, root, rows, depth + 1);
    if (rows.length >= 120) break;
  }
  return rows;
};

const normalizeExecutable = (executable: string) => {
  const remotionExecutable = os.platform() === 'win32'
    ? resolve(dirname(executable), 'chrome-headless-shell.exe')
    : resolve(dirname(executable), 'chrome-headless-shell');
  if (basename(executable) !== basename(remotionExecutable) && !existsSync(remotionExecutable)) {
    copyFileSync(executable, remotionExecutable);
  }
  if (os.platform() !== 'win32') {
    chmodSync(executable, 0o755);
    chmodSync(remotionExecutable, 0o755);
  }
  return remotionExecutable;
};

const download = async (url: string, destination: string, redirects = 0): Promise<void> => {
  const client = url.startsWith('https:') ? https : http;
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const request = client.get(url, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        if (redirects > 5) {
          rejectPromise(new Error(`Too many redirects while downloading ${url}`));
          return;
        }
        const nextUrl = new URL(location, url).toString();
        download(nextUrl, destination, redirects + 1).then(resolvePromise, rejectPromise);
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        rejectPromise(new Error(`Download failed with HTTP ${status}: ${url}`));
        return;
      }

      const total = Number(response.headers['content-length'] || 0);
      let downloaded = 0;
      const file = createWriteStream(destination);
      log({
        type: 'browser_download',
        phase: 'response',
        status: 'ok',
        source: 'custom_url',
        http_status: status,
        content_length: total,
        destination,
      });
      response.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (total > 0) {
          const progress = Math.min(1, downloaded / total);
          const bucket = progressBuckets.find((candidate) => progress >= candidate && !loggedProgressBuckets.has(candidate));
          if (bucket !== undefined || progress === 1) {
            const selectedBucket = bucket ?? 1;
            loggedProgressBuckets.add(selectedBucket);
            log({
              type: 'browser_download',
              phase: 'progress',
              source: 'custom_url',
              progress: selectedBucket,
              downloaded_bytes: downloaded,
              total_size_bytes: total,
            });
          }
        }
      });
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolvePromise();
      });
      file.on('error', rejectPromise);
    });
    request.on('error', rejectPromise);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Chrome Headless Shell download timed out after ${timeoutMs}ms`));
    });
  });
};

const runCommand = async (
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{code: number | null; stdout: string; stderr: string}> => {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      rejectPromise(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolvePromise({code, stdout, stderr});
    });
  });
};

const extractArchive = async (archivePath: string, outputPath: string) => {
  const extractTimeoutMs = Number(process.env.REMOTION_BROWSER_EXTRACT_TIMEOUT_MS || 300000);
  try {
    const unzip = await runCommand('unzip', ['-q', '-o', archivePath, '-d', outputPath], extractTimeoutMs);
    log({
      type: 'browser_download',
      phase: 'extract_command',
      command: 'unzip',
      code: unzip.code,
      stdout: unzip.stdout.slice(0, 2000),
      stderr: unzip.stderr.slice(0, 2000),
    });
    if (unzip.code === 0) return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log({type: 'browser_download', phase: 'extract_command', command: 'unzip', status: 'error', message});
  }

  const python = await runCommand(
    'python3',
    ['-m', 'zipfile', '-e', archivePath, outputPath],
    extractTimeoutMs,
  );
  log({
    type: 'browser_download',
    phase: 'extract_command',
    command: 'python3 -m zipfile',
    code: python.code,
    stdout: python.stdout.slice(0, 2000),
    stderr: python.stderr.slice(0, 2000),
  });
  if (python.code !== 0) {
    throw new Error(`Failed to extract Chrome archive: ${python.stderr || python.stdout || `exit ${python.code}`}`);
  }
};

const run = async () => {
  const targetPlatform = platform();
  const downloadUrl = process.env.REMOTION_CHROME_DOWNLOAD_URL?.trim() || defaultDownloadUrl(targetPlatform);
  const outputPath = resolve(downloadsRoot, targetPlatform);
  const archivePath = resolve(downloadsRoot, `chrome-headless-shell-${targetPlatform}.zip`);
  const existingExecutable = walk(outputPath)[0];
  if (existingExecutable && existsSync(resolve(downloadsRoot, 'VERSION'))) {
    log({type: 'browser_download', phase: 'executable', status: 'ok', source: 'cache', executable: normalizeExecutable(existingExecutable)});
    return;
  }

  log({
    type: 'browser_download',
    phase: 'ensure',
    status: 'started',
    source: 'custom_url',
    url: downloadUrl,
    output_path: outputPath,
    timeout_ms: timeoutMs,
  });
  mkdirSync(downloadsRoot, {recursive: true});
  rmSync(outputPath, {recursive: true, force: true});
  if (existsSync(archivePath)) unlinkSync(archivePath);

  await download(downloadUrl, archivePath);
  const archiveStat = statSync(archivePath);
  log({
    type: 'browser_download',
    phase: 'archive',
    status: 'ok',
    archive_path: archivePath,
    size: archiveStat.size,
  });
  mkdirSync(outputPath, {recursive: true});
  log({type: 'browser_download', phase: 'extract', status: 'started', archive_path: archivePath, output_path: outputPath});
  try {
    await extractArchive(archivePath, outputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    log({type: 'browser_download', phase: 'extract', status: 'error', archive_path: archivePath, output_path: outputPath, message, stack});
    throw error;
  }
  unlinkSync(archivePath);
  log({
    type: 'browser_download',
    phase: 'extract',
    status: 'done',
    output_path: outputPath,
    entries: existsSync(outputPath) ? readdirSync(outputPath).slice(0, 50) : [],
    ...(verbose ? {tree: tree(outputPath)} : {}),
  });

  const executable = walk(outputPath)[0];
  if (!executable) {
    log({
      type: 'browser_download',
      phase: 'find_executable',
      status: 'failed',
      output_path: outputPath,
      downloads_root: downloadsRoot,
      output_tree: tree(outputPath),
      downloads_tree: tree(downloadsRoot),
    });
    throw new Error(`Chrome Headless Shell executable not found after extracting ${archivePath}`);
  }
  const remotionExecutable = normalizeExecutable(executable);
  writeFileSync(resolve(downloadsRoot, 'VERSION'), testedVersion, 'utf8');
  log({type: 'browser_download', phase: 'executable', status: 'ok', executable: remotionExecutable});
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log({type: 'browser_download', phase: 'failed', status: 'error', message});
  process.exit(1);
});
