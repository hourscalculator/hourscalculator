# 修复 Cloudflare Workers 构建与部署

- 状态：执行中。用户已授权修复并确认暂用 https://hourscalculator.io。
- 小型任务，仅修改 vite.config.ts、wrangler.jsonc、README.md、.env.example 和本计划。
- 复用现有 Vite SEO 生成入口，SITE_URL 未设置时使用暂定域名，保留环境覆盖及校验。
- 配置 Workers 静态资源目录 dist，匹配 npm run build 与 npx wrangler deploy。
- 验证无环境变量构建、覆盖域名构建、SEO 检查、类型检查、单元测试及 Wrangler dry-run。
- 计划自查：范围、构建入口与 SEO 消费者一致，无 A/B 问题。
- 线上部署与域名绑定需要 Cloudflare 账户环境，未验证部分据实披露。
- 实现自查完成：构建复用现有 SEO 入口，Workers assets 指向实际产物，无额外运行时。
- 默认构建、SITE_URL 覆盖构建、typecheck、44 项单元测试、diff 检查通过。
- SEO 检查存在入口页 /with-lunch 链接断言失败，相关页面内容未在本轮修改。
- Wrangler dry-run 的 npx 命令未返回结果，部署预检与线上部署尚未验证。
- 状态：修复完成，待 Cloudflare 构建部署验收。
