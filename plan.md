# Detail 常用设置与页面顺序对齐

当前状态为“自动执行完成，待统一人工验收”。用户已批准将 SEO 检查脚本加入修改范围，正式 SEO 验证通过。
任务规模为中型，围绕 Detail 卡片的现有渲染、日期范围和每日休息操作闭环，沿用当前草稿与计算协议。
用户已确认用 PRD 的 Add 按钮替换 Automatic daily unpaid break，并删除 Time Card 标题下方的旧批量按钮。

## 基线与前项交接

- 制定计划时 HEAD 为 `6162626943d58dd348936551d6aa9680f5c97a79`。执行前核对当前计划标题、状态、Git diff 与必要入口。
- 既有未提交工作涉及 README、四份产品文档、Obsidian、Quick Fill 的 Period 图标、样式和原计划。执行按文件内本轮差异隔离修改，保留这些已有内容。
- 前项终态为分享快照文档已更新、对应页面行为待后续实现。Quick Fill 图标与上一轮 Detail 自动实现已完成，统一人工验收未完成而结束。原计划全文保存在 `/tmp/hourscalculator-plan-before-detail-layout-v4atq4b7.md`。

## 目标与产品口径

- 页面依次呈现工时卡、增加卡片、统一时薪与加班、汇总及公式、操作按钮、高级设置、Help / FAQ。每卡内部依次为姓名和日期范围、Common settings、每日记录。
- 常用区提供 `＋ Add [30] min break to all days`。分钟数为每卡本次添加参数，默认30，修改参数后点击加号才写入每日记录。输入值在当前卡视图中保留，刷新后按默认值初始化。
- 批量操作覆盖当前卡当前范围内全部日期，包括空白日期。已有正数时长、旧分钟休息或有效区间休息的日期跳过，重复点击保持原条数。逐日增删沿用现有入口。
- 分钟数使用现有0～1439整数范围。计划采用0分钟点击时无需新增记录的处理。空白、负数、小数和超限值在参数输入处报错，批量操作整体保持原数据。
- 周期菜单为1～4周与Custom。Custom下方显示开始和结束日期，与卡头Period共用范围状态、校验和日期选择入口，任一处确认后同步回显。Custom内编辑保持输入可用。
- 历史Calendar month计划按Custom展示原实际起止日期，读取时保留原存储字段，实际编辑后提交Custom范围。修改统计范围保留范围外已录记录，日期弹窗取消保留原范围。
- 每段In / Out和右侧×组成工作组，每条休息分钟数和右侧×组成独立休息组。每日记录下方提供胶囊式 `+ Work`、`+ Break`。窄屏休息可移到同日下一行。
- 新录休息使用持续分钟数。旧区间、有薪、自动休息及现有预设继续按已有兼容路径展示和计算。PRD及帮助将“开启自动休息”的日常操作说明改为点击添加，并区分历史记录兼容规则。

## 修改范围与复用边界

- 本轮允许写入 `plan.md`。
- 用户追加批准 `scripts/seo.mjs`，限更新本次休息输入及已有动态锚点对应的三处检查断言。
- 执行阶段前端允许 `index.html`、`src/ui/app.ts`、`src/styles/main.css`，产品文档允许 `docs/README.md`、`docs/detail.prd.md`，文档修改限本次功能和验收口径。
- 浏览器测试允许 `tests/e2e/helpers.ts` 与下列实际文件，修改限上述功能及旧控件的直接消费者。
  `tests/e2e/duration-breaks.spec.ts`、`tests/e2e/daily-break.spec.ts`、`tests/e2e/break-drag.spec.ts`、`tests/e2e/card-isolation.spec.ts`、`tests/e2e/date-range.spec.ts`、`tests/e2e/acceptance.spec.ts`、`tests/e2e/table-layout.spec.ts`、`tests/e2e/calculator.spec.ts`、`tests/e2e/timeline.spec.ts`、`tests/e2e/input-commit.spec.ts`、`tests/e2e/field-errors.spec.ts`、`tests/e2e/mode-sync.spec.ts`、`tests/e2e/simple.spec.ts`、`tests/e2e/simple-compat.spec.ts`、`tests/e2e/personas.spec.ts`、`tests/e2e/workflows.spec.ts`。
- 复用 `Card`、`cardPeriod`、`durationBreaks`、`selectEmployee`、`getReport/getTableReport`、`reportForMode`、CSV及分享编解码入口，执行修改集中在现有UI与直接测试。
- Quick Fill 和 Report 关联范围为日期、休息、确认提交与计算结果的回归。分享快照页面的新行为、计算协议、部署、依赖和Obsidian由相应任务管理。

