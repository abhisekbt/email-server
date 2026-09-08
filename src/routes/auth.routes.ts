import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../middleware/auth.middleware";
import { authService } from "../services/auth.service";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        message: parseResult.error.issues[0]?.message || "Invalid login credentials format",
      });
      return;
    }

    const { email, password } = parseResult.data;
    const result = await authService.authenticate(email, password);
    if (!result) {
      res.status(401).json({ message: "Invalid email or password. Please verify credentials." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await authService.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Session signed out successfully." });
});
