# Quick Fill 休息分钟在 Detail 显示

状态：自动验证完成，待统一人工验收；全量浏览器套件存在未通过项。

## 目标与范围

规模：小型。Quick Fill 只记录每日无薪休息分钟数，Detail 应在对应工作段显示该分钟数，不推断或伪造休息起止时间。保留现有计算语义，不重复扣除。

允许修改：`docs/README.md`、`docs/quick-fill.prd.md`、`docs/detail.prd.md`、`src/ui/app.ts`、`src/styles/main.css`、`tests/e2e/mode-sync.spec.ts`、本计划。Quick Fill 输入、数据模型、计算公式及 Report 输出不改；保留工作区已有改动。

## 复用与验收

沿用 `renderDays()` 的 Detail 展示入口和 `dailyBreakMinutes` 状态；通过现有 Simple → Calculate → Detailed 路径验证，不新增映射状态或时间推断。Report 继续使用现有计算结果。

| 检查 | 通过标准 | 验证 |
| --- | --- | --- |
| 分钟数传递 | Quick Fill 选30分钟后，Detail 对应日期显示 `Unpaid break: 30 min`，不生成起止时间输入 | Playwright |
| 计算 | 同一数据进入 Detail 前后净工时不变，休息仅扣一次 | Playwright |
| 零休息 | 0分钟不显示休息摘要 | Playwright |
| 显式时段 | 用户在 Detail 输入具体休息后，摘要不再表示一条仍生效的分钟扣除 | Playwright |

先在现有 `tests/e2e/mode-sync.spec.ts` 扩展真实模式切换用例并确认 RED，再最小修改 Detail 渲染。最终运行目标 Playwright 用例、`npm run typecheck`、`npm run test:unit`、`npm run test:e2e`、`git diff --check`。浏览器自动验证不替代统一人工验收。

## 最终验证

构建、类型检查、单元测试及 Quick Fill → Detail 浏览器用例通过。全量浏览器套件 176 项通过、58 项失败、3 项跳过；失败集中在既有日期/工作段定位冲突、测试域名断言不匹配及进入 Detail 前的向导用例超时。人工验收未执行，待统一验收。

---

# 分享快照兼容旧加班设置值

状态：执行中。

## 目标与范围

规模：小型。用户提供的 `#report=` 快照包含 `settings.mode: "weekly40"`，当前读取边界只接受规范值 `weekly`、`daily`、`ca`，因此显示 `Invalid settings`。修复后把这个历史表示迁移为 `weekly`，并保留原有 `overtime`、费率和其它设置。

允许修改：`src/io/delivery.ts`、`tests/e2e/delivery.spec.ts`、本计划。Detail、Quick Fill、计算规则、分享格式及页面文案不改；工作区已有其它改动保留。根计划中尚待执行的卡片锚点合同保持原样。

## 复用与影响

沿用分享链接 `previewShare()` → `decodeShare()` → `decodeCard()` 路径，在共享数据校验入口做一次旧值规范化。`decodeCard()` 也供本地草稿加载及嵌套员工卡复用；迁移后统一使用现有 `Settings.mode`，避免把 `weekly40` 当成每日加班规则。

## 验收与验证

| 检查 | 通过标准 | 验证 |
| --- | --- | --- |
| 旧分享快照 | gzip 的 `#report=` 快照含 `weekly40` 时，Report 正常只读显示，无错误 | Playwright |
| 加班口径 | 单日9小时的周加班快照显示9小时常规工时、0小时加班 | Playwright |
| 既有行为 | 类型检查、单元测试和全量浏览器测试通过 | npm 脚本 |

先在 `tests/e2e/delivery.spec.ts` 用真实 gzip 分享协议构造旧枚举快照；每轮先 `npx vite build` 更新预览产物，再运行 `npx playwright test tests/e2e/delivery.spec.ts --project=chromium --grep "legacy weekly40"` 确认 RED/GREEN。随后运行 `npm run typecheck`、`npm run test:unit`、`npm run test:e2e`、`git diff --check`。未做线上部署；自动完成后仍待统一人工验收。

---

# 全站页头品牌统一

状态：自动执行完成，待统一人工验收。

## 范围与口径

允许修改 index.html、scripts/seo.mjs、plan.md。复用首页模板及 Vite 的所有派生页面生成入口。Detail、快速填写、Report 无功能影响。

页头按用户指定结构显示 punch<span>card</span>calculator，href 保持 /，新增 aria-label="Punch Card Calculator"。页头可访问名称、页脚品牌、og:site_name 完全一致。视觉字标按指定的小写连写形式保留，首页 H1 保持 Time Card Calculator。

