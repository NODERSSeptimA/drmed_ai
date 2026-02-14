// Syncs ICD-10 codes from JSON into the database.
// Safe to run on every deploy — uses skipDuplicates.
const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("fs");
const { join } = require("path");

const prisma = new PrismaClient();

async function main() {
  const filePath = join(process.cwd(), "data/icd10-f.json");
  const icd10Data = JSON.parse(readFileSync(filePath, "utf-8"));

  const result = await prisma.icd10.createMany({
    data: icd10Data,
    skipDuplicates: true,
  });

  console.log(`ICD-10: ${result.count} new codes loaded (${icd10Data.length} total in file)`);
}

main()
  .catch((e) => { console.error("ICD-10 sync failed:", e.message); })
  .finally(() => prisma.$disconnect());
