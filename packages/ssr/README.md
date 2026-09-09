# @temples/ssr

Server-side rendering (SSR) and static site generation (SSG) for the
[temples](https://github.com/zipang/temples) template engine. `prepare` wires the engine to
[linkedom](https://github.com/WebReflection/linkedom), so templates render to HTML strings on
the server, without a browser. The package is developed and tested on Bun. The shipped build
also targets Node, but Node.js and Deno are untested.

## Install

```sh
bun add @temples/ssr
```

This installs `@temples/engine` and `@temples/components` as dependencies.

## Usage

`prepare(source)` returns an async render function:

```javascript
import { prepare } from "@temples/ssr";

const render = prepare("<h1 data-bind='article.title'>Title</h1>");

const html = await render({ article: { title: "The Great Race" } });
console.log(html); // <h1>The Great Race</h1>
```

For static site generation, prepare the layout once, render every page template with its data,
and write the returned strings to files.

## `prepare(source, options)` — reusable render functions

`prepare` compiles an HTML source into an async render function. `prepare` itself is
synchronous; the render call is the async boundary. Each call renders independently:

```javascript
import { prepare } from "@temples/ssr";

const render = prepare("<p data-bind='message'>Hello</p>");

const html = await render({ message: "Hello world" });
```

Options:

| Option | Default | Effect |
|--------|---------|--------|
| `removeDataBindings` | `true` | Unwrap every rendered component to its children, so no custom tag remains in the output. The engine always consumes the `data-*` control attributes during the render. |
| `templesComponents` | `[]` | `TemplesComponent` classes used by the source. Each custom tag renders to its component markup, and each component's `css` is concatenated into one `<style>` tag. |
| `rehydrate` | `false` | Reserved: include the component library so custom elements mount and activate in the browser. |

The data passed to each render call also seeds the components' global store: an attribute absent
from the markup resolves from the render data, and an explicit attribute on the tag wins.

## Documentation

Full guides and API reference: https://zipang.github.io/temples/

## License

MIT
