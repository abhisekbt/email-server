import { Request, Response } from "express";

import { ApiError } from "../middleware/error-handler";
import { communicationsService } from "../services/communications.service";
import { scheduleCommunicationSchema, sendCommunicationSchema, testDispatchSchema } from "../utils/validators";

export const communicationsController = {
  async list(_req: Request, res: Response) {
    const communications = await communicationsService.list();
    res.json(communications);
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    const communication = await communicationsService.get(id);
    if (!communication) throw new ApiError(404, "Communication not found");
    res.json(communication);
  },

  async send(req: Request, res: Response) {
    const payload = sendCommunicationSchema.parse(req.body);
    const communication = await communicationsService.send(payload);
    res.status(201).json(communication);
  },

  async schedule(req: Request, res: Response) {
    const payload = scheduleCommunicationSchema.parse(req.body);
    const communication = await communicationsService.schedule(payload);
    res.status(201).json(communication);
  },

  async draft(req: Request, res: Response) {
    const payload = sendCommunicationSchema.parse(req.body);
    const communication = await communicationsService.draft(payload);
    res.status(201).json(communication);
  },

  async testDispatch(req: Request, res: Response) {
    const payload = testDispatchSchema.parse(req.body);
    const result = await communicationsService.testDispatch(payload);
    res.json(result);
  },
};
