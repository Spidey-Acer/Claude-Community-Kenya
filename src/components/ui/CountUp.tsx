interface CountUpProps {
  target: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Renders the final formatted number immediately — in the server-rendered
 * HTML, on first client paint, and for no-JS or reduced-motion readers alike.
 * There is no client-side count-up from 0: that flashed "~0" (or the whole
 * stat missing) at every server-rendered load and at every no-JS visitor,
 * which is worse than skipping the animation.
 *
 * The "climbing" flourish is a pure CSS fade/rise-in (`.count-reveal`, see
 * globals.css) that starts at first paint, needs no JavaScript to run, and is
 * automatically flattened to instant by the site-wide
 * `prefers-reduced-motion: reduce` reset.
 */
export function CountUp({ target, prefix = "", suffix = "", className }: CountUpProps) {
  const classes = ["count-reveal", className].filter(Boolean).join(" ");
  return (
    <span className={classes}>
      {prefix}
      {target.toLocaleString()}
      {suffix}
    </span>
  );
}
