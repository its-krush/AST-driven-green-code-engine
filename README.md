# AST Green-Code Engine

The AST Green-Code Engine is a shared static-analysis and refactoring system for JavaScript and TypeScript. It identifies energy-related anti-patterns, provides source-to-source rewrites, exposes the same engine through a VS Code extension, and provides a browser dashboard for batch uploads and Chromium telemetry.

## Architecture

| Subsystem | Location | Responsibility |
|---|---|---|
| Shared AST engine | `src/core` | Babel parsing, detection, scoring, and refactoring |
| VS Code extension | `src/extension` | Diagnostics, quick fixes, and companion pet webview |
| Dashboard API | `src/dashboard/server.ts` | Source upload, ZIP ingestion, analysis, refactoring, and CDP benchmarking |
| Dashboard UI | `src/dashboard/public` | Source editor, findings, score, and before/after comparison |

The supported anti-patterns are DOM queries nested in loops, high-frequency `scroll`/`resize`/`wheel`/`touchmove` listeners without throttling, and array traversals nested in loops. The engine validates syntax before analysis and reports source locations for editor integrations.

## Quick start

```bash
npm install
npm run build
npm test
npm run dev
```

Open `http://localhost:4173`. The server binds to `0.0.0.0` and accepts `PORT` for deployment. The declared `puppeteer` dependency enables `/api/benchmark` to collect Chrome DevTools Protocol `TaskDuration`, `JSHeapUsedSize`, and `LayoutCount` metrics.

## VS Code packaging

The extension manifest is in `src/extension/package.json`. After compiling, package it with the VS Code Extension Manager (`vsce`) from the repository root, or copy the generated `dist` tree and manifest into an extension bundle. The extension registers diagnostics on open/change, native quick-fix code actions, and the `Green-Code: Open Companion` command.

## Safety and limitations

Refactoring is deliberately conservative. DOM caching is applied when the loop is directly inside a block or program scope. Event listeners are wrapped with a generated throttle helper. Heavy array traversals are reported with an explanatory suggestion but are not rewritten automatically because loop fusion requires domain-specific semantics. Benchmark execution must be treated as untrusted-code execution and should be isolated in a container in production.

## Verification

The repository includes unit tests for the core detector/refactoring behavior and integration tests for the dashboard health, analysis, and invalid-source paths. Run `npm test` to execute them. Run `npm run build` to compile the dashboard and extension. Run `npm run package:extension` to produce `ast-green-code-engine.vsix` after compilation.

The dashboard provides a Canvas-based performance visualization. The visualization displays before/after finding counts and score after refactoring, as well as Chrome DevTools Protocol values for main-thread task time, JavaScript heap usage, and DOM layout count.

The packaged extension artifact is `ast-green-code-engine.vsix`. Install it from VS Code with **Extensions → More Actions → Install from VSIX**.

## Windows setup

The project uses Node-based build scripts and does not require Bash, `rm`, `cp`, or other Unix commands. In PowerShell, run:

```powershell
git clone https://github.com/its-krush/AST-driven-green-code-engine.git
Set-Location AST-driven-green-code-engine
npm ci
npm run build
npm test
npm start
```

Open `http://localhost:4173`. If Puppeteer cannot download Chromium because of a corporate proxy, install dependencies without the browser download, then set `PUPPETEER_EXECUTABLE_PATH` to an installed Chrome executable:

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD="true"
npm ci
$env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm start
```

If `npm ci` reports a lockfile mismatch, remove `node_modules` and `package-lock.json`, then run `npm install` once. Commit the regenerated lockfile only if the dependency versions were intentionally changed.
