# Blur text effect (no libraries)
 
Text fades in with a blur, word by word, and chosen words get a highlight.
Only needs React. Works in Next.js (App Router) and plain React.
 
## Setup (1 minute)
 
1. Copy `BlurText.tsx` and `blur-highlight.css` into the **same folder**, e.g. `components/`.
2. Use it in a page (see `page.tsx`):
```tsx
import BlurText, { BlurGroup } from "@/components/BlurText";
```
 
If your project has no `@/` alias, use a relative path instead, e.g. `../components/BlurText`.
 
## Two ways to use it
 
**One piece of text**
 
```tsx
<BlurText as="h1" text="Hello world" className="text-4xl" effect="zoom" />
```
 
**Existing content** (headings, paragraphs, spans, lists)
 
```tsx
<BlurGroup highlightedBits={["important", "words"]}>
  <h2>Title</h2>
  <p>Some important words here.</p>
</BlurGroup>
```
 
Anything you do NOT wrap stays completely normal.
 
## Handy options
 
| Option | What it does | Default |
|---|---|---|
| `effect` | `blur`, `zoom`, `tilt`, `focus`, `drift` | `blur` |
| `delay` | milliseconds between words | 200 (`BlurGroup`: 60) |
| `highlightColor` | highlight color | lime |
| `highlightedBits` | words to highlight, or `{ text, occurrence }` | none |
| `trigger` | `view`, `load`, `hover`, `click` | `view` |
 
Content shown on screen together starts together; the parts below start when you scroll to them.
 