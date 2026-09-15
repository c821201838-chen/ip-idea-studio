import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROFILES, EXAMPLE, makeTopics, makeDraft } from "../lib/planner.ts";
import { generateWithOpenAI, GenerationError } from "../lib/openai.ts";

test("Both accounts support 6/8/10 distinct directions and complete scripts without supplied experience",()=>{
  for(const account of ["film","course"])for(const count of [6,8,10]){
    const topics=makeTopics("","",account,DEFAULT_PROFILES[account],count);
    assert.equal(topics.length,count);assert.equal(new Set(topics.map(t=>t.title)).size,count);
    for(const topic of topics){assert.ok(topic.reason.includes(DEFAULT_PROFILES[account].audience));const draft=makeDraft(topic,"",account,DEFAULT_PROFILES[account]);for(const heading of ["【3 秒开头钩子】","【正文结构","【完整口播稿】","【结尾互动】"])assert.ok(draft.content.includes(heading));assert.ok(draft.content.includes("待补充"));assert.ok(!draft.content.includes("undefined"));}
  }
  const film=makeTopics(EXAMPLE,"AI 视频","film",DEFAULT_PROFILES.film);
  const course=makeTopics(EXAMPLE,"AI 视频","course",DEFAULT_PROFILES.course);
  assert.notEqual(film[0].title,course[0].title);
  assert.ok(makeDraft(film[0],EXAMPLE,"film",DEFAULT_PROFILES.film).content.includes(EXAMPLE));
});
const input={action:"topics",account:"film",profile:DEFAULT_PROFILES.film,source:EXAMPLE,subject:"AI 镜头",count:6,previousTitles:["已有标题"],apiKey:"test-only-secret-never-a-real-key",model:"gpt-5.4-mini"};
function response(data,status="completed"){return Response.json({status,output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(data)}]}]});}
const fakeTopics=Array.from({length:6},(_,i)=>({title:`示例选题${i+1}`,angle:"过程拆解",hook:"从画面开始",reason:"帮助影像创作者理解操作过程",subject:"AI 镜头"}));
test("OpenAI sends only to official endpoint, uses profile/history, disables storage, and excludes credentials from prompt",async()=>{
  let calls=0;
  const result=await generateWithOpenAI(input,async(url,init)=>{calls++;assert.equal(url,"https://api.openai.com/v1/responses");const body=JSON.parse(init?.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.model,input.model);assert.ok(body.input.includes(input.profile.tone));assert.ok(body.input.includes("已有标题"));assert.ok(!JSON.stringify(body).includes(input.apiKey));assert.equal(new Headers(init?.headers).get("Authorization"),`Bearer ${input.apiKey}`);return response({topics:fakeTopics});});
  assert.equal(calls,1);assert.equal(result.topics?.length,6);assert.equal(result.topics?.[0].audience,input.profile.audience);
});
test("Partial, refused, duplicate, missing, and malformed upstream results never become valid topics",async()=>{
  const cases=[response({topics:fakeTopics},"incomplete"),response({topics:fakeTopics.slice(0,3)}),response({topics:Array(6).fill(fakeTopics[0])}),response({topics:[{}]}),Response.json({status:"completed",output:[{type:"message",content:[{type:"refusal"}]}]}),Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:"broken json"}]}]})];
  for(const value of cases)await assert.rejects(generateWithOpenAI(input,async()=>value),GenerationError);
});
test("Upstream errors and network failures return friendly errors without leaking keys",async()=>{
  for(const status of [400,401,403,404,429,500]){
    await assert.rejects(generateWithOpenAI(input,async()=>new Response(input.apiKey,{status})),(e)=>e instanceof GenerationError&&!e.message.includes(input.apiKey));
  }
  await assert.rejects(generateWithOpenAI(input,async()=>{throw new Error(input.apiKey);}), (e)=>e instanceof GenerationError&&!e.message.includes(input.apiKey));
});
test("Structured script fields form an editable draft with accurate source and account",async()=>{
  const script={title:"测试脚本",hook:"你会关注哪个细节？",structure:"0–3 秒：画面开场",spoken:"这是完整口播，未知的事实是【待补充：真实结果】。",cta:"分享你的想法。",caption:"一次创作记录",materials:"□ 真实片段"};
  const result=await generateWithOpenAI({...input,action:"draft"},async()=>response(script));
  assert.equal(result.draft?.source,EXAMPLE);assert.equal(result.draft?.account,"film");assert.ok(result.draft?.content.includes(script.spoken));assert.equal(result.draft?.materials,script.materials);
});
