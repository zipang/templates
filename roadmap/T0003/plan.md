# Implementation Plan: [T0003] Canonical `define()` API with the `attributes` option

Spec: `roadmap/T0003/spec.md`.

## Overview

`TemplesComponent.define(tagName, componentClass, options)` becomes the only documented way to
declare a component. The new `attributes` option derives the `observedAttributes` and
`attributeTypes` statics, which become internal implementation details. A guard rejects a double
definition. The tests, the example app, and the docs move to the canonical form.

## Architecture Decisions

- `attributes?: Record<string, AttributeType>` on `DefineOptions`. Keys are the observed
  attribute names, values are the coercion types. One map replaces two statics.
- `define()` derives the statics before `customElements.define()`. The platform reads
  `observedAttributes` at registration, so the assignment must run first.
- The guard uses `Object.hasOwn(ctor, ...)`. Inherited base-class defaults (`[]`, `{}`) never
  trigger the error, a subclass declaration does. Any double definition throws, even when the
  values match.
- The class-form overload stays in code. SSR registers through it. The docs drop it.
- Docs replace the static-fields table with a `DefineOptions` table and show one declaration
  form. The class keeps only `state` and handler methods in every example.

## Task List

The Task List section is the markdown TODO list — one checkbox per task:

### Phase 1: API

- [ ] **Task 1: `attributes` option + guard in `define()`**
  - Acceptance: `DefineOptions` carries `attributes`. `define()` derives
    `observedAttributes`/`attributeTypes` and throws on a double definition. Tests cover the
    derivation, the coercion of every `AttributeType` through the tag, and the guard error.
    Write the tests first (TDD).
  - Verify: `bun test packages/components`
  - Files: `packages/components/src/component.ts`, `packages/components/src/component.test.ts`
  - Depends: None

- [ ] **Task 2: Migrate the component tests to the canonical form**
  - Acceptance: every test registers through the three-argument form. Classes keep `state` and
    handlers only. The `events`-override compatibility test stays as the single static-events
    case. No test class declares `observedAttributes` or `attributeTypes`.
  - Verify: `bun test packages/components`
  - Files: `packages/components/src/component.test.ts`
  - Depends: Task 1

### Checkpoint: API

- [ ] `bun test packages/components` passes
- [ ] `bun run check` and `bun run typecheck` pass

### Phase 2: Consumers

- [ ] **Task 3: Migrate the example app**
  - Acceptance: `shopping-item` and `shopping-app` declare no attribute statics. `define()`
    receives `attributes: { ... }`. The list keeps its behavior.
  - Verify: `bun test` plus a manual check of `bun run dev`
  - Files: `example/components/shopping-item/index.ts`, `example/components/shopping-app/index.ts`
  - Depends: Task 1

- [ ] **Task 4: Rewrite the component docs**
  - Acceptance: `README.md`, `components.md`, and `api-reference.md` show the three-argument
    form only. The "Static fields" tables become a `DefineOptions` table with `attributes`. The
    State, Lifecycle, and API-reference sections name the `attributes` map. No doc mentions the
    class-form overload or the attribute statics.
  - Verify: `bun run docs:build`, then read the built pages
  - Files: `packages/components/README.md`, `packages/docs/content/components.md`,
    `packages/docs/content/api-reference.md`
  - Depends: Task 1

### Checkpoint: Consumers

- [ ] Example works in the browser
- [ ] Docs build and show one declaration form

### Phase 3: Gate

- [ ] **Task 5: Full verification + commit preparation**
  - Acceptance: the full gate passes. Every docs snippet matches the implementation. The spec
    and the plan stay accurate.
  - Verify: `bun run check && bun run typecheck && bun test && bun run docs:build`
  - Files: none expected
  - Depends: Tasks 2, 3, 4

### Checkpoint: Complete

- [ ] All acceptance criteria met
- [ ] Ticket committed, ready for implementation

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Guard fires on classes that never declared the statics | High | `Object.hasOwn` sees own properties only. Test the inherited-default case |
| Test migration misses a static-dependent behavior | Medium | Full `bun test` after each task |
| Docs drift from the real API | Medium | Cross-check every snippet against `component.ts` and the tests |
| SSR breaks once the statics become internal | Medium | SSR keeps the class form and its statics. SSR tests run in the full gate |

## Open Questions

- None.
