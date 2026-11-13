import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const html = readFileSync("dist/index.html", "utf8");
assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
assert.match(html, /<html lang="en">/);
assert.match(html, /Time Card Calculator – Free Hours &amp; Pay Calculator/);
assert.equal(
  html
    .match(/id="about-copy">(.*?)<\/p>/s)[1]
    .trim()
    .split(/\s+/).length,
  120,
);
const schema = JSON.parse(
  html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
);
assert.equal(schema["@graph"][1].mainEntity.length, 8);
assert.ok(schema["@graph"][1].mainEntity.every(q => !q.name.includes("<") && !q.acceptedAnswer.text.includes("<")));
for (const faq of schema["@graph"][1].mainEntity) {
  assert.ok(html.replace(/\s+/g, " ").includes(faq.name));
  assert.ok(html.replace(/\s+/g, " ").includes(faq.acceptedAnswer.text));
}
const canonical = html.match(/rel="canonical" href="(.*?)"/)[1];
assert.ok(canonical.startsWith("https://"));
const sitemap = readFileSync("dist/sitemap.xml", "utf8");
assert.equal((sitemap.match(/<loc>/g) || []).length, 4);
assert.ok(sitemap.includes(canonical));
assert.ok(
  readFileSync("dist/robots.txt", "utf8").includes(canonical + "sitemap.xml"),
);
console.log(
  "SEO checks passed: static content, 120 word About, 8 FAQs, schema, canonical, sitemap, robots",
);

for (const path of ['with-lunch', 'biweekly', 'decimal']) {
  const page = readFileSync(`dist/${path}/index.html`, 'utf8');
  assert.ok(page.includes(`rel="canonical" href="${canonical}${path}"`));
  assert.ok(page.includes('id="calculator"'));
  assert.ok(page.includes('href="/with-lunch"'));
}
