import { Redirect, useLocalSearchParams } from 'expo-router';

export default function UniversalConnectRedirect() {
  const { id } = useLocalSearchParams();
  const profileId = Array.isArray(id) ? id[0] : id;

  return <Redirect href={`/user/${encodeURIComponent(profileId ?? '')}` as any} />;
}
