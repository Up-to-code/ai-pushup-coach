import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Open Push Counter',
};

export default async function OpenProfilePage({ params }: Props) {
  const { id } = await params;
  const encodedId = encodeURIComponent(decodeURIComponent(id));
  const appUrl = `pushcounter://user/${encodedId}`;
  const webProfileUrl = `/u/${encodedId}`;

  return (
    <main className="page legal-page">
      <p className="eyebrow">Push Counter</p>
      <h1>Open this profile</h1>
      <p className="lede">Continue to the Push Counter app or view the public profile on the web.</p>
      <div className="action-row">
        <a className="button primary" href={appUrl}>
          Open app
        </a>
        <a className="button secondary" href={webProfileUrl}>
          View web profile
        </a>
      </div>
    </main>
  );
}
