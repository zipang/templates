# Spec: [T0003] Canonical `define()` API with the `attributes` option

## Objective

Make `TemplesComponent.define(tagName, componentClass, options)` the one documented way to
declare a component. A new `attributes` option replaces the `observedAttributes` and
`attributeTypes` static fields, so one call carries the full component configuration:

```javascript
TemplesComponent.define("flipping-card", FlippingCard, {
    template,
    attributes: { title: "string", hidden: "boolean" },
    events: { "click .flip-btn": "flip" },
});
```

- Each `attributes` key names an observed attribute. Each value is its coercion type.
- `define()` derives `observedAttributes` and `attributeTypes` on the class before registration.
- A class that declares its own `observedAttributes` or `attributeTypes` statics, and also
  passes `attributes`, makes `define()` throw. There is one source of truth, with no silent
  override.
- The documentation shows only this form. The static fields stay internal: the platform reads
  `observedAttributes` at registration, and SSR registers through the class-form overload.

**Users:** developers who build components with `@temples/components`.
**Why now:** two declaration forms coexist today. The class form splits the configuration
between static fields and options. One canonical form removes that choice.

## Tech Stack

- Bun (runtime, test runner), TypeScript (strict)
- Biome (format + lint)
- Test DOM from `test/setup.ts` (linkedom globals)
- No new dependencies

## Commands

```
Install:     bun install
Test:        bun test
Focus:       bun test packages/components
Check:       bun run check
Typecheck:   bun run typecheck
Docs build:  bun run docs:build
```

## Project Structure

Files touched by this ticket:

```
packages/components/src/component.ts        attributes option + guard + JSDoc
packages/components/src/component.test.ts   full migration to the canonical form + new tests
example/components/shopping-item/index.ts   attributes option replaces the statics
example/components/shopping-app/index.ts    attributes option replaces the statics
packages/components/README.md               canonical example only
packages/docs/content/components.md         DefineOptions table, canonical examples
packages/docs/content/api-reference.md      one signature, DefineOptions
```

## Public API

```typescript
export interface DefineOptions {
    /** The HTML template string, parsed once by `define()`. */
    template: string;
    /**
     * Declarative attribute map. Each key names an observed attribute that flows
     * into `state`. Each value is its `AttributeType` coercion.
     */
    attributes?: Record<string, AttributeType>;
    /** Optional declarative event map. */
    events?: EventMap;
    /** The component stylesheet, concatenated into the SSR output. */
    css?: string;
    /** The global data store shared by every component. */
    globalStore?: TemplesData;
}
```

Behavior:

- `define()` sets `ctor.attributeTypes = options.attributes` and
  `ctor.observedAttributes = Object.keys(options.attributes)` before `customElements.define()`.
  The platform reads `observedAttributes` at registration, so the derivation must run first.
- When `options.attributes` is set and the class owns an `observedAttributes` or
  `attributeTypes` property, `define()` throws:

  ```
  Component "<tag>" declares attributes on static fields and in define() options.
  Remove the static declaration and pass { attributes } to define().
  ```

- Detection uses `Object.hasOwn(ctor, ...)`, so the base-class defaults (`[]`, `{}`) never
  trigger the error. Only a subclass declaration does.
- The class-form overload `define(options?: { globalStore })` stays in code for SSR. The
  documentation drops it.

## Code Style

Follow `AGENTS.md`: Biome (tabs, double quotes), a JSDoc block on every function, arrow
functions, a blank line before test and loop statements, STE prose for comments and docs.
Example:

```typescript
/**
 * Derive the observed attributes and their coercion types from one map.
 *
 * @param ctor - The component class to configure.
 * @param attributes - The attribute map, name to type.
 */
const applyAttributes = (ctor: typeof TemplesComponent, attributes: Record<string, AttributeType>): void => {
	ctor.attributeTypes = attributes;
	ctor.observedAttributes = Object.keys(attributes);
};
```

## Testing Strategy

- `bun test packages/components` covers the derivation, the coercion of every type through the
  tag, the reactivity of derived attributes, and the guard error.
- The full suite (`bun test`) keeps the SSR and docs pipelines green.
- The example keeps its behavior. Check it after the migration.

## Boundaries

- Always: run the full gate (`bun run check`, `bun run typecheck`, `bun test`) before a task
  counts as done. Keep SSR green. Keep STE prose in comments and docs.
- Ask first: changing the guard semantics, renaming the `attributes` option, removing the
  class-form overload from code.
- Never: document the class-form overload or the attribute statics as public API. Show two
  declaration forms in any doc or example.

## Success Criteria

- `attributes` derives `observedAttributes` and `attributeTypes`. Derived attributes flow into
  `state` with coercion (`"string" | "boolean" | "number" | "json"`) and re-render on
  `attributeChangedCallback`.
- `define()` throws on a double definition, even when the values match.
- Every component test registers through the three-argument form.
- The example app declares no attribute statics.
- The docs show one declaration form and document `attributes`.
- `bun run check`, `bun run typecheck`, `bun test`, and `bun run docs:build` all pass.

## Out of Scope

- Removing the class-form overload from code (SSR registers through it).
- Guards for `events`, `css`, or `template` statics. They keep today's coexistence semantics:
  an option overrides the static when both are present.
- Shadow DOM, SSR behavior changes, new docs pages.

## Open Questions

- None. Resolved during the interview: the guard throws on any double definition. Specs and
  docs stay in English (STE).
