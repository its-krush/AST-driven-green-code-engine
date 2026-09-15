# Deployment Guide

## What was broken

The previous `Dockerfile` ran `npm ci --omit=dev` and then `npm run build`.
The build script needs `typescript`, `rimraf`, and `copyfiles` — all of which
are `devDependencies` — so that step failed on any platform that builds this
image with production-only installs (including Render, if it auto-detects
the `Dockerfile` and uses Docker as the environment). Separately, Puppeteer's
bundled Chromium has no chance of launching on a minimal `-slim` base image
without its shared libraries (`libnss3`, `libatk`, `libgtk`, etc.) installed.

Both are fixed below: the `Dockerfile` is now a two-stage build (a builder
stage with full `devDependencies`, and a slim runtime stage with production
dependencies plus a real system Chromium), and `server.ts` now honours
`PUPPETEER_EXECUTABLE_PATH` when launching the browser.

## Recommended: Docker on Render

1. In the Render dashboard, create a **Web Service**, connect this
   repository, and set **Environment** to **Docker** (Render should
   auto-detect the `Dockerfile`; confirm it explicitly if you're re-creating
   the service).
2. Leave the build/start commands blank — the `Dockerfile` handles both.
3. Set the health-check path to `/api/health`.
4. Deploy. The image installs a system Chromium during the build, so
   `/api/benchmark` works out of the box with no extra configuration.

Build and run locally to verify before pushing:

```bash
docker build -t ast-green-code-engine .
docker run --rm -p 4173:4173 ast-green-code-engine
```

Open `http://localhost:4173` and confirm `/api/health` returns `{"ok":true,...}`.

## Alternative: Render native Node runtime (render.yaml)

`render.yaml` deploys without Docker, using Render's Node buildpack. Use this
via **New → Blueprint** pointing at this repo. It sets:

- `buildCommand: npm ci && npm run build` (installs full `devDependencies`,
  so this path never hits the missing-`tsc` problem the Docker image had).
- `startCommand: npm start`
- `healthCheckPath: /api/health`
- `NODE_VERSION: 22.11.0` to match the Docker image's Node version.

Puppeteer on this path has a different, well-documented Render gotcha: the
Chromium binary downloaded to `$HOME/.cache/puppeteer` during the build is
not always visible to the running service. The included `.puppeteerrc.cjs`
redirects Puppeteer's cache into the project directory
(`./.cache/puppeteer`) so it persists between build and runtime. Do not
delete that file if you use this deployment path.

## Docker (any host)

```bash
docker build -t ast-green-code-engine .
docker run --rm -p 4173:4173 ast-green-code-engine
```

The image runs as the unprivileged `node` user and exposes
`GET /api/health` for health checks.

## Railway, Fly.io, or another Node/Docker host

Either the Dockerfile or the buildpack path above works unchanged:

```text
Build (Docker): none needed, Dockerfile is self-contained
Build (buildpack): npm ci && npm run build
Start: npm start
Health check: /api/health
```

Bind to the platform-provided `PORT`; the application already defaults to
port `4173` when no value is supplied.

## Benchmarking support

The `/api/benchmark` route uses Puppeteer and the Chrome DevTools Protocol to
collect main-thread task time, JavaScript heap usage, and DOM layout counts.
In the Docker image, this is backed by Debian's `chromium` package
(`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`), not Puppeteer's bundled
download. Treat the code executed by this route as untrusted: it already
runs inside an isolated headless browser process, and production deployments
should additionally apply container-level CPU/memory/time limits.

## VS Code extension

The extension source is under `src/extension`. Compile the repository with
`npm run build`, then package the extension using `vsce` and the manifest at
`src/extension/package.json`, or run `npm run package:extension`. The
extension uses the compiled file at `dist/extension/extension.js`.
