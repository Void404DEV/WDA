import BlurText from "./BlurText";

const handleAnimationComplete = () => {
  console.log('Animation completed!');
};

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
  onAnimationComplete={handleAnimationComplete}
  className="text-2xl mb-8"
  loop={false}
  loopDelay={2}
  focusOnHover
/>