# Detail PRD 对齐

状态为“自动执行完成，待统一人工验收”。全部五项实现、主 agent 自查与适用修正已完成。统一人工验收尚未执行。源码基线为 `279eccd986c6d129b00317ca0fbf5ea1abc43329`，制定计划前 Git 工作区干净。
上一份 Report 与 Quick Fill 合同自动验证完成，统一人工验收未完成而结束。

## 任务拆分

整体同时涉及休息数据协议、编辑界面、设置、工资展示和模板恢复，按大型需求拆为五个可独立验收的任务。执行时依次形成五项中型合同并衔接。各合同允许文件、复用入口和实际证据记录如下。

| 顺序 | 独立交付边界 | 已定位的复用入口 |
| --- | --- | --- |
| 一，时长休息的数据与计算 | 每卡每日多条无薪时长，旧数据兼容，Quick Fill 回读与提交，报告、CSV、分享和审批消费一致 | Card/Employee、getReport、calculate、reportForMode、commitDraft、decodeCard、snapshotId |
| 二，Detail 表格与操作 | 日期/In/Out/Break 表格、删除时间轴、增删时长休息、批量覆盖全部日期并跳过已有休息、删除卡片确认、新建一周且每日一段、FAQ 默认展开 | renderDays、initialize、addEntry、cardPeriod、renderWorkerCards、既有事件委托和校验 |
| 三，高级设置与时间格式 | 基础/项目/模板分组、修改蓝点和重置、Sunday 排首位且默认 Monday、保留现有高级能力、全局时间格式覆盖 Detail/Quick Fill/报告 | createCard、applyPreset、syncControls、syncVisibleFields、displayTime、timeInputs |
| 四，汇总与工资公式 | 普通/加班/双倍工时及金额分别显示，hh:mm 与 Decimal、公式和多卡金额可核对 | getTableReport、summaryReport、tableReport、paySummary、grossPay |
| 五，完整草稿模板 | 全部卡片、记录、时薪与设置保存本地，预览确认后整体恢复，兼容旧规则模板 | makeTemplate、applyTemplate、loadTemplates、saveTemplates、decodeCard、现有模板操作 |

各任务同步更新对应 PRD 与页面帮助。PRD 按功能和具体操作预期组织，消除旧时间轴、休息起止填写和仅保存规则等冲突描述。开发入口和验证证据归计划及当次交付。

## 已批准的共用口径

- 新录休息按日保存多条无薪分钟数，逐条可编辑和删除。从最早工作分钟依次扣除，跨工作日边界后沿用现有工时及加班分类。
- 批量添加覆盖本卡当前范围的全部日期，包含空白日期；已有正数休息的日期跳过，重复操作不叠加，默认添加30分钟。
- 空白日可以先保存休息，净工时为零且报告省略；填入工作后检查休息总量。缺半段、重叠工作、负数/非整数休息及休息超限均须定位错误并阻止交付。
- 普通 Detail 新建为一周、每日一段工作，新增休息默认30分钟，由用户触发添加；具名双周等入口保留各自明确的周期用途。
- 高级设置重置保留已填工时、姓名、统一时薪和加班选择；修改蓝点依据高级设置默认值判断。保留工作日边界、小数展示、预设及审批回执，统一收进高级区。
- 旧草稿、起止区间、有薪休息、自动休息、历史多费率分享和审批按已有数据契约计算。旧快照保持独立，现有 Quick Fill 确认提交、历史日期保存和多卡独立计费规则持续适用。

## 合同一的目标与范围

规模为中型，围绕每日时长休息的单条数据与计算调用链闭环。目标是让草稿、Quick Fill 和交付出口一致消费按日时长列表，为后续表格编辑提供正式共享入口。
计划阶段写入范围为 `plan.md`。执行允许文件如下。

