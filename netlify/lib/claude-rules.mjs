/**
 * Request rules for /api/claude. Plain functions with no npm imports, so they're easy to test.
 *
 * tests/paste-test.mjs and tests/scan-cost-test.mjs read this file as text and pull out
 * the MAX_IMAGES and MAX_PROMPT_CHARS constants and the whole validateClaudeBody declaration
 * (up to the first line that is just "}"). Keep those three in this shape and keep validateClaudeBody
 * free of other references, or those tests stop checking that the app's real requests pass.
 */

export const DEFAULT_MODEL = 'claude-sonnet-5-5';        // must match CONFIG.MODEL in src/app.js
export const DEFAULT_LIST_MODEL = 'claude-haiku-5-5';    // cheapest model, for reading handwritten shopping lists
export const MAX_BODY = 6 * 1024 * 1024;                 // Netlify's buffered request limit is 6 MB; the app's 6 photos are ~3 MB
export const MAX_TOKENS_CAP = 4096;
export const LIST_MAX_TOKENS = 400;                      // a shopping list reply is short (the app asks for 400)
export const LIST_MAX_IMAGES = 2;                        // one list, maybe front and back
export const MAX_IMAGES = 6;                             // the app sends at most 6 photos per scan
export const MAX_PROMPT_CHARS = 40000;                   // all text blocks + system; the app's longest prompt is well under this

// "purpose" sent by the app -> billing tier.
//   scan:    fridge / pantry / freezer photos. Premium only.
//   list:    a photo of a handwritten shopping list. Free: FREE_LIST_PER_MONTH a month per person, cheapest model.
//   anything else (receipt, paste, recipes, steps, missing): "general". Free: FREE_DAILY_PER_USER a day per person.
// Unknown names fall back to "general" on purpose, so a new app feature never breaks; only "scan" unlocks Premium.
export const PURPOSES = { scan: 'scan', list: 'list' };

// The app only ever sends one user message made of text and base64 photo blocks. Reject anything else
// so the free allowance can't be used for huge prompts, extra turns or other content types.
export function validateClaudeBody(body) {
  if (!Array.isArray(body.messages) || body.messages.length !== 1) return 'Send exactly one message.';
  const m = body.messages[0];
  if (!m || m.role !== 'user') return 'Only a user message is allowed.';
  const content = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
  if (!Array.isArray(content) || !content.length) return 'Message content is required.';
  if (body.system != null && typeof body.system !== 'string') return 'system must be text.';
  let chars = (body.system || '').length, images = 0;
  for (const c of content) {
    if (c && c.type === 'text' && typeof c.text === 'string') chars += c.text.length;
    else if (c && c.type === 'image' && c.source && c.source.type === 'base64' && typeof c.source.data === 'string'
      && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(c.source.media_type)) images++;
    else return 'Unsupported message content.';
  }
  if (images > MAX_IMAGES) return `Up to ${MAX_IMAGES} photos at a time.`;
  if (chars > MAX_PROMPT_CHARS) return 'That request is too long.';
  return null;
}

// Returns { purpose } or { error }. Runs after validateClaudeBody.
export function resolvePurpose(body) {
  if (body.purpose != null && (typeof body.purpose !== 'string' || body.purpose.length > 30)) return { error: 'purpose must be a short text.' };
  const purpose = PURPOSES[body.purpose] || 'general';
  if (purpose === 'list') {
    const content = typeof body.messages[0].content === 'string' ? [] : body.messages[0].content;
    if (content.filter(c => c.type === 'image').length > LIST_MAX_IMAGES) return { error: `Up to ${LIST_MAX_IMAGES} photos of a list at a time.` };
  }
  return { purpose };
}

// Builds the exact payload sent to Anthropic. Only the fields the app needs; the model is chosen here.
export function buildPayload(body, purpose, { model, listModel }) {
  const cap = purpose === 'list' ? LIST_MAX_TOKENS : MAX_TOKENS_CAP;
  const payload = {
    model: purpose === 'list' ? (listModel || DEFAULT_LIST_MODEL) : (model || DEFAULT_MODEL),
    max_tokens: Math.max(1, Math.min(Math.floor(Number(body.max_tokens)) || Math.min(2000, cap), cap)),
    messages: [{ role: 'user', content: body.messages[0].content }]
  };
  if (typeof body.system === 'string' && body.system) payload.system = body.system;
  return payload;
}