## 阶段与复用入口

### 执行进度（2026-11-17）

- 已核对计划标题、既有 Git 改动及相关 PRD；保留原有未提交工作。`npx vite build` 通过。
- 阶段一 RED：新增 `tests/e2e/duration-breaks.spec.ts` 的 45 分钟批量添加真实页面用例；Chromium 执行在等待 `[data-bulk-minutes]` 时超时，确认页面尚无参数输入。证据目录 `/tmp/hourscalculator-detail-layout-breaks-red`。
- 沙箱内预览监听 `127.0.0.1:4173` 返回 `EPERM`；经授权在沙箱外重试后浏览器测试正常运行并取得上述 RED。
- 阶段一 GREEN、重构和阶段二至四尚未执行；继续按本合同实施并保留人工验收待统一验收。
- 继续执行：已将批量入口移入常用区并接入每卡输入，`npx vite build` 和新增 45 分钟 Chromium 用例通过（证据 `/tmp/hourscalculator-detail-layout-breaks-green`）。这仅覆盖阶段一部分断言，阶段一尚未完成。
- 阶段一整组验证发现旧夹具 `card-isolation.spec.ts` 和 `daily-break.spec.ts` 仍查找已删除的 `[data-setting="auto"]`；首项超时后中断该组，需按合同改为新入口或用旧草稿覆盖历史自动休息，之后重跑。还需补全参数校验、旧错误定位与多卡等断言，然后继续阶段二。
- 阶段二部分进展：`npx vite build` 通过；自定义日期页面用例因缺少输入框 RED，加入输入和范围同步后 Chromium GREEN（`/tmp/hourscalculator-detail-layout-dates-red`、`/tmp/hourscalculator-detail-layout-dates-green`）。完整日期回归、历史月份和错误路径仍待验证。
- 阶段三部分进展：390px 测试发现工作删除按钮换到下行 RED；调整工作与休息分组后该用例 GREEN（`/tmp/hourscalculator-detail-layout-rows-red`、`/tmp/hourscalculator-detail-layout-rows-green`）。完整布局及其他浏览器验证未执行。
- 阶段一重跑：更新两个旧控件夹具后，计划指定 Chromium 三文件共 8 项通过；仍需补齐参数非法值、历史自动休息错误定位及全部合同断言。`npm run typecheck` 通过。
- 阶段二指定四文件 Chromium 回归：修正旧月份选项与旧开关夹具后 14 项通过（`/tmp/hourscalculator-detail-layout-dates`）；历史月份与更多边界仍需补充。
- 阶段三指定五文件 Chromium 回归 12 项通过。阶段一补充非法值和历史休息；人员场景首次有两项夹具失败，修复后与历史月份用例合计 11 项通过（`/tmp/hourscalculator-detail-layout-followup`）。产品文档和帮助说明已按本合同调整；最终检查及主 agent 自查待完成。
- 最终检查进行中：typecheck、82 项 unit、build、OG、diff 检查通过。SEO 失败于 `scripts/seo.mjs:78` 仍要求已删除的旧 `data-setting="deduction"` 输入；该脚本不在本合同允许文件内，需范围决策，不以伪造旧控件绕过。完整三浏览器套件已启动（282 项，单 worker）。
- 完整套件实际结果：274 通过、2 跳过、6 失败。三浏览器 canonical 断言仍要求 `https://example.test/`，当前及 HEAD 的默认配置均为正式域名，属基线差异；Chromium 另外三项超时（其中下载临时文件丢失）隔离重跑 3/3 通过（`/tmp/hourscalculator-timeout-retry`）。
- 实现自查发现 375/390px 休息输入仅约 35/40px，实际内容难读；补充真实页面 RED（`/tmp/hourscalculator-mobile-readability-red`），将窄屏休息移至同日下一行，操作放在记录之后。修正后 Chromium 相关 14 项通过（`/tmp/hourscalculator-followup-current`），截图已检查；人工验收仍待统一进行。
- SEO 临时预检：只在 `/tmp` 将旧输入断言替换为新输入后，进一步暴露既有静态 `biweekly` 锚点断言失败；未更改合同外脚本。三浏览器最新相关回归运行中（`/tmp/hourscalculator-latest-validation`）。
- 最新相关功能回归三浏览器 99 项通过。随后桌面双休息场景发现按钮高于部分休息记录，修正后检查截图又发现表格行被压缩至 100px；分别补充 RED，调整表格行布局后 Chromium 四项通过，桌面截图显示输入和操作完整（`/tmp/hourscalculator-desktop-width-red`、`/tmp/hourscalculator-desktop-width-green`）。继续验证三浏览器及阶段三回归。
- 修正后阶段三指定五文件三浏览器共 42 项通过（`/tmp/hourscalculator-rows-three-final`）；最后补充的历史自动休息超限、日期错误修复及删除休息后工资断言等 Chromium 13 项通过（`/tmp/hourscalculator-final-edge`）。最新 `npm run build`、`test:og`、`typecheck`、82 项 unit、`git diff --check` 通过。
- 主 agent 实现自查：A 类桌面及窄屏布局问题已按上述 RED/GREEN 修正；B 类为 `scripts/seo.mjs` 不在允许文件范围，正式 `npm run test:seo` 仍因第 78 行查找已移除的旧输入失败。仅在 `/tmp/hourscalculator-seo-candidate.mjs` 试改该断言及两个已有静态锚点断言后运行通过；候选文件不是正式验证通过。需用户确认允许修改该脚本，随后应用最小修正并重跑正式 SEO 检查。C 类无须实施项；用户人工验收未执行。
- 再核对旧夹具后，多卡测试补充刷新后实际休息分钟断言：首卡30、第二卡45，Chromium 通过（`/tmp/hourscalculator-card-value-audit`）。Lunch 预设原有 `settings.auto` 草稿断言仍在，未被新参数默认值断言替代。
- 补充范围边界：1～4周分别显示7、14、21、28天，缩短周期并刷新后范围外 09:00–17:00 记录仍可恢复；另以历史15分钟休息和带薪区间验证批量45分钟添加时跳过已有记录。两项 Chromium 均通过（`/tmp/hourscalculator-period-preservation`、`/tmp/hourscalculator-legacy-bulk`）。
- 补充交付矩阵：新增和刷新两卡后，每卡常用区恰有一个批量入口、旧开关及标题下批量入口为零；三卡各8小时的工资从各 $200 同步为各 $240、总计 $720。Chromium 两项通过（`/tmp/hourscalculator-card-delivery-audit`）。
- 用户批准扩充范围后，`scripts/seo.mjs` 仅更新批量分钟输入和两个静态动态锚点的三处断言；正式 `npm run test:seo` 通过，`git diff --check` 通过。执行自查 B 类范围问题已关闭。

