# @temples/docs

The documentation site of the Temples packages — built **with Temples itself**.

## How it works

```
content/*.md  ──Bun.markdown──▶  HTML fragments
                                     │
layout.html  ──@temples/ssr prepare()─▶  dist/<slug>.html  +  dist/assets/style.css
content/*.md  ──raw copy─────────────▶  dist/<slug>.md  (plain-text counterpart)
                                     │
                                     └──▶  dist/llms.txt  (agent index, links the .md files)
```

- `content/*.md` — one file per page. The front-matter block carries `title`, `description`,
  and `order` (nav ordering). A page with `hidden: true` is built but stays out of the
  navigation and `llms.txt`.
- `content/404.md` — the 404 error page, kept out of the navigation by `hidden: true`.
- `layout.html` — a Temples template: the nav iterates `site.pages` (`data-iterate`), the page
  body is injected with `data-bind="html=page.content"`. The head declares the markdown export
  of the page with `<link rel="alternate" type="text/markdown">`, kept only while
  `data-render-if="page.markdownUrl"` is truthy — hidden pages carry an empty `markdownUrl`,
  so they emit no link.
- `src/markdown.ts` — the only module that touches `Bun.markdown` (an unstable Bun API), so a
  parser swap stays a one-file change.
- `src/build.ts` — the pipeline. `buildSite()` is exported for tests; the script runs it when
  executed directly. It copies every visible page as raw markdown next to its HTML file.
- `src/serve.ts` — serves `dist/` with a Bun file route for the root, and a `fetch` handler
  for every other path. When the path does not name a file in `dist/`, the handler serves
  `404.html` with status 404.

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
  links are relative. Pages also uses `dist/404.html` as its error page.
- **Vercel / Netlify / Cloudflare Pages** — create a project pointed at this repository with:
  - build command: `bun install && bun run docs:build`
  - output directory: `packages/docs/dist`
- **LLM agents** — the build emits `dist/llms.txt`, an index of every page with absolute links
  to its raw markdown (`<slug>.md`), so agents fetch plain text instead of HTML.
