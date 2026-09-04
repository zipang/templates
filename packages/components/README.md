# @temples/components

Declarative Web Components built on the [Temples](https://github.com/zipang/Temples) template
engine. Inherit from `TemplesComponent` instead of `HTMLElement`, and the template, state, and
event wiring become declarative.

## Install

```sh
bun add @temples/components
```

`@temples/engine` is installed automatically as a dependency.

## Usage

Declare a component with static fields, then register it with `define()`:

```javascript
import { TemplesComponent } from "@temples/components";
import template from "./flipping-card.html" with { type: "text" };
import "./flipping-card.css";

export class FlippingCard extends TemplesComponent {
    static tag = "flipping-card";
    static template = template;
    static observedAttributes = ["title", "flipped"];
    static attributeTypes = { flipped: "boolean" };

    // DOM events ("type selector") and inter-component messages ("tag:message")
    static events = {
        "click .flip-btn": "flip",
        "shopping-item:updated": "onUpdated",
    };

    flip() {
        this.state.flipped = true; // reactive: mutation re-renders
    }

    onUpdated(event) {
        // event.detail carries the payload
    }
}

FlippingCard.define();
```

The same registration works in the explicit form:

```javascript
TemplesComponent.define("flipping-card", FlippingCard, { template });
```

### State and reactivity

- Observed attributes flow into `this.state`, coerced by `static attributeTypes`
  (`"string" | "boolean" | "number" | "json"`).
- `this.state` is a deep reactive proxy: any mutation triggers a re-render of the component's
  bindings.
- Attributes on the tag are the single source of truth; the optional `define({ globalStore })`
  seeds attributes that the tag does not set.

### Events and messaging

- `static events` maps bindings to handler method names. Handlers run with `this` bound to the
  component instance and receive the event.
- A binding with a space (`"click .flip-btn"`) is a delegated DOM event inside the component.
- A binding without a space (`"shopping-item:updated"`) is an inter-component message delivered
  over a shared bus. Send one with `this.emit("updated", detail)` — it is delivered as
  `"flipping-card:updated"` to any subscribed component.

### Styling

Components use the Light DOM. Scope the rules in the component stylesheet by the component's tag
name:

```css
flipping-card {
    display: inline-block;
}
```

## Documentation

Full guides and API reference: https://zipang.github.io/Temples/

## License

MIT
