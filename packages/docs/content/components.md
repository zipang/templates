---
title: Components
description: Declarative Web Components with reactive state and event wiring.
order: 3
---

# Components

`@temples/components` turns the engine into a Web Component system. 

## Install

```sh
bun add @temples/components
```

`@temples/engine` comes as a dependency.

## Declare a component

Import `TemplesComponent`, write a class that extends it, and register the pair with
`TemplesComponent.define()`. The class carries the state and the handler methods. The define call
carries the template, the attributes, and the event bindings. The component then renders its
template, reacts to state changes, and wires its events — with no framework.

**Note:** with Bun, import the template as text and import the stylesheet directly:

```javascript
// flipping-card.js
import { TemplesComponent } from "@temples/components";
import template from "./flipping-card.html" with { type: "text" };
import "./flipping-card.css";

export class FlippingCard extends TemplesComponent {
    constructor() {
        super({ flipped: false });
    }

    flip() {
        this.state.flipped = true;
    }
}

TemplesComponent.define("flipping-card", FlippingCard, {
    template,
    attributes: { title: "string", flipped: "boolean" },
    events: {
        "click .flip-btn": "flip",
    },
});
```

```html
<!-- flipping-card.html -->
<div class="card-inner">
    <h3 data-bind="title">A title</h3>
    <button class="flip-btn" type="button">Flip</button>
</div>
```

```html
<!-- usage -->
<flipping-card title="Hello World" flipped="false"></flipping-card>
```

### Define options

| Option | Role |
|--------|------|
| `template` | The HTML template string. Parsed once per class. Every instance clones it. |
| `attributes` | The observed attributes map. Each key names an attribute that flows into `state`. Each value is its coercion type: `"string"`, `"boolean"`, `"number"`, or `"json"`. |
| `events` | The event bindings map (see below). |
| `css` | Optional stylesheet text, injected when the component is used in SSR (see below). |
| `globalStore` | Optional shared store that seeds the attributes the tag does not set. |

The `attributes` map derives the class `observedAttributes` and `attributeTypes` statics, which
stay internal. A class that passes `attributes` and also declares those statics makes `define()`
throw.

## State: attributes are the source of truth

A component's data lives in `this.state`. The subclass passes its initial values to `super()`,
and the state becomes a deep reactive proxy at construction:

- Each name in the `attributes` map is read from the tag, coerced by its declared type, and
  written into `state`.
- Changing an attribute (`card.setAttribute("flipped", "true")`) updates `state` and re-renders.
- Mutating `state` (`this.state.flipped = true`) re-renders the component's bindings.

In TypeScript, the class declares its complete state shape with the `TemplesComponent<T>`
parameter — the observed attributes plus every internal value. The initial `super({ ... })`
literal and every `state` access are then checked:

```typescript
type FlippingCardState = {
    title: string;
    flipped: boolean;
};

export class FlippingCard extends TemplesComponent<FlippingCardState> {
    constructor() {
        super({ title: "", flipped: false });
    }
}
```

An `interface` or a `type` alias both work as the state shape. Message payloads stay `unknown`
at the bus boundary; narrow them with a type guard before use.
- The optional `globalStore` option seeds the attributes the tag does not set:
  `globalStore: { title: "Default" }` in the define call. An explicit attribute on the tag
  always wins over the store.

State mutation drives rendering: there is no separate `render()` call to remember.

## Events and messaging

The `events` option maps bindings to handler method names. Handlers run with `this` bound to the
component instance and receive the event, so they can call `preventDefault()`, read
`event.target.value`, and call other component methods directly.

A binding **with a space** is a DOM event: `"<eventType> <selector>"`. One shared document
listener per event type serves every component; the selector is matched inside the component's
subtree.

```javascript
events: {
    "submit .add-form": "onAdd",
    "click .flip-btn": "flip",
},

onAdd(event) {
    event.preventDefault();
    // read event.target.value, mutate this.state, ...
}
```

A binding **without a space** is an inter-component message: `"<tag>:<name>"`. Messages travel on
a shared bus, so any component can talk to any other, regardless of DOM position:

```javascript
// shopping-item.js
this.emit("updated", { id: 1, label: "Milk" }); // delivered as "shopping-item:updated"

// shopping-app.js
events: {
    "shopping-item:updated": "onUpdated",
    "shopping-item:removed": "onRemoved",
},

onUpdated(event) {
    // event.detail carries the payload
}
```

The tag prefix keeps same-named messages from different component classes apart. The `events` map
is registered on connection and unsubscribed on disconnection; `this.on(map)` adds runtime
bindings the same way.

## Styling

Components use the Light DOM — no Shadow DOM. Styles reach the component through the page's
global styles or through the `css` option. Scope every rule by the component tag name:

```css
flipping-card {
    perspective: 1000px;
}

flipping-card[flipped="true"] .card-inner {
    transform: rotateY(180deg);
}
```

Light DOM keeps the component themeable with the page's CSS variables; tag-name scoping keeps
rules from leaking.

## Lifecycle

`TemplesComponent` implements the standard custom element lifecycle:

| Hook | Behavior |
|------|----------|
| `connectedCallback` | Clones the template into the component, seeds `state` from the attributes and the global store, registers the `events` map, renders. |
| `disconnectedCallback` | Unsubscribes events and the state subscription. |
| `attributeChangedCallback` | Coerces the attribute into `state` and re-renders. |

## Components on the server

`@temples/ssr` can render component tags to their markup for static output. See
[SSR and static site generation](ssr.html).
