'use client';

import {
  Children,
  Fragment,
  cloneElement,
  createElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode
} from 'react';
import './blur-highlight.css';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Direction = 'top' | 'bottom' | 'left' | 'right';
type Phase = 'from' | 'in' | 'out' | 'rest';
type HighlightBit = string | { text: string; occurrence?: number };
type Range = [start: number, end: number];

export type BlurTextEffect = 'blur' | 'zoom' | 'tilt' | 'focus' | 'drift';
export type BlurTextStaggerFrom = 'start' | 'center' | 'end' | 'random';
export type BlurTextTrigger = 'view' | 'load' | 'hover' | 'click';

/** Animation options shared by <BlurText> and <BlurGroup>. */
export type BlurOptions = {
  /** Milliseconds between each word / letter. */
  delay: number;
  animateBy: 'words' | 'letters';
  direction: Direction;
  /** IntersectionObserver options (trigger="view"). */
  threshold: number;
  rootMargin: string;
  /** CSS timing function for the movement, e.g. "cubic-bezier(0.22, 1, 0.36, 1)". */
  easing?: string;
  onAnimationComplete?: () => void;
  /** Seconds per animation step (a full animation is 2 steps). */
  stepDuration: number;
  /** Starting blur in px. */
  blur: number;
  /** Travel distance in px. */
  distance: number;
  effect: BlurTextEffect;
  staggerFrom: BlurTextStaggerFrom;
  trigger: BlurTextTrigger;
  loop: boolean;
  /** Seconds to wait before a loop restarts. */
  loopDelay: number;
  color?: string;
  /** Text starts in this color and fades to its normal color. */
  fromColor?: string;
  /** Blur every word except the hovered one. */
  focusOnHover: boolean;
  highlightedBits: HighlightBit[];
  highlightColor: string;
  highlightColorDark?: string;
  /** Text color inside the highlight. Picked automatically (black/white) if omitted. */
  highlightTextColor?: string;
  highlightDirection: Direction;
  /** Seconds after the text has finished animating before the highlight starts. */
  highlightDelay: number;
  highlightDuration: number;
};

export type BlurTextProps = Partial<BlurOptions> & {
  text?: string;
  className?: string;
  /** Element to render. Default "p". */
  as?: ElementType;
};

export type BlurGroupProps = Partial<BlurOptions> & {
  children?: ReactNode;
};

const DEFAULTS: BlurOptions = {
  delay: 200,
  animateBy: 'words',
  direction: 'top',
  threshold: 0.1,
  rootMargin: '0px',
  stepDuration: 0.35,
  blur: 10,
  distance: 50,
  effect: 'blur',
  staggerFrom: 'start',
  trigger: 'view',
  loop: false,
  loopDelay: 2,
  focusOnHover: false,
  highlightedBits: [],
  highlightColor: 'hsl(80, 100%, 50%)',
  highlightDirection: 'left',
  highlightDelay: 0.4,
  highlightDuration: 1
};

/** Merge props over defaults, ignoring props that are explicitly `undefined`. */
const resolve = (props: Partial<BlurOptions>, base: BlurOptions = DEFAULTS): BlurOptions => {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(props)) if (value !== undefined) out[key] = value;
  return out as BlurOptions;
};


/* -------------------------------------------------------------------------- */
/*  Effects — plain CSS values, no animation library                          */
/* -------------------------------------------------------------------------- */

interface State {
  opacity: number;
  blur: number;
  transform: string;
}

interface Effect {
  from: State;
  exit: State;
  /** Easing for opacity + blur. */
  fade: string;
  /** Movement overshoots a little (springy). */
  bounce: boolean;
  /** Movement duration as a fraction of the full duration. */
  settle: number;
  origin?: string;
  exitEase: string;
}

const AXES: Record<Direction, ['x' | 'y', number]> = {
  top: ['y', -1],
  bottom: ['y', 1],
  left: ['x', -1],
  right: ['x', 1]
};

