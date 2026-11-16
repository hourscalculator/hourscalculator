# Report 与 Quick Fill 需求对齐

产品口径与三项任务已获用户执行授权，当前状态为“自动执行完成，待统一人工验收”。需求依据为用户本次六项回复、逐日差异重开场景的补充确认、最新 Quick Fill 预览页说明及相关 PRD。源码对照为 `2b174a3dccae08ae16565caaf6d9af56ef184149`。
旧计划所列人工验收未完成而结束。原“weekly40”条目仍缺最终验收证据，其终态待核验。

## 任务拆分与实现差异

整体涉及报告展示、向导提交生命周期和跨周数据，按大型需求拆为三个可独立验收的中型任务。三个执行合同依次执行，允许文件和验收边界分别列于下文。

| 顺序 | 当前实现与目标差异 | 交付边界 |
| --- | --- | --- |
| 一，共用 Report 与预览 | 每卡重复 Hours、费率、工资。Break 固定显示，Content 位于 Hours，零工时日期和空费率占位行仍显示 | 各卡信息与明细依次展示，随后统一 Hours、计费口径和公式总计。Quick Fill 预览及分享、打印使用同一主体 |
| 二，Quick Fill 交互与提交 | 逐日设置可折叠，输入立即改写并保存 Card，Continue 主要在点击后拦截错误 | 本次弹窗内单向切入逐日表格，休息表中 In/Out 只读。有效 Continue/Calculate 提交，Back 暂存，关闭及刷新恢复已确认值。Detailed 接收已确认数据 |
| 三，Period 与历史周 | 日期选择平移并过滤记录，Period 必填，Simple 校验和写入遍历全部 entries | Period 可清空，按当前周计算并隐藏报告中的 Period 与具体日期。新周按上一周对应星期复制上下班，保留旧周，目标周已有记录优先 |

任务二复用 `mountSimple()`、`createSimpleMeta()`、现有时间/休息 setter、`setFieldError()` 和 Detail 输入样式。临时输入归本次弹窗所有，已确认 Card 为持久化依据。初访默认值、兼容 Detail 回读、复杂数据确认及 Clear 进入其验收。
任务二按已确认记录推导重开后的初始模式。已确认时间或休息有逐日差异时恢复对应逐日表格。验收操作为周五18:00、其余16:30并 Continue，关闭重开及刷新重开后均恢复逐日表格，周五保持18:00。仅切换模式产生的临时状态随本次弹窗结束。
任务三复用日期选择窗口、`cardPeriod()`、按实际日期保存的 `entries/content/emptyRows` 和现有编解码入口。切周同时核对 `simpleCompatible()`、`simpleReport()`、默认值和逐日 setter 的当前范围，避免历史周参与当前填写或被批量覆盖。单周复制只带上下班时间，其余数据按目标周记录和既定默认规则恢复。双周及自定义范围沿用日期选择能力，复制规则以标准单周为适用范围。
后续任务进入执行前分别形成当前合同并完成主 agent 计划自查。授权覆盖整组任务时按上述顺序衔接。

## 已确认的产品口径

- Calculate 后为预览页，顶部链接进入 Detailed，中部按 Report 的表格顺序展示，底部提供 Print/PDF、Export CSV、Copy share link。操作复用 Detail 的交付入口，复制成功显示绿圈白勾。
- 当前步骤的临时输入可随 Back 往返恢复。关闭、Escape 或刷新后保留当前步骤位置，恢复各步骤最近一次 Continue 确认的值。尚未提交的步骤使用进入该步时的已确认数据或默认值。第4步由 Calculate 确认。
- 逐日模式的单向限制属于本次弹窗。重开时根据已确认记录恢复模式，存在逐日差异时显示逐日表格并保留差异。进入 Detailed 时接收已点 Continue 的数据。
- Period 清空后内部仍有当前周的计算日期，报告省略 Period 和具体日期，星期仍作为每日标识。该显示状态需随草稿与分享快照保存，旧数据缺少该状态时按原日期展示。
- 零净工时日期省略。时薪留空时省略 Hourly rate、Rate/Hr 和 Gross pay，保留工时与简短的未设置时薪提示。零时薪作为已填写值处理。
- 每卡独立计算工时及加班，再合并相同日期的净分钟与各卡 REG、OT、双倍工时及金额。Weekly 的40小时门槛按每卡每周应用。

## 当前合同一的目标与范围

规模为中型，围绕共用报告生成及其预览、分享、打印消费者集中实现。
目标布局为各卡的有值身份信息表与 Time Card 明细表，随后一份全卡 Hours、一份有值计费口径表、一份 Weekly/Period Totals。Project 和 Client 有值时进入对应身份信息行。Content 进入所属卡、所属日期的明细列。Break 列按每卡有效休息数据决定显示。
公式表使用现有 REG + OT = Total 展示。加班关闭和未设置时薪按已确认空值规则渲染。多段工作与有薪/无薪休息应可核对。

