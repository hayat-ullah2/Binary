import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { licenseKeys } from "./schema";
import { generateLicenseKey, toLicenseKey } from "@/lib/license";
import { PLAN_DURATION_DAYS, type LicenseKey, type LicensePlan } from "@/types/admin";

export async function listLicenseKeys(): Promise<LicenseKey[]> {
  const rows = await db
    .select()
    .from(licenseKeys)
    .orderBy(desc(licenseKeys.createdAt));
  return rows.map(toLicenseKey);
}

export interface CreateLicenseInput {
  label?: string;
  email?: string | null;
  plan?: LicensePlan;
  maxActivations?: number;
  /** Override plan default; null = never expires. */
  expiresInDays?: number | null;
}

export async function createLicenseKey(
  input: CreateLicenseInput
): Promise<LicenseKey> {
  const plan = input.plan ?? "Trial";
  const days =
    input.expiresInDays !== undefined
      ? input.expiresInDays
      : PLAN_DURATION_DAYS[plan];
  const expiresAt =
    days === null ? null : new Date(Date.now() + days * 86_400_000);

  const [row] = await db
    .insert(licenseKeys)
    .values({
      key: generateLicenseKey(),
      label: input.label?.trim() || "Unnamed license",
      email: input.email?.trim() || null,
      plan,
      status: "ACTIVE",
      maxActivations: input.maxActivations ?? 1,
      expiresAt,
    })
    .returning();
  return toLicenseKey(row);
}

export async function setLicenseStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE" | "REVOKED"
): Promise<LicenseKey | null> {
  const [row] = await db
    .update(licenseKeys)
    .set({ status })
    .where(eq(licenseKeys.id, id))
    .returning();
  return row ? toLicenseKey(row) : null;
}

export async function deleteLicenseKey(id: string): Promise<boolean> {
  const rows = await db
    .delete(licenseKeys)
    .where(eq(licenseKeys.id, id))
    .returning({ id: licenseKeys.id });
  return rows.length > 0;
}
