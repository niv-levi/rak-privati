import "server-only";
import { devVehicles, devHistory, devRecalls } from "./data";

/**
 * Development fixtures. Enabled ONLY when USE_DEV_FIXTURES=true and NODE_ENV !== 'production'.
 * Returns `undefined` when fixtures are disabled (so adapters continue to the real source),
 * `null` when fixtures are enabled but the plate is unknown (simulates "not found").
 */
export function fixturesEnabled(): boolean {
  return process.env.USE_DEV_FIXTURES === "true" && process.env.NODE_ENV !== "production";
}

export function loadFixture<T>(kind: "gov_vehicles" | "gov_history" | "gov_recalls", plate: string): T | null | undefined {
  if (!fixturesEnabled()) return undefined;
  const table = kind === "gov_vehicles" ? devVehicles : kind === "gov_history" ? devHistory : devRecalls;
  if (plate === "9999999") throw new Error("fixture: simulated provider outage");
  return (table as Record<string, unknown>)[plate] as T | undefined ?? null;
}
