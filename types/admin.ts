export type LicensePlan = "Trial" | "Monthly" | "Quarterly" | "Lifetime";

/** Stored status (admin-controlled). EXPIRED is derived from expiresAt. */
export type LicenseStoredStatus = "ACTIVE" | "INACTIVE" | "REVOKED";

/** Effective status shown in the UI (includes derived EXPIRED). */
export type LicenseStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "REVOKED";

export interface LicenseKey {
  id: string;
  key: string;
  label: string;
  email: string | null;
  plan: LicensePlan;
  status: LicenseStatus;
  activations: number;
  maxActivations: number;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export const LICENSE_PLANS: LicensePlan[] = [
  "Trial",
  "Monthly",
  "Quarterly",
  "Lifetime",
];

/** Default validity in days per plan (null = never expires). */
export const PLAN_DURATION_DAYS: Record<LicensePlan, number | null> = {
  Trial: 7,
  Monthly: 30,
  Quarterly: 90,
  Lifetime: null,
};
