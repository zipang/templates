---
name: design-system-tokens
description: Read, update, and apply this project's Design System. Use when creating or styling any UI component, when changing the theme palette, or when touching DESIGN.md or src/styles/*.css. The Design System is a dual-file contract (DESIGN.md + theme.css) of fixed design tokens exposed as CSS variables.
---

# Design System Tokens

Adapted from [the-ai-lab/design-system-tokens](https://github.com/zipang/the-ai-lab/blob/master/recipes/the-designer/skills/design-system-tokens/SKILL.md) for this project's practical usage: pure CSS files, no Tailwind in `./src/`, Radix primitives re-exposed as our own styled UI library.

## Deliverables

| File | Role |
|---|---|
| `DESIGN.md` (root) | Design System foundation. YAML front matter with the token values chosen by the designer, plus prose rules to build every component. |
| `src/styles/theme.css` | Theme stylesheet. Every token defined as a CSS variable inside one `:root` block. |
| `src/styles/color-variants.css` | Derived `muted` / `active` variants for brand and action colors. Included after `theme.css`. |
| `src/styles/reset.css` | Base CSS reset consuming the theme variables. |
| `src/styles/components/*.css` | One stylesheet per re-exposed Radix component (`button.css`, `dialog.css`, ...). |

## Workflow

1. To change a token value: edit the value in **both** `DESIGN.md` front matter and `theme.css`. Keep them identical.
2. To add a component: read its section in `DESIGN.md`, create `src/styles/components/<name>.css`, use only theme tokens (`var(--…)`), never raw hex/hsl literals.
3. Component states (`hover`, `active`, `disabled`, `focus-visible`) must use the derived color variants from `color-variants.css` and the focus ring recipe from `DESIGN.md`.
4. Run `bun run check` after any CSS change (Biome lints CSS too).

## Token contract (summary)

The token list is **fixed**. Never add an undocumented token. The full normative tables live in the upstream skill; here is how we apply it:

- Families: `colors` (brand, action, text, surface), `typography` (base, display, mono families; scale xs→display; weights; line heights; letter spacing), `spacing`, `rounded`, `elevation`, `border`.
- Mapping rule: dotted path → dashed variable. `colors.text.base` → `--color-text` (drop `.base`). Optional tokens always defined in `theme.css` with a `var()` fallback to a required token.
- Link and border *colors* are not tokens. Components pick them from the palette.
- Derived variants are not tokens: they stay out of `DESIGN.md` front matter and are generated in `color-variants.css`.

## Validation rules

- Do not add any new undocumented token.
- `theme.css` must define every token from the contract.
- Never write a literal color inside `src/styles/components/*`; only `var()` references.
- The `muted` / `active` variant derivation:
  - muted: `hsl(from var(--X) h calc(s * 0.8) calc(l * 1.2))`
  - active: `hsl(from var(--X) h calc(s * 1.2) calc(l * 1.1))`
- When porting styles from `./prototype/`, replace Tailwind utility classes and shadcn variables (`--primary`, `--background`, ...) with our token names.

The concrete token values for this project live in `DESIGN.md` and `src/styles/theme.css`. This skill never duplicates them.