计划阶段写入范围为 `plan.md`。合同一执行范围如下。

- 产品与入口文件为 `docs/report.prd.md`、`index.html`、`src/ui/report.ts`、`src/ui/simple.ts`、`src/ui/app.ts`、`src/styles/main.css`、`src/styles/print.css`。
- 测试文件为 `tests/state/simple.test.ts`、`tests/e2e/simple.spec.ts`、`tests/e2e/delivery.spec.ts`、`tests/e2e/share-actions.spec.ts`、`tests/e2e/workflows.spec.ts`、`tests/e2e/content.spec.ts`、`tests/e2e/mode-sync.spec.ts`、`tests/e2e/personas.spec.ts`、`tests/e2e/date-range.spec.ts`、`tests/e2e/table-layout.spec.ts`、`tests/e2e/helpers.ts` 和本计划。既有测试的修改限于本合同布局和动作的直接依赖。
- 向导步骤与保存生命周期属于任务二。日期清空、历史周与相应 Card/解码模型扩展属于任务三。用户已有 docs 与 Obsidian 改动作为工作区基线保留。

## 权威来源与逐步复用

1. 复用 `tableReport()`、`timeCardDetails()`、`summaryReport()`、`paySummary()`、`readonlyBillingSettings()` 与 `escape()`，集中整理报告主体和条件字段。Simple 使用 `reportForMode(card, true)` 的整班结果，Detail 使用 `getTableReport()` 的按日历范围结果，各自的 Hours 和总计取自同一模式结果并累加各卡实际分币。先沿用正式 `errors/issues` 校验并阻止错误交付，再过滤有效的零工时日期。
2. 复用 `mountSimple().renderHome()` 及原三按钮，通过 `onDelivery → runDelivery()` 处理打印、CSV、分享。共用 `updateCopiedState()` 的复制反馈与失效规则。共享主体接入 `previewShare()`、只读审批快照和 `#print-report`。
3. 复用 `sharePreview`、`adopt/dismiss` 和现有快照编解码，把 PRD 要求的采纳/保留本地草稿入口接入 Report 链接。现有入口位于隐藏的 `#editor` 内，需调整可见容器并在选择后恢复正式编辑视图。
4. 复用现有 Report 单元测试、真实浏览器入口、CSV 检查及 `verifyDelivery()`，用原始分钟和分币断言结果。旧快照含不同费率时沿用各卡实际费率与原金额，并提供可核对的费率说明。

## 验收矩阵

| 功能与输入 | 用户可观察预期 | 证据 |
| --- | --- | --- |
| 单人 Weekly，周一至四08:00–16:30，周五至18:00，各休30分钟，$20/h | 一份 Hours 和总计，41:30 / 41.50，REG40小时/$800、OT1:30/$45，总$845。关闭加班时为$830 | 单元与真实预览/分享/打印/CSV |
| 三卡同一天各8小时，Daily，$25/h | 三组身份与明细，合并 Hours 当日24:00，REG24小时、OT0，总$600 | 单元与多卡浏览器 |
| 无 Content、无休息，另有空白日期 | 省略空列和无工时日期。有 Content 或正数休息的卡出现对应列，内容绑定正确卡与日期 | 单元与桌面/手机浏览器 |
| 无时薪和一天8小时，另测时薪0 | 空时薪显示8:00与简短提示，省略费率和工资行。时薪0显示明确的零费率、零金额 | 单元与浏览器 |
| 预览顶部链接、三按钮及复制反馈 | 顶部进入 Detailed，底部三动作可用。复制成功显示绿圈白勾，修改数据后恢复待复制状态。复制失败显示可手动复制的链接 | Chromium 剪贴板与拒绝路径 |
| 页面、分享、打印与CSV | 同一数据各出口净分钟、分类分钟及分币一致。分享主体与打印主体一致。Sunday22:00–06:00休30分钟在 Simple 交付中为7:30 | 真实交付链 |
| 本地草稿存在时打开 Report 链接，再分别采纳/保留 | 选择前本地草稿原样保存。采纳后采用快照，保留后返回原草稿。损坏链接提示错误且草稿可恢复 | 浏览器及本地存储断言 |
| 半段、重叠或休息超限记录，以及浏览器拒绝保存 | 错误可定位至卡、日期和字段，保留输入并阻止交付。保存失败时反馈可见，当前页面数据可继续查看 | 真实编辑与交付入口 |
| 老链接、历史多费率及审批快照 | 原草稿后改不影响老链接。旧卡各8小时、$20与$30合计$400。审批与回执仍关联原快照 | 旧协议用例与浏览器 |
| 多卡月份与320/375/390px手机 | 卡片身份、明细和汇总完整，文字换行与打印分页可读，公式符号可见 | 浏览器截图与统一人工验收 |