const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0, 0.9, 0.45)';
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
const SPRING = 'cubic-bezier(0.34, 1.45, 0.64, 1)'; // slight overshoot

const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const deg = (n: number) => `${Math.round(n * 100) / 100}deg`;

const buildEffect = (effect: BlurTextEffect, direction: Direction, blur: number, distance: number): Effect => {
  const [axis, sign] = AXES[direction] ?? AXES.top;
  const b = Math.max(0, blur);
  const d = distance;
  const move = (amount: number) => (axis === 'x' ? `translate(${px(amount)}, 0)` : `translate(0, ${px(amount)})`);

  switch (effect) {
    case 'zoom':
      return {
        from: { opacity: 0, blur: b * 1.2, transform: `${move(sign * d * 0.35)} scale(1.4)` },
        exit: { opacity: 0, blur: b, transform: `${move(-sign * d * 0.2)} scale(0.82)` },
        fade: EASE_OUT,
        bounce: true,
        settle: 0.5,
        exitEase: EASE_IN
      };

    case 'tilt': {
      const rotate = axis === 'y' ? 'rotateX' : 'rotateY';
      const lean = axis === 'y' ? -sign : sign;
      return {
        from: { opacity: 0, blur: b, transform: `perspective(600px) ${rotate}(${deg(lean * 55)}) ${move(sign * d * 0.5)}` },
        exit: { opacity: 0, blur: b, transform: `perspective(600px) ${rotate}(${deg(-lean * 40)}) ${move(-sign * d * 0.3)}` },
        fade: EASE_OUT,
        bounce: true,
        settle: 0.8,
        origin: `${axis === 'x' ? (sign < 0 ? 0 : 100) : 50}% ${axis === 'y' ? (sign < 0 ? 0 : 100) : 50}%`,
        exitEase: EASE_IN
      };
    }

    case 'focus': {
      const soft: State = { opacity: 0.32, blur: b * 1.4, transform: 'scale(1.12)' };
      return { from: soft, exit: soft, fade: EASE_IN_OUT, bounce: false, settle: 1, exitEase: EASE_IN_OUT };
    }

    case 'drift': {
      const h = direction === 'right' ? 1 : -1;
      const v = axis === 'y' ? sign : 0;
      return {
        from: { opacity: 0, blur: b, transform: `translate(${px(h * d * 1.6)}, ${px(v * d * 0.3)}) skewX(${deg(h * 28)})` },
        exit: { opacity: 0, blur: b, transform: `translate(${px(-h * d * 1.2)}, ${px(-v * d * 0.2)}) skewX(${deg(h * 20)})` },
        fade: EASE_OUT,
        bounce: true,
        settle: 0.55,
        exitEase: EASE_IN
      };
    }

    default:
      return {
        from: { opacity: 0, blur: b, transform: move(sign * d) },
        exit: { opacity: 0, blur: b, transform: move(-sign * d * 0.6) },
        fade: 'linear',
        bounce: true,
        settle: 0.5,
        exitEase: EASE_IN
      };
  }
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Turn the highlight list into sorted, non-overlapping [start, end) character ranges. */
const findHighlightRanges = (text: string, bits: HighlightBit[]): Range[] => {
  const found: Range[] = [];

  for (const bit of bits) {
    const needle = typeof bit === 'string' ? bit : bit.text;
    if (!needle) continue;

    const target = typeof bit === 'string' ? null : (bit.occurrence ?? 1); // 1-based
    let from = 0;
    let count = 0;
    let index = text.indexOf(needle, from);

    while (index !== -1) {
      count += 1;
      if (target === null || count === target) found.push([index, index + needle.length]);
      if (target !== null && count >= target) break;
      from = index + needle.length;
      index = text.indexOf(needle, from);
    }
  }

  found.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
};

/** Map: first word of a highlight -> last word of it. Highlights always cover whole words. */
const findHighlightWords = (words: string[], ranges: Range[]): Map<number, number> => {
  const result = new Map<number, number>();
  if (ranges.length === 0) return result;

  let offset = 0;
  const spans = words.map(word => {
    const start = offset;
    offset += word.length + 1;
    return [start, start + word.length] as const;
  });

  let lastEnd = -1;
  for (const [start, end] of ranges) {
    let first = -1;
    let last = -1;
    spans.forEach(([ws, we], i) => {
      if (ws < end && we > start) {
        if (first === -1) first = i;
        last = i;
      }
    });
    if (first === -1) continue;
    if (first <= lastEnd) {
      // overlaps / touches the previous highlight -> extend it
      const prevStart = [...result.keys()].pop() as number;
      result.set(prevStart, Math.max(result.get(prevStart) as number, last));
      lastEnd = Math.max(lastEnd, last);
    } else {
      result.set(first, last);
      lastEnd = last;
    }
  }
  return result;
};

const buildRanks = (count: number, from: BlurTextStaggerFrom, seedText: string): number[] => {
  const ranks = Array.from({ length: count }, (_, i) => i);
  if (from === 'end') return ranks.map(i => count - 1 - i);
  if (from === 'center') {
    const mid = (count - 1) / 2;
    const offset = count % 2 === 0 ? 0.5 : 0;
    return ranks.map(i => Math.abs(i - mid) - offset);
  }
  if (from === 'random') {
    // seeded shuffle: same text -> same order (no hydration mismatch)
    let seed = 2166136261;
    for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619) >>> 0;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const order = ranks.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((piece, rank) => {
      ranks[piece] = rank;
    });
  }
  return ranks;
};

