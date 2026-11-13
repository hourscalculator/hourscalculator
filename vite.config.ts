import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";
export default defineConfig(({ command }) => {
  const raw = process.env.SITE_URL;
  if (command === "build" && !raw)
    throw Error("Set SITE_URL to the public site origin before building");
  const origin = raw ? new URL(raw).origin : "";
  if (raw && (!/^https?:\/\//.test(raw) || new URL(raw).pathname !== "/"))
    throw Error("SITE_URL must be an HTTP(S) origin");
  return {
    plugins: [
      {
        name: "single-page-seo",
        configurePreviewServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (
              req.url &&
              /^\/(with-lunch|biweekly|decimal)\/?(?:\?.*)?$/.test(req.url)
            )
              req.url = req.url.replace(/\/?(\?.*)?$/, "/index.html$1");
            next();
          });
        },
        transformIndexHtml(html) {
          const faq = [
            ...(
              html.match(/<section id="faq">([\s\S]*?)<\/section>/)?.[1] ?? ""
            ).matchAll(
              /<details>\s*<summary>(.*?)<\/summary>\s*<p>(.*?)<\/p>\s*<\/details>/gs,
            ),
          ].map((m) => ({
            "@type": "Question",
            name: m[1].replace(/\s+/g, " ").trim(),
            acceptedAnswer: {
              "@type": "Answer",
              text: m[2].replace(/\s+/g, " ").trim(),
            },
          }));
          return html.replaceAll("%SITE_URL%", origin).replace(
            "</head>",
            `<script type="application/ld+json">${JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  name: "Time Card Calculator",
                  url: origin + "/",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Any",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                  },
                },
                { "@type": "FAQPage", mainEntity: faq },
              ],
            })}</script></head>`,
          );
        },
        closeBundle() {
          const home = readFileSync("dist/index.html", "utf8");
          {
            for (const [path, title, copy] of [
              [
                "with-lunch",
                "Time Card Calculator With Lunch",
                "Automatically deduct a 30 minute unpaid lunch after 6 hours of work. Manual unpaid breaks replace the automatic deduction.",
              ],
              [
                "biweekly",
                "Biweekly Time Card Calculator",
                "Calculate two weeks of work with weekly overtime thresholds applied separately to each week.",
              ],
              [
                "decimal",
                "Decimal Hours Calculator",
                "See decimal hours first, with actual minutes and hours:minutes alongside. Display rounding preserves pay.",
              ],
            ]) {
              let source = home
                .replaceAll(origin + '/"', origin + "/" + path + '"')
                .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
                .replace(
                  /<h1[^>]*>.*?<\/h1>/s,
                  `<h1>${title}</h1><p>${copy}</p>`,
                );
              const question = `How does ${title} start a new card?`;
              source = source.replace(
                '<section id="faq">',
                `<section id="faq"><details><summary>${question}</summary><p>${copy}</p></details>`,
              );
              source = source.replace(
                /(<script type="application\/ld\+json">)(.*?)(<\/script>)/s,
                (_, open, json, close) => {
                  const schema = JSON.parse(json);
                  schema["@graph"][1].mainEntity.push({
                    "@type": "Question",
                    name: question,
                    acceptedAnswer: { "@type": "Answer", text: copy },
                  });
                  return open + JSON.stringify(schema) + close;
                },
              );
              mkdirSync(`dist/${path}`, { recursive: true });
              writeFileSync(`dist/${path}/index.html`, source);
            }
          }
          writeFileSync(
            "dist/sitemap.xml",
            `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["", "with-lunch", "biweekly", "decimal"].map((path) => `<url><loc>${origin}/${path}</loc></url>`).join("")}</urlset>`,
          );
          writeFileSync(
            "dist/robots.txt",
            `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
          );
        },
      },
    ],
  };
});
