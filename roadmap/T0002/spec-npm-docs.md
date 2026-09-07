# Spec: Publish `@temples/*` on npm + agent-oriented documentation site

## Objective

Restructure the Temples 1.0 repository into a Bun workspace monorepo and publish four packages to npm:

- `@temples/engine` — the standalone `Renderer` core (the main package).
- `@temples/components` — the `TemplesComponent` base class. Depends on `@temples/engine`.
- `@temples/ssr` — linkedom wiring for server-side rendering. Depends on `@temples/engine`.
- `@temples/jquery` — the `$.fn.temples(data)` plugin. Depends on `@temples/engine`.

Before publishing, build a documentation site from markdown sources in `docs/`, rendered by
Temples itself (dogfood: `Bun.markdown` → Temples `Renderer` → `renderToString`), deployable as a
plain static site (GitHub Pages primary, Vercel documented as an alternative), with an `llms.txt`
so AI coding agents can discover and consume the docs.

**Users:** humans evaluating and learning Temples; AI coding agents implementing with it.
**Why now:** npm publishing is blocked (invalid `"name": "@temples"`), the root README documents an
outdated API (`this.data`, `update(path, value)`) versus the current reactive API (`this.state`), and
dogfooding the SSG pipeline is the proof the engine is production-ready.

## Tech Stack

- Bun (runtime, package manager, test runner, bundler) — no npm/yarn/pnpm tooling.
- TypeScript (strict), Biome (format + lint), linkedom (SSR DOM), jQuery (peer dep of the plugin only).
- Docs pipeline: `Bun.markdown` (built-in, unstable API — isolated in one module) + `@temples/engine` + `@temples/ssr`.

## Commands

```
Install:        bun install
Test:           bun test
Lint:           bun run lint
Format:         bun run format
Check:          bun run check
Typecheck:      bun run typecheck
Build:          bun run build
Docs build:     bun run docs:build
Docs serve:     bun run docs:serve
Publish check:  cd packages/engine && bun publish --dry-run   (repeat per package)
Publish:        bun run publish:all                            (engine → components → ssr → jquery)
Deploy docs:    GitHub Actions workflow (push to main) or `vercel deploy docs/dist` (alternative)
```

## Project Structure

```
packages/
  engine/       @temples/engine      src: engine.ts, utilities/properties.ts (+ tests)
  components/   @temples/components  src: component.ts, reactive.ts (+ tests)
  ssr/          @temples/ssr         src: ssr.ts, utilities/dom-globals.ts (+ tests)
  jquery/       @temples/jquery      src: jquery.ts (+ tests)
  docs/         (private)            content/*.md, layout.html, style.css, build.ts, dist/ (built site)
example/        stays at root; imports updated to scoped package names
roadmap/        numbered tickets (spec, plan, todo)
.github/        workflows: docs deploy to GitHub Pages
```

Root `package.json` keeps the name `@temples` as a private workspace root (never published).

## Code Style

Follow `AGENTS.md`: Biome (tabs, double quotes, semicolons, no trailing commas), JSDoc on every
function, arrow functions, blank line before test/loop statements, Simplified Technical English
for all prose. Example:

```ts
/** Returns the pages manifest entry for a slug, or undefined. */
const findPage = (slug: string) => pages.find((page) => page.slug === slug);
```

## Testing Strategy

- `bun test` at the root discovers colocated `*.test.ts` in every workspace.
- `test/setup.ts` (root preload) installs DOM globals from linkedom for browser-API tests.
- The docs build gets a smoke test: building produces `docs/dist/index.html` and `docs/dist/llms.txt`.
- Publish metadata is verified with `bun publish --dry-run` (packs the tarball, no upload).

## Boundaries

- Always: run `bun run check` + `bun run typecheck` before declaring a task complete; keep the
  current reactive API documented (never the removed `this.data`/`update()` API); keep markdown
  parsing isolated in one module.
- Ask first: changing the public API surface of any package; adding a runtime dependency; changing
  the package names or scope; creating the npm org (human action).
- Never: publish for real without human confirmation (OTP required); commit `dist/` output;
  reintroduce the v0 name-based registry; import linkedom or jQuery from `@temples/engine`.

## Success Criteria

- All four packages build to `dist/` with valid `exports` maps and `.d.ts` files.
- `bun publish --dry-run` succeeds for all four packages with the correct file list.
- `bun run docs:build` produces a static site in `docs/dist/` with per-page HTML, assets, and `llms.txt`.
- The docs document the current reactive API and the `@temples/*` import paths.
- GitHub Actions workflow builds and deploys the docs to GitHub Pages.
- All packages versioned 1.0.0; CHANGELOG.md records the release.

## Out of Scope

- Interactive editable code examples (Storybook-like) — post-v1.
- Changesets or CI-driven npm publishing — manual `bun publish` for v1.
- Shadow DOM support.
- The remaining SSR `prepare()` `rehydrate` option (deferred T21 of the previous phase).

## Open Questions

- None. Resolved during the interview: the `temples` npm org was confirmed creatable by the user;
  the license is MIT (a LICENSE file must be added before the real publish — see RELEASE.md);
  `data-*` control attributes stay in the rendered docs HTML by decision of the user.
