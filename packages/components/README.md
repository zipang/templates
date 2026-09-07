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

Declare a component with `TemplesComponent.define()`. The class carries the state and the handler
methods. The define call carries the template, the attributes, and the event bindings:

```javascript
import { TemplesComponent } from "@temples/components";
import template from "./flipping-card.html" with { type: "text" };
import "./flipping-card.css";

export class FlippingCard extends TemplesComponent {
    constructor() {
        super({ flipped: false });
    }

    flip() {
        this.state.flipped = true; // reactive: mutation re-renders
    }

    onUpdated(event) {
        // event.detail carries the payload
    }
}

TemplesComponent.define("flipping-card", FlippingCard, {
    template,
    attributes: { title: "string", flipped: "boolean" },
    events: {
        "click .flip-btn": "flip",
        "shopping-item:updated": "onUpdated",
    },
});
```

### State and reactivity

- Each name in the `attributes` map is an observed attribute. It flows into `this.state`, coerced
  by its declared type (`"string" | "boolean" | "number" | "json"`).
- `this.state` is a deep reactive proxy: any mutation triggers a re-render of the component's
  bindings.
- Attributes on the tag are the single source of truth; the optional `globalStore` option seeds
  attributes that the tag does not set.
- In TypeScript, the class declares its complete state shape with the `TemplesComponent<T>`
  parameter. The compiler types every `state` access, and the initial `super({ ... })` literal is
  checked against the shape:

  ```typescript
  interface CardState {
      title: string;
      flipped: boolean;
  }

  export class FlippingCard extends TemplesComponent<CardState> {
      constructor() {
          super({ title: "", flipped: false });
      }
  }
  ```

### Events and messaging

- The `events` option maps bindings to handler method names. Handlers run with `this` bound to the
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
