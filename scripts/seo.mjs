import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const html = readFileSync("dist/index.html", "utf8");
assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
assert.ok(html.includes("<h1>Time Card Calculator</h1>"));
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
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url);
const sitemapPaths = ["", "with-lunch", "biweekly", "decimal", "privacy", "terms"];
assert.deepEqual(
  sitemapUrls,
  sitemapPaths.map((path) => `${canonical}${path ? `${path}/` : ""}`),
);
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

const firstCard = html.match(/id="worker-cards">\s*(<section[\s\S]*?<\/section>)/)?.[1] ?? "";
assert.match(firstCard, /<option value="2" selected/);
assert.match(firstCard, /data-setting="auto"[^>]*checked="checked"/);
assert.match(firstCard, /data-setting="deduction"[^>]*value="30"/);
assert.match(html, /<option value="weekly40" selected/);
assert.match(html, /data-card="defaultSegments"[^>]*value="2"/);
assert.match(html, /id="daily-report">[\s\S]*?0:00[\s\S]*?0\.00[\s\S]*?\$0\.00/);

const expectedPages = [
  ["", "Time Card Calculator – Free Hours &amp; Pay Calculator", "Time Card Calculator", "time card calculator"],
  ["with-lunch/", "Time Card Calculator With Lunch – Paid & Unpaid Breaks", "Time Card Calculator With Lunch", "with lunch"],
  ["biweekly/", "Biweekly Time Card Calculator – Two-Week Payroll", "Biweekly Time Card Calculator", "biweekly"],
  ["decimal/", "Decimal Hours Calculator – Minutes to Decimal Conversion", "Decimal Hours Calculator for Time Cards", "decimal"],
];
const titles = new Set();
for (const [path, expectedTitle, expectedHeading, keyword] of expectedPages) {
  const page = readFileSync(`dist/${path}index.html`, "utf8");
  const title = page.match(/<title>(.*?)<\/title>/s)[1];
  const heading = page.match(/<h1[^>]*>(.*?)<\/h1>/s)[1];
  const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
  assert.equal(title, expectedTitle, path);
  assert.equal(heading, expectedHeading, path);
  assert.equal((page.match(/<h1[ >]/g) || []).length, 1, path);
  assert.notEqual(title, heading, path);
  assert.ok(description.toLowerCase().includes(keyword), path);
  titles.add(title);
}
assert.equal(titles.size, 4);
assert.match(html, /<h1>Time Card Calculator<\/h1>\s*<p class="lede">Free, no signup — calculates hours, lunch breaks, weekly and biweekly overtime, decimal hours and gross pay\.<\/p>/);
console.log("Four-page titles, headings, target keywords and homepage subtitle passed");

for (const path of ['', 'with-lunch/', 'biweekly/', 'decimal/', 'with-breaks/', 'free/', 'overtime-calculator/', 'privacy/', 'terms/']) {
 const page = readFileSync(`dist/${path}index.html`, 'utf8');
 assert.match(page, /og:image/);
 assert.match(page, /twitter:card/);
 assert.match(page, /favicon.svg/);
 assert.equal(page.match(/property="og:url" content="([^"]+)"/)[1], page.match(/rel="canonical" href="([^"]+)"/)[1]);
}

const shingles = text => {
 const tokens = text.replace(/<[^>]*>/g, ' ').toLowerCase().match(/[a-z]+/g);
 return new Set(tokens.slice(0,-4).map((_,i)=>tokens.slice(i,i+5).join(' ')));
};
const homeShingles = shingles(article(html));
for (const path of ['biweekly', 'decimal']) {
 const page = readFileSync(`dist/${path}/index.html`, 'utf8');
 const set = shingles(article(page));
 const similarity = [...set].filter(s=>homeShingles.has(s)).length / set.size;
 assert.ok(similarity < 0.4);
 console.log(`${path} five-word phrase overlap: ${(similarity*100).toFixed(1)}%`);
 assert.match(page, /BreadcrumbList/);
}
const decimalPage = readFileSync('dist/decimal/index.html','utf8');
assert.equal((article(decimalPage).match(/<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr>/g)||[]).length,60);
assert.match(html, /id="biweekly"[^>]*[^]*?Report period/);
assert.match(html, /id="lunch"/);
assert.equal((sitemap.match(/<lastmod>2026-11-15<\/lastmod>/g)||[]).length,6);

// Default production identity must propagate through the generated pages.
const expectedOrigin = process.env.SITE_URL || "https://punchcardcalculator.com";
for (const path of sitemapPaths) {
  const page = readFileSync(`dist/${path ? path + "/" : ""}index.html`, "utf8");
  const expectedUrl = `${new URL(expectedOrigin).origin}/${path ? path + "/" : ""}`;
  assert.ok(page.includes(`rel="canonical" href="${expectedUrl}"`));
  assert.ok(page.includes(`property="og:url" content="${expectedUrl}"`));
  assert.ok(page.includes(`property="og:image" content="${new URL(expectedOrigin).origin}/og-image.png"`));
  assert.ok(page.includes('property="og:site_name" content="Punch Card Calculator"'));
  assert.ok(page.includes('<footer>Punch Card Calculator'));
  for (const [, json] of page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const checkUrls = value => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "url" || key === "item") assert.ok(child.startsWith(new URL(expectedOrigin).origin + "/"));
        else checkUrls(child);
      }
    };
    checkUrls(JSON.parse(json));
  }
}
