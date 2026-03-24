# DrinkWater Agent Guide

## Purpose

This document guides AI agents working in this repository.  
Primary goals: KISS, small components/functions, readable code, and clear folder ownership.

## Folder Architecture

- `src/app/`
  - Route-level screens only.
  - Keep screen files thin: orchestration + layout.
  - Avoid embedding domain calculations directly in route files.

- `src/features/water/`
  - Water feature implementation and business logic.
  - `domain/`: pure functions, formatters, aggregations, no UI/no side effects.
  - `hooks/`: screen/view models, data derivation, async orchestration.
  - `components/`: feature-specific UI pieces (if not globally reusable).

- `src/components/`
  - Shared reusable UI components only (generic across features/screens).
  - If a component is feature-specific, move to `src/features/<feature>/components`.

- `src/lib/`
  - Integration/infrastructure adapters (storage, notifications, platform IO).
  - Prefer pure helper extraction inside lib modules for testability/readability.
  - Function names must signal side effects (`loadAndSync*`, `save*`, `sync*`).

- `src/i18n/`
  - Translation and locale setup.
  - No business logic in locale files.

- `src/constants/`, `src/hooks/`
  - Global constants and generic app-wide hooks.
  - Keep focused and reusable.

## Clean Code Rules

## KISS

- Choose simple control flow over clever abstractions.
- Prefer explicit branching with clear names over compact nested ternaries.
- Keep data transformations near domain helpers, not JSX.

## Small Components

- Aim for screen components to mostly compose subcomponents/hooks.
- Extract repeated sections into dedicated presentational components.
- Avoid components that manage unrelated concerns (UI + domain + persistence together).

## Small Functions

- One function, one responsibility.
- Extract pure helpers when:
  - function exceeds easy scan length,
  - branch count grows,
  - same intent appears multiple times.
- Prefer descriptive names over comments.

## Human Readability

- Use consistent naming:
  - side-effecting functions: verbs (`save`, `sync`, `cancel`, `schedule`)
  - pure formatters/selectors: intent names (`format*`, `group*`, `build*`, `pick*`)
- Avoid boolean/state explosions; model state with small discriminated unions where useful.
- Keep nesting shallow; return early.

## Folder Ownership Rules

- New water-domain logic goes to `src/features/water/domain`.
- New history/settings view-model logic goes to `src/features/water/hooks`.
- Shared UI primitives stay in `src/components`.
- Do not introduce feature logic into `src/components` or route files when avoidable.

## Change Checklist (before finishing)

- Is the change KISS and easy to explain in 2-3 sentences?
- Did any function/component become too large? If yes, split.
- Did you place code in the correct folder by ownership?
- Are side effects explicit in function names?
- Did you run lint on changed files/project?
