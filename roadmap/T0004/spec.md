# Spec: [T0004] Typed component state through `TemplesComponent<T>`

## Objective

Make the component state fully typed for component authors. `TemplesComponent` becomes generic
over the state shape: `TemplesComponent<T>`. A subclass declares its state type on the
`extends` clause, passes its initial literal to `super({ ... })`, and reads and writes
`this.state` with full type safety — no `Record<string, unknown>` widening, no casts:

```typescript
export class ShoppingItem extends TemplesComponent<ShoppingItemData> {
	constructor() {
		super({ id: "", label: "", checked: false });
	}

	private snapshot(): ShoppingItemData {
		return { id: this.state.id, label: this.state.label, checked: this.state.checked };
	}
}
```

- `T` describes the **complete** state shape: the observed attributes plus every internal
  value. The author declares it once, on the `extends` clause.
- The base class keeps the default `T = Record<string, unknown>`, so plain (untyped) components
  and every internal reference keep working unchanged.
- A new exported boundary type, `TemplesComponentClass`, describes any `TemplesComponent`
  subclass constructor regardless of its state type. `define()` and the SSR signatures use it,
  which fixes the `TS2419` incompatibility that descoped the first generic attempt (T0003).

**Users:** developers who build components with `@temples/components`, starting with the
example app, which becomes the DX proof.
**Why now:** T0003 descoped the generic and left casts in the example
(`this.state.items as ShoppingItemData[]`). Those casts are the visible debt.

## Tech Stack

- Bun (runtime, test runner), TypeScript (strict)
- Biome (format + lint)
- Test DOM from `test/setup.ts` (linkedom globals)
- No new dependencies, no runtime changes — this ticket is type-level only

## Commands

```
Install:     bun install
Test:        bun test
Focus:       bun test packages/components
Check:       bun run check
Typecheck:   bun run typecheck
Docs build:  bun run build:docs
```

## Project Structure

Files touched by this ticket:

```
packages/components/src/component.ts        generic class + TemplesComponentClass boundary
packages/components/src/component.test.ts   type-level tests (@ts-expect-error) + typed classes
packages/ssr/src/ssr.ts                     boundary signatures (PrepareOptions, helpers)
packages/ssr/src/ssr.test.ts                typed test classes
example/components/shopping-item/index.ts   typed state, zero casts
example/components/shopping-app/index.ts    typed state, zero casts
example/components/shopping-vault/index.ts  typed state, zero casts
packages/components/README.md               typed example
packages/docs/content/components.md         typed examples, State section
packages/docs/content/api-reference.md      T parameter, TemplesComponentClass row
```

## Public API

The class gains one type parameter. The state contract from T0003 (constructor initialization,
non-writable property) is unchanged at runtime:

```typescript
export class TemplesComponent<T = Record<string, unknown>> extends HTMLElement {
	/** The reactive state, initialized through `super({ ... })`. */
	declare readonly state: T;

	/** The platform instantiates with no arguments, hence the default. */
	constructor(state: T = {} as T);
}
```

The new boundary type describes any subclass constructor, whatever its state type:

```typescript
export interface TemplesComponentClass {
	tag: string;
	template: string;
	css: string;
	events: EventMap;
	observedAttributes: string[];
	attributeTypes: Record<string, AttributeType>;
	globalStore?: TemplesData;
	new (...args: never[]): HTMLElement;
}
```

- `define()` takes the boundary type: `static define(tagName: string, componentClass:
  TemplesComponentClass, options: DefineOptions): void`. The class-form overload
  `define(options?: { globalStore })` keeps its signature.
- The `never[]` parameter list accepts every subclass constructor, because `never` is
  assignable to any constructor parameter type. This is what makes
  `TemplesComponent.define("x", SomeSubclass, options)` compile again.
- The construct signature returns `HTMLElement`, not `TemplesComponent<...>`. Comparing a
  concrete instance's typed state against `Record<string, unknown>` would reject author-declared
  interfaces (`ShoppingItemData` has no implicit index signature). No boundary consumer reads
  instance state, so `HTMLElement` is the honest view.
- `T` stays **unconstrained**. A constraint such as `T extends Record<string, unknown>` is
  checked at the `extends` clause and would reject interface-typed state the same way.

