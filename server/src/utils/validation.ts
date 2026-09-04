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
const closedReasonEnum = z.enum(["not_interested", "failed"]).nullable().optional();

const nameOrBusinessRefine = (data: { name?: string | null; business?: string | null }) =>
  !!(data.name && data.name.trim()) || !!(data.business && data.business.trim());
const nameOrBusinessMessage = {
  message: "A név vagy az üzlet megadása kötelező",
  path: ["name"],
};

export const createCustomerSchema = z
  .object({
    name: z.string().trim().max(200).nullable().optional(),
    business: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    email: z.string().trim().max(200).nullable().optional(),
    note: z.string().trim().max(5000).nullable().optional(),
    stage: stageEnum.default("potential"),
    priority: scaleValue,
    motivation: scaleValue,
  })
  .refine(nameOrBusinessRefine, nameOrBusinessMessage);

export const updateCustomerSchema = z.object({
  name: z.string().trim().max(200).nullable().optional(),
  business: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(5000).nullable().optional(),
  stage: stageEnum.optional(),
  priority: scaleValue,
  motivation: scaleValue,
  closed_reason: closedReasonEnum,
});

export { nameOrBusinessRefine };

export const reorderSchema = z.object({
  stage: stageEnum,
  orderedIds: z.array(z.number().int()),
});

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, "A komment nem lehet üres").max(3000),
});

const taskStageEnum = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "waiting_review",
  "done",
  "closed",
]);

const tagIdsField = z.array(z.number().int()).optional();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "A cím megadása kötelező").max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  stage: taskStageEnum.default("backlog"),
  assignee_id: z.number().int().nullable().optional(),
  tag_ids: tagIdsField,
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  stage: taskStageEnum.optional(),
  assignee_id: z.number().int().nullable().optional(),
  highlighted: z.boolean().optional(),
  tag_ids: tagIdsField,
});

export const TAG_COLORS = [
  "#d99a3d",
  "#4d7ea8",
  "#7c6bb0",
  "#3a8a74",
  "#c85a4a",
  "#c15b8c",
] as const;

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "A név megadása kötelező").max(30),
  color: z.enum(TAG_COLORS),
});

export const taskReorderSchema = z.object({
  stage: taskStageEnum,
  orderedIds: z.array(z.number().int()),
});

export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1, "A becenév megadása kötelező").max(40),
  avatar: z
    .string()
    .max(400_000, "A kép túl nagy")
    .regex(/^data:image\/(png|jpe?g|webp);base64,/, "Érvénytelen kép formátum")
    .nullable()
    .optional(),
});

export const createNoteSchema = z.object({
  text: z.string().trim().min(1, "A jegyzet nem lehet üres").max(500),
  color: z.enum(TAG_COLORS).optional(),
  poll: z
    .object({
      type: z.enum(["single", "multiple"]),
      options: z
        .array(z.string().trim().min(1, "Az opció nem lehet üres").max(120))
        .min(2, "Legalább 2 opció szükséges")
        .max(10, "Legfeljebb 10 opció adható meg"),
    })
    .optional(),
});

export const updateNoteSchema = z.object({
  text: z.string().trim().min(1, "A jegyzet nem lehet üres").max(500).optional(),
  color: z.enum(TAG_COLORS).optional(),
  pollOptions: z
    .array(
      z.object({
        id: z.number().int().optional(),
        text: z.string().trim().min(1, "Az opció nem lehet üres").max(120),
      })
    )
    .min(2, "Legalább 2 opció szükséges")
    .max(10, "Legfeljebb 10 opció adható meg")
    .optional(),
});

export const voteNoteSchema = z.object({
  optionId: z.number().int(),
});

export const reorderNotesSchema = z.object({
  orderedIds: z.array(z.number().int()),
});

const linkUrlField = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Érvénytelen link (http:// vagy https:// szükséges)" }
  );

// Keep in sync with LINK_ICON_NAMES in client/src/components/icons.tsx.
export const LINK_ICON_NAMES = [
  "link-2",
  "globe",
  "image",
  "calendar",
  "file-text",
  "mail",
  "map-pin",
  "github",
  "slack",
  "video",
  "book-open",
  "folder",
  "users",
  "shopping-cart",
  "message-circle",
] as const;

const linkIconField = z.enum(LINK_ICON_NAMES).nullable().optional();

export const createLinkSchema = z.object({
  label: z.string().trim().min(1, "A név megadása kötelező").max(60),
  url: linkUrlField,
  icon: linkIconField,
});

export const updateLinkSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  url: linkUrlField.optional(),
  icon: linkIconField,
});

export const updateAppSettingsSchema = z.object({
  linksEnabled: z.boolean().optional(),
});

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "A jelenlegi jelszó megadása kötelező"),
    newPassword: z.string().min(10, "A jelszónak legalább 10 karakter hosszúnak kell lennie"),
    newPasswordConfirm: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "A két jelszó nem egyezik",
    path: ["newPasswordConfirm"],
  });