## 执行步骤与验证命令

1. 对齐 Report PRD 的布局、空值和具体操作验收，按功能整理章节，源码索引和执行证据归本计划。为矩阵中的差异补测试并用真实输入确认 RED。
2. 按上述复用入口最小修改报告主体、预览动作与分享视图，运行对应单元和浏览器用例确认 GREEN，再整理本轮产生的重复逻辑并重跑相关用例。
3. 集中核对全部直接消费者和允许文件，主 agent 按 checker 做实现自查，采纳适用修正并运行最终验证，交付“自动执行完成，待统一人工验收”状态。
目标验证使用 `npx vitest run tests/state/simple.test.ts`。浏览器每轮先 `npx vite build` 更新预览产物，再执行 `npx playwright test tests/e2e/delivery.spec.ts tests/e2e/simple.spec.ts tests/e2e/share-actions.spec.ts tests/e2e/workflows.spec.ts --project=chromium --grep "Report|legacy weekly40|result reuses|copies report|monthly employee"`。新增本合同用例名称统一包含 `Report`。
最终集中运行 `npm run typecheck`、`npm run test:unit`、`npm run build`、`npm run test:seo`、`npm run test:og`、一次 `npm run test:e2e` 和 `git diff --check`。浏览器启动需要本地端口及 Playwright 浏览器权限，遇沙箱端口限制使用执行工具的权限流程。

## 验证状态与待验收

三项任务实现及主 agent 自查修正完成，当前状态为“自动执行完成，待统一人工验收”。
本轮类型检查、71项单元测试、构建、OG检查及 git diff --check 通过。最终构建的31项 Chromium 直接消费者测试全部通过，另1项 Report 采纳/保留草稿测试通过。
实际输入覆盖三卡各8小时/$25合计24小时/$600、周五18:00且其余16:30并各休30分钟得到41:30/$845、Sunday22:00–06:00休30分钟得到7:30、关闭丢弃未确认18:00而恢复确认17:00、新周已有周五17:00优先于旧周18:00且旧记录保留、清空Period后隐藏日期并保留42:30工时。
全量三浏览器测试已运行结束，198通过、45失败、3跳过。失败对应15个现有用例，已在隔离HEAD基线复现同名失败，涉及Detailed空白多工作段夹具与静态canonical预期。SEO检查的biweekly锚点断言在隔离HEAD中同样失败。这些既有问题保留为剩余风险。
320/375/390px工作日布局、320px逐日表格、390px可选信息及报告、月份打印和跨模式交付已有浏览器证据。最新手机截图位于 `/tmp/hours-mobile-verified`，最终直接消费者trace位于 `/tmp/hours-delivery-final`，完整套件trace位于 `/tmp/hours-complete-e2e`。
统一人工验收待执行。部分新增测试在实现后补齐，全部阶段的先RED顺序证据未完整保留，不能声称全程严格TDD。

## 当前合同二 — Quick Fill 提交恢复

已授权连续执行，中型任务。允许修改 `src/ui/simple.ts`、`src/state/simple.ts`、`src/styles/main.css`、`tests/state/simple.test.ts`、`tests/e2e/simple.spec.ts`、`docs/quick-fill.prd.md` 和本计划。
复用 mountSimple、createSimpleMeta、各 setter 和现有交付入口。弹窗独占临时 Card，Continue/Calculate 才替换已确认 Card，Back 保留临时值，关闭恢复确认数据。恢复只保留步骤位置，逐日模式由确认数据推导。
验收包含输入时草稿不变、Continue 后持久化、关闭及刷新恢复、逐日单向切换、休息表时间只读、无效输入禁用下一步。
验证使用 `npx vitest run tests/state/simple.test.ts`，构建后 `npx playwright test tests/e2e/simple.spec.ts --project=chromium`，最终集中完整验证。

## 当前合同三 — Period 与历史周

任务二完成后自动执行，中型任务。允许修改 `src/state/card.ts`、`src/state/simple.ts`、`src/ui/simple.ts`、`src/ui/report.ts`、`src/io/delivery.ts`、`tests/state/simple.test.ts`、`tests/e2e/simple.spec.ts`、`docs/quick-fill.prd.md` 和本计划。
复用 cardPeriod、simpleDates、日期选择窗口和原快照编解码。日期隐藏使用可选字段，缺失沿用旧展示。切周保留实际日期记录，标准单周按对应星期复制上下班，目标已有记录优先。当前范围隔离适用于兼容判断、默认推导、setter、计算与校验。
验收包含清空后当前周计算与隐藏日期、分享刷新保留显示状态、上周记录保留、新周逐星期复制、已有目标优先、历史记录不参与本周校验或批量修改。
验证使用相关单元、构建后 Chromium Quick Fill 测试以及计划中的最终集中命令。
