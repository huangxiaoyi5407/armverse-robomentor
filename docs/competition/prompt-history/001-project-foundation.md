# 001 — Reproducible project foundation

Date: 2026-10-22. Task: create the smallest Next.js / TypeScript foundation for RoboMentor UR5, with an accessible page title and an honestly labelled demo mode. No robot algorithms, agents, lessons, or elaborate UI were requested or added.

## Inputs and decisions

- Implemented Task 1 from the approved implementation plan and the scoped task brief. The approved spec and plan were not edited.
- Runtime used: Windows, Node.js `v24.18.0`, npm `11.16.0`. Declared requirements remain Node.js `>=20.9.0`, npm `>=10.0.0`.
- Accepted AI suggestions: use an App Router server page, semantic `main`/`h1`, an accessible named `status`, Chinese document language, local system fonts, basic dark design tokens, Testing Library role queries, and a committed npm lockfile.
- Accepted compatibility correction: explicitly use Vite 6 because the initially resolved Vite 7 requires Node 20.19 or newer. Vite 6.4.5 supports Node 20.0 or newer. Runtime execution on Node 20.9 itself was not performed.
- Accepted compatibility correction: use Rollup's official `@rollup/wasm-node` implementation through the `rollup` npm alias and `$rollup` override. Windows Application Control blocked the native Rollup binary even outside the sandbox. No Windows policy was changed and no dependency files were patched. npm retained the original native package when an alias used the same version number, so the final explicit alias uses version 4.64.0 and was verified by a fresh `npm ci`.
- Production builds use Next's supported `--webpack` option. Development uses the standard `next dev` command. Next's native SWC loaded successfully during diagnostics.
- Rejected suggestions: remote font downloads, extra UI frameworks, Three.js, Zustand, robotics logic, AI provider behavior, or invented lesson content. Those exceed this foundation task.
- `test:e2e` intentionally prints that browser acceptance tests arrive in Task 12 and exits successfully. It is a documented placeholder, not browser acceptance evidence.
- README authoring and the timed clean-machine reproduction are explicitly assigned to Task 12 in the approved plan. This task supplies the installation/start commands below without claiming that final release gate is complete.

## Locked direct dependencies

| Package | Version |
| --- | --- |
| next | 16.4.2 |
| eslint-config-next | 16.0.10 |
| typescript-eslint (complete matched toolchain) | 8.46.4 |
| react / react-dom | 19.3.1 |
| typescript | 5.9.3 |
| vite | 6.4.5 |
| vitest | 3.2.7 |
| rollup alias: @rollup/wasm-node | 4.64.0 |
| eslint | 9.39.5 |
| jsdom | 26.1.0 |
| @testing-library/react | 16.3.3 |
| @testing-library/jest-dom | 6.9.1 |
| @types/node | 20.19.43 |
| @types/react / @types/react-dom | 19.3.0 |

`package-lock.json` contains exact transitive versions, registry locations, and integrity hashes. `@/*` resolves to `src/*` in TypeScript and Vitest. Generated Next types and TypeScript build state are ignored.

## Commands and evidence

Commands ran from `D:/传智杯/.worktrees/robomentor-build` on `robomentor-build`.

### Dependency installation

1. `npm install --fetch-retries=0 --fetch-timeout=20000` inside the sandbox: exit 1, `ENOTFOUND registry.npmjs.org`.
2. First installation approval waited and was interrupted. A later approved install returned successful metadata requests but stopped showing progress; it was interrupted with Ctrl-C, exit 1.
3. `npm install --fetch-retries=0 --fetch-timeout=20000 --maxsockets=5 --no-audit --no-fund --loglevel=verbose` outside the sandbox: exit 0, `added 443 packages in 8m`.
4. After Vite/official Rollup WASM corrections, repeated `npm install --fetch-retries=0 --fetch-timeout=20000 --maxsockets=5 --no-audit --no-fund`. Final correction: exit 0, `removed 2 packages, and changed 1 package in 7s`.

These network flags are local verification options, not prerequisites for normal installation.

### Initial failure before implementation

Test written before the page shell. The first two attempts to run `npm run test:run -- src/app/page.test.tsx` failed before test collection with `ERR_DLOPEN_FAILED`, `An Application Control policy has blocked this file`, naming `@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node`. The second attempt ran outside the sandbox with the same result. These were environmental failures, not the required red result.