- 模型与计算为 `src/state/card.ts`、`src/state/simple.ts`、`src/domain/core.ts`、`src/domain/report.ts`。
- 消费者为 `src/io/delivery.ts`、`src/io/workflows.ts`、`src/ui/report.ts`、`src/ui/simple.ts`、`src/ui/app.ts`。修改限休息读写、校验、展示和交付适配。
- 产品文档为 `docs/README.md`、`docs/detail.prd.md`、`docs/quick-fill.prd.md`、`docs/report.prd.md`，修改限本合同休息规则和对应验收。
- 单元测试为 `tests/domain/core.test.ts`、`tests/domain/report.test.ts`、`tests/state/card.test.ts`、`tests/state/simple.test.ts`、`tests/state/workflows.test.ts`、`tests/io/delivery.test.ts`。
- 浏览器测试为新增 `tests/e2e/duration-breaks.spec.ts`，以及 `tests/e2e/simple-compat.spec.ts`、`tests/e2e/mode-sync.spec.ts`、`tests/e2e/simple.spec.ts`、`tests/e2e/delivery.spec.ts`、`tests/e2e/workflows.spec.ts`；既有测试仅适配本合同直接依赖。复用 `tests/e2e/helpers.ts` 的 openDetailed、chooseRange 和 verifyDelivery。
- 表格重排、时间轴移除、批量按钮、默认值调整、设置重置和分组、DT 公式布局、模板恢复协议归后续独立合同；本合同围绕上述允许文件实现休息数据链。包配置、部署、Obsidian 与其他文件由各自任务管理。

## 实现步骤与复用边界

1. 对齐四份 PRD 的休息口径和具体测试输入，补充真实多段、多条时长、空白日、跨周、旧数据和多卡案例，先验证当前实现的功能差异。文档以缺失或冲突断言确认 RED，代码用原始分钟和分币断言确认 RED。
2. 复用 Card/Employee、currentEmployee、employeeCards、selectEmployee、addEmployee 和 decodeCard。原 dailyBreakMinutes 依附工作段且为单值，无法表达空白日和多条独立休息，因此在同一 Card/Employee 内扩展可选的按日时长列表及读写入口，每条为0～1439整数分钟。旧分钟值在读取边界兼容，实际编辑对应日期时迁移并避免双计；新字段缺失按该卡旧数据解释，解码和员工切换均需防止继承当前选中卡的列表。沿用原存储 owner。
3. 复用 getReport → report → calculate 与 grossPay，集中归一化时长休息，从有效工作分钟起按时间顺序跨工作段扣除，跳过已扣的旧无薪区间。某日期显式提供新列表时，以该列表替代该日期旧分钟值和自动休息生成/阈值扣除，空列表或零分钟同样生效；旧手动区间及有薪属性照常计算，其他日期沿用原规则。利用既有 errors/issues 定位非法值和总量超限。分配位置仅供计算使用，持久化记录分钟数。
4. 复用 simpleBreakMinutes、simpleCompatible、simpleReport、reportForMode、setSimpleBreak 与 mountSimple.commitDraft，共用同一休息归一化入口。兼容单工作段时向导回读每日合计，实际编辑的日期经 Continue/Calculate 提交；其他日期的休息明细及历史数据保留，复杂记录沿用确认保护。Simple 的整班报告与 Detail 的工作日拆分继续各自使用既有报告入口。
5. 复用 timeCardDetails、csv、encodeShare/decodeShare、snapshotId 和正式 runDelivery/valid 交付入口，输出每日时长且避免在多工作段重复展示同一扣除。审批摘要纳入新记录，切换选中卡保持摘要稳定，未经编辑的旧快照保留匹配。通过正式加载、刷新、打印、CSV、分享和审批路径验证，集中整理本轮重复逻辑后重跑受影响用例。

## 合同一验收矩阵

| 功能与真实输入 | 明确预期 | 验证层级 |
| --- | --- | --- |
| 同日09:00–12:00及13:00–17:00，休15+30分钟，关闭加班，$20/h | 净375分钟，6:15/6.25，工资12500分；输入顺序变化仍从最早工作分钟扣除 | 规则/状态单元与浏览器交付 |
| 空白日只有30分钟休息，再填09:00–17:00 | 初始无错误、零工时且报告省略；填工作后450分钟、7:30，刷新保留 | 状态、编解码与正式页 |
| 范围2026-11-22至23，周日22:00–周一06:00，休30分钟 | Detail 周日90分钟、周一360分钟，总450分钟；工作日边界变化沿用既有归属 | 规则/状态单元与报告 |
| 三卡同日各09:00–17:30、休30分钟，统一$25/h | 每卡480分钟/$200，合计1440分钟/$600；选中卡切换与分享还原保持独立 | 状态、摘要、编解码与正式页交付 |
| 旧版本、旧分钟休息、旧起止区间/有薪/自动休息及审批 | 缺新字段按原契约加载，原分钟与工资可核对；无编辑时回执仍匹配，新增休息后摘要变化 | 历史结构夹具与正式分享/审批 |
| 旧自动休息为30分钟，新列表分别为15、0和空列表 | 对应日期分别只扣15、0和0分钟，其他旧日期仍按旧规则计算 | 规则/状态单元与编解码 |
| 持久化时长为负数、非整数或超过1439分钟 | 解码错误可定位记录，原草稿保留；运行时非法数据经正式校验拒绝 | 编解码与状态单元 |
| 60分钟有效休息配30分钟工作，另测缺半段和重叠工作 | 错误包含卡/日期/记录位置，阻止打印、CSV、分享；通过已有工作输入框修正后可交付 | 单元与正式交付入口 |
| 单段数据从 Detail 经向导读取并确认，再关闭、刷新 | 正确回读每日休息合计；只提交已确认步骤和已编辑日期，其他日期明细完整 | 单元与 Chromium 向导 |
| 本地保存失败或分享损坏 | 页面保留当前数据并显示失败反馈，原草稿受保护；各正常出口分钟及分币一致 | 现有失败路径与正式交付 |

