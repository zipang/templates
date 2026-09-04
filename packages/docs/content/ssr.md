---
title: SSR and static site generation
description: Render Temples templates to HTML strings on the server with linkedom.
order: 4
---

# SSR and static site generation

The engine operates on a DOM. In the browser that is the native `document`; on the server there
is no DOM, so `@temples/ssr` wires the engine to
[linkedom](https://github.com/WebReflection/linkedom) — a fast DOM implementation — for parsing
and serialization on Bun, Node.js, and Deno.

## Install

```sh
bun add @temples/ssr
```

## Render a template on the server

Import the entry once, then use the `Renderer` exactly as in the browser:

```javascript
import "@temples/ssr";
import { Renderer } from "@temples/engine";

const renderer = new Renderer("<h1 data-bind='article.title'>Title</h1>");
renderer.render({ article: { title: "The Great Race" } });

console.log(renderer.renderToString()); // <h1>The Great Race</h1>
```

The main `@temples/engine` entry never imports linkedom, so browser bundles stay small.

## Static site generation

For SSG, render one page per data set and write the returned strings to files:

```javascript
import "@temples/ssr";
import { Renderer } from "@temples/engine";

const layout = new Renderer(fullPageMarkup);

for (const [slug, data] of Object.entries(pages)) {
    layout.render(data);
    await Bun.write(`dist/${slug}.html`, layout.renderToString());
}
```

## `prepare()` — reusable render functions

`prepare(source, options)` compiles a template into an async render function. Every call parses
fresh and renders independently, so partial data from one call never leaks into the next. The
default output strips the `data-*` control attributes when web components are rendered, and the
result is plain markup:

```javascript
import { prepare } from "@temples/ssr";

const render = await prepare("<p data-bind='message'>Hello</p>");

console.log(await render({ message: "Hello world" })); // <p>Hello world</p>
```

### Options

| Option | Default | Effect |
|--------|---------|--------|
| `removeDataBindings` | `true` | Strip every Temples trace from the output: all `data-*` control attributes, and every used component rendered to plain static markup. |
| `templesComponents` | `[]` | `TemplesComponent` classes used by the source (see below). |
| `rehydrate` | `false` | Reserved: include the component library so custom elements mount and activate in the browser. |

The data passed to each render call also seeds the components' global store: an attribute absent
from the markup resolves from the render data, and an explicit attribute on the tag wins.

### Full pages

`prepare` accepts a full HTML document (doctype, `<html>`, `<head>`, `<body>`) and returns the
complete document — this site is built exactly this way. The source must have a single root
element; multi-root sources throw.

```javascript
const renderPage = await prepare(layoutHtml);

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

const render = await prepare("<article-card></article-card>", {
    templesComponents: [ArticleCard],
});

const html = await render({ title: "Store title" });
// <h4>Store title</h4> ... plus the component's css in a <style> tag
```

Each call registers a fresh subclass of every component class — linkedom allows a class to be
defined only once per window, and every render parses into a fresh window. Component instances
are unwrapped to their children, and with the default options the output contains no
`data-*` control attributes and no custom tags: plain, static markup.

## Runtime requirements

`@temples/ssr` runs on Bun, Node.js (18+), and Deno. It installs the linkedom globals only for
the duration of each render and restores the previous values afterwards.
