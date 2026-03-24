import { z } from "zod";

export const campaignCreateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().max(1000).optional().default(""),
  targetDomain: z.string().min(1, "Le domaine cible est requis").max(500),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).default("ACTIVE"),
  checkFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
  memberIds: z.array(z.string()).optional().default([]),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
