import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
const packedB64 = await fs.readFile(new URL('./build.b64', import.meta.url), 'utf8');
const source = zlib.gunzipSync(Buffer.from(packedB64.trim(), 'base64')).toString('utf8');
const temp = path.join(os.tmpdir(), `today-mlb-build-${Date.now()}.mjs`);
await fs.writeFile(temp, source, 'utf8');
await import(`file://${temp}`);
