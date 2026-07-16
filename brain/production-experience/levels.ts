export type ProductionLevelId = 1 | 2 | 3 | 4 | 5;

export type ProductionLevel = {
  id: ProductionLevelId;
  name: string;
  min: number;
  max: number;
  wowLabel?: string;
};

export const PRODUCTION_LEVELS: ProductionLevel[] = [
  { id: 1, name: "Prototype", min: 0, max: 25 },
  { id: 2, name: "Beta Ready", min: 25, max: 50 },
  { id: 3, name: "Startup Ready", min: 50, max: 75 },
  { id: 4, name: "Production Ready", min: 75, max: 90 },
  {
    id: 5,
    name: "Senior Engineer Approved",
    min: 90,
    max: 100,
    wowLabel: "Senior Engineer Approved",
  },
];

export function getProductionLevel(score: number | null): ProductionLevel | null {
  if (score === null) return null;
  const clamped = Math.max(0, Math.min(100, score));
  return (
    PRODUCTION_LEVELS.find((level) => clamped >= level.min && clamped <= level.max) ??
    PRODUCTION_LEVELS[0]
  );
}

export function isSeniorEngineerApproved(score: number | null, blockers: number): boolean {
  return score !== null && score >= 90 && blockers === 0;
}

export function isReadyToDeploy(score: number | null, blockers: number): boolean {
  return score !== null && score >= 85 && blockers === 0;
}
