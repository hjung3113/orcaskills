---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the active discipline: challenge terms, invent edge-case scenarios, and write the glossary and decisions down when they crystallise.

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives.

Create files lazily: create `CONTEXT.md` only when the first term is resolved, and `docs/adr/` only when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with existing `CONTEXT.md` language, call it out immediately.

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term.

### Discuss concrete scenarios

Stress-test domain relationships with concrete edge cases that force precise boundaries.

### Cross-reference with code

Check whether user statements agree with the code. Surface contradictions and ask which is right.

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` immediately using [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md). Keep it free of implementation details.

### Offer ADRs sparingly

Offer an ADR only when the decision is hard to reverse, surprising without context, and the result of a real trade-off. Use [ADR-FORMAT.md](./ADR-FORMAT.md).
