import { Router } from "express";
import { notesRepo } from "../repositories/notes";
import {
  createNoteSchema,
  updateNoteSchema,
  voteNoteSchema,
  reorderNotesSchema,
} from "../utils/validation";
import { requireAuth } from "../middleware/auth";

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get("/", (req, res) => {
  const user = (req as any).user;
  res.json({ notes: notesRepo.list(user.id) });
});

notesRouter.post("/", (req, res) => {
  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const user = (req as any).user;
  const note = notesRepo.create(
    parsed.data.text.trim(),
    parsed.data.color || "#d99a3d",
    user.id,
    parsed.data.poll
  );
  res.status(201).json({ note });
});

notesRouter.patch("/reorder", (req, res) => {
  const parsed = reorderNotesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const user = (req as any).user;
  notesRepo.reorder(parsed.data.orderedIds);
  res.json({ notes: notesRepo.list(user.id) });
});

notesRouter.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const note = notesRepo.update(id, parsed.data);
  if (!note) return res.status(404).json({ error: "not_found" });
  res.json({ note });
});

notesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  notesRepo.remove(id);
  res.json({ ok: true });
});

notesRouter.post("/:id/vote", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  const parsed = voteNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const user = (req as any).user;
  const note = notesRepo.vote(id, parsed.data.optionId, user.id);
  if (!note) return res.status(404).json({ error: "not_found" });
  res.json({ note });
});
