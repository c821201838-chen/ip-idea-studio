import assert from "node:assert/strict";
import { DEFAULT_PROFILES, makeTopics, makeDraft, EXAMPLE } from "../lib/planner.ts";
const origin=process.env.TEST_ORIGIN||"http://localhost:5173";
if(!["localhost","127.0.0.1"].includes(new URL(origin).hostname))throw new Error("This test only runs against a local preview.");
const first=`test-ip-studio-${crypto.randomUUID()}`, second=`test-ip-studio-${crypto.randomUUID()}`;
async function api(path,method="GET",value,user=first,extra={}){
  const r=await fetch(`${origin}${path}`,{method,headers:{"Content-Type":"application/json",...(user?{"oai-authenticated-user-id":user,"oai-authenticated-user-email":"test@example.invalid"}:{}),...extra},...(value?{body:JSON.stringify(value)}:{})});
  return {status:r.status,data:await r.json()};
}
for(const path of ["/api/profiles","/api/topics","/api/drafts"]){assert.equal((await api(path,"GET",null,null)).status,401);}
const profile={...DEFAULT_PROFILES.film,name:"接口验证账号",tone:"简洁真诚",pillars:"制作过程、画面观察",persona:"如实记录的学习者"};
assert.equal((await api("/api/profiles","POST",{account:"film",profile})).status,200);
const profiles=(await api("/api/profiles")).data.profiles;
assert.deepEqual(profiles.film,profile);assert.equal(profiles.course.name,DEFAULT_PROFILES.course.name);
assert.equal((await api("/api/profiles","GET",null,second)).data.profiles.film.name,DEFAULT_PROFILES.film.name);
const topics=makeTopics(EXAMPLE,"雨夜镜头","film",profile,10);
const pool={account:"film",topics,source:EXAMPLE,subject:"雨夜镜头",engine:"template",updatedAt:Date.now()};
assert.equal((await api("/api/topics","POST",pool)).status,200);
assert.deepEqual((await api("/api/topics")).data.pools[0].topics,topics);
assert.equal((await api("/api/topics","GET",null,second)).data.pools.length,0);
const draft=makeDraft(topics[0],EXAMPLE,"film",profile);
assert.equal((await api("/api/drafts","POST",draft)).status,200);
draft.title="编辑后的脚本标题";draft.content+="\n人工补充的真实细节";
assert.equal((await api("/api/drafts","POST",draft)).status,200);
const saved=(await api("/api/drafts")).data.drafts;assert.equal(saved.length,1);assert.equal(saved[0].title,draft.title);assert.equal(saved[0].content,draft.content);
assert.equal((await api("/api/drafts","GET",null,second)).data.drafts.length,0);
const secondDraft={...draft,title:"另一账号的数据"};assert.equal((await api("/api/drafts","POST",secondDraft,second)).status,200);
assert.equal((await api("/api/drafts")).data.drafts[0].title,draft.title);
assert.equal((await api("/api/drafts","POST",draft,first,{Origin:"https://untrusted.example"})).status,403);
assert.equal((await api("/api/topics","POST",{...pool,topics:[]})).status,400);
assert.equal((await api("/api/generate","POST",{})).status,400);
assert.equal((await api("/api/generate","POST",{},null)).status,401);
console.log("Passed: auth gates, profile persistence, 10-topic pool recovery, draft edits, user isolation, origin checks, invalid generation input.");
console.log(JSON.stringify({testOwners:[first,second]}));