本合同处理本地同步状态及现有保存/分享失败路径。分钟休息输入框的增删、行内错误、批量按钮、表格布局与手机视觉在任务二通过真实操作和统一人工验收证明。

## 验证命令与当前证据

开发阶段逐步执行 RED → GREEN → REFACTOR，使用 `npx vitest run tests/domain/core.test.ts tests/domain/report.test.ts tests/state/card.test.ts tests/state/simple.test.ts tests/state/workflows.test.ts tests/io/delivery.test.ts`。针对失败用例缩小运行范围。
浏览器用例先 `npx vite build`，再 `npx playwright test tests/e2e/duration-breaks.spec.ts tests/e2e/simple-compat.spec.ts tests/e2e/mode-sync.spec.ts tests/e2e/simple.spec.ts tests/e2e/delivery.spec.ts tests/e2e/workflows.spec.ts --project=chromium`。正式页面夹具经原 localStorage/分享解码加载，交付使用原按钮。
合同完成时主 agent 使用 checker 做实现自查并采纳适用修正，最终集中运行 `npm run typecheck`、`npm run test:unit`、`npm run build`、`npm run test:seo`、`npm run test:og`、一次 `npm run test:e2e` 和 `git diff --check`。浏览器端口或启动权限按实际工具限制处理。
需求调查阶段39项既有状态单元测试通过，属于既有行为证据。本轮新需求验证证据见末尾统一交付，统一人工验收尚未执行。
旧合同记载 Detailed 夹具、canonical 和 SEO 锚点相关失败，执行时核对当前基线并区分本合同回归。完成状态以实际运行结果与剩余风险为准，统一人工验收单独记录。

## 本轮执行记录

用户已授权连续执行全部五项任务。启动核对 HEAD 与合同基线一致，既存修改仅为本计划。
合同一执行中。新增真实输入 RED 已确认，两个用例分别得到420而非375分钟、450而非465分钟。实现后六文件76项单元通过，类型检查通过。旧自动休息替代新列表的测试按已批准显式覆盖口径调整。
主 agent 计划复核确认复用 Card、calculate、getReport、原解码、CSV 与审批摘要入口。后续合同尚未执行。

## 合同二 — Detail 表格与操作

已获整组执行授权，合同一直接消费者回归收尾后衔接。规模中型。允许文件为 src/state/card.ts、src/state/presets.ts、src/ui/app.ts、src/styles/main.css、index.html、tests/state/card.test.ts、tests/e2e/duration-breaks.spec.ts、tests/e2e/mode-sync.spec.ts、docs/README.md、docs/detail.prd.md 和本计划。
复用 renderDays、initialize、cardPeriod、原事件委托、durationBreaks、removeEmployee 和原校验。增删分钟列表只改当前卡日期，批量遍历当前范围包括空白日，已有正数休息跳过。保持旧区间可见及原计算。默认一周一工作段、主动添加30分钟。移除时间轴及其失去调用的事件与帮助，删除卡片先确认。
验收为多条编辑、删除、空白日批量、重复批量、多卡隔离、默认一段、手机输入可用及旧数据可见。命令为 npx vitest run tests/state/card.test.ts、npm run typecheck、npx vite build，以及 npx playwright test tests/e2e/duration-breaks.spec.ts tests/e2e/mode-sync.spec.ts --project=chromium。
主 agent 计划自查发现 presets 当前会把普通入口改为双周并开启自动休息，需要在本合同范围内一并对齐，否则 createCard 默认值无法影响正常入口。该建议已纳入允许文件和验收。未发现需扩大产品口径的事项。