1. **常用设置与批量休息**。复用 `worker-card-template`、`workerViews`、原 `data-bulk-break` 委托、`durationBreaks`、`stopRowSync` 和 `persist`。先让正式页面用例在缺少可编辑参数或45分钟实际被写成30分钟处RED，再将批量入口放入常用区，移除旧开关与标题下重复入口，按输入分钟写入。参数由本卡视图持有，旧 `settings.auto/deduction` 继续服务历史兼容。同步适配 `updateResults`、`renderValidation` 中旧输入框的强制查询、禁用逻辑及错误定位，完成GREEN后整理重复逻辑并复验。
2. **周期与日期同步**。复用 `cardPeriod`、`openDateRange`、`apply-dates`、原 `change` 处理与 `syncControls`。先用选择Custom缺少输入、任一日期入口更新后另一处未同步的真实操作确认RED，再补齐输入及共同范围提交逻辑。复用Quick Fill的 `choosePeriod/applyPeriod` 回调与确认边界，覆盖多卡、历史月份、跨月和取消，GREEN后复验。
3. **每日记录与响应式布局**。复用 `renderDays`、现有时间输入、工作删除及休息增删事件、`.work-fields`、`.day-actions` 和 `.duration-cell`。先在正式页面断言×位于对应组右侧、胶囊按钮位于每日记录下方及375/390px布局，确认RED后调整分组和样式。保留原输入标识、校验关联与焦点提交，再做GREEN和整理后的复验。
4. **文档与跨模块交付**。复用现有PRD功能章节与具体验收表、`openDetailed/chooseRange/verifyDelivery`、既有Quick Fill及交付用例。同步当前产品说明、更新依赖旧开关或月份选项的夹具，保留旧数据测试的实际数值断言。集中验证阶段成果、完成主agent实现自查及适用修正，最终运行完整测试并交付人工验收清单。

## 验收矩阵

