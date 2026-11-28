import BlurText, { BlurGroup } from "@/components/BlurText";

// Normal Next.js server page. No "use client" needed here:
// BlurText.tsx already has it.
//
// How it's split:
//   <BlurText>   -> one piece of text, with its own settings (effect, delay, colors...)
//   <BlurGroup>  -> wrap content you already have; only tell it WHICH words to highlight
//   Anything outside <BlurGroup> / <BlurText> is left completely normal.

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <BlurText
        text="Isn't this so cool?!"
        effect="blur"
        animateBy="words"
        direction="top"
        staggerFrom="start"
        trigger="view"
        delay={200}
        stepDuration={0.35}
        blur={10}
        distance={50}
        className="text-2xl mb-8"
        loop={false}
        loopDelay={2}
        focusOnHover
      />
            {/* Normal text: no effect */}
      <p className="mt-4 opacity-60">This paragraph stays normal.</p>

      {/* Your existing content: wrap it, pick the words to highlight */}
      <section className="mt-24">
        <BlurGroup highlightedBits={["simple", "highlight"]}>
          <h2 className="text-3xl font-semibold">How it works</h2>
          <p className="mt-4 text-lg">
            Wrap any text, and it fades in with a <strong>simple</strong> blur.
            Pick words to highlight.
          </p>
        </BlurGroup>
      </section>
    </main> 
  );
}