/** Black or white, whichever reads better on the highlight (supports #hex, rgb() and hsl()). */
const contrastText = (color?: string): string | undefined => {
  if (!color) return undefined;
  const c = color.trim();
  let rgb: number[] | undefined;

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  const rgbMatch = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c);
  const hslMatch = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(c);

  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, ch => ch + ch) : hex[1];
    rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  } else if (rgbMatch) {
    rgb = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  } else if (hslMatch) {
    const h = Number(hslMatch[1]);
    const sat = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;
    const a = sat * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    rgb = [f(0), f(8), f(4)];
  }

  if (!rgb) return undefined;
  const [r, g, b] = rgb;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111' : '#fff';
};

/* -------------------------------------------------------------------------- */
/*  Walking existing content (for <BlurGroup>)                                */
/* -------------------------------------------------------------------------- */

/** Elements whose text is never split into animated words. */
const SKIP_TAGS = new Set(['pre', 'code', 'kbd', 'samp', 'textarea', 'script', 'style', 'svg', 'select', 'option']);

/** Elements that animate on their own, the moment they scroll into view. */
const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'figcaption',
  'dt', 'dd', 'td', 'th', 'label', 'summary', 'caption'
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;

/** Add data-no-blur to any element to leave it (and everything inside it) untouched. */
const isSkipped = (el: ReactElement<AnyProps>): boolean => {
  const optOut = el.props['data-no-blur'];
  return (typeof el.type === 'string' && SKIP_TAGS.has(el.type)) || (optOut !== undefined && optOut !== false);
};

const tokenize = (str: string): string[] => str.split(/\s+/).filter(Boolean);

const hasDirectText = (children: ReactNode): boolean =>
  Children.toArray(children).some(child => typeof child === 'string' && child.trim() !== '');

/** How many animated pieces (words or letters) a piece of content will produce. */
const countPieces = (node: ReactNode, by: BlurOptions['animateBy']): number =>
  Children.toArray(node).reduce<number>((sum, child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      const words = tokenize(String(child));
      return sum + (by === 'words' ? words.length : words.reduce((n, w) => n + Array.from(w).length, 0));
    }
    if (!isValidElement(child)) return sum;
    const el = child as ReactElement<AnyProps>;
    return isSkipped(el) ? sum : sum + countPieces(el.props.children, by);
  }, 0);

interface Ctx {
  o: BlurOptions;
  ranks: number[];
  piece: number; // next piece index
  id: number; // next string id (for keys)
}

