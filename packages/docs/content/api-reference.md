---
title: API reference
description: Every public class, method, and type of the @temples packages.
order: 6
---

# API reference

## `@temples/engine`

### `Renderer`

The standalone rendering engine. One instance renders one template.

```javascript
new Renderer(source: Element | string)
```

The source is a DOM element, an element id (`"#id"`), or an HTML string. An id string binds the
existing page element in place, so every render writes into the live DOM; an unknown id throws.
An HTML string is parsed once into a container. The caller owns the instance — there is no
registry and nothing to destroy; release the renderer by dropping the reference.

| Member | Returns | Description |
|--------|---------|-------------|
| `render(data)` | `Element` | Renders the paths present in `data` into the template. Absent paths keep their state. Returns the template root element for insertion, cloning, or serialization. |
| `update(path, value)` | `Element` | Sets one dotted path (e.g. `"user.status"`) and re-renders only the bindings bound to that exact path. |
| `toHtml()` | `string` | Serialized HTML of the rendered template. |
| `renderToString()` | `string` | Synonym of `toHtml()`. |

### Types

```typescript
interface TemplesData {
    [key: string]: TemplesDataValue;
}

type TemplesDataValue =
    | string
    | number
    | boolean
    | null
    | ((this: TemplesData) => RenderValue)
    | TemplesData
    | TemplesDataValue[];
```

Function values are called with their parent object as `this`; the return value is used as the
bound value. See [Data-binding syntax](binding-syntax.html) for the attribute reference.

## `@temples/components`

### `TemplesComponent`

Base class for declarative Web Components. Inherit from it instead of `HTMLElement`.

**Static fields**

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `string` | The custom element tag name (must contain a hyphen). |
| `template` | `string` | The HTML template string, parsed once per class. |
| `css` | `string` | Optional stylesheet text, used by SSR output. |
| `events` | `EventMap` | Declarative bindings: `"<eventType> <selector>"` for DOM events, `"<tag>:<message>"` for inter-component messages. Values are handler method names. |
| `observedAttributes` | `string[]` | Plain attribute names that flow into `state`. |
| `attributeTypes` | `Record<string, AttributeType>` | Coercion per attribute. |

**Static methods**

```typescript
TemplesComponent.define(options?: { globalStore?: TemplesData }): void;
TemplesComponent.define(tagName: string, componentClass: typeof TemplesComponent, options: DefineOptions): void;
```

The first form registers the subclass itself from its static fields. The second registers an
explicit tag and class with `{ template, events?, css?, globalStore? }`. Both parse the template
once, register the event types, and call `customElements.define()`.

**Instance members**

| Member | Description |
|--------|-------------|
| `state` | The reactive state object: attributes coerced by `attributeTypes`, plus any internal values. Any mutation re-renders. |
| `emit(name, detail?)` | Emits an inter-component message, delivered as `"<tag>:<name>"` on the shared bus. |
| `on(events)` | Merges additional bindings at runtime, same map format as `static events`. |

**Types**

```typescript
type AttributeType = "boolean" | "number" | "json" | "string";

type EventMap = Record<string, string>;

type EventHandler = (this: TemplesComponent, event: Event) => void;
```

### `@temples/components/reactive`

The reactive primitive, exported separately for direct use:

| Member | Description |
|--------|-------------|
| `reactive(target)` | Wraps an object in a deep proxy. Mutations of any nested property or array element notify subscribers. |
| `subscribe(target, listener)` | Attaches a listener to a reactive proxy. Returns an unsubscribe function. |

## `@temples/ssr`

### `prepare(source, options?)`

Compiles an HTML source (fragment or full document, single root required) into an async render
function:

```typescript
const render: (data: TemplesData) => Promise<string> = await prepare(source, {
    removeDataBindings?: boolean;   // default true
    templesComponents?: (typeof TemplesComponent)[];
    rehydrate?: boolean;            // reserved
});
```

Every call parses fresh and renders independently. See
[SSR and static site generation](ssr.html) for behavior and examples.

## `@temples/jquery`

Importing the entry registers the plugin:

| Expression | Effect |
|------------|--------|
| `$(selector).temples(data)` | Renders `data` into every matched element. |
| `$(selector).temples()` | Returns the prepared `Renderer`. |

jQuery is a peer dependency (>= 3). Importing the plugin without jQuery throws a clear error.
