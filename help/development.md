---
title: Development
group: Maintenance
category: Contributor Guide
---

# Development

## Install

```bash
npm install
```

## Local workflow

```bash
npm run lint
npm test
npm run build
```

These commands cover the main package responsibilities:

- `lint` performs TypeScript-only validation
- `test` runs the Vitest suite
- `build` emits ESM, CJS, and declaration files through `tsup`

## Watch mode

```bash
npm run dev
npm run test:watch
```

## Source layout

```text
src/index.ts          Public package entrypoint
src/checks/           Validation classes, shared types, and helpers
help/                 Source markdown guides for TypeDoc project documents
docs/                 Generated TypeDoc site output
test/                 Vitest coverage for the exported surface
dist/                 Generated output
```

## Extending the validation API

When adding new checks:

1. Place the implementation in `src/checks/`.
2. Export the symbol from `src/checks/index.ts`.
3. Re-export it from `src/index.ts` if it should be public.
4. Add or update tests under `test/`.
5. Update `README.md` and `docs/checks.md` if the public API changes.

## Async API note

The package now mixes synchronous validators with async entry points.

- `ObjectCheck.check()` and `ArrayCheck.checkEach()` can consume promised checks
- `ValueCheck.isTrue()`, `ObjectCheck.isTrue()`, and `ArrayCheck.isTrueEach()` support async predicates
- `FieldCheck.file()` and `FieldCheck.image()` return promises because binary data must be loaded before validation

When updating docs or examples, prefer `await` at the outer rule boundary and use `result(...)` for the final output shape after the awaited check chain resolves.

## Notes for this workspace

The current machine has a Homebrew Node runtime issue related to ICU libraries. If `npm run lint` or `npm run build` aborts before TypeScript runs, switch to a working Node installation before validating release changes.