import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
});

export const rankingQuerySchema = reportQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const userReportQuerySchema = z.object({
  userId: z.string().min(1)
});

export const periodQuerySchema = reportQuerySchema.extend({
  period: z.enum(['day', 'week', 'month']).optional()
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type RankingQueryInput = z.infer<typeof rankingQuerySchema>;
export type UserReportQueryInput = z.infer<typeof userReportQuerySchema>;
export type PeriodQueryInput = z.infer<typeof periodQuerySchema>;
