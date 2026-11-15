# Time Card 编辑、统一 Report 与双向同步重构

## 状态与范围

- 自动执行完成，待统一人工验收。本次五批修复及受影响回归已完成，保留执行起点已有未提交改动。
- 定级为中型。变更集中在现有 Card → 编辑 → 报告 → 交付链路，沿用计算核心、持久化协议与交付入口。
- Detail 顺序为完整 Time Card 区块、增加卡片、统一时薪与加班方案、全部卡片工时和工资汇总、操作按钮、高级设置与答疑。
- Time Card 包含 Name、Date、Report period、自动每日无薪休息与每日填写表。新增完整卡片继承上一张卡的填写值并生成独立记录 ID。
- Settings 控制 Client、Project、Content 显示。开关为整页显示设置，字段值按卡片或日期归属。关闭后保存原值，重新启用可继续编辑。有值的旧草稿自动显示对应字段。
- Report 按卡片同行展示姓名、日期及已填写身份信息，列每日净工时 hh:mm / decimal、有内容的 Content、工时汇总、时薪、明确的加班方案与工资结果。多卡另列总体汇总。
- 简化结果由调整细节链接、同一 Report 正文、Print / PDF、Export CSV、Copy share link 三个按钮组成。
- 采用现有统一时薪与加班方案。每人独立时薪和项目管理列为能力缺口，当前团队主用例采用三人同费率。
- 变更边界为下列允许文件。计算规则扩展、生产发布、远端提交与范围外修改需进入对应授权。

## 权威来源与复用边界

- Card 为原始记录的唯一来源，沿用 currentEmployee / employeeCards / selectEmployee / getTableReport。卡片姓名、日期、休息与内容按现有归属保存。
- 弹窗打开时优先完成当前弹窗操作，Detail 编辑后的最新值进入弹窗。切换、返回、展开或折叠逐日设置及无修改继续，均按最新 Card 展示与计算。
- SimpleMeta 保存步骤和明确的默认填写意图，逐日手动值优先于默认传播。已复现的旧默认值覆盖 Detail 记录列为必修项。
- getReport、simpleReport、reportForMode 共用既有 calculate 核心。Simple 完整班次口径、Detail 所选日期区间口径分别进入报告、CSV 与分享。
- 沿用 worker-card-template、renderWorkerCards / renderDays、summaryReport / paySummary / tableReport、现有 actions DOM 与 runDelivery，收敛重复汇总和报告结构。
- getTableReport 各卡结果作为团队合计来源。历史草稿含多费率时按各卡工资求和，费率按卡展示。
- load / save / decodeCard / encodeShare / previewShare、makeTemplate / applyTemplate 与审批消费者承担兼容入口。显示选项向后兼容既有 v1 / v2 草稿、模板及分享链接。

## 允许文件

