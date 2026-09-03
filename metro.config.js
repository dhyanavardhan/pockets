const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// officecrypto-tool and its dependencies (used for on-device statement
// decryption, see src/lib/xlsxStatement.js) do require() calls for a
// handful of Node built-in modules that don't exist in React Native.
// `crypto` gets routed to a real native implementation; `timers`/`fs` are
// only ever needed for code paths this app never actually exercises, so
// they get lightweight local stand-ins purely so Metro's bundler (which
// resolves every static require() up front, unlike Node) has something to
// resolve them to. See src/lib/shims/ for what each stub actually does.
const NODE_BUILTIN_ALIASES = {
  crypto: 'react-native-quick-crypto',
  timers: path.resolve(__dirname, 'src/lib/shims/timers.js'),
  fs: path.resolve(__dirname, 'src/lib/shims/fs.js'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(NODE_BUILTIN_ALIASES, moduleName)) {
    return context.resolveRequest(context, NODE_BUILTIN_ALIASES[moduleName], platform);
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
