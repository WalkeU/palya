import { Router } from "express";
import { appSettingsRepo } from "../repositories/appSettings";
import { updateAppSettingsSchema } from "../utils/validation";
import { requireAuth } from "../middleware/auth";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

function readSettings() {
  return {
    linksEnabled: appSettingsRepo.getBool("linksEnabled", true),
    autoCloseDays: appSettingsRepo.getInt("autoCloseDays", 30),
    customerPrimaryField:
      (appSettingsRepo.get("customerPrimaryField") as "name" | "business" | undefined) ||
      "name",
  };
}

settingsRouter.get("/", (_req, res) => {
  res.json(readSettings());
});

settingsRouter.patch("/", (req, res) => {
  const parsed = updateAppSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (parsed.data.linksEnabled !== undefined) {
    appSettingsRepo.setBool("linksEnabled", parsed.data.linksEnabled);
  }
  if (parsed.data.autoCloseDays !== undefined) {
    appSettingsRepo.setInt("autoCloseDays", parsed.data.autoCloseDays);
  }
  if (parsed.data.customerPrimaryField !== undefined) {
    appSettingsRepo.set("customerPrimaryField", parsed.data.customerPrimaryField);
  }
  res.json(readSettings());
});
