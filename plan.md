# 全站域名与品牌迁移

状态：自动执行完成，待统一人工验收；线上域名解析阻塞。

## 范围与实现

允许修改 `vite.config.ts`、`index.html`、`README.md`、`scripts/seo.mjs`、`.env.example`、`plan.md`，以及确有需要的单一站点配置文件。

复用现有 Vite 页面生成、social 元信息、JSON-LD、sitemap 与 robots 生成入口。新增 SITE_URL 常量，统一默认生产源为 https://punchcardcalculator.com，保留现有构建环境覆盖能力。默认生产域名只定义一次。全页 og:site_name 和页脚品牌为 Punch Card Calculator。首页 H1 保持 Time Card Calculator，其他页面现有功能标题保留。隐私和条款中的域名、联系方式如存在则同步更新。

Detail、快速填写、Report 的输入、计算、数据和交互无变更。保留 docs 四份已有未提交修改。

## 阶段与验收

1. 在现有 SEO 检查补充默认域名、品牌、canonical 与 og:url 完全相同、结构化数据及图片源断言，运行默认构建确认旧值触发 RED。
2. 在现有生成链集中接入 SITE_URL 并更新品牌及 README 默认域名说明。构建后 SEO 检查 GREEN，确认首页 H1 未变，sitemap 恰好六条。
3. 运行 typecheck、单元测试、SEO 检查与 git diff --check。启动产物预览，curl 首页、with-lunch、biweekly、decimal、privacy、terms、sitemap.xml、robots.txt，确认八个入口直接返回 200，核对元信息并扫描源码与 dist 无旧域名。

命令包括 npm run build、npm run test:seo、npm run typecheck、npm run test:unit、npm run preview 和 curl。

线上新域名六页另行 curl 验证并如实记录。域名 DNS、托管绑定或部署若尚未就绪，记录真实阻塞，不把本地产物 200 当作线上通过。本轮未授权部署或域名账户配置。浏览器与人工验收保留待统一人工验收状态。

## 主 agent 计划自查

已核对现有公共生成入口、六条 sitemap 列表与相关 PRD。无 A/B 问题。线上域名绑定与部署状态尚未验证。

## 本轮执行证据

- RED：默认构建后新增 SEO 断言在 canonical 新域名检查处失败。
- GREEN：默认构建、SEO 检查、typecheck 通过，单元测试 6 文件 66 项通过。首页 H1 保留，六页品牌、图片源、结构化 URL 与 canonical/og:url 检查通过，sitemap 六条及 robots 检查通过。隐私及条款正文没有联系方式或旧域名。
- curl 本地构建产物的六页、sitemap、robots 共八个入口均为 200。
- curl 线上八个入口均因 Could not resolve host 失败，尚不能确认线上 200。
- 全仓含隐藏文件及 dist 扫描旧域名无命中（排除 .git 和 node_modules）。实现入口为 vite.config.ts 中 SITE_URL 与现有页面生成链，index.html 页脚；.env.example 清除旧默认值。
- 主 agent 自查无 A/B 问题。本轮文件 diff --check 通过；全量检查发现既有 docs 四份修改中存在行尾空白，保持原样。未执行浏览器及人工验收。
