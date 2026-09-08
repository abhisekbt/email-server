import { NextFunction, Request, Response } from "express";

import { authService, JwtPayload, UserRole } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required. Please sign in." });
    return;
  }

  const token = authHeader.slice(7).trim();
  const payload = authService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Session expired or invalid authentication token." });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Access denied. This action requires ${allowedRoles.join(" or ")} authority.`,
      });
      return;
    }

    next();
  };
}
