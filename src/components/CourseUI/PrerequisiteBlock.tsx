import React from "react";

const normalize = (raw: string | undefined): string => {
  if (!raw) return "";
  return raw.replace(/^Prereq:\s*/i, "").trim();
};

/** `\s+and\s+` (case-insensitive "and") — linear time, no ReDoS. */
function matchWhitespaceAndConnector(text: string, i: number): number {
  const n = text.length;
  if (i >= n || !/\s/.test(text[i])) return 0;
  let j = i;
  while (j < n && /\s/.test(text[j])) j++;
  const wlen = 3;
  if (j + wlen > n) return 0;
  if (text.slice(j, j + wlen).toLowerCase() !== "and") return 0;
  j += wlen;
  if (j >= n || !/\s/.test(text[j])) return 0;
  while (j < n && /\s/.test(text[j])) j++;
  return j - i;
}

function pushTrimmedSlice(
  parts: string[],
  text: string,
  start: number,
  end: number
): void {
  const part = text.slice(start, end).trim();
  if (part) parts.push(part);
}

/** If at depth 0 and on a split boundary, append the segment and return the next index and start. */
function tryAdvancePastSplit(
  text: string,
  i: number,
  start: number,
  parenDepth: number,
  parts: string[]
): { nextI: number; nextStart: number } | null {
  if (parenDepth !== 0) return null;
  const ch = text[i];
  if (ch === ";" || ch === ",") {
    pushTrimmedSlice(parts, text, start, i);
    const next = i + 1;
    return { nextI: next, nextStart: next };
  }
  const andLen = matchWhitespaceAndConnector(text, i);
  if (andLen === 0) return null;
  pushTrimmedSlice(parts, text, start, i);
  const next = i + andLen;
  return { nextI: next, nextStart: next };
}

/**
 * Split common UF-style prerequisite lists into readable chunks without breaking long sentences badly.
 * Does not split on "or" (e.g. "B or higher" stays one segment).
 * Does not split inside `(...)` so grouped text (including `;`, `,`, or ` and ` within) stays one segment.
 * Uses a single O(n) pass (no regex backtracking) so hostile input cannot cause super-linear CPU.
 */
export const splitPrerequisiteParts = (text: string): string[] => {
  if (!text || text === "N/A") return [];
  const parts: string[] = [];
  let start = 0;
  const n = text.length;
  let i = 0;
  let parenDepth = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === "(") {
      parenDepth++;
      i++;
      continue;
    }
    if (ch === ")") {
      if (parenDepth > 0) parenDepth--;
      i++;
      continue;
    }

    const split = tryAdvancePastSplit(text, i, start, parenDepth, parts);
    if (split) {
      i = split.nextI;
      start = split.nextStart;
      continue;
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
};

function highlightCodes(
  text: string,
  onCodeClick?: (code: string) => void
): React.ReactNode {
  const re = /\b([A-Z]{2,4})\s+(\d{4}[A-Z]?)\b/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={`t-${key++}`}>{text.slice(last, m.index)}</span>);
    }
    const code = `${m[1]} ${m[2]}`;
    if (onCodeClick) {
      nodes.push(
        <button
          key={`c-${key++}`}
          type="button"
          onClick={() => onCodeClick(code)}
          className="inline align-baseline mx-0.5 px-1.5 py-0.5 rounded-md text-[0.92em] font-semibold text-sky-200 bg-sky-950/50 border border-sky-700/50 hover:bg-sky-900/60 hover:border-sky-500/60 transition-colors cursor-pointer"
        >
          {code}
        </button>
      );
    } else {
      nodes.push(
        <span
          key={`c-${key++}`}
          className="font-semibold text-sky-200/95"
        >
          {code}
        </span>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<span key={`t-${key++}`}>{text.slice(last)}</span>);
  }
  return nodes.length > 0 ? <>{nodes}</> : text;
}

type PrerequisiteBlockProps = {
  prerequisites: string | undefined;
  /** Called with e.g. "COP 3503" when user clicks a highlighted code (modal only). */
  onCourseCodeClick?: (code: string) => void;
  /** Tighter spacing for search results dropdown. */
  variant?: "modal" | "compact";
};

const PrerequisiteBlock: React.FC<PrerequisiteBlockProps> = ({
  prerequisites,
  onCourseCodeClick,
  variant = "modal",
}) => {
  const cleaned = normalize(prerequisites);
  const isEmpty = !cleaned || cleaned === "N/A";

  if (isEmpty) {
    return (
      <div
        className={
          variant === "modal"
            ? "rounded-lg border border-dashed border-gray-600/70 bg-[#161616] px-3 py-3 text-sm text-gray-400"
            : "rounded-md border border-dashed border-gray-600/50 bg-black/20 px-2 py-2 text-sm text-gray-400"
        }
      >
        <span className="text-gray-500">No prerequisites listed</span>
        <span className="block mt-1 text-xs text-gray-500 leading-snug">
          UF may still enforce requirements—check the catalog or your advisor.
        </span>
      </div>
    );
  }

  const parts = splitPrerequisiteParts(cleaned);
  const usePills =
    parts.length >= 2 &&
    parts.every((p) => p.length <= 120) &&
    parts.length <= 16;

  const proseClass =
    variant === "modal"
      ? "text-[14px] text-gray-200 leading-relaxed"
      : "text-sm text-gray-200 leading-relaxed";

  if (usePills) {
    return (
      <ul
        className={`flex flex-wrap gap-2 list-none m-0 p-0`}
      >
        {parts.map((part) => (
          <li
            key={part}
            className={
              variant === "modal"
                ? "max-w-full rounded-lg border border-gray-600/60 bg-[#1e1e1e] px-2.5 py-2 text-[13px] text-gray-200 shadow-sm"
                : "max-w-full rounded-md border border-gray-600/50 bg-[#1a1a1a] px-2 py-1.5 text-[13px] text-gray-200"
            }
          >
            <span className={proseClass}>
              {highlightCodes(part, onCourseCodeClick)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className={
        variant === "modal"
          ? "rounded-lg border border-gray-600/50 bg-[#161616] px-3 py-3"
          : "rounded-md border border-gray-600/40 bg-black/25 px-2 py-2"
      }
    >
      <p className={`${proseClass} whitespace-pre-wrap m-0`}>
        {highlightCodes(cleaned, onCourseCodeClick)}
      </p>
    </div>
  );
};

export default PrerequisiteBlock;
