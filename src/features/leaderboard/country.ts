export function normalizeLeaderboardCountryCode(countryCode?: string | null) {
  return countryCode?.trim().toUpperCase() || 'GLOBAL';
}

export function isRealLeaderboardCountryCode(countryCode?: string | null) {
  return normalizeLeaderboardCountryCode(countryCode) !== 'GLOBAL';
}

export function resolveLeaderboardCountryCode({
  isSignedIn,
  localCountryCode,
  remoteCountryCode,
}: {
  isSignedIn: boolean;
  localCountryCode?: string | null;
  remoteCountryCode?: string | null;
}) {
  const normalizedLocalCountryCode = normalizeLeaderboardCountryCode(localCountryCode);
  const normalizedRemoteCountryCode = normalizeLeaderboardCountryCode(remoteCountryCode);

  if (!isSignedIn) {
    return normalizedLocalCountryCode;
  }

  if (isRealLeaderboardCountryCode(normalizedRemoteCountryCode)) {
    return normalizedRemoteCountryCode;
  }

  if (isRealLeaderboardCountryCode(normalizedLocalCountryCode)) {
    return normalizedLocalCountryCode;
  }

  return normalizedRemoteCountryCode;
}
