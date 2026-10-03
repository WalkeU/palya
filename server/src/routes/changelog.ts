import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const changelogRouter = Router();

changelogRouter.use(requireAuth);

changelogRouter.get("/", (_req, res) => {
  try {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "..", "..", "CHANGELOG.md"),
      "utf-8"
    );
    res.json({ content });
  } catch {
    res.json({ content: "" });
  }
});
