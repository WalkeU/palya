import { Router } from "express";
import { usersRepo } from "../repositories/users";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  changeOwnPasswordSchema,
} from "../utils/validation";
import { requireAuth } from "../middleware/auth";
import { loginRateLimiter, passwordChangeRateLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

function publicUser(user: {
  id: number;
  email: string;
  nickname: string | null;
  role: string;
  must_change_password: number;
  avatar: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    mustChangePassword: !!user.must_change_password,
    avatar: user.avatar,
  };
}

authRouter.get("/csrf", (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

authRouter.get("/me", (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = usersRepo.findById(req.session.userId);
  if (!user) return res.json({ user: null });
  res.json({ user: publicUser(user) });
});

authRouter.post("/login", loginRateLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const user = usersRepo.findByEmail(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "session_error" });
    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

authRouter.post(
  "/change-password",
  passwordChangeRateLimiter,
  requireAuth,
  (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const user = (req as any).user;
    const hash = hashPassword(parsed.data.newPassword);
    usersRepo.completeFirstLogin(user.id, hash, parsed.data.nickname);
    const updated = usersRepo.findById(user.id)!;
    res.json({ user: publicUser(updated) });
  }
);

authRouter.patch("/profile", requireAuth, (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const user = (req as any).user;
  usersRepo.updateProfile(user.id, parsed.data.nickname, parsed.data.avatar ?? null);
  const updated = usersRepo.findById(user.id)!;
  res.json({ user: publicUser(updated) });
});

authRouter.patch(
  "/password",
  passwordChangeRateLimiter,
  requireAuth,
  (req, res) => {
    const parsed = changeOwnPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const user = (req as any).user;
    if (!verifyPassword(parsed.data.currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "invalid_current_password" });
    }
    const hash = hashPassword(parsed.data.newPassword);
    usersRepo.updatePassword(user.id, hash);
    res.json({ ok: true });
  }
);
