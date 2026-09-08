import { Router } from "express";

import { smtpController } from "../controllers/smtp.controller";
import { asyncHandler } from "../middleware/async-handler";

export const smtpRouter = Router();

smtpRouter.get("/", asyncHandler(smtpController.get));
smtpRouter.put("/", asyncHandler(smtpController.update));
smtpRouter.post("/test", asyncHandler(smtpController.test));
