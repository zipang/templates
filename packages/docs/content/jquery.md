---
title: jQuery plugin
description: Render Temples data into jQuery collections.
order: 5
---

# jQuery plugin

For pages that already use jQuery, `@temples/jquery` exposes the engine as the `$.fn.temples`
method. The templates and the binding syntax are identical to the standalone engine — only the
entry point changes.

## Install

```sh
bun add @temples/jquery jquery
```

jQuery is a peer dependency: load it before importing the plugin. Importing the plugin without
jQuery throws a clear error.

## Usage

```javascript
import $ from "jquery";
import "@temples/jquery";

$(".list").temples({ items: ["Milk", "Bread"] }); // render data into each matched element
const renderer = $(".list").temples(); // get the prepared Renderer
```

- `$(selector).temples(data)` renders `data` into every matched element with the standard
  binding attributes.
- `$(selector).temples()` without arguments returns the prepared `Renderer`, for partial updates:

```javascript
const renderer = $(".list").temples();
renderer.update("status", "done");
```

The main `@temples/engine` entry never touches `$`; the plugin import is tree-shakeable.
