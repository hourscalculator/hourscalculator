# 分享 Report 直链只读与本地草稿替换

本轮状态：实现已完成，未运行测试，待统一人工验收。打开有效 `#report=` 分享链接时，快照直接覆盖当前浏览器草稿，页面只读且不提供按钮或操作功能。

## 目标与范围

只修改分享 Report 直链流程；普通计算报告的打印/CSV，以及 `#readonly=` 审批快照保持原行为。无效链接保留本地草稿并在页面内提示。

允许文件：`src/ui/app.ts`、`src/styles/main.css`、`tests/e2e/simple.spec.ts`、本计划。测试文件只更新已有直接场景，不新增测试；本轮不运行测试。

## 实施步骤与验收

1. 复用 `previewShare`、`decodeShare`、当前 `card` 和 `persist`；有效 `#report=` 链接直接载入并保存快照，不清除链接。
2. 隐藏采纳/保留提示及只读打印/CSV控件，并阻断这两个控件在 Report 直链下的事件；普通报告和审批流程不受影响。
3. 更新现有分享报告浏览器场景，检查报告只读、操作控件不可见且本地草稿已被快照覆盖。检查目标 diff 与 `git diff --check`。

## 计划自查

已核对正式入口 `previewShare`、分享解码/本地保存路径、`#readonly=` 消费者、只读工具事件及现有 `tests/e2e/simple.spec.ts` 直接用例。实现仅作用于 `#report=`；无效分享路径不写本地，审批与普通报告的现有控件继续使用。无新增状态或并行流程。

## 实现自查与验证

- 有效分享链接解码后直接替换 `card` 并持久化，报告页隐藏分享选择、打印及 CSV 控件，且不响应对应事件。
- 无效链接保持本地卡片不变，并在只读页内显示错误。普通 Report 和 `#readonly=` 流程未改。
- 已更新现有浏览器用例以覆盖新行为；未运行测试。
- `git diff --check -- plan.md src/ui/app.ts src/styles/main.css tests/e2e/simple.spec.ts`：通过。

---

# Detail 每日工时卡窄屏布局

当前状态：自动执行完成，待统一人工验收。
任务规模：小型。修改限于 Detail 每日工时卡的现有表格 CSS 与布局回归用例，不改页面级操作区、数据或计算。

## 前项与依据

- 前项自动验证完成，统一人工验收未完成而结束。用户提供的新截图暴露窄屏下 AM/PM 换行、删除按钮脱离 Out，以及日期行内部出现分隔线的问题。
- 当前产品依据为用户本轮明确要求及工作区已有的 `docs/detail.prd.md` 布局说明。该文件含未提交用户改动，保留原样，不纳入本轮编辑。
- 已阅读 `docs/README.md`、`docs/detail.prd.md`、`docs/quick-fill.prd.md`、`docs/report.prd.md`。修改限定 Detail 的 `.entry-table` 与操作区；Quick Fill 和 Report 样式保持原样。

## 目标与验收

每个日期作为完整分组：In/Out 与 Break 在上方，`+ Work`、`+ Break` 在下方；分组内部无分隔线，仅日期之间有分隔线。窄屏先让 Break 换到下一行；更窄时 In 和 Out 各占一行。时间输入和 AM/PM 控件始终并排，删除工作段的 × 跟在 Out 组末尾。页面不产生横向溢出。

| 操作 | 预期 | 验证 |
| --- | --- | --- |
| 1440px 打开 Detail 每日记录 | In/Out 与 Break 按现有桌面布局呈现，操作胶囊在记录之后 | 现有布局用例 |
| 390px 打开 Detail | In、Out 输入与 AM/PM 各自同排；Break 和操作区在工时记录之后；日期之间有分隔线，日期内无横线 | 浏览器断言与截图 |
| 320px 打开 Detail | In 与 Out 分两行；每个时间输入仍与 AM/PM 同排；× 与 Out 同排并在其末尾；无横向溢出 | 浏览器断言与截图 |
| Quick Fill 与 Report | 页面级操作区与本轮无关，保持现有样式 | 本轮不改对应样式 |

## 范围与复用

- 允许修改：`src/styles/main.css`、`tests/e2e/table-layout.spec.ts`、本文件。
- 不修改：`docs/detail.prd.md` 及其他现有用户改动；不改 `src/ui/app.ts`、数据协议、计算路径、Quick Fill、Report、交付功能。
- 复用 `renderDays` 生成的 `.entry-table` / `.day` / `.period` / `.duration-cell` / `.day-actions` 结构及 `tests/e2e/helpers.ts` 的 `openDetailed` 正式页面入口。CSS 已有移动断点；修正表格单元格边框、窄屏 `.work-fields`、`.time-control`、`.meridiem` 排列。不新增状态或路径。
- 窄屏测试通过正式页面断言真实控件边界框和日期单元边框；不以 DOM 快照代替布局验证。

## 执行与验证

- RED/GREEN：修复前真实页面用例重现 375/390px 下时间输入与 AM/PM 分行、320px 下 In/Out 未分行；修复后每个输入与 AM/PM 同排、窄屏 In/Out 分行，删除键跟随 Out。完整 `table-layout.spec.ts` Chromium 5/5 通过。
- 截图复核：320px 下 In/Out 分行且删除键跟随 Out；每日胶囊位于记录下方，日期之间有分隔线、日期内无横线。
- 最终验证：`npm run typecheck`、`npm run test:unit`（82 项）、`npm run build` 通过。完整 `table-layout.spec.ts` Chromium 5/5 通过；此前完整 E2E 中三个浏览器的 Time Card 布局用例均通过。
- 完整 E2E 为 310 通过、2 跳过、3 失败；三项均是 `workflows.spec.ts` canonical 断言期望 `https://example.test/`、实际返回 `https://punchcardcalculator.com/`。`vite.config.ts` 默认值和 HEAD 相同，该基线 URL 差异与本次样式无关。
- `git diff --check` 对本轮 `src/styles/main.css`、`plan.md`、`tests/e2e/table-layout.spec.ts` 通过；全量检查仅报告未修改的 `docs/detail.prd.md` 中用户已有行尾空格。截图已检查，统一人工验收待进行。

## 交付状态

自动执行完成，待统一人工验收。主 agent 实现自查无 A/B 类问题：复用现有 Detail DOM 和 CSS 断点，窄屏控件组合与日期边界均有正式页面布局断言；未修改页面级操作区、Quick Fill 或 Report。C 类无必须采纳项。
