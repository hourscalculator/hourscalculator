# 暂缓收录未完善的专题页

状态：自动执行完成，待统一人工验收。用户已明确要求在正文补齐前，从 sitemap 移除 `/with-breaks/`、`/free/`、`/overtime-calculator/`。

范围：`vite.config.ts`、`scripts/seo.mjs`、`plan.md`。只调整 sitemap 收录与对应验收断言；保留这三页的生成和预览路由。Detail、快速填写、Report 的产品需求和正文不变。

1. 将 SEO 验收改为 6 个 sitemap 地址，并断言三条待完善地址不在其中；先运行构建和 SEO 验收，确认当前实现因仍包含这三条而失败（RED）。
2. 从 sitemap 生成列表中移除三条地址；重新构建并通过 SEO 验收（GREEN）。
3. 检查 sitemap 其余地址、页面生成、`git diff --check` 与最终 diff。

验收：sitemap 保留首页、`with-lunch`、`biweekly`、`decimal`、`privacy`、`terms` 共 6 条，且不包含三条待完善地址；三页本身仍照常生成。验证命令：`npm run build`、`npm run test:seo`、`git diff --check`。

## 执行证据与自查

- RED：构建产物仍有 9 条 sitemap 地址，SEO 断言识别出三条待移除地址并失败。
- GREEN：`npm run build`、`npm run test:seo`、`git diff --check` 通过；产物 sitemap 保留 6 条，三个专题页仍生成。
- 主 agent 实现自查：无 A/B 级问题；未改动计算、三个模块 PRD 或页面正文。浏览器与线上人工验收未执行。
