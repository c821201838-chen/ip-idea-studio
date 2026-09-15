import { z } from "zod";
import { accountSchema, profileSchema, topicSchema } from "@/lib/validation";
import { body, database, HttpError, json, owner } from "@/lib/server";
import { generateWithOpenAI, GenerationError } from "@/lib/openai";
export const dynamic = "force-dynamic";
const schema=z.object({action:z.enum(["topics","draft"]),account:accountSchema,profile:profileSchema,source:z.string().max(5000),subject:z.string().max(80),count:z.union([z.literal(6),z.literal(8),z.literal(10)]),topic:topicSchema.optional(),apiKey:z.string().trim().min(12).max(1000),model:z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/)}).strict();
export async function POST(request:Request){
  try{
    const userId=await owner();
    const parsed=schema.safeParse(await body(request));
    if(!parsed.success)throw new HttpError("请检查账号画像、素材、模型名称和 API Key。",400);
    const input=parsed.data;
    if(input.action==="draft"&&!input.topic)throw new HttpError("请先选择一个选题。",400);
    const history=input.action==="topics"?await database().prepare("SELECT title FROM drafts WHERE owner_id = ? AND account = ? ORDER BY updated_at DESC LIMIT 15").bind(userId,input.account).all<{title:string}>():null;
    return json(await generateWithOpenAI({...input,previousTitles:history?.results.map(row=>row.title)||[]}));
  }catch(error){
    if(error instanceof HttpError||error instanceof GenerationError)return json({error:error.message},error.status);
    // This route handles API keys. Never log raw errors, request bodies, or upstream responses.
    return json({error:"暂时无法生成，请稍后重试。当前内容已保留。"},503);
  }
}
