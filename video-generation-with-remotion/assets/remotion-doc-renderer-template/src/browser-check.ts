import {spawn} from 'node:child_process';
import {existsSync, readdirSync, statSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

type JsonLine = Record<string, unknown>;

const rendererRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const executableNames = new Set(['chrome-headless-shell', 'headless_shell', 'chrome-headless-shell.exe', 'chrome', 'chrome.exe']);
const verbose = process.env.REMOTION_BROWSER_VERBOSE === '1';

const log = (line: JsonLine) => {
  console.log(JSON.stringify({timestamp: new Date().toISOString(), ...line}));
};

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

const run = async () => {
  const cacheDir = resolve(rendererRoot, 'node_modules/.remotion/chrome-headless-shell');
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE?.trim() || '',
    ...walk(cacheDir),
  ].filter((path, index, all) => path && all.indexOf(path) === index && existsSync(path));

  log({
    type: 'browser_check',
    phase: 'find',
    cache_dir: cacheDir,
    candidates,
    ...(verbose || candidates.length === 0 ? {tree: tree(cacheDir)} : {}),
  });
  const executable = candidates[0];
  if (!executable) {
    throw new Error('Chrome Headless Shell executable not found. Run npm run browser:download first.');
  }

  if (process.platform === 'linux') {
    const ldd = await runCommand('ldd', [executable], 15000);
    log({type: 'browser_check', phase: 'ldd', executable, code: ldd.code, stdout: ldd.stdout, stderr: ldd.stderr});
    if (ldd.stdout.includes('not found') || ldd.stderr.includes('not found')) {
      throw new Error('Chrome Headless Shell is missing Linux shared libraries. Install the missing packages listed by ldd.');
    }
  }

  const version = await runCommand(executable, ['--version'], 15000);
  log({type: 'browser_check', phase: 'version', executable, code: version.code, stdout: version.stdout, stderr: version.stderr});
  if (version.code !== 0) {
    throw new Error(`Chrome Headless Shell --version failed with code ${version.code}`);
  }

  const launch = await runCommand(
    executable,
    ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--dump-dom', 'about:blank'],
    30000,
  );
  log({type: 'browser_check', phase: 'launch', executable, code: launch.code, stdout: launch.stdout, stderr: launch.stderr});
  if (launch.code !== 0) {
    throw new Error(`Chrome Headless Shell launch failed with code ${launch.code}`);
  }
  log({type: 'browser_check', phase: 'ok', executable});
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log({type: 'browser_check', phase: 'failed', status: 'error', message});
  process.exit(1);
});
