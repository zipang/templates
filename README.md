# Temples: Declarative HTML Templates

![Temples logo](assets/temples-logo.png)

`Temples` (templ*at*es that you won't hate) is a templating system for HTML. Templates are plain
HTML blocks decorated with a few `data-bind` attributes — no non-HTML syntax, no framework. The
same templates render in the browser and on the server.

This repository is a Bun workspace monorepo. It is a rewriting of the original
[Temples v0](https://github.com/zipang/Temples/tree/v0) template system, with jQuery replaced by a
standard, DOM-based engine.

## Packages

| Package | Description |
|---------|-------------|
| [`@temples/engine`](packages/engine) | The standalone `Renderer`: `data-bind` / `data-iterate` / `data-render-if` / `data-show-if` / `data-hide-if`, partial real-time updates, serialization. |
| [`@temples/components`](packages/components) | The `TemplesComponent` base class for declarative Web Components with reactive state. |
| [`@temples/ssr`](packages/ssr) | Server-side rendering and static site generation, wired to linkedom. |
| [`@temples/jquery`](packages/jquery) | The `$.fn.temples(data)` jQuery plugin (jQuery is a peer dependency). |

## Documentation

The documentation site is built in [`packages/docs`](packages/docs) — with Temples itself. It
deploys as a static site to <https://zipang.github.io/Temples/>, and ships an `llms.txt` for AI
coding agents.

## Development

```sh
bun install            # install all workspaces
bun test               # run every package's tests
bun run check          # Biome format + lint
bun run typecheck      # tsc --noEmit
bun run build          # build all packages (engine first)
bun run dev            # serve the example app
bun run docs:build     # build the documentation site
```

## Repository layout

```
packages/
  engine/       @temples/engine
  components/   @temples/components
  ssr/          @temples/ssr
  jquery/       @temples/jquery
  docs/         documentation site (private, built with Temples)
example/        shopping-list demo app
tasks/          spec, plan, and task list
```

## License

MIT
