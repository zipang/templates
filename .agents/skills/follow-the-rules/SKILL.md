---
name: follow-the-rules
description: Review some code to check conformance against the project's internal quality requirements and rules.
---

# Skill: follow-the-rules

Review some code changes against the **project rules** before it lands.
This skill does not restate the rules — it points at them. The rules are:

- `AGENTS.md` (root) — workflow and project context
- `src/AGENTS.md` — TypeScript: mandatory JSDoc, arrow functions only,
  interfaces for object params, naming (`Elt` suffix), non-obvious control-flow
  comments, no `any`, colocated tests
- `src/components/AGENTS.md` — components as APIs (`React.FC<Props>`),
  tier placement §0, stylesheet-last import, one test per source, non-trivial
  tests, design-token styling

## When to Use

- Before committing or merging any change (ask for review when asked to
  "review", "check rules", or before `/commit`)
- After any feature, refactor, rule-file change, or bug fix

## Proportionate Verification

Run only what the change can affect:

| Change | Verification |
|---|---|
| Docs only (`*.md`, comments) | Use the `technical-writing` skill and check the project's glossary for proposed updates |
| Config/tooling | Only the tools the config affects |
| Source code | Full gates: `bun test`, `bunx tsc --noEmit`, `bun run check` |

Never re-run a command that passed on unchanged files.

## The Review Pass

Walk the diff once per axis. Cite file:line for every finding.

1. **Rules compliance** — JSDoc present/exported and formal? Arrow-only?
   Interface for object params? Names obvious and consistent (`headerElt`)?
   Comments explain *why* only at non-obvious branches? Tests colocated,
   one-per-source, non-trivial?
2. **Component placement** — Does the tier match §0 of
   `src/components/AGENTS.md`? Product-named components never in `layout/`
   or `ui/`. Dependencies flow downward only.
3. **Design System** — No raw colors in component CSS; token `var()` only;
   stylesheet is the last import. **No raw text tags** (`h1`–`h6`, `p`)
   anywhere in pages or components — typography goes through `base/Heading`
   and `base/Text` exclusively; flag any direct HTML element used to build a
   page as a required fix.
4. **Efficiency** — No duplicated logic where a shared util exists
   (DRY); no over-memoization; no premature abstraction; no dead code left.
5. **Behavior** — Tests assert observable behavior that would catch a
   regression; build and suite green.

## Findings Format

Label each finding so the author knows what is required:

- *(no prefix)* — required fix before merge
- **Critical:** blocks merge (broken behavior, security)
- **Nit:** optional polish
- **FYI:** context only

Lead with correctness; a few high-conviction findings beat long lists.

## Verdict

End with exactly one of:
- **Approve** — commit may proceed
- **Request changes** — list what must change first
