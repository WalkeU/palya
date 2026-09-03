import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(10, "A jelszónak legalább 10 karakter hosszúnak kell lennie"),
    newPasswordConfirm: z.string().min(1),
    nickname: z.string().trim().min(1, "A becenév megadása kötelező").max(40),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "A két jelszó nem egyezik",
    path: ["newPasswordConfirm"],
  });

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const stageEnum = z.enum(["potential", "discussion", "building", "done"]);
const scaleValue = z.number().int().min(1).max(5).nullable().optional();

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "A név megadása kötelező").max(200),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(5000).nullable().optional(),
  stage: stageEnum.default("potential"),
  priority: scaleValue,
  motivation: scaleValue,
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(5000).nullable().optional(),
  stage: stageEnum.optional(),
  priority: scaleValue,
  motivation: scaleValue,
});

export const reorderSchema = z.object({
  stage: stageEnum,
  orderedIds: z.array(z.number().int()),
});

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, "A komment nem lehet üres").max(3000),
});
