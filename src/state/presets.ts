import { createCard, type Card } from "./card";
export type Preset =
  "hourly" | "lunch" | "biweekly" | "decimal" | "freelancer";
export function applyPreset(card: Card, preset: Preset) {
  const defaults = createCard(card.anchor);
  card.length = preset === "biweekly" ? "2" : defaults.length;
  card.defaultSegments = defaults.defaultSegments;
  card.defaultBreaks = defaults.defaultBreaks;
  card.decimalFirst = preset === "decimal";
  card.format = defaults.format;
  card.showAmPm = defaults.showAmPm;
  card.settings = {
    ...defaults.settings,
    rate: card.settings.rate,
    auto: preset === "lunch",
    overtime: preset !== "freelancer",
    round: preset === "freelancer" ? "none" : "two",
  };
}
export function routePreset(path: string): Preset {
  return (
    (
      {
        "/with-lunch": "lunch",
        "/biweekly": "biweekly",
        "/decimal": "decimal",
      } as Record<string, Preset>
    )[path.replace(/\/$/, "")] ?? "hourly"
  );
}
