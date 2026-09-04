---
title: Data-binding syntax
description: The complete reference of data-bind, data-iterate, and data-render-if.
order: 2
---

# Data-binding syntax

Every binding path resolves against the data dictionary passed to `render(data)`. Paths use dot
notation: `article.author.name`. A path may point at a value or at a function — function values
are called with the parent object as `this`, and their return value is used:

```javascript
{
    article: {
        comments: [],
        popular() {
            return this.comments.length > 20;
        },
    },
}
```

## `data-bind` — inline values

The attribute holds one or more bindings, separated by commas. A binding has the form
`[target=]path`:

```html
<img
    data-bind="src=user.avatar, title=user.fullname"
    src="http://avatar.com/default.png"
    title="Sample user"
/>
<div data-bind="user.fullname">John DOE</div>
<input type="text" data-bind="value=user.name" />
```

### Targets

| Target | Effect |
|--------|--------|
| `text=` | Sets the text content. |
| `html=` | Sets the inner HTML. Only use it with trusted data. |
| `value=` | Sets the `value` property (form controls) or attribute (other elements). |
| `<attr>=` | Sets any attribute: `src=`, `href=`, `title=`, `class=`, ... |
| *(shorthand)* | No target: the default depends on the element (see below). |

### Shorthand defaults

The shorthand `data-bind="user.fullname"` picks its target from the element:

- Form controls (`input`, `textarea`, `select`) bind the **value**.
- Every other element binds the **text content**.

So these pairs are equivalent:

```html
<div data-bind="html=user.fullname">John DOE</div>
<div data-bind="user.fullname">John DOE</div>

<input data-bind="value=user.name" />
<input data-bind="user.name" />
```

For a `<select>`, the shorthand marks the matching `<option>` as selected.

### Boolean attributes

Attributes such as `checked`, `disabled`, and `hidden` are set through the DOM property, so the
value `false` removes the attribute instead of writing the string `"false"`.

### The `class` target

The `class` attribute is a space-separated list, so Temples toggles one value in place instead of
replacing the list. Declare the candidates inside brackets:

```html
<div class="row container" data-bind="class[article|quote|tweet]=article.type">...</div>
```

If `article.type` is `"quote"`, the element gets `class="row container quote"`. All other classes
(`row`, `container`) are preserved.

### Clearing values

When a bound path resolves to `null` or `undefined`, the binding clears: text becomes empty,
attributes are removed, and form controls are emptied.

## `data-iterate` — loops

`data-iterate` renders a collection: the first child of the element is the row sub-template, and
one clone is created per item. The item is bound under a variable name:

```html
<ul data-iterate="tag: article.tags">
    <li><a data-bind="tag.label, href=tag.url">peace</a></li>
</ul>
```

Syntax variants — all equivalent:

```html
<div data-iterate="article.quotes">...</div>
<div data-iterate="quote: article.quotes">...</div>
<div data-iterate="quote from article.quotes">...</div>
<div data-each="quote from article.quotes">...</div>
```

Without an explicit variable name, Temples derives one from the path by dropping a trailing
`-s`: `article.tags` iterates as `tag`, and `status` stays `status` (no trailing `s` to drop).

Inside a row, the iteration variable is merged into the data, so bindings resolve
`tag.label` first and fall back to the outer data.

### Keyed reconciliation

Rows are tracked by a key. Declare it with a `data-key` attribute on the row sub-template, or
rely on an `id` property in the items:

```html
<ul data-iterate="item: todo.items">
    <li data-key="item.id" data-bind="item.label">Buy milk</li>
</ul>
```

When the collection changes, Temples reconciles: unchanged rows keep their DOM element, removed
rows are deleted, new rows are inserted, and rows are moved to match the new order. Input focus,
scroll position, and animations survive a re-render.

## `data-render-if` — conditionals

The element renders only when the condition is truthy:

```html
<div class="icon" data-render-if="article.featured">
    <img src="featured.png" />
</div>

<div class="icon" data-render-if="article.popular">
    <img src="popular.png" />
</div>
```

When the condition turns falsy, the element hides; when it turns truthy again, the element
shows. The condition may be a function in the data (see the top of this page). The hiding uses
the element's `display` style, so an element authored `display: none` is restored correctly.

## Combining bindings

An element can carry several binding attributes at once:

```html
<li
    data-iterate="item: cart.items"
    data-render-if="item.available"
    data-bind="item.label"
>
    <span data-bind="item.price">0.00</span>
</li>
```
