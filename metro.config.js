const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const extraExclusions = [/\/ios\/build\/.*/];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(...extraExclusions);
} else if (config.resolver.blockList) {
  config.resolver.blockList = [config.resolver.blockList, ...extraExclusions];
} else {
  config.resolver.blockList = extraExclusions;
}

module.exports = config;
