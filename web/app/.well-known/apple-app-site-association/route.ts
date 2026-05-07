import { iosBundleId, appleTeamId } from '@/lib/config';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [`${appleTeamId}.${iosBundleId}`],
            components: [
              {
                '/': '/u/*',
                comment: 'Open shared Push Counter profiles in the app.',
              },
              {
                '/': '/open/*',
                comment: 'Open app handoff URLs.',
              },
              {
                '/': '/connect/*',
                comment: 'Open profile connection handoff URLs.',
              },
            ],
          },
        ],
      },
    },
    {
      headers: {
        'content-type': 'application/json',
      },
    }
  );
}
