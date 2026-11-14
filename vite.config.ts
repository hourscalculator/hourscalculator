import { topics, relatedPages } from "./src/seo/content";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";
export default defineConfig(() => {
  const raw = process.env.SITE_URL || "https://hourscalculator.io";
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
          html = html.replace("</article>", relatedPages() + "</article>");
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
            for (const { path, title, description, body, faq } of topics) {
              const faqHtml = `<section id="faq"><h2>${title} FAQ</h2>${faq.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join("")}</section>`;
              let source = home
                .replace(/rel="canonical" href="[^"]*"/, `rel="canonical" href="${origin}/${path}/"`)
                .replace(/(<meta\s+name="description"\s+content=")[^"]*/, `$1${description}`)
                .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
                .replace(/<h1[^>]*>.*?<\/h1>/s, `<h1>${title}</h1>`)
                .replace(/<article id="help">[\s\S]*?<\/article>/, `<article id="help">${body}${faqHtml}<p>For other reporting periods and settings, use the <a href="/">time card calculator</a>.</p>${relatedPages()}</article>`);
              source = source.replace(
                /(<script type="application\/ld\+json">)(.*?)(<\/script>)/s,
                (_, open, json, close) => {
                  const schema = JSON.parse(json);
                  schema["@graph"][0].url = `${origin}/${path}/`;
                  schema["@graph"][1].mainEntity = faq.map(([name, text]) => ({
                    "@type": "Question", name,
                    acceptedAnswer: { "@type": "Answer", text },
                  }));
                  return open + JSON.stringify(schema) + close;
                },
              );
              mkdirSync(`dist/${path}`, { recursive: true });
              writeFileSync(`dist/${path}/index.html`, source);
            }
          }
          writeFileSync(
            "dist/sitemap.xml",
            `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["", "with-lunch", "biweekly", "decimal"].map((path) => `<url><loc>${origin}/${path ? path + "/" : ""}</loc></url>`).join("")}</urlset>`,
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