全站发布 HTML（含可见文案、meta、JSON-LD）不得含旧品牌连续字符串。全仓搜索中 wrangler.jsonc 的 Worker 标识及 docs/README.md 的历史线上参考地址仍是技术配置和历史资料，不进入发布页面，本轮保留。若要求连这些非页面引用也清除，需要确认 Worker 是否迁移，避免改变现有部署目标。

## 阶段与验证

1. 在现有 SEO 检查补充六页页头结构、链接、可访问名称以及旧品牌零命中断言。构建并执行 npm run test:seo，确认旧页头导致 RED。
2. 只修改共享首页页头，重新 npm run build 与 npm run test:seo，确认 GREEN。检查全部生成 HTML，确保其他派生页面也统一品牌。
3. npm run typecheck、npm run test:unit、git diff --check，主 agent 自查最终差异。记录真实测试证据，浏览器及人工验收待完成。

## 计划自查

已核对 PRD、共享模板、生成链及 SEO 检查入口。需明确的口径是字标使用指定连写结构，完全一致以可访问名称比较。生产页无旧品牌与保留既有 Worker 标识可以同时满足。无须修改计算、样式或站点元信息生成逻辑。

## 本轮执行证据与实现自查

- RED：新增六页页头结构断言后，构建成功，SEO 检查因旧页头不满足品牌要求失败。
- GREEN：修改 index.html 共享页头后，npm run build、npm run test:seo、npm run typecheck 均通过；npm run test:unit 共 6 文件 66 项通过；git diff --check 通过。
- 全部 9 个生成 HTML（含指定六页）检查旧名称零命中，页头结构及可访问名称正确。六页页脚、og:site_name 和首页 H1 的既有断言通过。
- 主 agent 自查无 A/B 问题，改动仅涉及共享页头、两条 SEO 断言及本计划。复用原有生成链，无样式或计算逻辑修改。浏览器和人工验收未执行，线上部署未执行。

---

# 快速修复：暂不收录三页

状态：自动执行完成，待统一人工验收。

## 任务与范围

规模：小型。只调整共享静态页生成逻辑及其 SEO 检查，不改变运行时功能或页面内容。

目标：`/with-breaks/`、`/free/`、`/overtime-calculator/` 的 head 输出 `noindex,follow`，H1 后不再出现同名 H2；当前不进入 sitemap 或任何 Related 区。

允许修改：`vite.config.ts`、`scripts/seo.mjs`、本计划。禁止新增页面级 robots 实现、把三页加入 Related，或更改其他路由内容。工作区已有品牌改动保持不动。

## 实现与复用

三页由 `vite.config.ts` 的同一页面循环生成；复用 `social()` 注入 robots。`TEMPORARY_PAGES_INDEXABLE` 默认 `false`，同一开关控制三页的 robots 值及 sitemap 条目；以后改成 `true` 即会移除 noindex 并加入 sitemap。三页继续不进入 `src/seo/content.ts` 的 `relatedPages()` 列表。只对这三个路径省略生成器中与 H1 同名的 H2。

## 验收与验证

| 检查 | 通过标准 | 方式 |
| --- | --- | --- |
| 三页 robots | head 各含唯一 `noindex,follow`，不含 `noindex,nofollow` | SEO 脚本、curl 本地预览 |
| 标题 | 三页 H1 后没有文字完全相同的 H2 | SEO 脚本 |
| 站点导航 | robots 为 noindex 时三页不在 sitemap；任何开关状态下 Related 区都没有指向三页的链接 | SEO 脚本 |
| 响应 | 三条本地预览路由均返回 HTML | curl |

扩展 `scripts/seo.mjs` 检查 robots、标题、sitemap 与所有生成页中的 Related 链接；SEO 检查读取同一个索引开关，核对 robots 和 sitemap 状态。最小修改 `vite.config.ts` 的共享生成入口。验证：`npx vite build`、`npm run test:seo`、`npm run typecheck`、三页本地 `curl` 和 `git diff --check` 均通过；curl 返回 200，三页 head 均为唯一 `noindex,follow`，H1 后没有同名 H2。完整 `npm run build` 在额外的未提交 OG 图片生成步骤启动 Chromium 时因本机权限失败；本次页面构建及 SEO 验收已通过。浏览器和人工验收未执行，待统一人工验收。

---

# 快速修复：三张主题内页面包屑

状态：本任务目标验收完成，待统一人工验收；全量 SEO 检查受工作区并发修改影响暂未通过。

