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

module.exports = () => {
  const config = appJson.expo;
  const associatedDomain = `applinks:${webHost()}`;

  return {
    ...config,
    ios: {
      ...config.ios,
      associatedDomains: Array.from(new Set([...(config.ios.associatedDomains ?? []), associatedDomain])),
    },
  };
};
