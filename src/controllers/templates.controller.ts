import { Request, Response } from "express";

import { ApiError } from "../middleware/error-handler";
import { templatesService } from "../services/templates.service";
import { templatePayloadSchema, templateUpdateSchema } from "../utils/validators";

export const templatesController = {
  async list(_req: Request, res: Response) {
    const templates = await templatesService.list();
    res.json(templates);
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    const template = await templatesService.get(id);
    if (!template) throw new ApiError(404, "Template not found");
    res.json(template);
  },

  async create(req: Request, res: Response) {
    const payload = templatePayloadSchema.parse(req.body);
    const template = await templatesService.create(payload);
    res.status(201).json(template);
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const payload = templateUpdateSchema.parse(req.body);
    const template = await templatesService.update(id, payload);
    if (!template) throw new ApiError(404, "Template not found");
    res.json(template);
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await templatesService.remove(id);
    if (!deleted) throw new ApiError(404, "Template not found");
    res.json({ id, deleted: true });
  },
};
