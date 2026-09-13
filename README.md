# AST Green-Code Engine

The AST Green-Code Engine is a shared static-analysis and refactoring system for JavaScript and TypeScript. It identifies energy-related anti-patterns, provides source-to-source rewrites, exposes the same engine through a VS Code extension, and provides a browser dashboard for batch uploads and optional Chromium telemetry.

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

Open `http://localhost:4173`. The server binds to `0.0.0.0` and accepts `PORT` for deployment. The `puppeteer` package is intentionally optional in the base install; installing it enables `/api/benchmark` to collect Chrome DevTools Protocol `TaskDuration`, `JSHeapUsedSize`, and `LayoutCount` metrics.

## VS Code packaging

The extension manifest is in `src/extension/package.json`. After compiling, package it with the VS Code Extension Manager (`vsce`) from the repository root, or copy the generated `dist` tree and manifest into an extension bundle. The extension registers diagnostics on open/change, native quick-fix code actions, and the `Green-Code: Open Companion` command.

## Safety and limitations

Refactoring is deliberately conservative. DOM caching is applied when the loop is directly inside a block or program scope. Event listeners are wrapped with a generated throttle helper. Heavy array traversals are reported with an explanatory suggestion but are not rewritten automatically because loop fusion requires domain-specific semantics. Benchmark execution must be treated as untrusted-code execution and should be isolated in a container in production.
