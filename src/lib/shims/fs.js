// Stand-in for Node's 'fs' module. cfb (a dependency of officecrypto-tool,
// used for on-device statement decryption) has a lazy require('fs') inside
// a helper that's only reached if you hand it a file path instead of an
// in-memory buffer — this app always decrypts from a buffer, so that path
// is never actually exercised. This stub exists only so Metro's bundler
// (which resolves every static require() up front, unlike Node's lazy
// runtime require) has something to resolve it to.
export default {};
