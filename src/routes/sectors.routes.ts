import { Router } from "express";

import { sectorsController } from "../controllers/sectors.controller";
import { asyncHandler } from "../middleware/async-handler";

export const sectorsRouter = Router();

sectorsRouter.get("/", asyncHandler(sectorsController.list));
sectorsRouter.get("/:id", asyncHandler(sectorsController.get));
sectorsRouter.post("/", asyncHandler(sectorsController.create));
sectorsRouter.put("/:id", asyncHandler(sectorsController.update));
sectorsRouter.delete("/:id", asyncHandler(sectorsController.remove));
