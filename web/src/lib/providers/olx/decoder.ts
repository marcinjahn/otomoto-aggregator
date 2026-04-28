/**
 * olx HTML embeds its prerendered listing state as
 *   `window.__PRERENDERED_STATE__ = "<doubly-encoded JSON string>";`
 * The string is JSON-encoded (escaped quotes, backslashes) inside another
 * JSON-encoded literal, so a single JSON.parse leaves a string — we have to
 * parse twice.
 */
const ASSIGNMENT_RE = /window\.__PRERENDERED_STATE__\s*=\s*("(?:\\.|[^"\\])*")/;

export class PrerenderedStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrerenderedStateError";
  }
}

/**
 * Decode the `__PRERENDERED_STATE__` blob from raw olx HTML. Returns the
 * fully-parsed state object. Throws `PrerenderedStateError` if the marker
 * is missing or the JSON is malformed.
 */
export function decodePrerenderedState(html: string): unknown {
  const m = ASSIGNMENT_RE.exec(html);
  if (!m) {
    throw new PrerenderedStateError(
      "__PRERENDERED_STATE__ assignment not found in olx HTML",
    );
  }
  const literal = m[1]!;
  let inner: unknown;
  try {
    inner = JSON.parse(literal);
  } catch (e) {
    throw new PrerenderedStateError(
      "Outer JSON parse of __PRERENDERED_STATE__ failed: " +
        (e as Error).message,
    );
  }
  if (typeof inner !== "string") {
    throw new PrerenderedStateError("Outer JSON parse did not yield a string");
  }
  try {
    return JSON.parse(inner);
  } catch (e) {
    throw new PrerenderedStateError(
      "Inner JSON parse of __PRERENDERED_STATE__ failed: " +
        (e as Error).message,
    );
  }
}
