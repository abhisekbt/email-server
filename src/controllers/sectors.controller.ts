import { Request, Response } from "express";

import { ApiError } from "../middleware/error-handler";
import { sectorsService } from "../services/sectors.service";
import { sectorPayloadSchema, sectorUpdateSchema } from "../utils/validators";

export const sectorsController = {
  async list(_req: Request, res: Response) {
    res.json(await sectorsService.list());
  },

  async get(req: Request, res: Response) {
    const sector = await sectorsService.get(Number(req.params.id));
    if (!sector) throw new ApiError(404, "Sector not found");
    res.json(sector);
  },

  async create(req: Request, res: Response) {
    const payload = sectorPayloadSchema.parse(req.body);
    res.status(201).json(await sectorsService.create(payload));
  },

  async update(req: Request, res: Response) {
    const payload = sectorUpdateSchema.parse(req.body);
    const sector = await sectorsService.update(Number(req.params.id), payload);
    if (!sector) throw new ApiError(404, "Sector not found");
    res.json(sector);
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await sectorsService.remove(id);
    if (!deleted) throw new ApiError(404, "Sector not found");
    res.json({ id, deleted: true });
  },
};
