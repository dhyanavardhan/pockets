// Native pickers (document picker, image picker, share sheet) hand off to
// system UI, which briefly flips AppState to 'background'/'inactive' even
// though the user never left the app. Screens that open one of these should
// wrap the call so the App.js lock listener doesn't treat it as backgrounding.
let suppressed = 0;

export function isLockSuppressed() {
  return suppressed > 0;
}

export async function withLockSuppressed(fn) {
  suppressed++;
  try {
    return await fn();
  } finally {
    suppressed--;
  }
}
