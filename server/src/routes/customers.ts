import { Router } from "express";
import { customersRepo } from "../repositories/customers";
import { commentsRepo } from "../repositories/comments";
import {
  createCustomerSchema,
  updateCustomerSchema,
  reorderSchema,
  createCommentSchema,
  nameOrBusinessRefine,
} from "../utils/validation";
import { requireAuth } from "../middleware/auth";

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.get("/", (_req, res) => {
  const customers = customersRepo.list();
  res.json({ customers });
});

customersRouter.post("/", (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const user = (req as any).user;
  const customer = customersRepo.create(parsed.data, user.id);
  res.status(201).json({ customer });
});

customersRouter.patch("/reorder", (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  customersRepo.reorder(parsed.data.stage, parsed.data.orderedIds);
  res.json({ customers: customersRepo.list() });
});

customersRouter.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const existing = customersRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "not_found" });

  const nextName = parsed.data.name !== undefined ? parsed.data.name : existing.name;
  const nextBusiness =
    parsed.data.business !== undefined ? parsed.data.business : existing.business;
  if (!nameOrBusinessRefine({ name: nextName, business: nextBusiness })) {
    return res.status(400).json({ error: "invalid_input" });
  }

  const customer = customersRepo.update(id, parsed.data);
  res.json({ customer });
});

customersRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  customersRepo.remove(id);
  res.json({ ok: true });
});

customersRouter.get("/:id/comments", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  res.json({ comments: commentsRepo.listForCustomer(id) });
});

customersRouter.post("/:id/comments", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  if (!customersRepo.findById(id)) {
    return res.status(404).json({ error: "not_found" });
  }
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const user = (req as any).user;
  const comment = commentsRepo.create(id, user.id, parsed.data.text);
  res.status(201).json({ comment });
});
