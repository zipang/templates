# @temples/engine

The standalone, DOM-based templating engine of [Temples](https://github.com/zipang/Temples).
Templates are plain HTML decorated with a few `data-*` attributes. The engine renders structured
data into them and re-renders single paths for real-time partial updates.

## Install

```sh
bun add @temples/engine
```

Works in the browser out of the box. On the server (Bun, Node.js, Deno), pair it with
[`@temples/ssr`](../ssr) which wires the engine to a DOM.

## Usage

Build a `Renderer` from a DOM element or an HTML string, then render data into it:

```html
<div id="logged-user">
    <img data-bind="src=user.avatar" src="http://avatar.com/default.png" />
    <div data-bind="user.fullname" class="active">John DOE</div>
</div>
```

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

The constructor source is an element id (`"#id"`), a DOM element, or an HTML string. An id string
binds the existing page element in place, so every render writes into the live DOM. An unknown id
throws a clear error.

### Binding attributes

- `data-bind` — inline values: `data-bind="src=user.avatar, title=user.fullname"`. The shorthand
  (`data-bind="user.fullname"`) sets the text content of non-input elements and the value of form
  controls. The `class` attribute supports toggling a value in place:
  `data-bind="class[article|quote|tweet]=article.type"`.
- `data-iterate` — loops: `data-iterate="quote: article.quotes"`. The first child is the row
  sub-template. Rows are reconciled by key (`data-key` or item `id`), so list edits preserve DOM
  identity, focus, and scroll. `data-each` and the `from` keyword are accepted variants.
- `data-render-if` — presence conditional: `data-render-if="article.featured"`. A truthy
  condition keeps the element in the DOM; a falsy condition removes it and a placeholder
  comment holds its slot until the condition turns truthy again.
- `data-show-if` — visibility conditional, same polarity: a truthy condition shows the element,
  a falsy one hides it with `display:none`. The element stays in the DOM.
- `data-hide-if` — the inverse of `data-show-if`: a truthy condition hides. Handy when the data
  names the hiding state itself (`data-hide-if="article.hidden"`).
- Function values in the data are called and their return value is used as the condition.

### Partial updates

`render(data)` touches only the paths present in `data`. For a single value, `update(path, value)`
re-renders only the bindings bound to that exact path:

```javascript
renderer.update("user.status", "away");
```

### Serialization

`toHtml()` (and its synonym `renderToString()`) returns the serialized HTML of the rendered
template. This is the entry point for SSR and static site generation.

```javascript
const renderer = new Renderer("<h1 data-bind='article.title'>Title</h1>");
renderer.render({ article: { title: "The Great Race" } });
console.log(renderer.renderToString()); // <h1>The Great Race</h1>
```

## Documentation

Full guides and API reference: https://zipang.github.io/Temples/

## License

MIT
