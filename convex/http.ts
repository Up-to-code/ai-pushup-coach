import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import Sqids, { defaultOptions } from 'sqids';

const http = httpRouter();

type UploadThingToken = {
  apiKey: string;
  appId: string;
  regions: string[];
  ingestHost?: string;
};

type UploadRequestFile = {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
};

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const UPLOADTHING_VERSION = '7.7.4';
const encoder = new TextEncoder();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function decodeUploadThingToken(): UploadThingToken {
  const token = process.env.UPLOADTHING_TOKEN?.replace(/^['"]|['"]$/g, '');
  if (!token) {
    throw new Error('Missing UPLOADTHING_TOKEN in Convex environment.');
  }

  return JSON.parse(atob(token));
}

function djb2(value: string) {
  let hash = 5381;
  let index = value.length;
  while (index) {
    hash = (hash * 33) ^ value.charCodeAt(--index);
  }
  return (hash & 0xbfffffff) | ((hash >>> 1) & 0x40000000);
}

function shuffle(value: string, seed: string) {
  const chars = value.split('');
  const seedNumber = djb2(seed);

  for (let index = 0; index < chars.length; index += 1) {
    const target = ((seedNumber % (index + 1)) + index) % chars.length;
    const current = chars[index];
    chars[index] = chars[target];
    chars[target] = current;
  }

  return chars.join('');
}

function randomSeed() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
}

function generateFileKey(appId: string, file: UploadRequestFile) {
  const alphabet = shuffle(defaultOptions.alphabet, appId);
  const encodedAppId = new Sqids({ alphabet, minLength: 12 }).encode([Math.abs(djb2(appId))]);
  return `${encodedAppId}${randomSeed()}${Math.abs(djb2(`${file.name}:${file.size}:${file.type}`))}`;
}

async function hmacSha256(payload: string, secret: string) {
  const signingKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function signUploadUrl(url: URL, apiKey: string) {
  const signature = await hmacSha256(url.toString(), apiKey);
  url.searchParams.append('signature', `hmac-sha256=${signature}`);
  return url.toString();
}

function validateAvatarUpload(files: UploadRequestFile[]) {
  if (files.length !== 1) {
    throw new Error('Avatar upload expects exactly one file.');
  }

  const file = files[0];
  if (!file.type.startsWith('image/')) {
    throw new Error('Avatar upload only accepts image files.');
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Avatar image must be 4MB or smaller.');
  }

  return file;
}

const handleUploadthing = httpAction(async (_ctx, request) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    const actionType = url.searchParams.get('actionType');

    if (request.method === 'GET') {
      return jsonResponse([
        {
          slug: 'avatarImage',
          config: {
            image: {
              maxFileSize: '4MB',
              maxFileCount: 1,
            },
          },
        },
      ]);
    }

    if (slug !== 'avatarImage' || actionType !== 'upload') {
      return jsonResponse({ error: 'Unknown upload route.' }, 404);
    }

    const { files } = await request.json();
    const file = validateAvatarUpload(files ?? []);
    const token = decodeUploadThingToken();
    const region = token.regions[0];
    const ingestHost = token.ingestHost ?? 'ingest.uploadthing.com';
    const key = generateFileKey(token.appId, file);
    const uploadUrl = new URL(`https://${region}.${ingestHost}/${key}`);

    uploadUrl.searchParams.set('expires', String(Date.now() + 60 * 60 * 1000));
    uploadUrl.searchParams.set('x-ut-identifier', token.appId);
    uploadUrl.searchParams.set('x-ut-file-name', file.name);
    uploadUrl.searchParams.set('x-ut-file-size', String(file.size));
    uploadUrl.searchParams.set('x-ut-file-type', file.type);
    uploadUrl.searchParams.set('x-ut-content-disposition', 'inline');
    uploadUrl.searchParams.set('x-ut-acl', 'public-read');

    return jsonResponse([
      {
        url: await signUploadUrl(uploadUrl, token.apiKey),
        key,
        name: file.name,
        customId: null,
      },
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload setup failed.';
    console.error('Avatar upload setup failed:', error);
    return jsonResponse({ error: message }, 400);
  }
});

http.route({
  path: '/api/uploadthing',
  method: 'GET',
  handler: handleUploadthing,
});

http.route({
  path: '/api/uploadthing',
  method: 'POST',
  handler: handleUploadthing,
});

export default http;
