import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const html = readFileSync("dist/index.html", "utf8");
assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
assert.ok(html.includes("<h1>Free Time Card Calculator</h1>"));
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
  assert.ok(page.includes(`rel="canonical" href="${canonical}${path}/"`));
  assert.ok(page.includes('id="calculator"'));
  assert.ok(page.includes('href="/with-lunch/"'));
}

assert.ok(html.includes('href="/" class="brand"'));
assert.ok(!html.includes('id="help-details"'));
assert.ok(html.includes('id="templates"'));
const words = text => text.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
const article = page => page.match(/<article id="help">([\s\S]*?)<\/article>/)[1];
assert.ok(words(article(html)) >= 1200 && words(article(html)) <= 1800);
const descriptions = new Set([html.match(/name="description"\s+content="([^"]+)"/)[1]]);
for (const path of ['with-lunch', 'biweekly', 'decimal']) {
  const page = readFileSync(`dist/${path}/index.html`, 'utf8');
  assert.ok(page.includes('href="#help"'));
  assert.ok(page.includes('id="help"'));
  assert.ok(!page.includes('start a new card?'));
  assert.ok(words(article(page)) >= 400 && words(article(page)) <= 600);
  assert.ok(sitemap.includes(`${canonical}${path}/`));
  assert.ok(page.includes('href="/">time card calculator</a>'));
  for (const other of ['with-lunch', 'biweekly', 'decimal']) assert.ok(page.includes(`href="/${other}/"`));
  descriptions.add(page.match(/name="description"\s+content="([^"]+)"/)[1]);
  const graph = JSON.parse(page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(graph['@graph'][1].mainEntity.length, 5);
  for (const question of graph['@graph'][1].mainEntity) {
    assert.ok(page.includes(question.name));
    assert.ok(page.includes(question.acceptedAnswer.text));
  }
}
assert.equal(descriptions.size, 4);
console.log('Page word counts, independent descriptions, topic FAQs and navigation passed');
