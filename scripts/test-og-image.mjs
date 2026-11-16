import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Social cards must be generated at build time and shared by every page.
const ogImage = readFileSync('dist/og-image.png');
assert.equal(ogImage.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(ogImage.readUInt32BE(16), 1200);
assert.equal(ogImage.readUInt32BE(20), 630);
assert.ok(ogImage.length < 300_000, `Social image is ${ogImage.length} bytes`);
for (const path of ['', 'with-lunch/', 'biweekly/', 'decimal/', 'with-breaks/', 'free/', 'overtime-calculator/', 'privacy/', 'terms/']) {
  const page = readFileSync(`dist/${path}index.html`, 'utf8');
  for (const tag of [
    'property="og:image" content="https://punchcardcalculator.com/og-image.png"',
    'name="twitter:image" content="https://punchcardcalculator.com/og-image.png"',
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'property="og:image:type" content="image/png"',
  ]) assert.ok(page.includes(tag), `${path || '/'} missing ${tag}`);
}
console.log('Social image dimensions, size and all nine pages passed');
