import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Clinic ---
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
  console.log("Created clinic:", clinic.name);

  // --- Doctor ---
  const hashedPassword = await bcrypt.hash("password123", 10);
  const doctor = await prisma.user.create({
    data: {
      email: "doctor@dynastia18.ru",
      password: hashedPassword,
      name: "Иванова Светлана Александровна",
      role: "doctor",
      clinicId: clinic.id,
    },
  });
  console.log("Created doctor:", doctor.name);

  // --- Patients ---
  const patient1 = await prisma.patient.create({
    data: {
      firstName: "Анна",
      lastName: "Ковальски",
      middleName: "Михайловна",
      birthDate: new Date("1991-03-12"),
      gender: "female",
      phone: "+7 (903) 456-78-90",
      email: "anna.kowalski@mail.ru",
      address: "Санкт-Петербург, ул. Садовая 12",
      allergies: ["Пенициллин"],
      insuranceNumber: "1234567890",
      clinicId: clinic.id,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      firstName: "Михаил",
      lastName: "Белов",
      middleName: "Сергеевич",
      birthDate: new Date("1985-07-24"),
      gender: "male",
      phone: "+7 (916) 789-01-23",
      clinicId: clinic.id,
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      firstName: "Елена",
      lastName: "Соколова",
      middleName: "Ивановна",
      birthDate: new Date("1993-11-05"),
      gender: "female",
      phone: "+7 (926) 345-67-89",
      clinicId: clinic.id,
    },
  });

  const patient4 = await prisma.patient.create({
    data: {
      firstName: "Дмитрий",
      lastName: "Петров",
      middleName: "Андреевич",
      birthDate: new Date("1978-01-30"),
      gender: "male",
      phone: "+7 (905) 012-34-56",
      clinicId: clinic.id,
    },
  });

  console.log(
    "Created patients:",
    [patient1, patient2, patient3, patient4]
      .map((p) => `${p.lastName} ${p.firstName}`)
      .join(", ")
  );

  // --- Template: read from JSON file ---
  const templateJson = JSON.parse(
    readFileSync(join(process.cwd(), "templates/psychiatry-examination.json"), "utf-8")
  );

  const templateSchema = { sections: templateJson.sections };

  const template = await prisma.template.create({
    data: {
      title: templateJson.title,
      specialization: templateJson.specialization,
      schema: templateSchema,
      clinicId: clinic.id,
    },
  });
  console.log("Created template:", template.title);

  // --- Example Medical History (matching the template JSON field IDs) ---
  const medicalHistoryData = {
    patient_info: {
      full_name: "Ковальски Анна Михайловна",
      birth_date: "1991-03-12",
    },
    examination_basis: {
      basis:
        "Направлена ПНД №13 в связи с ухудшением психического состояния на фоне амбулаторного лечения. Выраженная депрессивная симптоматика, нарушение сна, тревога, снижение работоспособности.",
    },
    complaints: {
      complaints_text:
        "Стойко сниженное настроение в течение последних 3 месяцев с усилением в утренние часы. Утрата интересов и способности получать удовольствие (ангедония). Нарушение сна — ранние пробуждения в 4–5 утра. Снижение аппетита, потеря массы тела (−5 кг за 2 месяца). Выраженная тревога, внутреннее беспокойство. Трудности концентрации внимания, снижение работоспособности.",
    },
    anamnesis: {
      dispensary_observation:
        "Наблюдается в ПНД №13 с весны 2022 г. У нарколога не наблюдается.",
      neuroinfections: "Отрицает.",
      substance_use:
        "Алкоголь — эпизодически, в небольших количествах. Наркотики, ПАВ — отрицает.",
      psychotrauma:
        "Разрыв длительных отношений (2017 г.), профессиональное выгорание (2022 г.), конфликтная ситуация на работе и смерть бабушки (октябрь 2025 г.).",
      suicide_attempts: "Отрицает.",
      consciousness_episodes: "Отрицает.",
      chronic_diseases:
        "Хронический гастрит. Аллергия на пенициллин. Текущая терапия: эсциталопрам 10 мг/сут — без значимого эффекта.",
      anamnesis_additions:
        "Мать — эпизоды депрессии. Бабушка по материнской линии — суицидальная попытка в анамнезе. Отец — злоупотребление алкоголем.",
    },
    mental_status: {
      consciousness: "Ясное",
      orientation: "Ориентирована в месте, времени и собственной личности правильно",
      question_response: "По существу, с задержками, тихим голосом. Ответы односложные.",
      contact_productive: "Продуктивный. В контакт вступает пассивно.",
      speech: "Тихая, замедленная, монотонная. Спонтанная речевая продукция снижена.",
      attention: "Рассеянное, с трудом сосредотачивается на беседе.",
      observation_data:
        "Выглядит старше паспортного возраста. Одета аккуратно, но без внимания к внешности. Мимика обеднена, лицо гипомимичное. Поза согбенная, движения замедлены.",
      emotional_disorders:
        "Фон настроения резко снижен. Преобладают чувства тоски, безнадёжности, вины. Эмоциональные реакции обеднены, при упоминании семьи — плачет. Тревога выраженная.",
      memory_disorders:
        "Жалуется на ухудшение памяти на текущие события. Долговременная память сохранена.",
      intellect_disorders:
        "Не выявлено. Интеллект соответствует полученному образованию.",
      thinking_disorders:
        "Темп мышления замедлен. Бредовых идей не высказывает. Отмечаются идеи малоценности, самообвинения. Навязчивые мысли о бессмысленности жизни — без конкретных суицидальных планов.",
      sensation_quantitative: "Не выявлено.",
      sensation_qualitative: "Не выявлено.",
      perception_disorders:
        "Иллюзий, галлюцинаций не выявлено. Сенестопатии, деперсонализация, дереализация — отрицает.",
      motor_volitional:
        "Гипобулия. Волевая активность снижена. Затрудняется в принятии решений.",
      suicidal_intentions:
        "Суицидальные мысли пассивного характера. Конкретных планов и намерений не высказывает.",
      self_assessment:
        "Критика к заболеванию формальная. Понимает необходимость лечения, но выражает сомнение в возможности улучшения.",
    },
    somatic_neurological: {
      somatic_neuro_text:
        "Общее состояние удовлетворительное. Телосложение астеническое. АД — 105/70 мм рт. ст. ЧСС — 82/мин. Тоны сердца ритмичные. Зрачки D=S, фотореакция живая. Менингеальных знаков нет.",
    },
    dynamics: {
      dynamics_text:
        "Первый депрессивный эпизод — 2017 г. (реактивная депрессия, без лечения). Второй эпизод — весна 2022 г. (сертралин 50 мг, ремиссия). Текущий (третий) эпизод — с октября 2025 г., на фоне конфликта на работе и утраты.",
    },
    conclusion: {
      conclusion_features:
        "Выявленные особенности психического статуса (стойко сниженный фон настроения, ангедония, гипобулия, замедление мышления, идеи малоценности, тревога, нарушение сна и аппетита) указывают на наличие психического расстройства. В клинической картине отмечаются следующие симптомы: депрессивный аффект, ангедония, психомоторная заторможенность, инсомния, снижение аппетита, тревога.",
      disorder_level: "дефицитарный",
      reaction_type: "эндогенный",
    },
    diagnosis: {
      diagnosis_text:
        "Рекуррентное депрессивное расстройство, текущий эпизод тяжёлой степени с соматическими симптомами. Тревожный синдром. Инсомния.",
      icd_code: "F33.21",
    },
    examination_plan: {
      examination_plan_text:
        "ОАК, биохимический анализ крови (глюкоза, АЛТ, АСТ, креатинин), ОАМ, ЭКГ, ФГ органов грудной клетки, консультация терапевта, шкала Гамильтона (HDRS).",
    },
    treatment_plan: {
      treatment_plan_text:
        "Венлафаксин 75 мг → 150 мг, 2 р/сут с титрацией. Кветиапин 25 мг на ночь. Гидроксизин 25 мг при тревоге до 3 р/сут. Когнитивно-поведенческая терапия 2 р/нед.",
    },
    follow_up: {
      follow_up_date: "2026-01-29",
      doctor_name: "Иванова Светлана Александровна",
      examination_date: "2026-01-15",
    },
  };

  const medicalHistory = await prisma.medicalHistory.create({
    data: {
      data: medicalHistoryData,
      status: "completed",
      examinationDate: new Date("2026-01-15"),
      patientId: patient1.id,
      templateId: template.id,
      doctorId: doctor.id,
    },
  });
  console.log("Created medical history:", medicalHistory.id);

  // --- ICD-10 Chapter F codes ---
  const icd10Data = JSON.parse(
    readFileSync(join(process.cwd(), "data/icd10-f.json"), "utf-8")
  );
  const icd10Result = await prisma.icd10.createMany({
    data: icd10Data,
    skipDuplicates: true,
  });
  console.log("Loaded ICD-10 codes:", icd10Result.count);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
