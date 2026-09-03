// Sets global.crypto and global.Buffer to native-backed implementations.
// Must be imported before anything else — ES module imports fully
// evaluate in the order they're written before any plain statement in the
// importing file runs, so a plain install() call in index.js (after
// `import App from './App'`) would run too late: App's import graph
// (officecrypto-tool, for on-device statement decryption, via cfb/
// crypto-js) touches Buffer just by being loaded, before it's even
// called. Isolating install() in its own leaf module — one with no
// dependency on anything of ours — and importing it first guarantees it
// runs before any of that.
import { install } from 'react-native-quick-crypto';

install();
