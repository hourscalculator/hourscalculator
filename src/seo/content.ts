export const topics = [
  {
    path: "with-lunch",
    title: "Time Card Calculator With Lunch",
    description: "Use a time card calculator with lunch to track paid and unpaid breaks, review daily deductions and calculate work hours and estimated gross pay.",
    body: `<section><h2>Time card calculator with lunch breaks</h2>
<p>Enter your arrival and departure times, then record when lunch actually started and ended. A shift from 9 AM to 5 PM spans eight hours. A thirty minute unpaid lunch reduces payable time to seven hours and thirty minutes. If lunch is paid, those thirty minutes stay in the total. Use the time card calculator with lunch to make that distinction visible before sending your hours for review.</p>
<h2>Paid and unpaid lunch deductions</h2><p>A paid break remains part of worked time in this calculator. An unpaid break is deducted from the surrounding work period. Mark each manual break according to how it should be treated. If your lunch was interrupted by work, check the recorded interval and your employer’s applicable rules before treating the whole interval as unpaid. Record actual time so the card can be checked against your schedule.</p>
<h2>Should you deduct thirty minutes?</h2><p>Deduct thirty minutes when you actually took a thirty minute unpaid break. A scheduled lunch alone does not establish what happened. Automatic daily unpaid break inserts an editable interval starting at noon using your selected minutes. Review its placement for every shift. Manual unpaid breaks replace the automatic deduction, preventing the same lunch from being subtracted twice. For a shorter lunch, adjust the break endpoints to the actual times.</p>
<h2>California meal period basics</h2><p>California generally requires a meal period of at least thirty minutes for work exceeding five hours. A waiver by mutual consent may apply when the whole workday is no more than six hours. On-duty meal time generally counts as paid work. Industry exceptions and additional requirements can apply. The automatic deduction records time and does not check meal timing, waivers or premiums. Review the <a href="https://www.dir.ca.gov/dlse/faq_mealperiods.html">California DLSE meal period guidance</a> for your situation.</p></section>`,
    faq: [
      ["Does paid lunch reduce my hours?", "No. Mark the break as paid and its minutes remain in the worked total. Confirm that treatment with the policy applicable to your shift."],
      ["Will a manual lunch be deducted twice?", "Manual unpaid breaks replace the automatic deduction. Review the visible break intervals after entering lunch to confirm the daily total matches your actual work."],
      ["Can I change the automatic lunch time?", "Yes. The automatic interval starts at noon. Edit its start and end fields or move its timeline endpoints to match the break you took."],
      ["Does selecting California overtime check meal compliance?", "No. That setting calculates overtime categories. Meal period timing, waiver eligibility and any meal premium require a separate review using the applicable rules."],
      ["What if I worked through lunch?", "Record the time actually worked and remove an unpaid deduction that does not describe your day. Ask payroll how to document the missed or interrupted meal."],
    ],
  },
  {
    path: "biweekly",
    title: "Biweekly Time Card Calculator",
    description: "Use a biweekly time card calculator to total two weeks, calculate weekly overtime separately, track unpaid breaks and export hours for payroll.",
    body: `<section><h2>Biweekly time card calculator for two weeks</h2><p>A biweekly pay period covers two consecutive weeks. Choose two weeks in Report period, set the dates and enter each day’s arrival, departure and breaks. Review the full period before exporting it. The biweekly time card calculator keeps daily entries visible while adding both weeks into a period total, so you can compare the hours submitted with the dates on your pay statement.</p>
<h2>Calculate overtime separately each week</h2><p>With the weekly overtime setting, hours above forty in each configured workweek receive overtime treatment. Two weeks with forty five hours and thirty five hours add up to eighty hours, but still include five overtime hours. Combining both weeks into one eighty hour threshold would erase those five hours. Two weeks with forty hours each have the same eighty hour total and zero weekly overtime hours.</p>
<p>This calculator applies weekly thresholds separately. The <a href="https://www.dol.gov/agencies/whd/overtime/">U.S. Department of Labor overtime guidance</a> explains the federal workweek standard. At a twenty dollar hourly rate and a one and a half overtime multiplier, the first example gives seventy five regular hours worth $1,500 and five overtime hours worth $150. Estimated gross pay is $1,650. Compare each week’s entries when checking a difference, since a correct period total alone cannot establish that overtime was classified correctly.</p>
<h2>Match the workweek boundary</h2><p>The workweek boundary determines which hours belong together for weekly overtime. Set the first day to match your employer’s reporting rules before entering the card. A biweekly payday schedule does not change that boundary. Daily overtime and California mode use different rules, so select the setting that applies to your work. Check shifts crossing midnight and unpaid breaks before using the estimated pay.</p>
<h2>Prepare a biweekly payroll record</h2><p>Add a name and, for client work, the client and project. Review missing clock entries, compare both weeks and export CSV or print the report. Save your downloaded record with the relevant pay period. Local drafts are useful for continuing work in the same browser, while a downloaded report gives you a separate record to attach to an invoice or payroll question.</p></section>`,
    faq: [
      ["Is eighty hours always regular time?", "No. With weekly overtime, a forty five hour week followed by a thirty five hour week includes five overtime hours despite totaling eighty hours."],
      ["Is biweekly the same as twice monthly?", "No. Biweekly covers recurring fourteen day periods. Twice monthly uses two calendar based periods per month, which can contain different numbers of days."],
      ["Which day should start my workweek?", "Choose the workweek boundary used by your employer. Confirm it before reviewing overtime because moving the boundary changes which daily hours are grouped together."],
      ["Can I deduct different lunches each day?", "Yes. Enter actual manual breaks for each shift. Unpaid intervals reduce worked time, while breaks marked paid remain part of the daily total."],
      ["How do I send both weeks to payroll?", "Choose Export CSV or Print / PDF after reviewing the date range and correcting errors. Check that the exported dates cover the intended two weeks."],
    ],
  },
  {
    path: "decimal",
    title: "Decimal Hours Calculator",
    description: "Use a decimal hours calculator to convert minutes into payroll hours, compare hh:mm totals and understand rounding differences in CSV and estimated pay.",
    body: `<section><h2>Decimal hours calculator for payroll</h2><p>Decimal hours express minutes as a fraction of sixty. Divide minutes by sixty, then add any whole hours. Seven hours and thirty minutes becomes 7.50 hours. Seven hours and forty five minutes becomes 7.75 hours. Use the decimal hours calculator to compare this payroll format with familiar hours and minutes while keeping the underlying worked time available for review.</p>
<h2>Minutes to decimal hours conversion table</h2><table><thead><tr><th>Minutes</th><th>Decimal hours</th></tr></thead><tbody><tr><td>5</td><td>0.0833</td></tr><tr><td>10</td><td>0.1667</td></tr><tr><td>15</td><td>0.25</td></tr><tr><td>20</td><td>0.3333</td></tr><tr><td>30</td><td>0.50</td></tr><tr><td>45</td><td>0.75</td></tr><tr><td>60</td><td>1.00</td></tr></tbody></table><p>The repeating fractions in this table are rounded to four decimal places. Fifteen, thirty and forty five minutes convert exactly. For a longer duration, keep the whole hours and convert only the remaining minutes. Eight hours and fifteen minutes is 8.25 hours. Enter arrival and departure times in the clock fields, then read the resulting duration in the decimal column.</p>
<h2>Why payroll totals may differ</h2><p>A displayed value can hide part of a minute fraction. Rounding each daily decimal before adding the days can produce a different result from adding actual minutes first. Three one minute entries displayed as 0.02 each would sum to 0.06, while their combined three minutes equal 0.05 hours. This calculator totals minutes before converting the result and preserves those minutes when estimating pay.</p>
<p>Check whether payroll rounds clock punches, rounds daily durations or rounds only the period total. Also compare unpaid lunch deductions, overtime classification, the hourly rate and the workweek boundary. These choices can explain a difference even when both systems use decimal hours. Review the original time entries alongside the exported CSV so you can locate the first point where the figures diverge.</p>
<h2>Calculate pay using decimal hours</h2><p>At twenty dollars per hour, seven hours and thirty minutes produces $150 before any overtime adjustments. Treating 7:30 as 7.30 would produce $146. Choose the decimal display precision you need, then use the actual minutes and gross pay figures to check your invoice. Keep the hours and minutes column in your review process when a rounded decimal looks unfamiliar.</p></section>`,
    faq: [
      ["Is fifteen minutes 0.15 hours?", "Fifteen minutes equals 0.25 hours because fifteen divided by sixty is one quarter. A value of 0.15 hours represents nine minutes."],
      ["How do I convert forty five minutes?", "Divide forty five by sixty to get 0.75 hours. Add the whole hours separately, so six hours and forty five minutes becomes 6.75 hours."],
      ["Does changing decimal precision change my pay?", "Display precision changes how decimal hours appear. The calculator preserves actual minutes for totals and estimated pay instead of recalculating from rounded display values."],
      ["Why do rounded daily values differ from the total?", "Daily decimal values may each contain rounding differences. The period total converts summed minutes, so adding displayed daily figures can give a slightly different number."],
      ["What should I compare with payroll first?", "Compare the date range, original clock times and unpaid breaks. Then check rounding policy, weekly overtime boundaries and rates against the actual minutes in your report."],
    ],
  },
];

export function relatedPages() {
  return `<section><h2>Related time card calculators</h2><p><a href="/with-lunch/">Time card calculator with lunch</a> · <a href="/biweekly/">Biweekly time card calculator</a> · <a href="/decimal/">Decimal hours calculator</a></p></section>`;
}
