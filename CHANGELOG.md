# Changelog

## 1.0.0 — 2026-09-04

First public release. The repository is now a Bun workspace monorepo publishing four packages:

| Package | Description |
|---------|-------------|
| [`@temples/engine`](packages/engine) | The standalone DOM-based `Renderer`: `data-bind` / `data-iterate` / `data-render-if` / `data-show-if` / `data-hide-if`, partial real-time updates, serialization. |
| [`@temples/components`](packages/components) | The `TemplesComponent` base class for declarative Web Components with reactive state. |
| [`@temples/ssr`](packages/ssr) | Server-side rendering and static site generation, wired to linkedom. |
| [`@temples/jquery`](packages/jquery) | The `$.fn.temples(data)` jQuery plugin (jQuery is a peer dependency). |

### Added

- Workspace layout: `packages/engine`, `packages/components`, `packages/ssr`, `packages/jquery`,
  with inter-package dependencies on `@temples/engine`.
- `@temples/components/reactive` subpath export for direct use of the reactive proxy.
- Documentation site (`packages/docs`) built with temples itself: markdown sources rendered
  through `@temples/ssr` into a static site, deployable to GitHub Pages, Vercel, Netlify, or
  Cloudflare Pages. Ships an `llms.txt` agent index.
- GitHub Actions workflow deploying the docs to GitHub Pages.

### Changed

- Package identity: the previously un-publishable `@temples` root name becomes four scoped
  packages; imports move from `temples/*` to `@temples/*` subpaths.
- `linkedom` is now a runtime dependency of `@temples/ssr` (previously a devDependency of the
  single package).
- `jquery` is declared as a peer dependency of `@temples/jquery`.
- The root `@temples` package stays private and is never published.

### Removed

- The stale committed `dist/` output at the repository root; every package now builds into its
  own gitignored `dist/`.
- The stray `typescript` peer dependency.

### Migration from the previous 0.9.0 layout

- `import { Renderer } from "temples"` → `import { Renderer } from "@temples/engine"`.
- `import { TemplesComponent } from "temples/components"` → `import { TemplesComponent } from "@temples/components"`.
- `import "temples/ssr"` → `import "@temples/ssr"`.
- `import "temples/jquery"` → `import "@temples/jquery"`.
- Component state is the reactive `this.state` proxy; the `this.data` + `update(path, value)`
  component API of 0.9.0-era docs is gone. `Renderer#update(path, value)` remains the way to
  patch one path on a standalone renderer.
