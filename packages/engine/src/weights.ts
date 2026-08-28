import {
  DEFAULT_DOMAIN_WEIGHTS,
  type Domain,
  MIN_ACTIVE_DOMAINS,
} from "./constants";
import { round2 } from "./math";
import type { UserDomainSetting } from "./types";

export class DomainConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainConfigurationError";
  }
}

export function getActiveDomainCount(settings: UserDomainSetting[]): number {
  return settings.filter((setting) => setting.isActive).length;
}

export function getActiveDomainWeights(
  settings: UserDomainSetting[]
): Record<Domain, number> {
  const active = settings.filter((setting) => setting.isActive);

  if (active.length < MIN_ACTIVE_DOMAINS) {
    throw new DomainConfigurationError(
      `At least ${MIN_ACTIVE_DOMAINS} domains must remain active; got ${active.length}`
    );
  }

  const base: Record<Domain, number> = {} as Record<Domain, number>;
  let baseTotal = 0;

  for (const setting of active) {
    const weight =
      setting.weightOverride ?? DEFAULT_DOMAIN_WEIGHTS[setting.domain];
    base[setting.domain] = weight;
    baseTotal += weight;
  }

  if (!Number.isFinite(baseTotal) || baseTotal <= 0) {
    throw new DomainConfigurationError(
      "Effective weights must be finite and sum to more than zero"
    );
  }

  const result: Record<Domain, number> = {} as Record<Domain, number>;
  for (const domain of Object.keys(base) as Domain[]) {
    result[domain] = round2((base[domain] / baseTotal) * 100);
  }

  const currentTotal = Object.values(result).reduce((sum, weight) => sum + weight, 0);
  const residual = round2(100 - currentTotal);

  if (residual !== 0) {
    const [largestDomain] = Object.entries(result).sort(
      (a, b) => b[1] - a[1]
    )[0];
    result[largestDomain as Domain] = round2(
      result[largestDomain as Domain] + residual
    );
  }

  return result;
}