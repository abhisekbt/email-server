import { Request, Response } from "express";

import { ApiError } from "../middleware/error-handler";
import { categoriesService } from "../services/categories.service";
import { categoryPayloadSchema, categoryUpdateSchema } from "../utils/validators";

export const categoriesController = {
  async list(_req: Request, res: Response) {
    const categories = await categoriesService.list();
    res.json(categories);
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    const category = await categoriesService.get(id);
    if (!category) throw new ApiError(404, "Category not found");
    res.json(category);
  },

  async create(req: Request, res: Response) {
    const payload = categoryPayloadSchema.parse(req.body);
    const category = await categoriesService.create(payload);
    res.status(201).json(category);
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const payload = categoryUpdateSchema.parse(req.body);
    const category = await categoriesService.update(id, payload);
    if (!category) throw new ApiError(404, "Category not found");
    res.json(category);
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await categoriesService.remove(id);
    if (!deleted) throw new ApiError(404, "Category not found");
    res.json({ id, deleted: true });
  },
};
