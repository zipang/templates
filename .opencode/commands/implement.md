---
description: Implement a change or Ticket in thin vertical slices
---
Invoke the `incremental-implementation` skill for: "$ARGUMENTS"

Before implementing, resolve the Ticket context:

1. If `$ARGUMENTS` contains a Ticket ID (`T\d{4}`), use `roadmap/TXXXX/`.
   Otherwise, if it names a feature, match it against the Ticket titles in
   `roadmap/TXXXX/spec.md` and `roadmap/TXXXX/plan.md`. If no Ticket matches
   and the change is not ticket-worthy, proceed without one.
2. Load the Ticket's `spec.md` and `plan.md` as context, then implement its
   tasks in order, checking off the plan's task list as tasks complete.

Build in thin vertical slices — implement one piece, test it, verify it, then expand. Keep the system working at every step.
