import { z } from "zod";
import { body, database, failure, HttpError, json, owner } from "@/lib/server";
export const dynamic = "force-dynamic";
const schema = z.object({
  id: z.string().uuid(), account: z.enum(["film", "course"]), title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000), materials: z.string().max(5000), source: z.string().max(5000),
});
export async function GET() {
  try { const userId = await owner(); const rows = await database().prepare("SELECT id, account, title, content, materials, source, updated_at AS updatedAt FROM drafts WHERE owner_id = ? ORDER BY updated_at DESC").bind(userId).all(); return json({ drafts: rows.results }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const userId = await owner(); const result = schema.safeParse(await body(request));
    if (!result.success) throw new HttpError("草稿格式不完整，或文字超出长度限制。", 400);
    const draft = { ...result.data, updatedAt: Date.now() };
    await database().prepare(`INSERT INTO drafts (owner_id,id,account,title,content,materials,source,updated_at) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(owner_id,id) DO UPDATE SET account=excluded.account,title=excluded.title,content=excluded.content,materials=excluded.materials,source=excluded.source,updated_at=excluded.updated_at`)
      .bind(userId,draft.id,draft.account,draft.title,draft.content,draft.materials,draft.source,draft.updatedAt).run();
    return json({ draft });
  } catch (error) { return failure(error); }
}
