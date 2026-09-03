import { Router } from "express";
import { tasksRepo } from "../repositories/tasks";
import {
  createTaskSchema,
  updateTaskSchema,
  taskReorderSchema,
} from "../utils/validation";
import { requireAuth } from "../middleware/auth";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/", (_req, res) => {
  res.json({ tasks: tasksRepo.list() });
});

tasksRouter.post("/", (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const user = (req as any).user;
  const task = tasksRepo.create(parsed.data, user.id);
  res.status(201).json({ task });
});

tasksRouter.patch("/reorder", (req, res) => {
  const parsed = taskReorderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  tasksRepo.reorder(parsed.data.stage, parsed.data.orderedIds);
  res.json({ tasks: tasksRepo.list() });
});

tasksRouter.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const task = tasksRepo.update(id, parsed.data);
  if (!task) return res.status(404).json({ error: "not_found" });
  res.json({ task });
});

tasksRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  tasksRepo.remove(id);
  res.json({ ok: true });
});