合同一实现自查已集中修正每日列表归属、员工解码继承、审批摘要选中卡稳定性及 Quick Fill 历史日期自动休息污染。新增单元78项通过，新增正式CSV用例通过。48项Chromium直接消费者初跑45通过，2项休息展示/旧覆盖口径已修正，1项canonical预期失败待最终基线核对。完整验证统一末尾执行。
合同二 RED 为默认工作段实际2、预期1；GREEN 为17项Card单元通过。浏览器新用例初跑因关闭向导后重复寻找已消失入口超时，已修正夹具。该超时属于测试入口错误，未计产品RED。

合同二浏览器两项通过，覆盖新字段加载、CSV375分钟、批量空白日及幂等、手机截图。主 agent 实现自查已移除时间轴专用拖拽、键盘和刷新逻辑，保留旧区间输入的兼容入口。最终视觉及完整回归待统一运行。

## 合同三 — 高级设置与时间格式

已授权衔接，规模中型。允许 src/state/simple.ts、src/ui/app.ts、src/ui/simple.ts、src/styles/main.css、index.html、tests/e2e/duration-breaks.spec.ts、docs/detail.prd.md、docs/quick-fill.prd.md、plan.md。
复用 syncControls、createCard、displayTime、原 data-card/data-setting 变更与 renderAllWorkerDays。设置按基础、项目、模板分组，Sunday排序首位，Monday默认。蓝点依据默认值，重置保留工作、姓名、费率和加班选择。时间格式统一作用到Quick Fill输入与只读时刻，24h隐藏AM/PM。
验收为改变格式后所有输入回读正确、重置数据保留及蓝点恢复、模板审批入口仍可达。验证为 npm run typecheck、npx vite build 与 npx playwright test tests/e2e/duration-breaks.spec.ts --project=chromium。
主 agent 计划自查确认原向导 timeInputs 使用raw及固定AM/PM按钮，须接入displayTime和parseTime，避免只隐藏按钮而错误解析下午。该修正已纳入。

合同三 RED 已确认 Sunday 首项实际Monday。格式输入已复用displayTime并让24小时解析忽略隐藏AM/PM值，保留旧草稿原分钟。类型与构建通过，浏览器GREEN运行中。主 agent 自查修正了只隐藏按钮却仍传PM造成16:30解析失败的问题。

## 合同四 — 汇总与工资公式

已授权，中型。允许 src/ui/report.ts、tests/state/card.test.ts、docs/report.prd.md、plan.md。复用 paySummary、grossPay、getTableReport，分别展示REG、OT、DT的分钟与金额，并保留多卡逐卡分币合计。验收CA单日13小时、$20/h得到REG8h/$160、OT4h/$120、DT1h/$40、总$320；hh:mm与Decimal均可核对。验证为 npx vitest run tests/state/card.test.ts、npm run typecheck 和末尾正式页面交付回归。主 agent 计划自查确认只需扩展既有公式表，保持旧无DT场景布局。

合同四 RED 为CA13小时公式缺DT列；已在同一公式入口补齐。主 agent 实现自查识别多卡历史不同费率会导致DT金额误用合并空费率，已改为逐卡金额相加。类型与单元待最终重跑。

## 当前合同五 — 完整草稿模板

已授权，中型。允许 src/io/workflows.ts、src/ui/app.ts、index.html、tests/state/workflows.test.ts、tests/e2e/workflows.spec.ts、docs/detail.prd.md、plan.md。复用 makeTemplate、applyTemplate、loadTemplates、saveTemplates、decodeCard 与原确认对话框。新模板保存完整Card副本，应用前确认，取消无变化，确认整体替换。旧无草稿模板保持原规则应用。载入仍经decodeCard校验，损坏集合保留。验收为多卡、时薪、记录与设置整体恢复，原对象后改不污染模板，旧模板兼容与取消保护。验证为 npx vitest run tests/state/workflows.test.ts、npm run typecheck、构建及最终工作流浏览器回归。
主 agent 计划自查确认沿用现有version1模板容器增加可选draft可兼容旧集合，无需第二存储key或平行恢复入口。

