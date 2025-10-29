export const REQUIREMENT_TYPE_VALUES = [
  "functional",
  "non-functional",
  "performance",
  "security",
  "usability",
  "compliance",
  "integration",
  "data",
  "other",
] as const;

export type RequirementTypeValue = typeof REQUIREMENT_TYPE_VALUES[number];

export const REQUIREMENT_STATUS_VALUES = [
  "analysis",
  "discovery",
  "ready",
  "in-progress",
  "blocked",
  "done",
] as const;

export type RequirementStatusValue = typeof REQUIREMENT_STATUS_VALUES[number];
