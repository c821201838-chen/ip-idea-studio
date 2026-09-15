import { z } from "zod";
export const accountSchema = z.enum(["film", "course"]);
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(40), audience: z.string().trim().min(1).max(100),
  focus: z.string().trim().min(1).max(300), persona: z.string().trim().max(200),
  tone: z.string().trim().max(200), pillars: z.string().trim().max(300),
});
export const topicSchema = z.object({ id: z.string().max(100), angle: z.string().min(1).max(80), title: z.string().min(1).max(200), hook: z.string().min(1).max(500), reason: z.string().min(1).max(800), audience: z.string().max(200), subject: z.string().max(100), kind: z.number().int().min(0).max(9) });
export const draftSchema = z.object({ id: z.string().uuid(), account: accountSchema, title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(20000), materials: z.string().max(5000), source: z.string().max(5000), updatedAt: z.number() });
export const topicPoolSchema = z.object({ account: accountSchema, topics: z.array(topicSchema).min(5).max(10), source: z.string().max(5000), subject: z.string().max(80), engine: z.enum(["template", "ai"]), updatedAt: z.number() });
