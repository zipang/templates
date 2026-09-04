# Task List: `@temples/*` npm publication + docs site

Spec: `tasks/spec-npm-docs.md`. Plan: `tasks/plan.md`.
Tasks are ordered by dependency. Follow `test-driven-development` for any new logic.

---

## Phase 1: Workspace restructure (no behavior change)

- [x] **T1: Monorepo skeleton + source moves**
  - Acceptance: `packages/engine`, `packages/components`, `packages/ssr`, `packages/jquery` exist,
    each with its `package.json` (`@temples/<name>`, exports map, `files`), sources, and colocated
    tests. Root `package.json` declares `workspaces: ["packages/*"]` and stays private/unpublished.
    Inter-package imports use `@temples/engine`; root `test/setup.ts` points at the new dom-globals
    location; example imports and tsconfig paths use the scoped names. Old `src/` files are gone.
  - Verify: `bun install && bun test && bun run check && bun run typecheck` all green; `bun run dev` still serves the example.
  - Files: root `package.json`, `tsconfig.json`, `bunfig.toml` (if needed), `biome.jsonc`, `packages/*/package.json`, `packages/*/src/**`, `example/`, `test/setup.ts`

## Phase 2: Build

- [x] **T2: Per-package build scripts + root orchestration**
  - Acceptance: each package builds to `dist/` (browser ESM + minified; Node ESM for ssr) plus
    `.d.ts` via `tsconfig.build.json`, with `@temples/engine`, `linkedom`, `jquery` kept external.
    Root `build` runs packages in dependency order (engine first).
  - Verify: `bun run build` succeeds; each `dist/` holds the expected js/min/d.ts files; a dist file's imports of `@temples/engine` remain bare (not bundled).
  - Files: `packages/*/package.json`, `packages/*/tsconfig*.json`, root `package.json`

## Phase 3: Publish metadata

- [x] **T3: package.json metadata + READMEs**
  - Acceptance: every package has `publishConfig.access: "public"`, version 1.0.0, description,
    license, repository, keywords, `files: ["dist", "README.md"]`. `linkedom` is a runtime
    dependency of ssr; `jquery` a peerDependency of jquery; the stray `typescript` peerDependency
    is dropped. Each package has a README documenting the current reactive API with `@temples/*`
    imports; the root README becomes a monorepo overview. No mention of the removed
    `this.data`/`update()` public API anywhere.
  - Verify: `bun publish --dry-run` succeeds for all four packages with the expected file list.
  - Files: `packages/*/package.json`, `packages/*/README.md`, `README.md`

## Phase 4: Docs workspace (dogfood)

- [x] **T4: Docs pipeline (`packages/docs`)**
  - Acceptance: `packages/docs/build.ts` reads the content manifest, converts markdown with
    `Bun.markdown` (isolated in `src/markdown.ts`), renders pages through a Temples layout
    (`Renderer` + `@temples/ssr`) with nav iteration and `data-bind="html=page.content"`, and
    writes `docs/dist/<slug>/index.html` + relative assets. Works under a subpath base.
  - Verify: `bun run docs:build` produces valid HTML for every page; spot-check in a browser.
  - Files: `packages/docs/{package.json,tsconfig.json}`, `packages/docs/src/**`, `packages/docs/layout.html`, `packages/docs/assets/style.css`

- [x] **T5: Docs content**
  - Acceptance: pages exist for getting started, data-binding syntax, components guide, SSR/SSG
    guide, jQuery plugin, and API reference — all rewritten from current source with `@temples/*`
    imports and the reactive (`this.state`) API; every code example cross-checked against tests.
  - Verify: `bun run docs:build` builds all pages; internal links resolve.
  - Files: `packages/docs/content/*.md`

- [x] **T6: llms.txt generation**
  - Acceptance: the build emits `docs/dist/llms.txt` from the manifest (site title, one-line
    description per page, absolute markdown/HTML URLs).
  - Verify: built file exists, links match the emitted pages.
  - Files: `packages/docs/src/build.ts`

## Phase 5: Deploy story

- [x] **T7: GitHub Pages workflow + Vercel alternative**
  - Acceptance: `.github/workflows/docs.yml` installs, builds the docs, and deploys
    `packages/docs/dist` to GitHub Pages on push to `main`. `packages/docs/README.md` documents the
    Vercel alternative (output dir `packages/docs/dist`).
  - Verify: the workflow's build steps run locally without error; YAML is valid.
  - Files: `.github/workflows/docs.yml`, `packages/docs/README.md`

## Phase 6: Release gate

- [x] **T8: Version 1.0.0 + CHANGELOG + final gate**
  - Acceptance: all packages at 1.0.0; `CHANGELOG.md` records the restructure, the scoped names,
    and the docs site; full gate green; publish checklist (engine → components → ssr → jquery) in
    the root README or RELEASE.md.
  - Verify: `bun run check && bun run typecheck && bun test && bun run build` green; all four `bun publish --dry-run` clean.
  - Files: `packages/*/package.json`, `CHANGELOG.md`, `RELEASE.md` (or root README section)
