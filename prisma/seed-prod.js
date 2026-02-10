// Production seed script — runs with just `node` (no tsx needed)
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { readFileSync } = require("fs");
const { join } = require("path");

const prisma = new PrismaClient();

async function main() {
  // Check if data already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: "doctor@dynastia18.ru" },
  });
  if (existingUser) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  console.log("Seeding database...");

  const clinic = await prisma.clinic.create({
    data: {
      name: "ООО «Династия-18»",
      address: "г. Санкт-Петербург, ул. Ленина д. 5",
      phone: "(812) 385-50-80",
      email: "info@meddynasty.ru",
      inn: "7813615229",
      kpp: "781301001",
    },
  });

  const hashedPassword = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      email: "doctor@dynastia18.ru",
      password: hashedPassword,
      name: "Иванова Светлана Александровна",
      role: "doctor",
      clinicId: clinic.id,
    },
  });

  const patient1 = await prisma.patient.create({
    data: {
      firstName: "Анна", lastName: "Ковальски", middleName: "Михайловна",
      birthDate: new Date("1991-03-12"), gender: "female",
      phone: "+7 (903) 456-78-90", email: "anna.kowalski@mail.ru",
      address: "Санкт-Петербург, ул. Садовая 12",
      allergies: ["Пенициллин"], insuranceNumber: "1234567890",
      clinicId: clinic.id,
    },
  });

  await prisma.patient.createMany({
    data: [
      { firstName: "Михаил", lastName: "Белов", middleName: "Сергеевич", birthDate: new Date("1985-07-24"), gender: "male", phone: "+7 (916) 789-01-23", clinicId: clinic.id },
      { firstName: "Елена", lastName: "Соколова", middleName: "Ивановна", birthDate: new Date("1993-11-05"), gender: "female", phone: "+7 (926) 345-67-89", clinicId: clinic.id },
      { firstName: "Дмитрий", lastName: "Петров", middleName: "Андреевич", birthDate: new Date("1978-01-30"), gender: "male", phone: "+7 (905) 012-34-56", clinicId: clinic.id },
    ],
  });

  // Template
  let templateSchema = { sections: [] };
  try {
    const templateJson = JSON.parse(
      readFileSync(join(process.cwd(), "templates/psychiatry-examination.json"), "utf-8")
    );
    templateSchema = { sections: templateJson.sections };
    await prisma.template.create({
      data: {
        title: templateJson.title,
        specialization: templateJson.specialization,
        schema: templateSchema,
        clinicId: clinic.id,
      },
    });
  } catch (e) {
    console.log("Template file not found, skipping template creation");
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
