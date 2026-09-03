// Stand-in for Node's 'timers' module, which doesn't exist in React
// Native — only xml2js (a dependency of officecrypto-tool, used for
// on-device statement decryption) needs this, and only for setImmediate,
// which React Native already provides as a global.
export const setImmediate = global.setImmediate;
export const clearImmediate = global.clearImmediate;
export const setTimeout = global.setTimeout;
export const clearTimeout = global.clearTimeout;
export const setInterval = global.setInterval;
export const clearInterval = global.clearInterval;

export default { setImmediate, clearImmediate, setTimeout, clearTimeout, setInterval, clearInterval };
