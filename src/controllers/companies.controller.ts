import { Request, Response } from "express";

import { ApiError } from "../middleware/error-handler";
import { companiesService } from "../services/companies.service";
import { assignCategoriesSchema, companyPayloadSchema, companyUpdateSchema } from "../utils/validators";

export const companiesController = {
  async list(_req: Request, res: Response) {
    const companies = await companiesService.list();
    res.json(companies);
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    const company = await companiesService.get(id);
    if (!company) throw new ApiError(404, "Company not found");
    res.json(company);
  },

  async create(req: Request, res: Response) {
    const payload = companyPayloadSchema.parse(req.body);
    const company = await companiesService.create(payload);
    res.status(201).json(company);
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const payload = companyUpdateSchema.parse(req.body);
    const company = await companiesService.update(id, payload);
    if (!company) throw new ApiError(404, "Company not found");
    res.json(company);
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await companiesService.remove(id);
    if (!deleted) throw new ApiError(404, "Company not found");
    res.json({ id, deleted: true });
  },

  async assignCategories(req: Request, res: Response) {
    const id = Number(req.params.id);
    const payload = assignCategoriesSchema.parse(req.body);
    const company = await companiesService.assignCategories(id, payload.categories);
    if (!company) throw new ApiError(404, "Company not found");
    res.json(company);
  },
};