## 范围与验收

规模：小型。只修改 `with-lunch`、`biweekly`、`decimal` 三张主题页的静态生成逻辑、对应 SEO 验收和本计划。保留工作区现有其他改动。

三页可见面包屑为 `Home`（链接 `/`）和当前页标题（纯文本）；BreadcrumbList 仅含 `Home` 与当前页两个 ListItem，position 分别为 1、2，当前页 item 指向当前页 URL。

## 阶段与验证

1. 在 `scripts/seo.mjs` 为三页增加 JSON-LD 条目数、名称与 position，以及可见 nav 两段结构断言；执行 `npx vite build` 和 `npm run test:seo`，确认现状触发 RED。
2. 修改 `vite.config.ts` 的主题页生成入口，复用其现有 `title` 与 `origin/path` 生成两级 breadcrumb；重建并重跑 SEO 检查确认 GREEN。
3. 运行 `npm run typecheck`、`npm run test:unit`、`git diff --check`，核对三页生成源码与本轮差异。浏览器与人工验收仍待统一验收。

## 本轮执行证据与实现自查

- RED：`npx vite build` 成功；新增 SEO 断言因 `with-lunch` 仍有三个 JSON-LD 条目而失败。
- GREEN：首次重建后 `npm run test:seo` 通过。最终产物的定向复核也通过：三页 JSON-LD 均仅含 Home 和当前页，position 为 1、2；可见 nav 仅有首页链接和当前页纯文本。
- `npm run typecheck` 通过；`npm run test:unit` 6 个文件、66 项通过；`git diff --check` 通过。
- 最终再次运行全量 `npm run test:seo` 时，在本任务面包屑断言通过后，因并发任务修改 `index.html` 将现有首页 `biweekly` 锚点改为 `data-anchor`，触发脚本中既有锚点断言失败。本轮未修改该并发任务的文件或断言。
- 主 agent 实现自查无 A/B 问题。实现复用主题页静态生成入口与已有 `title`、`origin/path`；不影响其它页面或计算逻辑。浏览器与人工验收未执行，待统一验收。

---

# 快速修复：卡片模板锚点唯一性

状态：自动执行完成，待统一人工验收；完整 E2E 套件未完成。

## 任务与范围

规模：小型。只调整一份可复制卡片模板、现有锚点分配逻辑和对应浏览器验收；不改变数据、计算或报告协议。

保留首页首张实际卡片的 `id="lunch"` 与 `id="biweekly"`。模板改为 `data-anchor="lunch"` 与 `data-anchor="biweekly"`，由现有 JS 锚点分配入口设置首卡 id，并确保后续卡片不带这些 id。其他卡片模板及动态生成结构检查后不改无关内容；重复的样式 class 保持用于各卡片排版。

允许修改：`index.html`、`src/ui/app.ts`、`tests/e2e/workflows.spec.ts`、本计划。禁止修改 Simple、Report、输入/数据模型、计算逻辑和无关未提交文件。

## 复用与影响

复用 `src/ui/app.ts` 的 `updateShortcutAnchors()` 与 `renderWorkerCards()` 卡片生命周期；不新增锚点管理状态或第二套克隆路径。复制结构检查范围为 `#worker-card-template` 和 `renderDays()` 动态字段：模板除这两个锚点外没有需按卡复制的 id，动态时间字段使用现有 `data-entry`、`data-field` 标记且不带 id，类名按卡复用样式。影响限于 Detailed 卡片定位；Quick Fill、计算及 Report 无行为影响。

## 验收与验证

| 检查 | 通过标准 | 方式 |
| --- | --- | --- |
| 模板 | 两个目标控件只有 `data-anchor`，template.content 内没有 id | Playwright |
| DOM 唯一性 | 连加两张卡后，`document.querySelectorAll('[id]')` 无重复值 | Playwright |
| 快捷链接 | 连加两张卡后，shortcuts 每条链接都跳到对应的唯一控件 | Playwright |

先扩展 `tests/e2e/workflows.spec.ts` 使模板无 id 的断言 RED，再最小修改 HTML 与现有 JS 选择器并验证 GREEN。`npx vite build`、`npm run typecheck`、`npm run test:unit`、`git diff --check` 与目标 Playwright 用例在 Chrome、Chromium、WebKit 的验证通过。完整 `npm run test:e2e` 因其他用例失败而中断，剩余测试未运行；测试期间工作区有并行未提交修改，失败归因未隔离。浏览器人工验收待统一完成。
