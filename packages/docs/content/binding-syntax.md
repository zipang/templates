---
title: Data-binding syntax
description: The complete reference of data-bind, data-iterate, data-render-if, data-show-if, and data-hide-if.
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

The `class` attribute is a space-separated list, so temples toggles one value in place instead of
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

Without an explicit variable name, temples derives one from the path by dropping a trailing
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

When the collection changes, temples reconciles: unchanged rows keep their DOM element, removed
rows are deleted, new rows are inserted, and rows are moved to match the new order. Input focus,
scroll position, and animations survive a re-render.

## Conditionals — `data-render-if`, `data-show-if`, `data-hide-if`

All three conditions share the polarity: a **truthy** value means *render* or *show*. The
difference is the mechanism.

`data-render-if` controls the **presence** of the element. A truthy condition keeps it in the
DOM; a falsy condition removes it and a comment placeholder holds its slot, so the element
comes back at its exact former place when the condition turns truthy again:

```html
<div class="icon" data-render-if="article.featured">
    <img src="featured.png" />
</div>
```

`data-show-if` controls the **visibility** of the element, with the same polarity. A truthy
condition clears the inline `display`; a falsy condition hides the element with
`display:none`. The element always stays in the DOM:

```html
<div class="icon" data-show-if="article.popular">
    <img src="popular.png" />
</div>
```

`data-hide-if` is the inverse of `data-show-if`: a truthy condition hides. Use it when the
data names the hiding state itself:

```html
<div class="icon" data-hide-if="article.hidden">
    <img src="regular.png" />
</div>
```

The condition may be a function in the data (see the top of this page).

## Combining bindings

An element can carry several binding attributes at once:

```html
<li data-iterate="item: cart.items" data-bind="item.label">
    <span data-show-if="item.available" data-bind="item.price">0.00</span>
</li>
```

A condition on the loop container itself is evaluated against the data outside the loop. To
test a property of each item, put the condition on an inner element, as above: it is then
evaluated once per item.