- 生产与配置为 index.html、src/ui/app.ts、src/ui/simple.ts、src/ui/report.ts、src/state/card.ts、src/state/simple.ts、src/io/delivery.ts、src/io/workflows.ts、src/styles/main.css、src/styles/print.css、playwright.config.ts。
- 单测为 tests/state/card.test.ts、tests/state/simple.test.ts、tests/state/workflows.test.ts、tests/io/delivery.test.ts。
- 浏览器测试为 tests/e2e/helpers.ts、tests/e2e/*.spec.ts。其中新增 personas.spec.ts、mode-sync.spec.ts，其余仅调整受本轮字段位置、结构及共享入口影响的断言，保持数值、隔离与布局验证强度。
- 合同文件为 plan.md。进入执行时先核对本标题、状态、Git diff 与既有未提交修改归属。

## 实施与测试执行步骤

1. 建立行为基线。复用现有 Vitest / Playwright 与字段定位，配置 channel=chrome 项目，先固化四类用户、同步覆盖、字段开关和报告合同的失败断言。同步用例复现 Detail 41:30 返回弹窗后退回 40:00，预期值采用独立分钟及金额常量。
2. 修复双向同步。复用 mountSimple 的 getCard / replaceCard / persist、commitField / setMinute 和 setSimpleDefault / setSimpleDayTime / setSimpleBreak，收敛默认传播与逐日编辑状态。进入弹窗按最新 Card 恢复，通过同步专项及现有默认继承测试后整理视图。
3. 整理 Detail。复用 worker-card-template 与员工生命周期入口，调整头部、字段开关及汇总位置，沿用多段工作、休息、日期、timeline 与逐日传播，移除汇总区重复逐日清单。验证开关、旧数据、多卡隔离及 TC-02 / 03 / 04。
4. 统一 Report 与交付。复用 tableReport、工时及工资汇总区段、reportForMode、runDelivery 与原 actions DOM，接入简化结果、分享和打印。验证每卡明细、团队合计、TC-01 及四类用户 CSV / 分享 / 打印，调整直接相关 CSS 级联与旧结构断言。
5. 主 agent 按 checker implementation 清单只读审查目标、范围、复用、状态归属及代码风格，集中处理适用问题并运行受影响测试，最后执行一次完整验证，再进入统一人工验收。

## 测试入口与证据

- Chrome 采用 390×844 与 1440×900 的隔离本地上下文，固定测试日期与时区，通过真实页面选择报告日期。首次显示弹窗先操作弹窗，复杂需求经弹窗 Detailed 入口进入。
- 主用户旅程全部经可见 UI 录入，记录初始默认值、自动填充及真实清空确认。DOM 与存储用于读取核对，预置历史草稿限明确标注的兼容测试。
- 每例记录步骤、实际输入、预期、实际、PASS / FAIL / NOT IMPLEMENTED / 无法验证、原因、截图与 trace。证据路径含用例和浏览器标识，缺失能力按子项独立记录。
- 打印按钮验证 beforeprint，PDF 从独立报告页面验证，再人工核验系统打印对话框及分页。CSV 核对各日、各周、各卡与总额，分享在新上下文打开并核对正文及本地草稿隔离。

## 验收矩阵

| 用例 | 操作与独立预期 | 验证 |
| --- | --- | --- |
| TC-01 小时工 | 手机弹窗周一至周五08:00–16:30，周五改18:00，休30分钟，$20、周40小时后1.5倍。四天各8h、周五9.5h，总41:30 / 41.50，REG 40h、OT 1.5h、工资$845。转Detail重查 | Chrome UI及报告 |
| TC-02 Freelancer | 电脑Detail，周一09:15–11:45 / 12:30–15:00，周二10:00–12:00 / 13:00–16:15，$75，关闭加班。每日5h / 5.25h，总10:15 / 10.25，$768.75，空档自然排除 | Chrome UI及交付 |
| TC-03 HR | Jordan，Monday起周，双周2026-11-02–15，工作日2–13日。09:00–17:30，第二周周五至19:30，每天休30分钟，$22、周加班。两周40h / 42h，总82h，REG 80h、OT 2h，工资1760+66=$1826 | Chrome UI、逐周CSV |
| TC-04 团队 | 同一工作日三卡，Alex 07:00–15:30休30，Ben 07:30–16:00休30，Chris 08:00–17:00休60，统一$25，各填Kitchen Renovation。每人8h/$200，总24h/$600，名字、休息及日期独立 | Chrome UI、团队交付 |
| SYNC-01 | 弹窗填写后进Detail，核对姓名、报告日期、工作日、原始时间、AM/PM、休息分钟/区间、内容、费率与加班方案，刷新后重查 | UI及存储只读核对 |
| SYNC-02 | Detail改周五18:00后开弹窗，返回时间步骤，无修改继续或折叠逐日区后继续，周五仍18:00，总41:30。改变默认时间时保留该逐日手动值 | 必修P0，单测与UI |
| SYNC-03 | Detail改时间、休息、费率和加班方案，弹窗按当前能力读取或显示兼容提示，再从弹窗修改回Detail，多轮切换、关闭和刷新核对全部字段，输入后直接下一步也提交正确 | 单测与UI |
| SYNC-04 | 多段、多卡、双周记录进入简化兼容性提示，取消后全部数据完整。已填字段开关关闭、重开、刷新可恢复，其他卡片数据可核对 | UI及旧草稿兼容 |
| REG-A–D | 区间内跨夜22:00–06:00休30=7.50h，无休09:00–17:00=8h，08:00–16:15休30=7.75h，8h45m=8.75，先弹窗后Detail核对 | 计算单测与UI |
| REG-E–H | 09:00–12:00 / 13:00–17:00=7h，空白0h，同起止0h并明确提示。同一休息只扣一次，09:00–17:00已记30分钟休息后自动设置仍计7.5h。非法重叠或空档休息显示错误并阻止交付 | 单测与Detail UI |
| 周界与异常 | 周日22:00–周一06:00休30，Simple 7:30，Detail原所选周1:30，跨周部分在对应区间核对。无效时间、损坏草稿、存储拒绝与剪贴板拒绝给可恢复反馈 | 既有测试及UI |
| Report合同 | 同数据及统计口径下简化结果、分享和打印正文一致，姓名日期同行，每日净工时、内容、工时汇总、规则、工资完整且正文只读，Detail汇总全部卡片。390px长姓名/项目/内容可读且无横向滚动 | UI、DOM、打印样式 |
| 人工体验 | 首次5秒发现填写入口、四步弹窗理解、默认传播与逐日修改、手机横向滚动及触屏、复杂Detail可完成、报告可读性、打印分页 | 统一人工验收 |

## 验证顺序与命令

- 修改弹窗先运行 simple / mode-sync，修改Detail先运行 personas / card-isolation / mode-sync，修改报告先运行四类报告及 delivery / content / table-layout，再扩展到受影响的现有测试。
- 阶段单测采用 npx vitest run tests/state/simple.test.ts tests/state/card.test.ts tests/state/workflows.test.ts tests/io/delivery.test.ts。每次阶段E2E先运行 SITE_URL=https://example.test npm run build，再运行 npx playwright test --project=chrome tests/e2e/mode-sync.spec.ts tests/e2e/personas.spec.ts，按当前入口筛选。
- 最终集中运行 npm run typecheck、npm run test:unit、SITE_URL=https://example.test npm run build、npm run test:seo、npm run test:e2e、git diff --check。Chrome纳入完整E2E，现有Chromium/WebKit作为回归项目。
- 最终报告包含测试总览、预期/实际差异、P0–P3问题、功能缺失、修改建议及修复后回归，附截图、trace、CSV/PDF与无法验证项。

## 结果与剩余风险

- 本轮五批修复完成。typecheck、62项单测、指定SITE_URL构建、SEO、diff检查通过。完整三浏览器E2E为210通过、3跳过；最后Report宽度修复后，三浏览器受影响专项30通过。四类用户、休息改60分钟、多费率历史草稿、最新默认继承及A–H回归均通过。
- 真实Chrome交付使用原生剪贴板。WebKit打印事件保留环境限制标注。每人独立时薪及项目管理仍为既定能力缺口，首次理解、实体触屏、系统打印及最终视觉交由人工验收。

## 本轮修复合同

1. 休息数据。涉及 card.ts、app.ts、simple.ts 与对应测试。复用 getReport、renderDays、设置 change 入口。断言五天改60分钟为2250分钟/$750，手动休息加自动设置仅扣一次。先 Vitest RED，再 Chrome UI。
2. 工资汇总。涉及 report.ts 和测试，复用各卡 getTableReport 结果，按卡合计正常/加班工资。断言两人各480分钟、2000/3000美分时薪，总40000美分，切卡保持一致。
3. 默认同步。涉及 ui/simple.ts 与 state/simple.ts 和测试，复用 createSimpleMeta，打开时按最新 Card 恢复默认与差异。断言09:00–17:30默认和新增日期继承，保留41:30回归。
4. 结构。涉及 app.ts、report.ts、card.ts、样式和测试，复用模板及Report正文。新草稿可选字段关闭，旧值自动显示，汇总与逐日正文收敛。
5. 验收。涉及 helpers.ts、personas及同步测试。CSV解析按日/周/卡/工资核对，Chrome原生剪贴板、新上下文隔离、beforeprint及PDF。阶段构建后运行对应Chrome专项，最终执行既定完整命令。

## 最终证据与验收边界

- 完整回归日志为 test-results/full-e2e.log，最后样式复测为 test-results/final-layout.log。全部用例trace及主流程截图、CSV、PDF在test-results及final-layout子目录。CSV解析核对日期行、逐周正常/加班分钟、逐卡工资和总额，并附预期/实际JSON。
- 关键结果为休息修改2250分钟/$750、多费率正常工资$400/加班$0/总额$400、四类主流程2490/$845、615/$768.75、4920/$1826、1440/$600。
- 三项跳过均为WebKit的CDP性能、原生剪贴板权限和触屏分发专用测试；Chrome及Chromium对应项通过。WebKit beforeprint无法验证，分享使用测试适配；真实Chrome主流程使用原生剪贴板并验证beforeprint。
- 人工验收仍包括首次理解、实体手机触屏、系统打印对话框、PDF分页及最终视觉。每人独立时薪与项目管理保留为既定能力缺口。
