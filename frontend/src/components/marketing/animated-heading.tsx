import { Fragment } from "react";

type Props = {
  text: string;
  className?: string;
  /** seconds before the first word appears */
  startDelay?: number;
  /** a word that gets the moving light sweep, e.g. "2026" */
  highlight?: string;
};

/** Word-by-word rise-in. Server-safe, pure CSS (see globals.css). */
export function AnimatedHeading({ text, className, startDelay = 0.25, highlight }: Props) {
  const words = text.split(" ");
  return (
    <h1 className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.12em] [perspective:600px]">
            <span
              className={`inline-block hero-word ${w === highlight ? "hero-shimmer" : ""}`}
              style={{ animationDelay: `${startDelay + i * 0.13}s` }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}