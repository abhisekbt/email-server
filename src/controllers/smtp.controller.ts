import { Request, Response } from "express";

import { mailerService } from "../services/mailer.service";
import { smtpService } from "../services/smtp.service";
import { smtpConfigUpdateSchema } from "../utils/validators";

export const smtpController = {
  async get(_req: Request, res: Response) {
    const config = await smtpService.get();
    res.json({ ...config, password: config.password ? "********" : "" });
  },

  async update(req: Request, res: Response) {
    const payload = smtpConfigUpdateSchema.parse(req.body);
    const config = await smtpService.update(payload);
    res.json({ ...config, password: config.password ? "********" : "" });
  },

  async test(_req: Request, res: Response) {
    const result = await mailerService.verifyConnection();
    res.status(result.success ? 200 : 502).json(result);
  },
};
