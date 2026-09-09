---
title: Static site generation (SSR)
description: Render temples templates to HTML strings on the server with linkedom.
order: 4
---

# How to use @temples as a static site generator

The native HTML syntax of temples fits static site generation: plain HTML pages rendered with
data from external sources (like a collection of markdown files). The site you are reading is
generated this way. Its source lives in
[`packages/docs`](https://github.com/zipang/temples/tree/master/packages/docs).

## Install

```sh
bun add @temples/ssr
```

**Note:** The engine operates on a DOM. In the browser that is the native `document`. On the
server there is no DOM, so `@temples/ssr` (`ssr` stands for _Server Side Rendering_) wires the engine to
[linkedom](https://github.com/WebReflection/linkedom), a fast DOM implementation, for parsing
and serialization in server environments. linkedom is the only dependency of the package.

## Prepare a template

`prepare(source)` wires the engine to linkedom and returns an async render function:

```javascript
import { prepare } from "@temples/ssr";

const render = prepare("<h1 data-bind='article.title'>Title</h1>");

const html = await render({ article: { title: "The Great Race" } });
console.log(html); // <h1>The Great Race</h1>
```

Each render call installs the linkedom globals for its duration, renders, and restores the
previous globals after. The main `@temples/engine` entry never imports linkedom, so browser
bundles stay small.

## Static site generation

For SSG, prepare the layout once, render one page per data set, and write the returned
strings to files:

```javascript
import { prepare } from "@temples/ssr";

const layout = await Bun.file("layout.html").text();
const renderLayout = prepare(layout, { removeDataBindings: false });

for (const [slug, data] of Object.entries(pages)) {
    await Bun.write(`dist/${slug}.html`, await renderLayout(data));
}
```

This is exactly how the documentation site is built — the complete pipeline lives in
[`src/build.ts`](https://github.com/zipang/temples/tree/master/packages/docs/src/build.ts).

## `prepare()` — reusable render functions

`prepare(source, options)` compiles a template source into an async render function.
`prepare` itself is synchronous; the render call is the async boundary. Every call re-parses
the source and renders independently, so partial data from one call never leaks into the
next:

```javascript
import { prepare } from "@temples/ssr";

const render = prepare("<p data-bind='message'>Hello</p>");

console.log(await render({ message: "Hello world" })); // <p>Hello world</p>
```

The engine consumes the `data-*` control attributes during the render. Rendered components
add one more step: with the default options, each component tag is unwrapped to its children,
and the result is plain static markup.

### Options

| Option | Default | Effect |
|--------|---------|--------|
| `removeDataBindings` | `true` | Unwrap every rendered component to its children, so no custom tag remains in the output. The engine always consumes the `data-*` control attributes during the render. |
| `templesComponents` | `[]` | `TemplesComponent` classes used by the source (see below). |
| `rehydrate` | `false` | Reserved: include the component library so custom elements mount and activate in the browser. |

The data passed to each render call also seeds the components' global store: an attribute absent
from the markup resolves from the render data, and an explicit attribute on the tag wins.

### Full pages

`prepare` accepts a full HTML document (doctype, `<html>`, `<head>`, `<body>`) and returns the
complete document — this site is built exactly this way. The source must have a single root
element. Multi-root sources throw.

```javascript
const renderPage = prepare(layoutHtml);

const html = await renderPage({
    site: { pages: [{ title: "Home", url: "index.html" }] },
    page: { title: "My page", content: "<p>Hello</p>" },
});
```

## Server-side rendering of components

Pass the component classes through `templesComponents`, and each custom tag in the source renders
to its component markup. Every component's `css` is concatenated into one `<style>` tag in the
output, and the global store seeds attributes the markup does not set:

```javascript
import { prepare } from "@temples/ssr";
import { ArticleCard } from "./article-card.js";

const render = prepare("<article-card></article-card>", {
    templesComponents: [ArticleCard]
});

const html = await render({ title: "Store title" });
// <h4>Store title</h4> ... plus the component's css in a <style> tag
```

Each call registers a fresh subclass of every component class — linkedom allows a class to be
defined only once per window, and every render parses into a fresh window. Component instances
are unwrapped to their children, and with the default options the output contains no
`data-*` control attributes and no custom tags: plain, static markup.

## Runtime requirements

`@temples/ssr` is developed and tested on Bun, the runtime of this repository. The shipped
build also targets Node (`dist/ssr.js`), but Node.js and Deno are untested.

Each render call installs the linkedom globals only for its duration and restores the previous
values afterwards.
