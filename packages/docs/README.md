# @temples/docs

The documentation site of the Temples packages — built **with Temples itself**.

## How it works

```
content/*.md  ──Bun.markdown──▶  HTML fragments
                                     │
layout.html  ──@temples/ssr prepare()─▶  dist/<slug>.html  +  dist/assets/style.css
                                     │
                                     └──▶  dist/llms.txt  (agent index)
```

- `content/*.md` — one file per page. The front-matter block carries `title`, `description`,
  and `order` (nav ordering).
- `layout.html` — a Temples template: the nav iterates `site.pages` (`data-iterate`), the page
  body is injected with `data-bind="html=page.content"`.
- `src/markdown.ts` — the only module that touches `Bun.markdown` (an unstable Bun API), so a
  parser swap stays a one-file change.
- `src/build.ts` — the pipeline. `buildSite()` is exported for tests; the script runs it when
  executed directly.
- `src/serve.ts` — a static file server for `dist/`.

## Commands

```sh
bun run docs:build    # build the site into dist/
bun run docs:serve    # serve dist/ at http://localhost:4173
bun test              # the build has a smoke test (build.test.ts)
```

## Deployment

The site is a plain static output: any static host works, with `dist/` as the publish directory
and `bun install && bun run docs:build` as the build command.

- **GitHub Pages** — `.github/workflows/docs.yml` deploys on every push to `main`. Pages serves
  the site under a subpath (`/Temples/`), which the build supports because all asset and page
  links are relative.
- **Vercel / Netlify / Cloudflare Pages** — create a project pointed at this repository with:
  - build command: `bun install && bun run docs:build`
  - output directory: `packages/docs/dist`
- **LLM agents** — the build emits `dist/llms.txt`, an index of every page with absolute URLs.
