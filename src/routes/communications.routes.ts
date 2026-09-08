import { Router } from "express";

import { communicationsController } from "../controllers/communications.controller";
import { asyncHandler } from "../middleware/async-handler";

export const communicationsRouter = Router();

communicationsRouter.get("/", asyncHandler(communicationsController.list));
communicationsRouter.get("/:id", asyncHandler(communicationsController.get));
communicationsRouter.post("/send", asyncHandler(communicationsController.send));
communicationsRouter.post("/schedule", asyncHandler(communicationsController.schedule));
communicationsRouter.post("/draft", asyncHandler(communicationsController.draft));
communicationsRouter.post("/test-dispatch", asyncHandler(communicationsController.testDispatch));
