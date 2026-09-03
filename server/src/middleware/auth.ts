import { Request, Response, NextFunction } from "express";
import { usersRepo } from "../repositories/users";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    csrfToken?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "not_authenticated" });
  }
  const user = usersRepo.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "not_authenticated" });
  }
  if (
    user.must_change_password &&
    !req.originalUrl.startsWith("/api/auth/change-password")
  ) {
    return res.status(403).json({ error: "must_change_password" });
  }
  (req as any).user = user;
  next();
}

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;
  if (!user || user.role !== "superadmin") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}
