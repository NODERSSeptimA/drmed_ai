// Syncs template schemas from JSON files into the database.
// Safe to run on every deploy — updates existing templates by specialization.
const { PrismaClient } = require("@prisma/client");
const { readFileSync, readdirSync } = require("fs");
const { join } = require("path");

const prisma = new PrismaClient();

async function main() {
  const templatesDir = join(process.cwd(), "templates");
  const files = readdirSync(templatesDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const templateJson = JSON.parse(
      readFileSync(join(templatesDir, file), "utf-8")
    );

    if (!templateJson.sections || !templateJson.specialization) continue;

    const schema = { sections: templateJson.sections };

    const updated = await prisma.template.updateMany({
      where: { specialization: templateJson.specialization },
      data: { schema },
    });

    if (updated.count > 0) {
      console.log(`Synced template "${templateJson.title}" (${updated.count} record(s))`);
    } else {
      console.log(`No existing template for "${templateJson.specialization}", skipping (will be created by seed)`);
    }
  }
}

main()
  .catch((e) => { console.error("Template sync failed:", e.message); })
  .finally(() => prisma.$disconnect());
