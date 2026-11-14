import { Fragment, type CSSProperties } from "react";

/**
 * Splits text into words (or letters) that rise out of a mask when their parent
 * has data-reveal="mask" and scrolls into view. Screen readers get the plain text.
 */
export function Words({ text, by = "word", from = 0 }: { text: string; by?: "word" | "letter"; from?: number }) {
  const parts = by === "word" ? text.split(" ") : [...text];
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {parts.map((part, i) => (
          <Fragment key={i}>
            <span className="mask">
              <span style={{ "--i": from + i } as CSSProperties}>{part}</span>
            </span>
            {/* the space lives between the slots, where it can break the line */}
            {by === "word" && i < parts.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </>
  );
}