最终预检发现SEO静态首屏断言固定旧默认2段及自动休息选中。合同二直接消费者范围补充 scripts/seo.mjs，仅把断言对齐已批准1段和主动添加休息，保留其余SEO检查。主 agent计划自查确认与正常首页同一默认口径。

合同二布局复核补齐Date/In/Out/Break表头及日期/工作/休息分列。已移除时间轴的既有浏览器用例需按新产品入口改写，直接消费者允许文件追加 tests/e2e/break-drag.spec.ts、tests/e2e/timeline.spec.ts、tests/e2e/overtime-layout.spec.ts，保留其正式计算、手机和交付断言。

合同五RED确认模板应用后姓名仍为Changed，预期Saved worker。实现后80项单元通过，旧规则测试以移除draft字段的真实旧结构继续验证。主 agent自查修正完整恢复后的多卡视图重建及独立副本。
首次全量浏览器运行作为探索运行中止，发现时间轴专用旧用例尚未适配。已保留其输入、计算和手机断言并迁移到现有文本/分钟入口，待最终完整运行。此前全量结果不作为最终通过证据。

合同二直接消费者补充 tests/e2e/empty-day-help.spec.ts，仅将空白日新增休息断言从区间输入改为分钟输入，保留删除持久化与帮助验收。

合同二直接消费者补充 tests/e2e/calculator.spec.ts、tests/e2e/hourly.spec.ts、tests/e2e/personas.spec.ts。新录休息改走分钟按钮，历史区间验证改为真实旧草稿经localStorage解码加载，保留重叠/区间越界阻止交付断言。逐日新增休息保持本日归属，跨日应用通过明确批量按钮。

最终主agent实现自查补充直接消费者 tests/e2e/table-layout.spec.ts 的Hours选择器与 personas.spec.ts 的Weekly选项值。隔离HEAD已复现旧HR用例寻找不存在weekly选项、旧布局用例的多段严格定位错误；现版保留业务断言并对齐真实weekly40与共用Hours位置。未修改相关计算产品口径。

合同三最终自查发现Quick Fill失焦仍强制12小时显示，以及休息表只读时刻固定附加AM/PM。已用正式24h输入17:00失焦复现RED，实际5:00、预期17:00。实现修正继续复用displayTime(card)，在全量结束后构建并针对相关消费者重跑。

合同二错误定位RED确认超限60分钟配30分钟工作，休息输入未标记aria-invalid；已将计算issue映射到该日期休息输入，包含非法值提示及修复清除。
完整三浏览器运行结束，240通过、22失败、2跳过，耗时17.3分钟。22项包含18项旧交互/定位测试、3项既有canonical失败，以及1项运行期间加入更强断言后捕获的24h失焦回归。修正后按最终构建集中重跑全部直接消费者，保留原日志避免覆盖历史证据。

高级默认休息数量的直接入口自查发现addEntry/initialize仍会生成新区间空框。已用defaultBreaks=2确认RED，并改为每日两条30分钟时长，保留默认0且由用户触发的口径。

手机截图检查发现AM/PM按钮继承76px固定flex宽度，在窄表格列内互相重叠。边界框RED实际右边界216px、另一按钮左边界约204px。已仅在手机Detail表格内覆盖flex尺寸和滑块位移，待最终手机回归。


## 统一交付与最终主 agent 自查

状态为“自动执行完成，待统一人工验收”。五项实现均已完成，人工验收未执行。

| 功能 | 正式实现入口 | 本轮明确预期与证据 |
| --- | --- | --- |
| 每日多条时长与旧数据 | src/state/card.ts 的 getReport、src/domain/core.ts 的 calculate、src/io/delivery.ts 的 decodeCard | 多段工作扣15+30得到375分钟/$125，夜班得到90+360分钟，三卡各480分钟合计$600，旧区间/有薪/自动及显式零列表兼容 |
| Detail表格与操作 | src/ui/app.ts 的 renderDays 及原事件委托、src/state/presets.ts | Date/In/Out/Break分列、逐条增删、批量包括空白日及幂等、删除卡片确认、一周一段默认、FAQ展开 |
| 设置与时间格式 | src/ui/app.ts 的 syncControls/reset-advanced、src/ui/simple.ts 的 timeInputs/失焦/只读表 | Sunday首项且Monday默认、蓝点、重置保留姓名工时费率及加班、24h输入17:00失焦仍17:00 |
| 公式 | src/ui/report.ts 的 paySummary、tableReport、summaryReport | CA13小时分别REG8h/$160、OT4h/$120、DT1h/$40，总$320，多卡金额逐卡相加 |
| 完整模板 | src/io/workflows.ts 的 makeTemplate/applyTemplate/loadTemplates | 全Card副本，确认整体恢复，取消保持草稿，旧规则模板继续应用规则；两卡恢复885分钟/$406.25 |

