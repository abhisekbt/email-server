import { Router } from "express";

import { companiesController } from "../controllers/companies.controller";
import { asyncHandler } from "../middleware/async-handler";

export const companiesRouter = Router();

companiesRouter.get("/", asyncHandler(companiesController.list));
companiesRouter.get("/:id", asyncHandler(companiesController.get));
companiesRouter.post("/", asyncHandler(companiesController.create));
companiesRouter.put("/:id", asyncHandler(companiesController.update));
companiesRouter.delete("/:id", asyncHandler(companiesController.remove));
companiesRouter.post("/:id/categories", asyncHandler(companiesController.assignCategories));
