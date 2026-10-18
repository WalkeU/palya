import { Router } from "express";
import { expensesRepo } from "../repositories/expenses";
import { usersRepo } from "../repositories/users";
import {
  createExpenseSchema,
  settleExpensesSchema,
  updateExpenseSchema,
} from "../utils/validation";
import { requireAuth } from "../middleware/auth";

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

function payerExists(paidBy: number | null | undefined): boolean {
  return paidBy == null || !!usersRepo.findById(paidBy);
}

function participantsExist(ids: number[] | undefined): boolean {
  return !ids || ids.every((id) => !!usersRepo.findById(id));
}

expensesRouter.get("/", (_req, res) => {
  res.json({ expenses: expensesRepo.list() });
});

expensesRouter.post("/", (req, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (!payerExists(parsed.data.paid_by)) {
    return res.status(400).json({ error: "invalid_payer" });
  }
  if (!participantsExist(parsed.data.split_with)) {
    return res.status(400).json({ error: "invalid_participant" });
  }
  const user = (req as any).user;
  const expense = expensesRepo.create(parsed.data, user.id);
  res.status(201).json({ expense });
});

// Closes a settle-up round: everything the team just paid each other back for
// becomes "Elszámolva" at once.
expensesRouter.post("/settle", (req, res) => {
  const parsed = settleExpensesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const updated = expensesRepo.settleMany(parsed.data.ids);
  res.json({ updated });
});

expensesRouter.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (!payerExists(parsed.data.paid_by)) {
    return res.status(400).json({ error: "invalid_payer" });
  }
  if (!participantsExist(parsed.data.split_with)) {
    return res.status(400).json({ error: "invalid_participant" });
  }
  const expense = expensesRepo.update(id, parsed.data);
  if (!expense) return res.status(404).json({ error: "not_found" });
  res.json({ expense });
});

expensesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  expensesRepo.remove(id);
  res.json({ ok: true });
});
