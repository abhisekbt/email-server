import { Router } from "express";

import { categoriesController } from "../controllers/categories.controller";
import { asyncHandler } from "../middleware/async-handler";

export const categoriesRouter = Router();

categoriesRouter.get("/", asyncHandler(categoriesController.list));
categoriesRouter.get("/:id", asyncHandler(categoriesController.get));
categoriesRouter.post("/", asyncHandler(categoriesController.create));
categoriesRouter.put("/:id", asyncHandler(categoriesController.update));
categoriesRouter.delete("/:id", asyncHandler(categoriesController.remove));
