# Implementation Plan: `@temples/*` npm publication + docs site

Spec: `spec-npm-docs.md`.

## Architecture Overview

The single-package layout becomes a Bun workspace monorepo. `@temples/engine` is the foundation;
the three other packages depend on it through `workspace:*` (resolved to real versions by
`bun publish`). The docs site is a private workspace that consumes `@temples/engine` and
`@temples/ssr` — the site build is itself the dogfood proof of the SSR pipeline.

```
packages/
  engine      @temples/engine      ← Renderer core, no runtime deps
  components  @temples/components  ← TemplesComponent + reactive(), deps: engine
  ssr         @temples/ssr         ← linkedom wiring + dom-globals, deps: engine, linkedom
  jquery      @temples/jquery      ← $.fn.temples, deps: engine, peer: jquery
  docs        (private)            ← Bun.markdown + Renderer → docs/www/ static site
```

Dependency graph (publish order follows it):

```
engine ──→ components
       ──→ ssr
       ──→ jquery
engine + ssr ──→ docs (private, not published)
```

## Module Breakdown

### 1. Workspace packages
Each package carries: `package.json` (name `@temples/<pkg>`, `type: "module"`, `exports` map to
`www/`, `files: ["www", "README.md"]`, `publishConfig.access: "public"`, `sideEffects` where
needed), its own `tsconfig.json` (extends the root), a `tsconfig.build.json` (declaration emit),
and a build script.

Source moves:
- `src/engine.ts`, `src/utilities/properties.ts` → `packages/engine/src/`
- `src/component.ts`, `src/reactive.ts` → `packages/components/src/` (reactive ships with its only consumer)
- `src/ssr.ts`, `src/utilities/dom-globals.ts` → `packages/ssr/src/`
- `src/jquery.ts` → `packages/jquery/src/`
- Colocated `*.test.ts` files move with their sources.

Import rewrites inside sources:
- `./engine` → `@temples/engine` (in components, ssr, jquery)
- local utility imports stay relative
- root `test/setup.ts` imports dom-globals from `../packages/ssr/src/utilities/dom-globals`

### 2. Build (per package)
Replicate the proven single-package approach:
1. `tsc --noEmit` (typecheck gate)
2. `bun build src/<entries> --outdir dist --format esm --target browser --packages external` (+ minified variant)
3. Node-targeted build for `@temples/ssr`
4. `tsc -p tsconfig.build.json` for `.d.ts` output
`--packages external` keeps `@temples/engine`, `linkedom`, and `jquery` as runtime imports.
Build order: engine first, then components/ssr/jquery (their `.d.ts` resolution needs engine's).

### 3. Publish metadata
- `linkedom` moves from root devDependency to runtime dependency of `@temples/ssr`.
- `jquery` is a peerDependency of `@temples/jquery` (devDependency at root for tests).
- The stray `typescript` peerDependency is dropped from the root.
- Every package: `publishConfig.access: "public"` (scoped packages default to restricted),
  description, license, repository, keywords, version 1.0.0.
- Publishing uses `bun publish` (respects `publishConfig`, resolves `workspace:*`, supports
  `--dry-run`); publishing is a human step (npm OTP), the repo ships a checklist.

### 4. Docs workspace (`packages/docs`)
- `content/*.md` — one file per page, with a small front-matter block (title, description, order).
- `layout.html` — a temples template: nav via `data-iterate`, page content injected with
  `data-bind="html=page.content"`, title/head via `data-bind`.
- `build.ts` — the pipeline: read manifest → `Bun.markdown.html(md, { headings: { ids: true } })`
  → feed `{ title, content, nav }` into a `Renderer` (layout) → `renderToString()` → write
  `docs/www/<slug>/index.html` + `docs/www/assets/style.css` + `docs/www/llms.txt`.
- `Bun.markdown` is unstable: all markdown parsing lives in one module (`markdown.ts`) so a parser
  swap touches one file.
- Relative asset paths so the site works under GitHub Pages subpaths.
- `llms.txt` is generated from the same manifest (title, one-line description, markdown URL per page).

### 5. Docs content
Rewritten from the current source (never from the outdated README):
getting started, data-binding syntax, components guide, SSR/SSG guide, jQuery plugin,
API reference per package. The root README becomes a monorepo overview; each package README is a
short package-specific intro with a pointer to the site.

### 6. Deploy
- `.github/workflows/docs.yml`: on push to `main` → `bun install`, `bun run docs:build`, upload
  `packages/docs/www` via official GitHub Pages actions.
- Vercel alternative documented in `packages/docs/README.md` (output dir `packages/docs/www`).

## Implementation Order

```
Phase 1: Workspace restructure (no behavior change)      T1
Phase 2: Per-package build                                T2
Phase 3: Publish metadata + READMEs                       T3
Phase 4: Docs workspace (pipeline → content → llms.txt)   T4 → T5 → T6
Phase 5: Deploy story                                     T7
Phase 6: Release gate (1.0.0, changelog, final checks)    T8
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| `Bun.markdown` is an unstable API | Isolated in `packages/docs/src/markdown.ts`; single swap point |
| Scoped packages must publish in dependency order | Root `publish:all` script encodes the order; engine first |
| linkedom imported at runtime but declared devDep | Becomes a runtime dependency of `@temples/ssr` |
| GitHub Pages serves under a subpath | Relative asset paths, configurable base URL constant |
| Docs drift from the real API | Docs written against source + tests; examples cross-checked |
| `tsc` d.ts resolution across workspaces | Build engine first; workspace links resolve `@temples/engine` types |
| Old README API (`this.data`) resurfaces | Checklists in T3/T5 reject any non-reactive API mention |

## Verification Checkpoints

- After Phase 1: `bun install && bun test && bun run check && bun run typecheck` all green; example still runs.
- After Phase 2: `bun run build` produces complete `www/` in all four packages.
- After Phase 3: `bun publish --dry-run` succeeds for all four packages with the expected file list.
- After Phase 4: `bun run docs:build` produces valid HTML for every page + `llms.txt`; verified in a browser.
- After Phase 5: workflow file valid; its build step runs locally without error.
- After Phase 6: full gate green (`check`, `typecheck`, `test`, `build`, dry-runs).
