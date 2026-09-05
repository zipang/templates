---
title: Getting started
description: Install the Temples packages and render your first template in five minutes.
order: 1
---

# Getting started

Temples renders data into plain HTML. A template is a normal HTML fragment decorated with a few
`data-*` attributes. Nothing else: no framework, no build step, no non-HTML syntax.

## Install

Pick the packages you need. All of them depend on `@temples/engine`.

| Package | Install | Use it for |
|---------|---------|------------|
| `@temples/engine` | `bun add @temples/engine` | Direct rendering in the browser. |
| `@temples/components` | `bun add @temples/components` | Declarative Web Components. |
| `@temples/ssr` | `bun add @temples/ssr` | Server-side rendering and static site generation. |
| `@temples/jquery` | `bun add @temples/jquery jquery` | jQuery pages (jQuery is a peer dependency). |

## Your first template

Write the markup you would write anyway, with sample content inside. Add one `data-bind`
attribute per bound element:

```html
<div id="logged-user">
    <img data-bind="src=user.avatar" src="http://avatar.com/default.png" />
    <div data-bind="user.fullname" class="active">John DOE</div>
</div>
```

The sample content stays visible before any data arrives — designers work on real pages, and the
bindings never break their markup.

Build a `Renderer` from the template and render a data dictionary into it. The source is an
element id, a DOM element, or an HTML string:

```javascript
import { Renderer } from "@temples/engine";

const renderer = new Renderer("#logged-user");

renderer.render({
    user: {
        avatar: "http://avatar.com/johndoe",
        fullname: "John DOE",
    },
});
```

A string starting with `#` names an element already in the page: the renderer binds it in place,
so every render writes into the live DOM. An unknown id throws a clear error. The other forms
bind a detached element or a freshly parsed fragment:

```javascript
const fromElement = new Renderer(document.getElementById("logged-user"));
const fromString = new Renderer("<h1 data-bind='article.title'>Title</h1>");
```

The binding paths (`user.avatar`, `user.fullname`) resolve against the data dictionary you pass.
See [Data-binding syntax](binding-syntax.html) for the complete reference.

## Partial updates

`render(data)` touches only the paths present in the data. Absent paths keep their current state.
To change one value in real time, `update(path, value)` re-renders only the bindings bound to
that exact path:

```javascript
renderer.update("user.fullname", "Jane DOE");
```

This is what makes Temples suitable for live updates: a websocket message that carries one value
re-renders one binding, not the page.

## Serialize to HTML

`toHtml()` (or its synonym `renderToString()`) returns the rendered HTML as a string. On the
server, pair the engine with `@temples/ssr`:

```javascript
import "@temples/ssr";
import { Renderer } from "@temples/engine";

const renderer = new Renderer("<h1 data-bind='article.title'>Title</h1>");
renderer.render({ article: { title: "The Great Race" } });

console.log(renderer.renderToString()); // <h1>The Great Race</h1>
```

See [SSR and static site generation](ssr.html) for `prepare()`, full-page rendering, and
component rendering.

## Next steps

- [Data-binding syntax](binding-syntax.html) — `data-bind`, `data-iterate`, and the conditional
  bindings.
- [Components](components.html) — declarative Web Components with reactive state.
- [API reference](api-reference.html) — every public class, method, and type.
