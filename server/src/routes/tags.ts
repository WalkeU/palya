import { Router } from "express";
import { tagsRepo } from "../repositories/tags";
import { createTagSchema } from "../utils/validation";
import { requireAuth } from "../middleware/auth";

export const tagsRouter = Router();

tagsRouter.use(requireAuth);

tagsRouter.get("/", (_req, res) => {
  res.json({ tags: tagsRepo.list() });
});

tagsRouter.post("/", (req, res) => {
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const existing = tagsRepo.list().find(
    (t) => t.name.toLowerCase() === parsed.data.name.trim().toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ error: "name_taken" });
  }
  const tag = tagsRepo.create(parsed.data.name.trim(), parsed.data.color);
  res.status(201).json({ tag });
});

tagsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  tagsRepo.remove(id);
  res.json({ ok: true });
});
