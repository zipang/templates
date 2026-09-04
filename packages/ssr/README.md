# @temples/ssr

Server-side rendering (SSR) and static site generation (SSG) for the
[Temples](https://github.com/zipang/Temples) template engine. The entry wires the engine to
[linkedom](https://github.com/WebReflection/linkedom), so templates render to HTML strings on
Bun, Node.js, or Deno without a browser.

## Install

```sh
bun add @temples/ssr
```

This installs `@temples/engine` and `@temples/components` as dependencies.

## Usage

Import the entry once, then use the `Renderer` as in the browser:

```javascript
import "@temples/ssr";
import { Renderer } from "@temples/engine";

const renderer = new Renderer("<h1 data-bind='article.title'>Title</h1>");
renderer.render({ article: { title: "The Great Race" } });

console.log(renderer.renderToString()); // <h1>The Great Race</h1>
```

For static site generation, `renderToString()` is the serialization step: render every page
template with its data and write the returned strings to files.

## `prepare(source, options)` — reusable render functions

`prepare` compiles an HTML source into an async render function. Each call renders independently:

```javascript
import { prepare } from "@temples/ssr";

const render = await prepare("<p data-bind='message'>Hello</p>");
const html = await render({ message: "Hello world" });
```

Options:

| Option | Effect |
|--------|--------|
| `templesComponents` | Array of `TemplesComponent` classes used by the source. Each custom tag renders to its component markup, and each component's `css` is concatenated into one `<style>` tag. |
| `removeDataBinding` | Strip every Temples trace from the output: all `data-*` control attributes, and every used component rendered to plain static markup. |

The data passed to each render call also seeds the components' global store: an attribute absent
from the markup resolves from the render data, and an explicit attribute on the tag wins.

## Documentation

Full guides and API reference: https://zipang.github.io/Temples/

## License

MIT