/** One string -> highlighted / animated word pieces. */
const renderString = (str: string, ctx: Ctx): ReactNode => {
  const words = tokenize(str);
  if (words.length === 0) return str.length > 0 ? ' ' : null; // whitespace between elements

  const { o } = ctx;
  const normalized = words.join(' ');
  const highlightWords = findHighlightWords(words, findHighlightRanges(normalized, o.highlightedBits));

  const renderWord = (w: number): ReactNode => {
    const chunks = o.animateBy === 'words' ? [words[w]] : Array.from(words[w]);
    return (
      <span className="blur-text__word" key={`w-${w}`}>
        {chunks.map((chunk, c) => (
          <span className="blur-text__piece" key={`p-${w}-${c}`} style={{ '--r': ctx.ranks[ctx.piece++] } as CSSProperties}>
            {chunk}
          </span>
        ))}
      </span>
    );
  };

  const nodes: ReactNode[] = [];
  for (let w = 0; w < words.length; ) {
    if (w > 0) nodes.push(' ');
    const last = highlightWords.get(w);
    if (last === undefined) {
      nodes.push(renderWord(w));
      w += 1;
      continue;
    }
    const inner: ReactNode[] = [];
    for (let k = w; k <= last; k++) {
      if (k > w) inner.push(' ');
      inner.push(renderWord(k));
    }
    nodes.push(
      <mark className="blur-highlight__mark" key={`mark-${w}`}>
        {inner}
      </mark>
    );
    w = last + 1;
  }

  return (
    <Fragment key={`s-${ctx.id++}`}>
      <span className="blur-text__sr">{str}</span>
      <span aria-hidden="true">
        {/^\s/.test(str) ? ' ' : null}
        {nodes}
        {/\s$/.test(str) ? ' ' : null}
      </span>
    </Fragment>
  );
};

/** Inside a block: replace every string (at any depth) with animated pieces, keep all elements. */
const walkInline = (node: ReactNode, ctx: Ctx): ReactNode =>
  Children.toArray(node).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return renderString(String(child), ctx);
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<AnyProps>;
    if (isSkipped(el) || el.props.children == null) return el;
    return cloneElement(el, undefined, walkInline(el.props.children, ctx));
  });

/** Outside any block: find the elements that should animate on their own and wrap them in <Block>. */
const walkTop = (node: ReactNode, o: BlurOptions): ReactNode =>
  Children.toArray(node).map((child, i) => {
    if (typeof child === 'string' || typeof child === 'number') {
      const str = String(child);
      return str.trim() ? (
        <Block key={`t-${i}`} Tag="span" elementProps={{}} o={o}>
          {str}
        </Block>
      ) : (
        child
      );
    }
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<AnyProps>;
    if (isSkipped(el)) return el;

    const { children, ...rest } = el.props;
    if (typeof el.type === 'string' && (BLOCK_TAGS.has(el.type) || hasDirectText(children))) {
      return (
        <Block key={el.key ?? `b-${i}`} Tag={el.type} elementProps={rest} o={o}>
          {children}
        </Block>
      );
    }
    if (children == null) return el;
    return cloneElement(el, undefined, walkTop(children, o)); // container: keep looking inside
  });

/* -------------------------------------------------------------------------- */
/*  Batching — everything that appears together, starts together              */
/* -------------------------------------------------------------------------- */

interface Starter {
  /** Seconds this block needs for its text to land. */
  total: number;
  /** Called with the longest `total` of the whole batch, so highlights can line up. */
  start: (batchTotal: number) => void;
}

const startBatch = (items: Starter[]) => {
  if (items.length === 0) return;
  const batchTotal = Math.max(...items.map(item => item.total));
  items.forEach(item => item.start(batchTotal));
};

// One IntersectionObserver per (threshold, rootMargin), shared by every block on the page.
// An observer callback delivers all blocks that became visible together -> they start as one batch.
const observers = new Map<string, { observer: IntersectionObserver; items: Map<Element, Starter> }>();

