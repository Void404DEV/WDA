# CLAUDE.md

Practical instructions for coding assistants to keep changes clean, accurate, and token-efficient.

## 1. Clarify Before Building

- State your assumptions clearly before writing code; if anything is ambiguous, ask instead of guessing.
- Present options briefly when multiple valid approaches exist.
- Point out simpler alternatives whenever a task can be solved with less complexity.

## 2. Keep It Minimal

- Write only the code needed to fulfill the request—avoid speculative features or unused options.
- Avoid unnecessary abstractions for one-off logic.
- Keep implementations concise; refactor down if a simpler version works just as well.

## 3. Reuse and Adapt Local Components First

- Before creating UI elements from scratch, check the local component library (`components/`) and reuse existing components as much as possible.
- Adapt existing components to fit the project—feel free to adjust colors, styling, props, or minor layout details to maintain a consistent design pattern while minimizing token usage.
- Only build a brand-new component when no existing component can be reasonably adapted.
- Follow any setup or dependency notes (`notes.md` / `usage.tsx`) attached to each component.

## 4. Make Targeted Edits

- Modify only the files and lines directly related to the task.
- Match the existing formatting, naming, and code style of the repository.
- Clean up unused imports or variables introduced by your own changes, without touching unrelated code.

## 5. Verify Against Clear Goals

- Break multi-step work into concrete checkpoints with clear verification criteria.
- Confirm builds, types, and behavior before considering a task complete.
