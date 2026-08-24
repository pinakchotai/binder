export const DOMAIN_IDS = [
  "non_negotiables",
  "academia",
  "physical",
  "personal_growth",
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export const DOMAIN_META: Record<
  DomainId,
  { label: string; subtitle: string; description: string }
> = {
  non_negotiables: {
    label: "Daily Non-Negotiables",
    subtitle: "Your foundation",
    description: "The daily disciplines you refuse to skip.",
  },
  academia: {
    label: "Academia",
    subtitle: "Sharpen the mind",
    description: "Study, reading and revision — work that compounds.",
  },
  physical: {
    label: "Physical",
    subtitle: "Fuel the machine",
    description: "Movement, diet and recovery.",
  },
  personal_growth: {
    label: "Personal Growth",
    subtitle: "Compound yourself",
    description: "Skills, reflection and the big goals.",
  },
};

export function isDomainId(value: string): value is DomainId {
  return (DOMAIN_IDS as readonly string[]).includes(value);
}
