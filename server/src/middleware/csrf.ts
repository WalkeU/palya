import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function ensureCsrfToken(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }
  next();
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const header = req.header("X-CSRF-Token");
  if (!header || !req.session.csrfToken || header !== req.session.csrfToken) {
    return res.status(403).json({ error: "invalid_csrf_token" });
  }
  next();
}
