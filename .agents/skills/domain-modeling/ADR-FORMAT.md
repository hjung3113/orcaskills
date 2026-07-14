# ADR Format

ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc. Create the directory lazily.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

Optional sections are appropriate only when they add genuine value: status frontmatter, considered options, and consequences.

Offer an ADR only when the decision is hard to reverse, surprising without context, and the result of a real trade-off.
