import { readFileSync } from 'node:fs';
import { importPKCS8, SignJWT } from 'jose';

const [clientId, teamId, keyId, privateKeyPath] = process.argv.slice(2);

if (!clientId || !teamId || !keyId || !privateKeyPath) {
  console.error('Usage: node scripts/generate-apple-client-secret.mjs <clientId> <teamId> <keyId> <privateKeyPath>');
  process.exit(1);
}

const privateKey = readFileSync(privateKeyPath, 'utf8');
const key = await importPKCS8(privateKey, 'ES256');
const now = Math.floor(Date.now() / 1000);
const clientSecret = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuer(teamId)
  .setSubject(clientId)
  .setAudience('https://appleid.apple.com')
  .setIssuedAt(now)
  .setExpirationTime(now + 180 * 24 * 60 * 60)
  .sign(key);

process.stdout.write(clientSecret);
