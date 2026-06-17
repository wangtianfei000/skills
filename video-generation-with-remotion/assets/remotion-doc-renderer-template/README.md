# Remotion Doc Renderer MVP

Shared Remotion renderer for document-style videos.

## Current MVP

- Fixed composition: `GeneratedDocVideo`
- Resolution: `1920x1440`
- FPS: `60`
- Duration: `2400` frames / `40s`
- Scene module: `src/generated/scene.generated.tsx`
- Output path: `../output/remotion-doc-mvp/sample-doc-video.mp4`

## Commands

```bash
npm install
npm run deploy:verify
npm run render:sample
npm run still:sample
```

On Baota servers, Node.js installed from the panel may not be in the SSH
`PATH`. Use this form:

```bash
NODE_BIN="$(ls -d /www/server/nodejs/v*/bin 2>/dev/null | sort -V | tail -n 1)"
test -n "$NODE_BIN" || { echo "Baota Node.js not found under /www/server/nodejs"; exit 1; }
export PATH="$NODE_BIN:$PATH"

cd /www/wwwroot/videoblast/remotion-doc-renderer
node -v
npm -v
npm install --registry=https://registry.npmmirror.com
npm run browser:download
npm run browser:check

BROWSER_SRC="$(find node_modules/.remotion/chrome-headless-shell -type f \( -name chrome-headless-shell -o -name headless_shell \) | head -n 1)"
test -n "$BROWSER_SRC" || { echo "Chrome Headless Shell executable not found"; exit 1; }
rm -rf /www/wwwroot/videoblast/runtime/remotion-browser
mkdir -p /www/wwwroot/videoblast/runtime/remotion-browser
cp -a "$(dirname "$BROWSER_SRC")" /www/wwwroot/videoblast/runtime/remotion-browser/
BROWSER_DST="/www/wwwroot/videoblast/runtime/remotion-browser/$(basename "$(dirname "$BROWSER_SRC")")/$(basename "$BROWSER_SRC")"
grep -q '^REMOTION_BROWSER_EXECUTABLE=' /www/wwwroot/videoblast/.env \
  && sed -i "s#^REMOTION_BROWSER_EXECUTABLE=.*#REMOTION_BROWSER_EXECUTABLE=$BROWSER_DST#" /www/wwwroot/videoblast/.env \
  || echo "REMOTION_BROWSER_EXECUTABLE=$BROWSER_DST" >> /www/wwwroot/videoblast/.env

npm run deploy:verify
```

`npm run deploy:verify` is required on deployment. It builds `dist/render.js`,
downloads the Remotion Chrome Headless Shell if missing, and renders a short
smoke-test manifest through the shared renderer. If Chrome, Remotion bundling,
encoding, or output writing is broken, deployment should stop here before users
submit videos.

After `REMOTION_BROWSER_EXECUTABLE` is written to `.env`, future renders use the
fixed browser path instead of the cache under `node_modules/.remotion`, so
running `npm install` later should not force another browser download.

If the browser executable is missing, run:

```bash
npm run browser:download
```

`npm run browser:download` uses the npmmirror Chrome for Testing mirror by
default. To override it:

```bash
REMOTION_CHROME_DOWNLOAD_URL=https://your-mirror/chrome-headless-shell-linux64.zip npm run browser:download
```

If logs contain `chrome_mode` and `already_available`, the render process has
fallen back to Remotion's internal downloader. Pull the latest code and run
`npm run deploy:verify` again; it now runs `browser:download` first so the
npmmirror downloader prepares the cache before rendering.

Browser download logs are quiet by default. To print extraction trees and extra
diagnostics:

```bash
REMOTION_BROWSER_VERBOSE=1 npm run browser:download
REMOTION_BROWSER_VERBOSE=1 npm run browser:check
```

If verification hangs or fails after browser download, check the browser binary
directly:

```bash
npm run browser:check
```

On Ubuntu/Debian servers, missing Chrome runtime libraries are commonly fixed
with:

```bash
apt-get update
apt-get install -y libnss3 libatk-bridge2.0-0 libgtk-3-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libpango-1.0-0 libcups2 libxss1 libxshmfence1 libdrm2 libxkbcommon0 libatspi2.0-0 fontconfig fonts-noto-cjk fonts-noto-color-emoji
fc-cache -fv
```

`npm run deploy:verify` checks for `Noto Color Emoji` before smoke rendering.
If this font is missing, emoji and symbol icons such as 🏕️ / 🌿 / 🛡️ may render
as square boxes in the final video, so deployment should stop until the font
package is installed.

Render a task manifest without changing the shared Remotion source:

```bash
npm run render:manifest -- --manifest ../output/remotion-doc-mvp/manifest-task/manifest.json
```

After build, the backend can also call the stable CLI directly:

```bash
node dist/render.js --manifest ../output/remotion-doc-mvp/manifest-task/manifest.json
```

## Task Directory

Each render task owns only generated inputs and outputs. The shared Remotion
project stays in this directory and is reused for every video.

```text
output/remotion-doc-mvp/{taskId}/
  manifest.json
  scene.generated.tsx
  final.mp4
  cover.jpg
  .remotion-entry/
```

`manifest.json`:

```json
{
  "schema_version": "remotion_task_manifest_v1",
  "task_id": "manifest-task",
  "composition_id": "GeneratedDocVideo",
  "scene_module": "scene.generated.tsx",
  "output": {
    "video_path": "final.mp4",
    "cover_path": "cover.jpg",
    "cover_frame": 120
  },
  "render": {
    "codec": "h264",
    "pixel_format": "yuv420p",
    "concurrency": 4
  }
}
```

`render.ts` writes newline-delimited JSON logs for progress and final results,
so the backend can parse status without scraping Remotion console text.

## Notes

This MVP intentionally uses one shared Remotion project. Do not create a new
Remotion project per video. Future AI-generated scenes should replace or inject
only the task-local `scene.generated.tsx` module, while keeping dependencies,
components, fonts, and renderer code shared.