Author state types:

- The author declares the state shape with an `interface` **or** a `type` alias. Both work on
  the `extends` clause, in the `super()` literal, and on every `state` access. The example
  keeps its existing `interface ShoppingItemData`.
- The TypeScript limitation behind the two boundary choices above: TypeScript grants an
  implicit index signature to type aliases and anonymous object types only, never to
  interfaces (interfaces stay open to declaration merging). An interface is therefore not
  assignable to `Record<string, unknown>`. Constraining `T`, or letting the boundary construct
  signature return a state-carrying type, would surface that limitation at author call sites
  and break interfaces. The proposed design never compares author state against
  `Record<string, unknown>`.

Internal implementation details (not author-facing):

- `connectedCallback` and `attributeChangedCallback` write dynamic attribute names into the
  state, so they recast internally: `(this.state as Record<string, unknown>)[name] = ...`.
- `rerender` recasts the state to the engine data type: `render(this.state as TemplesData)`.
- `EventHandler`, `MessageSubscription`, and the private helpers keep today's non-generic
  signatures. Component authors write real methods, never `EventHandler` values, so handlers
  need no generic.

Behavior:

- No runtime behavior changes. The `defineProperty` state lock, the attribute seeding, the
  reactivity, the event bus, and SSR output are byte-identical. All existing tests pass
  untouched, except for class declarations that gain their type argument.

## Code Style

Follow `AGENTS.md`: Biome (tabs, double quotes), a JSDoc block on every function, arrow
functions, a blank line before test and loop statements, STE prose for comments and docs.
Example:

```typescript
/**
 * Type a component's complete state shape.
 *
 * @template T - The state shape: observed attributes plus internal values.
 */
export class TemplesComponent<T = Record<string, unknown>> extends HTMLElement {
	declare readonly state: T;
}
```

## Testing Strategy

- Type-level behavior is proven in `component.test.ts` with `@ts-expect-error` assertions:
  a wrong-shape literal in `super({ wrong: true })` is a compile error, and a wrong-type
  assignment `this.state.count = "text"` is a compile error. `bun run typecheck` turns an
  unused `@ts-expect-error` into a failure, which makes the type contract testable in TDD.
- Runtime tests stay unchanged: the T0003 state-contract tests (constructor seeding, rendering,
  reactive mutations, attribute coercion through the tag) must pass as-is.
- SSR tests keep their behavior; their class declarations gain type arguments or the boundary
  type.
- The full gate (`bun run check`, `bun run typecheck`, `bun test`, `bun run build:docs`) gates
  every task.

## Boundaries

- Always: run the full gate before a task counts as done. Keep every runtime test untouched and
  green. Keep STE prose in comments and docs.
- Ask first: constraining `T`, renaming `TemplesComponentClass`, making `EventHandler` generic,
  changing the default type argument.
- Never: change runtime semantics in this ticket. Use `any` for the boundary type. Document an
  author-facing workaround (cast, `type` alias requirement) instead of fixing the design.

## Success Criteria

- `this.state` is fully typed in the example app. A search for state casts in
  `example/components/` (`as ShoppingItemData`, `as ShoppingItemData[]`) returns nothing.
- A wrong-shape `super({ ... })` literal and a wrong-type state assignment are compile errors,
  proven by `@ts-expect-error` tests.
- `define()` accepts a concrete subclass of any state type, and the SSR pipeline
  (`PrepareOptions.templesComponents`) accepts a heterogeneous list of component classes.
- `TemplesComponentClass` is exported and documented.
- Every runtime test passes unchanged, and the full gate passes:
  `bun run check && bun run typecheck && bun test && bun run build:docs`.

## Out of Scope

- Inferring `T` from the `attributes` map of `define()`. `define()` stays state-agnostic.
- Generic `EventHandler`, typed `emit` payloads, and typed message routing.
- Any runtime change: no new options, no behavior change, no dependency.
- Generic `Renderer`/engine typing (`TemplesData` stays the engine's data type).

## Open Questions

- None. Resolved during the interview: `T` is the complete state shape declared on the
  `extends` clause; the constructor accepts the typed initial literal; the ticket covers the
  core types, the SSR boundary, the example migration, and the docs.
