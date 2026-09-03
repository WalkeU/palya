import { Router } from "express";
import { usersRepo } from "../repositories/users";
import { requireAuth } from "../middleware/auth";

export const membersRouter = Router();

membersRouter.use(requireAuth);

membersRouter.get("/", (_req, res) => {
  res.json({ members: usersRepo.listMembers() });
});
