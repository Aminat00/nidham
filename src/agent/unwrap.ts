/**
 * Shared transport unwrapper for the agent modules. n8n's AI Agent node (and raw LLM
 * replies) return the payload in inconsistent shapes: a JSON *string* (the default when
 * "Require Specific Output Format" is off), a ```json``` code-fenced string, an
 * `{ output: <string|object> }` envelope, or an array of items. This flattens all of
 * those into the plain candidate objects a normalizer can validate.
 */

const ENVELOPE_KEYS = ['output', 'data', 'json', 'result', 'response', 'text', 'message', 'content'];

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
    try {
      candidateObjects(JSON.parse(s), depth + 1, out);
    } catch {
      /* not JSON — ignore */
    }
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
