import { topics, relatedPages } from "./src/seo/content";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";
function social(html: string) {
  const url = html.match(/rel="canonical" href="([^"]+)"/)![1];
  const title = html.match(/<title>(.*?)<\/title>/)![1];
  const description = html.match(/name="description"\s+content="([^"]+)"/)![1];
  const origin = new URL(url).origin;
  return html.replace(/<link data-social[\s\S]*?<!-- social-end -->/g, "").replace("</head>", `<link data-social rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="Hours Calculator"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${origin}/og-image.png"><!-- social-end --></head>`);
}
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
              /^\/(with-lunch|biweekly|decimal|with-breaks|free|overtime-calculator|privacy|terms)\/?(?:\?.*)?$/.test(req.url)
            )
              req.url = req.url.replace(/\/?(\?.*)?$/, "/index.html$1");
            next();
          });
        },
        transformIndexHtml(html) {
          const workerCard = html.match(/<template id="worker-card-template">([\s\S]*?)<\/template>/)![1];
          html = html.replace('<div id="worker-cards"></div>', `<div id="worker-cards">${workerCard}</div>`);
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
          const home = social(readFileSync("dist/index.html", "utf8"));
          writeFileSync("dist/index.html", home);
          {
            for (const { path, title, metaTitle, description, body, faq } of topics) {
              const faqHtml = `<section id="faq"><h2>${path === "biweekly" ? "Biweekly time card" : path === "decimal" ? "Decimal time card" : title} FAQ</h2>${faq.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join("")}</section>`;
              let source = home
                .replace(/rel="canonical" href="[^"]*"/, `rel="canonical" href="${origin}/${path}/"`)
                .replace(/(<meta\s+name="description"\s+content=")[^"]*/, `$1${description}`)
                .replace(/<title>.*?<\/title>/s, `<title>${metaTitle}</title>`)
                .replace(/<h1[^>]*>.*?<\/h1>/s, `<h1>${title}</h1>`)
                .replace(/<article id="help">[\s\S]*?<\/article>/, `<article id="help">${body.replace("<p>", `<p>Use the <a href="/">time card calculator</a> to review your entries. `)}${faqHtml}<p>For other reporting periods and settings, use the <a href="/">time card calculator</a>.</p>${relatedPages()}</article>`);
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
              source = source.replace('<article id="help">', `<nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <a href="/">Time Card Calculator</a> &gt; ${title}</nav><script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:["Home","Time Card Calculator",title].map((name,i)=>({"@type":"ListItem",position:i+1,name,item:i===2?`${origin}/${path}/`:`${origin}/`}))})}</script><article id="help">`);
              source = social(source);
              mkdirSync(`dist/${path}`, { recursive: true });
              writeFileSync(`dist/${path}/index.html`, source);
            }
          }
          for (const [path, title, copy] of [
            ["with-breaks", "Time Card Calculator With Breaks", "Record paid and unpaid breaks and review net working time."],
            ["free", "Free Time Card Calculator", "Calculate working hours and estimated gross pay without an account."],
            ["overtime-calculator", "Overtime Calculator", "Review regular and overtime hours with the selected weekly rule."],
            ["privacy", "Privacy", "All calculation data stays in your own browser localStorage. We do not upload calculation data to a server, create accounts or use tracking cookies. Printing and CSV exports are generated locally in your browser. Clearing browser storage removes saved drafts. Sharing a snapshot deliberately puts data in the link fragment, which anyone holding that link can read."],
            ["terms", "Terms", "Results are estimates for checking and reference. They do not constitute a payslip or legal advice. Overtime and meal break rules depend on employer policy and applicable local law. We accept no liability for wage disputes arising from use of these results. Review entries and settings before submitting hours to payroll."],
          ]) {
            let page = home.replace(/rel="canonical" href="[^"]*"/, `rel="canonical" href="${origin}/${path}/"`).replace(/<title>.*?<\/title>/s, `<title>${title}</title>`).replace(/(<meta\s+name="description"\s+content=")[^"]*/, `$1${copy}`).replace(/<h1>.*?<\/h1>/, `<h1>${title}</h1>`).replace(/<article id="help">[\s\S]*?<\/article>/, `<article id="help"><p>Return to the <a href="/">time card calculator</a>.</p><h2>${title}</h2><p>${copy}</p>${relatedPages()}</article>`);
            page = page.replace(/<script type="application\/ld\+json">.*?<\/script>/gs, "");
            if (path === "privacy" || path === "terms") page = page.replace(/<section id="calculator"[\s\S]*?<div class="help-section">/, '<div class="help-section">').replace(/<script type="module"[^>]*><\/script>/g, "");
            mkdirSync(`dist/${path}`, {recursive:true});
            page = page.replace('<article id="help">', `<nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <a href="/">Time Card Calculator</a> &gt; ${title}</nav><script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:["Home","Time Card Calculator",title].map((name,i)=>({"@type":"ListItem",position:i+1,name,item:i===2?`${origin}/${path}/`:`${origin}/`}))})}</script><article id="help">`);
            writeFileSync(`dist/${path}/index.html`, social(page));
          }
          writeFileSync(
            "dist/sitemap.xml",
            `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["", "with-lunch", "biweekly", "decimal", "privacy", "terms"].map((path) => `<url><loc>${origin}/${path ? path + "/" : ""}</loc><lastmod>2026-11-15</lastmod></url>`).join("")}</urlset>`,
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