After the supported WASM dependency correction, with `src/app/page.tsx` still absent:

```text
> npm run test:run -- src/app/page.test.tsx
> vitest run src/app/page.test.tsx
RUN v3.2.7 D:/传智杯/.worktrees/robomentor-build
FAIL src/app/page.test.tsx [ src/app/page.test.tsx ]
Error: Failed to resolve import "@/app/page" from "src/app/page.test.tsx". Does the file exist?
Test Files  1 failed (1)
Tests  no tests
Start at  20:04:00
Duration  1.19s
```

Exit 1, expected missing-page failure. Only then were `page.tsx`, `layout.tsx`, and `globals.css` implemented.

### First green and production build

`npm run test:run`: exit 0, `1 passed` test file, `2 passed` tests, duration 1.26s.

`npm run lint`: exit 0, `eslint . --max-warnings=0`, no findings.

`npm run build` inside sandbox: exit 1, `EPERM: operation not permitted, mkdir` under `.next/static/chunks/next/dist/client/components`. The same command outside the sandbox passed compilation, TypeScript, static generation, and exited 0.

### Clean lockfile verification and final checks

```text
> npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 --maxsockets=5
added 441 packages in 19s
```

Exit 0. npm reported deprecations for `whatwg-encoding@3.1.1` and `eslint@9.39.5`, plus npm 11 allow-scripts notices for esbuild and unrs-resolver. Their installation scripts ran successfully; no persistent script-approval policy was changed. Audit was disabled for these network-sensitive installation checks; this is not vulnerability-audit evidence.

Fresh checks after `npm ci`:

```text
> npm run test:run
> vitest run
RUN v3.2.7 D:/传智杯/.worktrees/robomentor-build
✓ src/app/page.test.tsx (2 tests) 45ms
Test Files  1 passed (1)
Tests  2 passed (2)
Start at  20:08:29
Duration  1.28s

> npm run lint
> eslint . --max-warnings=0
```

Both exited 0. Final `npm run build` outside the sandbox:

```text
> next build --webpack
▲ Next.js 16.4.2 (webpack)
✓ Running next.config.ts took 606ms
Creating an optimized production build ...
✓ Compiled successfully in 841ms
Running TypeScript ...
Finished TypeScript in 947ms ...
Collecting page data using 4 workers ...
Generating static pages using 4 workers (0/3) ...
✓ Generating static pages using 4 workers (3/3) in 430ms
Finalizing page optimization ...
Collecting build traces ...
Route (app)
┌ ○ /
└ ○ /_not-found
○ (Static) prerendered as static content
```

Exit 0. `npm run test:e2e`: exit 0, `Browser acceptance tests will be added in Task 12.` No browser tests were executed.

## Self-review and remaining concerns

- Reviewed source, configs, dependency graph, lockfile, and staged diff. Removing the heading or the labelled demo status breaks the corresponding real DOM test; neither test relies on mocks.
- No keys, remote assets, unimplemented interactive controls, or claims of functioning AI appear in the shell. Demo status is unconditional because no provider exists yet.
- ESLint 9 is retained for the required Node 20.9 baseline; npm marks it unsupported. Revisit supported tooling when the runtime baseline can increase. jsdom's transitive whatwg-encoding deprecation is recorded, not suppressed.
- Windows policy requires the official Rollup WASM alias on this machine. The lockfile clean install and tests prove it is reproducible here; other operating systems and the exact minimum Node version were not exercised.
- Ten-minute README reproduction and real browser acceptance remain release tasks, not completed claims.

## Startup and commit reference

From a clean checkout with Node >=20.9 and npm >=10: run `npm ci`, then `npm run dev`, and open `http://localhost:3000`. No environment variables or AI key are needed.

Initial commit: `bc066653ab55a113f2a130d99149ad7c4c48a172`, subject `chore: establish reproducible Next.js foundation`. Resolve the latest correction commit for this record with `git log -1 --format=%H -- docs/competition/prompt-history/001-project-foundation.md`.

## Review correction 1 — complete Node 20.9 engine audit

