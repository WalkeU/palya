import fs from "node:fs";
import path from "node:path";
import { Router } from "express";

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf-8")
) as { version: string };

export const versionRouter = Router();

versionRouter.get("/", (_req, res) => {
  res.json({ version: pkg.version });
});
