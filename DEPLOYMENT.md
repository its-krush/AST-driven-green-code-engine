# Deployment Guide

## Local production run

Requirements are Node.js 22 or newer and npm 10 or newer.

```bash
npm ci
npm run build
PORT=4173 npm start
```

The application listens on `0.0.0.0` and exposes `GET /api/health` for service checks.

## Render

1. Create a new **Web Service** in Render.
2. Connect the GitHub repository.
3. Set the runtime to **Node**.
4. Use `npm ci && npm run build` as the build command.
5. Use `npm start` as the start command.
6. Set the health-check path to `/api/health`.
7. Deploy the service.

The included `render.yaml` can be used with Render Blueprint deployment. Render supplies the `PORT` environment variable automatically.

## Docker

Build and run the production image:

```bash
docker build -t ast-green-code-engine .
docker run --rm -p 4173:4173 ast-green-code-engine
```

Open `http://localhost:4173` after the container starts. The image runs as the unprivileged `node` user.

## Railway, Fly.io, or another Node host

Use the same commands:

```text
Build: npm ci && npm run build
Start: npm start
Health check: /api/health
```

Set `NODE_ENV=production`. Bind the service to the platform-provided `PORT`; the application already defaults to port `4173` when no value is supplied.

## Benchmarking support

The `/api/benchmark` route uses Puppeteer and Chrome DevTools Protocol to collect main-thread task time, JavaScript heap usage, and DOM layout counts. The standard `npm ci` installation includes Puppeteer and downloads a compatible Chromium build. For production use, execute uploaded or benchmarked code inside an isolated container with resource and time limits.

## VS Code extension

The extension source is under `src/extension`. Compile the repository with `npm run build`, then package the extension using `vsce` and the manifest at `src/extension/package.json`. The extension uses the compiled file at `dist/extension/extension.js`.