| 功能及实际操作 | 明确预期 | 验证层级 |
| --- | --- | --- |
| 新建、刷新、增加第二张卡 | 每卡常用区各有一个Add入口，旧开关及标题下独立按钮数量为零，Time Card后直接接日期区 | 浏览器 |
| 周一已有15+30分钟，其余六天空白，将批量参数设45并连续点两次 | 周一保留两条，其余六天各一条45分钟，刷新后记录一致 | 浏览器及本地草稿 |
| 两卡分别填写不同的批量参数，仅点击第二卡Add | 第一卡记录保持原值，第二卡按自己的参数与范围添加。当前视图切换不串参数 | 浏览器 |
| 参数分别填0、空白、-1、1.5、1440，再修正45 | 0无需新增。非法值提示且草稿保持原值，修正后可正常添加 | 浏览器 |
| 周期依次选1、2、3、4周 | 范围分别7、14、21、28天，旧范围外工作保留，选Custom显示起止输入 | 浏览器 |
| Custom设2026-11-10至18，再通过卡头改为11-28至12-04 | 首次显示9天，后次显示7天，两处日期同步。无效范围提示且保存值保留，弹窗取消不改范围 | 浏览器 |
| 加载2026年11月的旧month草稿与旧区间/有薪/自动休息草稿 | 月份范围保持11-01至11-30且菜单回显Custom。旧记录分钟及工资与原结果一致，超限可定位 | 浏览器及现有规则测试 |
| 同日09:00–12:00、13:00–17:00，休15和30分钟，$20/h且关闭加班 | 6:15、6.25小时、$125。删除15分钟后为6:30、$130。工作×只删除对应工作段 | 浏览器及CSV/打印/分享结果 |
| Quick Fill确认09:00–17:00和30分钟，Detail将休息改45，再回向导 | 回读45分钟和7:15工时。关闭未确认步骤沿用原提交规则，日期及Period图标行为可用 | 浏览器 |
| 三卡各8小时、统一$25/h，时薪改$30/h | 各卡金额由$200同步变$240，总计24小时/$720。加班仍逐卡计算 | 既有人物场景 |
| 375px、390px及桌面录入、增删与键盘切换 | 工作和休息分组清晰，×关联正确，同日换行无横向溢出或点击重叠，失焦提交正确 | 浏览器边界框与截图，统一人工验收 |
| 高级设置折叠、FAQ展开、汇总和交付操作 | 操作顺序符合PRD，双单位与工资公式可核对，已有模板、审批和历史记录入口可用 | 浏览器及统一人工验收 |

## 验证命令

- 各阶段先 `npx vite build`，以真实页面确认RED后实施最小修改，再重新构建并验证GREEN。环境启动失败单独记录为环境问题。
- 阶段一用 `npx playwright test tests/e2e/duration-breaks.spec.ts tests/e2e/daily-break.spec.ts tests/e2e/card-isolation.spec.ts --project=chromium --output=/tmp/hourscalculator-detail-layout-breaks`。
- 阶段二用 `npx playwright test tests/e2e/date-range.spec.ts tests/e2e/acceptance.spec.ts tests/e2e/mode-sync.spec.ts tests/e2e/simple-compat.spec.ts --project=chromium --output=/tmp/hourscalculator-detail-layout-dates`。
- 阶段三用 `npx playwright test tests/e2e/table-layout.spec.ts tests/e2e/calculator.spec.ts tests/e2e/timeline.spec.ts tests/e2e/input-commit.spec.ts tests/e2e/field-errors.spec.ts --project=chromium --output=/tmp/hourscalculator-detail-layout-rows`。RED、GREEN分别使用增加 `-red`、`-green` 后缀的独立目录保留证据。
- 最终集中运行 `npm run typecheck`、`npm run test:unit`、`npm run build`、`npm run test:seo`、`npm run test:og`、一次 `npm run test:e2e -- --workers=1 --output=/tmp/hourscalculator-detail-layout-final` 及 `git diff --check`。完整浏览器套件按现有Chrome、Chromium、WebKit项目运行。
- 浏览器验证需要启动本地预览及浏览器，遇到端口权限限制使用已有授权流程申请所需权限。完整套件失败时按正式夹具或隔离基线核对本轮回归和既有失败，并在交付列明实际结果。

## 交付状态与风险

自动执行完成，待统一人工验收。正式 SEO、typecheck、82 项 unit、build、OG 和 diff 检查通过。完整浏览器套件曾得 274 通过、2 跳过、6 失败：三项 Chromium 超时隔离重跑通过；三浏览器 canonical 断言要求 `example.test`，与本轮及 HEAD 默认正式域名不符，为既有基线差异。之后针对功能及布局修改的三浏览器回归分别 99 项、42 项通过；最新增加的边界断言另有 Chromium 通过证据。桌面及移动截图已自动生成并检查，未执行统一人工验收。
