---
title: Components
description: Declarative Web Components with reactive state and event wiring.
order: 3
---

# Components

`@temples/components` turns the engine into a Web Component system. Inherit from
`TemplesComponent` instead of `HTMLElement`, declare a few static fields, and the component
renders its template, reacts to state changes, and wires its events — with no framework.

## Install

```sh
bun add @temples/components
```

`@temples/engine` comes as a dependency.

## Declare a component

With Bun, import the template and the stylesheet directly:

```javascript
// flipping-card.js
import { TemplesComponent } from "@temples/components";
import template from "./flipping-card.html" with { type: "text" };
import "./flipping-card.css";

export class FlippingCard extends TemplesComponent {
    static tag = "flipping-card";
    static template = template;
    static css = "flipping-card { display: inline-block; }";
    static observedAttributes = ["title", "flipped"];
    static attributeTypes = { flipped: "boolean" };

    static events = {
        "click .flip-btn": "flip",
    };

    flip() {
        this.state.flipped = true;
    }
}

FlippingCard.define();
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

The registration also accepts an explicit form, useful when one module registers several
components:

```javascript
TemplesComponent.define("flipping-card", FlippingCard, { template, css });
```

### Static fields

| Field | Role |
|-------|------|
| `tag` | The custom element name (must contain a hyphen). |
| `template` | The HTML template string. Parsed once per class; every instance clones it. |
| `css` | Optional stylesheet text, injected when the component is used in SSR (see below). |
| `events` | The event bindings map (see below). |
| `observedAttributes` | Plain attribute names that flow into `state`. |
| `attributeTypes` | Optional coercion per attribute: `"string"`, `"boolean"`, `"number"`, or `"json"`. |

## State: attributes are the source of truth

A component's data lives in `this.state`, a deep reactive proxy built on connection:

- Each attribute in `observedAttributes` is read from the tag, coerced through
  `attributeTypes`, and written into `state`.
- Changing an attribute (`card.setAttribute("flipped", "true")`) updates `state` and re-renders.
- Mutating `state` (`this.state.flipped = true`) re-renders the component's bindings.
- An optional shared store seeds the attributes the tag does not set:
  `FlippingCard.define({ globalStore: { title: "Default" } })`. An explicit attribute on the tag
  always wins over the store.

State mutation drives rendering: there is no separate `render()` call to remember.

## Events and messaging

`static events` maps bindings to handler method names. Handlers run with `this` bound to the
component instance and receive the event, so they can call `preventDefault()`, read
`event.target.value`, and call other component methods directly.

A binding **with a space** is a DOM event: `"<eventType> <selector>"`. One shared document
listener per event type serves every component; the selector is matched inside the component's
subtree.

```javascript
static events = {
    "submit .add-form": "onAdd",
    "click .flip-btn": "flip",
};

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
static events = {
    "shopping-item:updated": "onUpdated",
    "shopping-item:removed": "onRemoved",
};

onUpdated(event) {
    // event.detail carries the payload
}
```

The tag prefix keeps same-named messages from different component classes apart. The class
`events` map is registered on connection and unsubscribed on disconnection; `this.on(map)` adds
runtime bindings the same way.

## Styling

Components use the Light DOM — no Shadow DOM. Styles reach the component through the page's
global styles or through the `css` static field. Scope every rule by the component tag name:

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
| `connectedCallback` | Clones the template into the component, seeds `state` from attributes and the global store, registers the `events` map, renders. |
| `disconnectedCallback` | Unsubscribes events and the state subscription. |
| `attributeChangedCallback` | Coerces the attribute into `state` and re-renders. |

## Components on the server

`@temples/ssr` can render component tags to their markup for static output. See
[SSR and static site generation](ssr.html).