The initial review checked top-level Vite's engine but missed a required transitive dependency. The original lockfile contained `@typescript-eslint/visitor-keys@8.72.0 -> eslint-visitor-keys@5.0.1`, whose Node requirement is `^20.19.0 || ^22.13.0 || >=24`. Thus the initial foundation did **not** support its declared Node 20.9 baseline. The earlier passing tests and build ran on Node24 and did not establish minimum-runtime compatibility.

Accepted review correction: select the **complete** compatible TypeScript ESLint toolchain, rather than override its child dependency. Official npm metadata established:

- `eslint-config-next@16.0.10` accepts `typescript-eslint@^8.46.0`.
- `typescript-eslint@8.46.4` pins its parser, plugin, utils and TypeScript ESTree packages to `8.46.4`.
- `@typescript-eslint/visitor-keys@8.46.4` naturally depends on `eslint-visitor-keys@^4.2.1`, which supports Node20.9.

The manifest now fixes `eslint-config-next` to `16.0.10` and explicitly fixes `typescript-eslint` to `8.46.4`, using `$typescript-eslint` to keep that same version throughout the graph. Next runtime remains 16.4.2. No child visitor-keys override was added.

Commands, from the project root:

```text
npm view eslint-config-next@16.0.10 dependencies --json
npm view @typescript-eslint/visitor-keys@8.46.4 dependencies engines --json
npm view typescript-eslint@8.46.4 dependencies engines --json
npm install --fetch-retries=0 --fetch-timeout=20000 --maxsockets=5 --no-audit --no-fund
```

Installation exited0: `added 3 packages, removed 4 packages, and changed 15 packages in 13s`. `npm ls typescript-eslint @typescript-eslint/visitor-keys eslint-visitor-keys` confirmed TypeScript ESLint's packages are all 8.46.4 and visitor keys naturally dedupes to ESLint's 4.2.1; no 5.x visitor keys remains.

Audit **every** lockfile dependency marked neither `optional` nor `devOptional`, including development dependencies and nested duplicate packages, rather than only direct dependencies. Use npm's semver parser against the literal minimum version; absent engines are counted separately. Reproducible command:

```sh
node -e "const semver=require('semver');const lock=require('./package-lock.json');const deps=Object.entries(lock.packages).filter(([location,p])=>location&&!p.optional&&!p.devOptional);const engines=deps.filter(([,p])=>p.engines?.node);const bad=engines.filter(([,p])=>!semver.satisfies('20.9.0',p.engines.node)).map(([location,p])=>({location,version:p.version,node:p.engines.node}));console.log(JSON.stringify({target:'20.9.0',requiredDependencies:deps.length,withNodeEngine:engines.length,withoutNodeEngine:deps.length-engines.length,incompatible:bad},null,2));process.exitCode=bad.length?1:0;"
```

Before correction: exit1, 433 required dependencies / 309 with engines, one incompatible entry: the nested `eslint-visitor-keys@5.0.1` above.

After correction and again after clean `npm ci`, exit0:

```json
{
  "target": "20.9.0",
  "requiredDependencies": 432,
  "withNodeEngine": 306,
  "withoutNodeEngine": 126,
  "incompatible": []
}
```

`npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 --maxsockets=5` exited0: `added 440 packages in 18s`. The same previously recorded deprecation and npm allow-scripts notices remain.

Fresh verification after this clean installation:

```text
npm run test:run
✓ src/app/page.test.tsx (2 tests) 46ms
Test Files  1 passed (1)
Tests  2 passed (2)
Start at  20:44:04
Duration  1.29s

npm run lint
> eslint . --max-warnings=0

npm run build
▲ Next.js 16.4.2 (webpack)
✓ Compiled successfully in 1021ms
Finished TypeScript in 941ms ...
✓ Generating static pages using 4 workers (3/3) in 407ms
Route (app)
┌ ○ /
└ ○ /_not-found
○ (Static) prerendered as static content
```

Each command exited0, build elevated for the previously documented sandbox restriction. An intermediate lint run found three forbidden CommonJS imports in the temporary ignored audit helper; converted that helper to ESM and reran lint to the clean exit0 shown above. Application source and ESLint rules were unchanged.

This is a complete **declared engines** audit of the required lockfile graph. Packages without engine declarations and actual execution on Node20.9 have not been validated by that metadata check; runtime verification still used Node24.18/npm11.16. README/browser release gates and prior deprecation concerns remain as documented.
