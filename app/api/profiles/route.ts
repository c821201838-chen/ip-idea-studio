import { z } from "zod";
import { DEFAULT_PROFILES, Account, Profile } from "@/lib/planner";
import { profileSchema, accountSchema } from "@/lib/validation";
import { body, database, failure, HttpError, json, owner } from "@/lib/server";
export const dynamic = "force-dynamic";
const schema = z.object({ account: accountSchema, profile: profileSchema });
export async function GET() {
  try {
    const userId = await owner();
    const rows = await database().prepare("SELECT account,name,audience,focus,persona,tone,pillars FROM profiles WHERE owner_id = ?").bind(userId).all<Profile & { account: Account }>();
    const profiles = { ...DEFAULT_PROFILES };
    for (const row of rows.results) if (row.account === "film" || row.account === "course") profiles[row.account] = { name: row.name, audience: row.audience, focus: row.focus, persona: row.persona || DEFAULT_PROFILES[row.account].persona, tone: row.tone || DEFAULT_PROFILES[row.account].tone, pillars: row.pillars || DEFAULT_PROFILES[row.account].pillars };
    return json({ profiles });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const userId = await owner(); const result = schema.safeParse(await body(request));
    if (!result.success) throw new HttpError("请填写账号名称、目标用户和内容方向，并检查文字长度。", 400);
    const { account, profile } = result.data;
    await database().prepare("INSERT INTO profiles (owner_id,account,name,audience,focus,persona,tone,pillars) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,account) DO UPDATE SET name=excluded.name,audience=excluded.audience,focus=excluded.focus,persona=excluded.persona,tone=excluded.tone,pillars=excluded.pillars").bind(userId,account,profile.name,profile.audience,profile.focus,profile.persona,profile.tone,profile.pillars).run();
    return json({ profile });
  } catch (error) { return failure(error); }
}
