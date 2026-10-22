// Node module hooks for tests/worker-test.mjs (registered with module.register).
//   @netlify/blobs     -> always the in-memory mock below (real Blobs needs a Netlify deploy)
//   @anthropic-ai/sdk  -> the REAL SDK when `npm ci` has been run (its HTTP calls are caught by a fake fetch),
//                         otherwise a small stand-in that makes the same HTTP call, so the test still runs.
export async function resolve(specifier, context, next) {
  if (specifier === '@netlify/blobs') return { url: new URL('./netlify-blobs.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier === '@anthropic-ai/sdk') {
    try { return await next(specifier, context); }
    catch { return { url: new URL('./anthropic-sdk.mjs', import.meta.url).href, shortCircuit: true }; }
  }
  return next(specifier, context);
}
