# AGENTS.md

## Read the README first

Most directories contain a `README.md`. It describes the content of the directory and the
conventions that apply inside it. Read it before you change anything in that directory.
Some directories have no README. In that case, work from the root `README.md` and this file.
If a change alters how a directory works, update its README in the same change.
A directory can also carry an `AGENTS.md` with rules for automated agent workflows. It is optional.

## Agent Skills

This project encodes the engineering workflow in agent skills. They live in `.agents/skills/`,
and agents load them on demand. Skills are workflows, not suggestions: follow the steps in
order, and do not skip their verification steps.

One task can use several skills, one after the other. Example:
`spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` →
`test-driven-development` → `follow-the-rules`.

### Skill routing

When a task arrives, identify its phase and load the matching skills:

| Phase | Skill | Use when |
|-------|-------|----------|
| Define | `interview-me` | The goal is unclear, and no plan, spec, or code exists |
| Define | `idea-refine` | A rough concept needs stress-testing or expansion |
| Define | `spec-driven-development` | A new project, feature, or change has no spec |
| Plan | `planning-and-task-breakdown` | A spec exists and needs small, verifiable tasks |
| Build | `incremental-implementation` | You start implementation work; deliver thin vertical slices |
| Build | `api-and-interface-design` | The work touches module boundaries or public interfaces |
| Build | `source-driven-development` | The work must follow official documentation |
| Build | `doubt-driven-development` | Stakes are high, or the code is unfamiliar |
| Build | `context-engineering` | Agent output quality degrades, or context needs setup |
| Build | `typescript-best-practices` | You write or modify TypeScript |
| Tooling | `use-bun` | Any JS/TS task: use Bun, not Node.js tooling |
| Verify | `test-driven-development` | You implement logic, fix a bug, or change behavior |
| Verify | `agent-browser` | You test or debug real web pages and components |
| Review | `follow-the-rules` | You review code against the project quality rules |
| Review | `code-simplification` | Code works, but its complexity grows |
| Write | `technical-writing` | You write or review technical prose |

When in doubt, start with a spec: use `spec-driven-development`.
Not every task needs every skill. A bug fix may only need `test-driven-development` → `follow-the-rules`.

### Operating behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.
The right column lists the failure mode that each behavior avoids.

| Do | Do not |
|----|--------|
| Surface assumptions before non-trivial work and give the human a chance to correct them. | Fill ambiguous requirements silently, or build without a spec because "it is obvious". |
| Manage confusion actively. STOP, name the confusion, present the tradeoff, wait for resolution. | Plow ahead when lost, or hide inconsistencies you notice. |
| Object when warranted, with concrete downsides and alternatives. | Be a yes-machine, or hide tradeoffs on non-obvious decisions. |
| Enforce simplicity. Prefer the boring, obvious solution. | Overcomplicate code and APIs. |
| Maintain scope discipline. Touch only what you are asked to touch. | Modify code or comments unrelated to the task, or remove things you do not fully understand. |
| Verify, do not assume. A task is done only when evidence passes. | Skip verification because "it looks right". |

## Boundaries

- Never commit secrets, keys, or `.env` files.
- Never edit generated output by hand: `packages/*/dist/` and `packages/docs/www/`. Rebuild it instead.
- Do not add a dependency without checking its effect on the bundle size (`bun run build:report`).

## Technical writing

All technical prose follows the `technical-writing` skill (Simplified Technical English).
It applies to README files, AGENTS files, skill instructions, JSDoc and code comments,
pull-request descriptions, commit messages, and error messages.
Text inside code (identifiers, shell commands, markup) stays verbatim.

## Browser testing

Use the `agent-browser` skill to test and debug real web pages and web components.
Its `SKILL.md` is a discovery stub. Run `agent-browser skills get core` to load the full workflow.

## Bun tooling

Default to Bun, not Node.js. The `use-bun` skill holds the authoritative guidance
(script usage, APIs, testing, and frontend HTML imports). Load it for every JS/TS task.

## Code style: linting and formatting

This project uses [Biome](https://biomejs.dev/) for formatting and linting.
[`.editorconfig`](.editorconfig) declares the formatting rules (minimal, editor-agnostic).
[`biome.jsonc`](biome.jsonc) enforces them.

### Style requirements

Check these rules in every code review:

- Declare a JSDoc block for every function.
- Define functions as arrow functions: `const fn = () => {}`. Do not use the `function` keyword.
- Always leave a blank line before a test statement or a loop statement. This shows the branching points.

### Commands

All commands in this table run from the repository root:

| Command | Description |
|---------|-------------|
| `bun test` | Run the test suite of every package |
| `bun run check` | Run formatter + linter (reports violations, no changes) |
| `bun run format` | Format all files in place (writes changes) |
| `bun run lint` | Run linter only |
| `bun run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `bun run build:report` | Print the size report of the built assets (raw and gzip). Use `--summary` for a per-package table |

### Completion gate

Before you declare any task complete:

- Run `bun run check` and `bun run typecheck`. Both must pass with zero errors.
- Write conformant code from the start. Do not defer to code review.
