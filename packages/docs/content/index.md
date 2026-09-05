---
title: Temples documentation
description: Declarative HTML templates rendered by a DOM-based engine, in the browser and on the server.
order: 0
---

# Temples

`Temples` (templ*at*es that you won't hate) is a templating system for HTML.

- Templates are **plain HTML** decorated with a few `data-bind` attributes — your IDE and your
  designers recognize everything.
- The engine is **DOM-based and declarative**, with real-time partial updates of single values.
- The same templates render **in the browser and on the server** (SSR and static site generation).
- Components are **Web Components** without a framework: inherit from `TemplesComponent`, declare
  static fields, and the template, state, and events wire themselves.

This documentation site is itself built with Temples: the markdown sources in
`packages/docs/content/` are rendered through the layout by `@temples/ssr`. Every page you read
here is dogfood.

## Packages

| Package | Description |
|---------|-------------|
| [`@temples/engine`](getting-started.html) | The standalone `Renderer` for direct use in the browser. |
| [`@temples/components`](components.html) | Declarative Web Components with reactive state. |
| [`@temples/ssr`](ssr.html) | Server-side rendering and static site generation. |
| [`@temples/jquery`](jquery.html) | The jQuery plugin for existing jQuery pages. |

## Where to start

- [Getting started](getting-started.html) — install the engine and render your first template.
- [Data-binding syntax](binding-syntax.html) — the full reference of `data-bind`,
  `data-iterate`, and the conditional bindings.
- [API reference](api-reference.html) — every public class, method, and type.

## For AI coding agents

An [`llms.txt`](https://zipang.github.io/Temples/llms.txt) index of this site is generated at
build time. Point your agent at it, or read the markdown sources directly in
`packages/docs/content/`.
