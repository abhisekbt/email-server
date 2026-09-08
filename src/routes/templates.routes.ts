import { Router } from "express";

import { templatesController } from "../controllers/templates.controller";
import { asyncHandler } from "../middleware/async-handler";

export const templatesRouter = Router();

templatesRouter.get("/", asyncHandler(templatesController.list));
templatesRouter.get("/:id", asyncHandler(templatesController.get));
templatesRouter.post("/", asyncHandler(templatesController.create));
templatesRouter.put("/:id", asyncHandler(templatesController.update));
templatesRouter.delete("/:id", asyncHandler(templatesController.remove));