const observeBlock = (el: Element, threshold: number, rootMargin: string, starter: Starter): (() => void) => {
  const key = `${threshold}|${rootMargin}`;
  let shared = observers.get(key);
  if (!shared) {
    const items = new Map<Element, Starter>();
    const observer = new IntersectionObserver(
      entries => {
        const ready: Starter[] = [];
        for (const entry of entries) {
          const item = items.get(entry.target);
          if (!entry.isIntersecting || !item) continue;
          observer.unobserve(entry.target);
          items.delete(entry.target);
          ready.push(item);
        }
        startBatch(ready);
      },
      { threshold, rootMargin }
    );
    shared = { observer, items };
    observers.set(key, shared);
  }
  shared.items.set(el, starter);
  shared.observer.observe(el);
  return () => {
    shared?.items.delete(el);
    shared?.observer.unobserve(el);
  };
};

// trigger="load": everything mounted in the same moment starts in the same batch
let pendingLoad: Starter[] = [];
const queueLoad = (starter: Starter): (() => void) => {
  if (pendingLoad.length === 0) {
    Promise.resolve().then(() => {
      const batch = pendingLoad;
      pendingLoad = [];
      startBatch(batch);
    });
  }
  pendingLoad.push(starter);
  return () => {
    pendingLoad = pendingLoad.filter(item => item !== starter);
  };
};

/* -------------------------------------------------------------------------- */
/*  Block — one element with its own timeline                                 */
/* -------------------------------------------------------------------------- */

interface BlockProps {
  Tag: ElementType;
  elementProps: AnyProps;
  children: ReactNode;
  o: BlurOptions;
}

