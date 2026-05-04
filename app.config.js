const appJson = require('./app.json');

function webHost() {
  const configuredDomain = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN;
  if (configuredDomain) return configuredDomain.replace(/^applinks:/, '');

  try {
    return new URL(process.env.EXPO_PUBLIC_WEB_URL ?? 'https://pushcounter.online').host;
  } catch {
    return 'pushcounter.online';
  }
}

function shouldUseAssociatedDomains() {
  return process.env.EXPO_PUBLIC_ENABLE_ASSOCIATED_DOMAINS === 'true';
}

module.exports = () => {
  const config = appJson.expo;
  const ios = { ...config.ios };

  if (shouldUseAssociatedDomains()) {
    const associatedDomain = `applinks:${webHost()}`;
    ios.associatedDomains = Array.from(new Set([...(ios.associatedDomains ?? []), associatedDomain]));
  }

  return {
    ...config,
    ios,
  };
};
