import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export function database() { if (!env.DB) throw new Error("D1 binding unavailable"); return env.DB; }
export class HttpError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function owner() { const user = await getChatGPTUser(); if (!user) throw new HttpError("请先登录后再保存或读取草稿。", 401); return user.userId; }
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } }); }
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError("请使用 JSON 提交内容。", 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError("请求来源不匹配，请刷新页面后重试。", 403);
  const raw = await request.text(); if (raw.length > 40000) throw new HttpError("内容过长，请缩短后重试。", 413);
  try { return JSON.parse(raw); } catch { throw new HttpError("内容格式有误。", 400); }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error("Content studio storage failure", error instanceof Error ? error.message : "Unknown storage error");
  return json({ error: "暂时无法读取或保存，请稍后重试。当前编辑会保留。" }, 503);
}
