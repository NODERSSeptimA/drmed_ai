import { z } from "zod"

export const createPatientSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  middleName: z.string().optional(),
  birthDate: z.string().min(1, "Дата рождения обязательна"),
  gender: z.enum(["male", "female"], { error: "Пол обязателен" }),
  phone: z.string().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  address: z.string().optional(),
  allergies: z.array(z.string()),
  insuranceNumber: z.string().optional(),
})

export type CreatePatientInput = z.infer<typeof createPatientSchema>
