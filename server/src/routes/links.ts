import { Router } from "express";
import { linksRepo } from "../repositories/links";
import { createLinkSchema, updateLinkSchema } from "../utils/validation";
import { requireAuth } from "../middleware/auth";

export const linksRouter = Router();

linksRouter.use(requireAuth);

linksRouter.get("/", (_req, res) => {
  res.json({ links: linksRepo.list() });
});

linksRouter.post("/", (req, res) => {
  const parsed = createLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const user = (req as any).user;
  const link = linksRepo.create(parsed.data, user.id);
  res.status(201).json({ link });
});

linksRouter.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  const parsed = updateLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const link = linksRepo.update(id, parsed.data);
  if (!link) return res.status(404).json({ error: "not_found" });
  res.json({ link });
});

linksRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  linksRepo.remove(id);
  res.json({ ok: true });
});
