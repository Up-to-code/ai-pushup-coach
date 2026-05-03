import { androidPackageName, androidSha256CertFingerprints } from '@/lib/config';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    androidSha256CertFingerprints.map((fingerprint) => ({
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: androidPackageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    })),
    {
      headers: {
        'content-type': 'application/json',
      },
    }
  );
}
