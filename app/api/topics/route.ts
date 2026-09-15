import { Account, Engine, Topic } from "@/lib/planner";
import { topicPoolSchema } from "@/lib/validation";
import { body, database, failure, HttpError, json, owner } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const userId = await owner();
    const rows = await database().prepare("SELECT account,topics,source,subject,engine,updated_at AS updatedAt FROM topic_pools WHERE owner_id = ?").bind(userId).all<{account: Account; topics: string; source: string; subject: string; engine: Engine; updatedAt: number}>();
    return json({ pools: rows.results.map(row => ({...row, topics: JSON.parse(row.topics) as Topic[]})) });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const userId = await owner(); const parsed = topicPoolSchema.safeParse(await body(request));
    if (!parsed.success) throw new HttpError("选题格式不完整，请重新生成。", 400);
    const pool = {...parsed.data, updatedAt: Date.now()};
    await database().prepare("INSERT INTO topic_pools (owner_id,account,topics,source,subject,engine,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(owner_id,account) DO UPDATE SET topics=excluded.topics,source=excluded.source,subject=excluded.subject,engine=excluded.engine,updated_at=excluded.updated_at").bind(userId,pool.account,JSON.stringify(pool.topics),pool.source,pool.subject,pool.engine,pool.updatedAt).run();
    return json({ pool });
  } catch (error) { return failure(error); }
}
