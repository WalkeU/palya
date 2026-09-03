import { Router } from "express";
import { usersRepo } from "../repositories/users";
import { generatePassword, hashPassword } from "../utils/password";
import { createUserSchema } from "../utils/validation";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireSuperAdmin);

usersRouter.get("/", (_req, res) => {
  res.json({ users: usersRepo.list() });
});

usersRouter.post("/", (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (usersRepo.findByEmail(parsed.data.email)) {
    return res.status(409).json({ error: "email_taken" });
  }
  const tempPassword = generatePassword(14);
  const hash = hashPassword(tempPassword);
  const user = usersRepo.create(parsed.data.email, hash, "user");
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: true,
    },
    temporaryPassword: tempPassword,
  });
});

usersRouter.post("/:id/reset-password", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  const user = usersRepo.findById(id);
  if (!user) return res.status(404).json({ error: "not_found" });

  const tempPassword = generatePassword(14);
  const hash = hashPassword(tempPassword);
  usersRepo.resetPassword(id, hash);

  res.json({
    user: { id: user.id, email: user.email },
    temporaryPassword: tempPassword,
  });
});