const Block = ({ Tag, elementProps, children, o }: BlockProps) => {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>(o.trigger === 'hover' || o.trigger === 'click' ? 'rest' : 'from');
  const played = useRef(phase === 'rest'); // true once the first run has started
  const settled = useRef(phase === 'rest');
  const [batchTotal, setBatchTotal] = useState(0); // longest text in the batch this block started with
  const onComplete = useRef(o.onAnimationComplete);
  onComplete.current = o.onAnimationComplete;

  /* ---- timings ---------------------------------------------------------- */
  const fx = useMemo(() => buildEffect(o.effect, o.direction, o.blur, o.distance), [o.effect, o.direction, o.blur, o.distance]);
  const duration = o.stepDuration * 2;
  const exitDuration = o.stepDuration * 1.3;
  const stagger = Math.max(0, o.delay) / 1000;
  const exitStagger = stagger * 0.4;

  const pieceCount = countPieces(children, o.animateBy);
  const ranks = useMemo(() => buildRanks(pieceCount, o.staggerFrom, String(pieceCount)), [pieceCount, o.staggerFrom]);
  const maxRank = ranks.reduce((max, rank) => Math.max(max, rank), 0);
  const inTotal = duration + maxRank * stagger; // seconds until the last piece lands
  const outTotal = exitDuration + maxRank * exitStagger;

  /* ---- phase machine: from -> in -> (out -> from -> in …) --------------- */
  const { trigger, threshold, rootMargin, loop, loopDelay } = o;
  useEffect(() => {
    let timer = 0;
    let raf1 = 0;
    let raf2 = 0;
    let release: (() => void) | undefined;

    // Wait two frames so the "from" style is painted before we switch to "in" (otherwise no transition runs)
    const enter = () => {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase('in'));
      });
    };
    const scheduleOut = () => {
      if (loop) timer = window.setTimeout(() => setPhase('out'), Math.max(0, loopDelay) * 1000);
    };

    if (phase === 'from') {
      settled.current = false;
      const element = ref.current;
      const starter: Starter = {
        total: inTotal,
        start: batch => {
          played.current = true;
          setBatchTotal(batch);
          enter();
        }
      };
      if (!played.current && trigger === 'view' && element && typeof IntersectionObserver !== 'undefined') {
        release = observeBlock(element, threshold, rootMargin, starter);
      } else if (!played.current && trigger === 'load') {
        release = queueLoad(starter);
      } else {
        played.current = true;
        enter();
      }
    } else if (phase === 'in') {
      timer = window.setTimeout(() => {
        settled.current = true;
        onComplete.current?.();
        scheduleOut();
      }, inTotal * 1000);
    } else if (phase === 'rest') {
      settled.current = true;
      scheduleOut();
    } else {
      settled.current = false;
      timer = window.setTimeout(() => setPhase('from'), outTotal * 1000);
    }

    return () => {
      release?.();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase, trigger, threshold, rootMargin, loop, loopDelay, inTotal, outTotal]);

  const replay = () => {
    if (settled.current) setPhase('out');
  };

  /* ---- render ----------------------------------------------------------- */
  const content = walkInline(children, { o, ranks, piece: 0, id: 0 });

  const style = {
    ...elementProps.style,
    color: o.color ?? elementProps.style?.color,
    cursor: trigger === 'click' ? 'pointer' : elementProps.style?.cursor,
    '--bt-from-o': fx.from.opacity,
    '--bt-from-f': `blur(${px(fx.from.blur)})`,
    '--bt-from-t': fx.from.transform,
    '--bt-exit-o': fx.exit.opacity,
    '--bt-exit-f': `blur(${px(fx.exit.blur)})`,
    '--bt-exit-t': fx.exit.transform,
    '--bt-origin': fx.origin,
    '--bt-from-color': o.fromColor,
    '--bt-dur': `${duration}s`,
    '--bt-move-dur': `${duration * fx.settle}s`,
    '--bt-fade': fx.fade,
    '--bt-move-ease': o.easing ?? (fx.bounce ? SPRING : fx.fade),
    '--bt-stagger': `${stagger}s`,
    '--bt-exit-dur': `${exitDuration}s`,
    '--bt-exit-ease': fx.exitEase,
    '--bt-exit-stagger': `${exitStagger}s`,
    '--bt-dim': `${Math.min(6, Math.max(2, o.blur * 0.3))}px`,
    '--bh-hl-delay': `${o.highlightDelay + Math.max(inTotal, batchTotal)}s`,
    '--bh-hl-duration': `${o.highlightDuration}s`,
    '--bh-color-light': o.highlightColor,
    '--bh-color-dark': o.highlightColorDark,
    '--bh-text-light': o.highlightTextColor ?? contrastText(o.highlightColor),
    '--bh-text-dark': o.highlightTextColor ?? contrastText(o.highlightColorDark)
  } as CSSProperties;

  return createElement(
    Tag,
    {
      ...elementProps,
      ref,
      className: `blur-text${o.focusOnHover ? ' blur-text--focus' : ''} ${elementProps.className ?? ''}`.trim(),
      'data-phase': phase,
      'data-direction': o.highlightDirection,
      style,
      onPointerEnter: (e: unknown) => {
        elementProps.onPointerEnter?.(e);
        if (trigger === 'hover') replay();
      },
      onClick: (e: unknown) => {
        elementProps.onClick?.(e);
        if (trigger === 'click') replay();
      }
    },
    content
  );
};

/* -------------------------------------------------------------------------- */
/*  Public components                                                         */
/* -------------------------------------------------------------------------- */

/** Animate one piece of text:  <BlurText text="Hello world" /> */
const BlurText = ({ text = '', className, as: Tag = 'p', ...options }: BlurTextProps) => (
  <Block Tag={Tag} elementProps={{ className }} o={resolve(options)}>
    {text}
  </Block>
);

/**
 * Animate content you already have. Wrap anything — headings, paragraphs, spans, lists —
 * and every text block animates by itself when it scrolls into view.
 * Renders no extra DOM element.
 */
export const BlurGroup = ({ children, ...options }: BlurGroupProps) => (
  <>{walkTop(children, resolve(options, { ...DEFAULTS, delay: 60, stepDuration: 0.25 }))}</>
);

export default BlurText;
