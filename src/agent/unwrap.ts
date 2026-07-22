/**
 * Shared transport unwrapper for the agent modules. n8n's AI Agent node (and raw LLM
 * replies) return the payload in inconsistent shapes: a JSON *string* (the default when
 * "Require Specific Output Format" is off), a ```json``` code-fenced string, an
 * `{ output: <string|object> }` envelope, or an array of items — AND, increasingly, a
 * string with the model's reasoning prose *before* the JSON ("Good, here's the plan… {…}").
 * This flattens all of those into the plain candidate objects a normalizer can validate.
 */

const ENVELOPE_KEYS = ['output', 'data', 'json', 'result', 'response', 'text', 'message', 'content'];

/**
 * Parse a string that may be pure JSON, or JSON embedded in surrounding prose. Tries a
 * direct parse first, then extracts the largest `{…}`/`[…]` substring that parses — so an
 * agent that narrates before emitting `{"type":"ask",…}` still gets understood.
 */
function parseLoose(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    /* fall through to extraction */
  }
  const starts = ['{', '['].map((c) => s.indexOf(c)).filter((i) => i >= 0);
  if (starts.length === 0) return undefined;
  const first = Math.min(...starts);
  const close = s[first] === '{' ? '}' : ']';
  // Largest candidate first: first opener → each closer from the end.
  for (let end = s.lastIndexOf(close); end > first; end = s.lastIndexOf(close, end - 1)) {
    try {
      return JSON.parse(s.slice(first, end + 1));
    } catch {
      /* keep shrinking */
    }
  }
  return undefined;
}

/** Decode a raw transport value into every candidate object it might contain. */
export function candidateObjects(
  raw: unknown,
  depth = 0,
  out: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
  if (depth > 5 || raw == null) return out;

  if (typeof raw === 'string') {
    let s = raw.trim();
    const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) s = fence[1].trim();
    if (!s) return out;
    const parsed = parseLoose(s);
    if (parsed !== undefined) candidateObjects(parsed, depth + 1, out);
    return out;
  }

  if (Array.isArray(raw)) {
    for (const el of raw) candidateObjects(el, depth + 1, out);
    return out;
  }

  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    out.push(r);
    for (const key of ENVELOPE_KEYS) {
      if (key in r) candidateObjects(r[key], depth + 1, out);
    }
  }

  return out;
}