最终检查命令与实际结果如下。

- `npm run typecheck` 通过。
- `npm run test:unit` 通过，6文件82项。
- `npm run build` 通过，包含OG生成。
- `npm run test:og` 通过。
- `git diff --check` 通过。
- `npm run test:seo` 失败于既有biweekly静态锚点断言。隔离HEAD在 /tmp/hourscalculator-head-baseline 复现同一断言失败。
- `npm run test:e2e` 完整运行264项，240通过、22失败、2跳过。其后修正旧交互夹具、24h失焦和休息字段定位，再执行下列功能回归。
- `npx playwright test --workers=3 --grep-invert 'cold mobile input under throttling|all static entry paths'` 运行261项，257通过、3失败、1跳过。排除的性能用例已在前述单worker全量运行验证，canonical用例在隔离HEAD复现域名预期失败。3项失败为手机按钮重叠2项及一次trace产物目录被并行测试清理造成的归档缺失，已修正布局并改为独立输出目录串行复验。
- `npx playwright test tests/e2e/timeline.spec.ts tests/e2e/duration-breaks.spec.ts tests/e2e/card-isolation.spec.ts --workers=1 --output=/tmp/hourscalculator-layout-verified` 三浏览器27项全部通过，包含更强的设置重置、删除确认、超限定位和修复、按钮不重叠断言。

主 agent 实现自查已核对最终diff、模型归属、员工切换、旧快照摘要、正式加载与交付、错误恢复、允许文件及文档。适用A项已集中修正，包括历史日期自动休息污染、员工字段继承、多费率DT金额、模板恢复视图重建、24h失焦与只读显示、默认休息旧输入路径、超限字段定位和手机按钮重叠。没有待处理的B项，C类额外重构未纳入。

本轮部分界面操作用例在实现后补齐，不能声称全部改动均严格保留先RED顺序。真实RED记录包括时长扣除、自动覆盖、默认工作段、DT公式、完整模板、24h失焦、休息超限字段及按钮边界框。构建中曾发现一次样式文件误写，已恢复原样式并仅保留本合同样式，最终构建及浏览器复验通过。

验证日志、基线对照和三浏览器手机截图位于 `/tmp/hourscalculator-detail-evidence`。最终浏览器trace与CSV位于 `/tmp/hourscalculator-layout-verified`。当前产品剩余风险为上述既有canonical与SEO检查失败、套件跳过项，以及尚未完成的人工验收。测试目录冲突已通过独立输出目录消除，最终多卡复验三浏览器均通过。

## 统一人工验收清单

| 操作 | 明确预期 | 人工状态 |
| --- | --- | --- |
| 同日09:00–12:00和13:00–17:00，休15+30，关闭加班，$20/h | 6:15/6.25/$125，修改输入顺序仍从最早工作分钟扣除 | 待验收 |
| 空白周先填休息，周一两条后批量，再重复批量 | 空白日保存休息，已有正数日期保持原列表，重复不叠加，填工作后重算 | 待验收 |
| Quick Fill确认后关闭刷新，再输入未确认数据后关闭；切24h并输入17:00 | 已确认值保留，未确认值丢弃，17:00失焦保持，休息表和报告使用统一格式 | 待验收 |
| 三卡各09:00–17:30、休30、$25/h；删除第二张时先取消再确认 | 各8小时/$200，合计24小时/$600，取消保留，确认删除后合计16小时/$400 | 待验收 |
| 修改高级设置并重置 | 蓝点随默认差异变化，重置保留姓名、工作、时薪和加班选择 | 待验收 |
| CA单日13小时、$20/h | REG8小时/$160、OT4小时/$120、DT1小时/$40，总$320，页面/打印/CSV/分享一致 | 待验收 |
| 保存多卡模板，改记录和费率，预览取消后再确认 | 取消保留当前数据，确认完整恢复卡片、记录、休息、费率与设置，旧规则模板可用 | 待验收 |
| 手机375/390px及真实打印预览，打开旧分享和审批回执 | 控件可输入且不重叠，纸面分页可读，旧快照独立，回执匹配状态正确 | 待验收 |
