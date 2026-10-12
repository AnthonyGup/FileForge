import { Router } from "express";
import mongoose from 'mongoose';

export const healthRouter = Router();

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

healthRouter.get("/", (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    db: STATES[mongoose.connection.readyState] ?? 'unknown'
  });
});
