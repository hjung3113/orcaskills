# Issue tracker: Local Markdown

Issues and specifications for this repository live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The feature specification is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Ticket numbers start at `01`; do not use one combined ticket file.
- Record ticket state near the top of each issue file as `Status: <state>`.
- Append discussion history under a `## Comments` heading.

## Publishing

When a skill publishes an issue or specification, create the appropriate file under `.scratch/<feature-slug>/`.

## Reading

When a skill refers to an issue, read the supplied local path or issue number from the relevant feature directory.
