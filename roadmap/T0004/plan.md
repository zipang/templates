# Implementation Plan: [T0004] Typed component state through `TemplesComponent<T>`

Spec: `roadmap/T0004/spec.md`.

## Overview

`TemplesComponent` becomes generic over the state shape. Authors declare `T` on the `extends`
clause and read and write `this.state` with full type safety. A new exported
`TemplesComponentClass` boundary type keeps `define()` and the SSR signatures compatible with
every subclass, whatever its state type. The runtime stays untouched: the ticket is type-level
only, and the example app becomes the DX proof with zero casts.

## Architecture Decisions

- `T` is the complete state shape (attributes plus internal values), declared on the
  `extends` clause. The constructor accepts the typed initial literal: `constructor(state:
  T = {} as T)`. The default keeps untyped components and every internal reference working.
- `T` is unconstrained. A constraint (`T extends Record<string, unknown>`) is checked at the
  `extends` clause and rejects author-declared interfaces, which lack implicit index signatures
  (`ShoppingItemData` in `example/types.ts` is an interface). Both `interface` and `type`
  author declarations work in the proposed design, because no author-facing code path compares
  the author state against `Record<string, unknown>`.
- `TemplesComponentClass` describes the constructor object: the mutable statics plus
  `new (...args: never[]): HTMLElement`. `never[]` accepts every subclass constructor
  parameter list (the assignability fix), and the `HTMLElement` return avoids comparing typed
  instance state against `Record<string, unknown>`. No boundary consumer reads instance state.
- `define()` and the private statics (`assertNoStaticAttributes`, `registerEventTypes`,
  `resolveTemplate`) take `TemplesComponentClass`. `customElements.define(ctor.tag, ctor)` may
  need one internal cast to `CustomElementConstructor` if the `never[]` signature is not
  accepted directly.
- Dynamic state writes inside the class recast internally:
  `connectedCallback`/`attributeChangedCallback` use
  `(this.state as Record<string, unknown>)[name]`, and `rerender` casts the state to
  `TemplesData` for the engine. These are library-internal, never author-facing.
- `EventHandler` stays non-generic: authors write real class methods, never `EventHandler`
  values.

## Task List

The Task List section is the markdown TODO list — one checkbox per task:

### Phase 1: Core types

- [ ] **Task 1: Generic `TemplesComponent<T>` + type-level tests**
  - Acceptance: the class, `state`, and the constructor are generic. `@ts-expect-error` tests
    prove that a wrong-shape `super({ wrong: true })` literal and a wrong-type
    `this.state.count = "text"` assignment are compile errors (write them first, TDD). Existing
    runtime tests pass unchanged.
  - Verify: `bun run typecheck && bun test packages/components`
  - Files: `packages/components/src/component.ts`,
    `packages/components/src/component.test.ts`
  - Depends: None

- [ ] **Task 2: `TemplesComponentClass` boundary + `define()` compatibility**
  - Acceptance: the interface is exported and documents the statics plus the
    `new (...args: never[]): HTMLElement` signature. `define()` and the private statics take
    the boundary type. A test proves `define()` accepts a concrete typed subclass, and
    `typecheck` proves `ssr.test.ts` compiles against it.
  - Verify: `bun run typecheck && bun test packages/components`
  - Files: `packages/components/src/component.ts`,
    `packages/components/src/component.test.ts`
  - Depends: Task 1

### Checkpoint: Core types

- [ ] `bun run typecheck` passes with the example still on its temporary casts
- [ ] `bun test packages/components` passes unchanged

### Phase 2: Consumers

- [ ] **Task 3: SSR boundary + typed SSR test classes**
  - Acceptance: `PrepareOptions.templesComponents`, `componentStyles`, and
    `unwrapComponents` use the boundary type. The SSR test classes gain type arguments where
    they carry state. SSR output stays identical.
  - Verify: `bun test packages/ssr`
  - Files: `packages/ssr/src/ssr.ts`, `packages/ssr/src/ssr.test.ts`
  - Depends: Task 2

- [ ] **Task 4: Example migration — the DX proof**
  - Acceptance: the three components declare `T` (`ShoppingItemData`, the app state with
    `isEmpty()`, the vault state) and pass typed literals to `super()`. No state cast remains:
    `snapshot()` returns `ShoppingItemData` without a cast, list mutations are typed. The
    example keeps its behavior.
  - Verify: `bun test` plus a manual check of `bun run dev`
  - Files: `example/components/shopping-item/index.ts`,
    `example/components/shopping-app/index.ts`, `example/components/shopping-vault/index.ts`
  - Depends: Tasks 2, 3

### Checkpoint: Consumers

- [ ] `rg "as ShoppingItemData" example/components/` returns nothing
- [ ] Example works in the browser

### Phase 3: Docs and gate

- [ ] **Task 5: Typed docs**
  - Acceptance: `README.md`, `components.md`, and `api-reference.md` show the typed
    declaration (`extends TemplesComponent<T>`), and the api-reference documents the `T`
    parameter and the `TemplesComponentClass` interface. No doc shows a state cast.
  - Verify: `bun run build:docs`, then read the built pages
  - Files: `packages/components/README.md`, `packages/docs/content/components.md`,
    `packages/docs/content/api-reference.md`
  - Depends: Task 4

- [ ] **Task 6: Full verification**
  - Acceptance: the full gate passes. Every docs snippet matches the implementation. The spec
    and the plan stay accurate.
  - Verify: `bun run check && bun run typecheck && bun test && bun run build:docs`
  - Files: none expected
  - Depends: Tasks 1–5

### Checkpoint: Complete

- [ ] All acceptance criteria met
- [ ] Ticket committed, ready for implementation

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Interface-typed state rejected by an implicit-index-signature check | High | `T` stays unconstrained; the boundary construct signature returns `HTMLElement`, never a state-carrying type |
| `TS2419` returns at the SSR call sites (the first attempt failed there) | High | `TemplesComponentClass` with `new (...args: never[])` is the assignability fix; Task 2 typechecks `ssr.test.ts` before the SSR task |
| `customElements.define` rejects the `never[]` construct signature | Low | One documented internal cast to `CustomElementConstructor`, inside the library |
| `{} as T` default hides a missing initial state | Low | Identical to today's behavior (the platform constructs with no args); the T0003 tests already cover the empty-state path |
| Docs drift from the real API | Medium | Cross-check every snippet against `component.ts` and the `@ts-expect-error` tests |

## Open Questions

- None.
