import "dotenv/config";
import { db } from "@/lib/db";
import { licenseKeys } from "@/lib/db/schema";
import { generateLicenseKey } from "@/lib/license";

const DAY = 86_400_000;
const now = Date.now();

const samples = [
  { label: "Ahmed Khan", email: "ahmed@example.com", plan: "Monthly" as const, status: "ACTIVE" as const, activations: 1, maxActivations: 1, created: 10, expires: 20 },
  { label: "Sara Ali", email: "sara@example.com", plan: "Quarterly" as const, status: "ACTIVE" as const, activations: 1, maxActivations: 2, created: 20, expires: 70 },
  { label: "Trial User", email: null, plan: "Trial" as const, status: "ACTIVE" as const, activations: 1, maxActivations: 1, created: 9, expires: -2 }, // expired
  { label: "Bilal Raza", email: "bilal@example.com", plan: "Lifetime" as const, status: "ACTIVE" as const, activations: 2, maxActivations: 3, created: 40, expires: null },
  { label: "Zain Malik", email: "zain@example.com", plan: "Monthly" as const, status: "REVOKED" as const, activations: 0, maxActivations: 1, created: 5, expires: 10 },
  { label: "Pending Reseller", email: null, plan: "Trial" as const, status: "INACTIVE" as const, activations: 0, maxActivations: 1, created: 3, expires: 5 },
];

async function main() {
  console.log("Seeding license keys…");
  await db.delete(licenseKeys);
  await db.insert(licenseKeys).values(
    samples.map((s) => ({
      key: generateLicenseKey(),
      label: s.label,
      email: s.email,
      plan: s.plan,
      status: s.status,
      activations: s.activations,
      maxActivations: s.maxActivations,
      createdAt: new Date(now - s.created * DAY),
      expiresAt: s.expires === null ? null : new Date(now + s.expires * DAY),
    }))
  );
  console.log(`  ✓ ${samples.length} license keys seeded`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
