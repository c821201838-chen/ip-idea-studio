"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, BookOpen, Check, Clapperboard, Copy, FileText, FolderOpen, Layers2, Lightbulb, LoaderCircle, PencilLine, Save, Settings2, Sparkles, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { z } from "zod";
import { Account, Draft, Profile, Topic, Engine, TopicPool, EXAMPLE, DEFAULT_PROFILES, makeTopics, makeDraft, draftText } from "@/lib/planner";
import { topicSchema, draftSchema, profileSchema } from "@/lib/validation";

type Session = { topics: Topic[]; snapshot: string; theme: string; selected: number; draft: Draft | null; dirty: boolean; engine: Engine; poolSaved: boolean };
const initial = (): Session => ({ topics: [], snapshot: "", theme: "", selected: -1, draft: null, dirty: false, engine: "template", poolSaved: false });
const sessionSchema = z.object({ topics: z.array(topicSchema).max(10), snapshot: z.string().max(5000), theme: z.string().max(80), selected: z.number(), draft: draftSchema.nullable(), dirty: z.boolean(), engine: z.enum(["template", "ai"]), poolSaved: z.boolean() });
const recoverySchema = z.object({ account: z.enum(["film", "course"]), source: z.string().max(5000), subject: z.string().max(80), sessions: z.object({ film: sessionSchema, course: sessionSchema }), pendingProfile: profileSchema.optional() });
const profileFields: { key: keyof Profile; label: string; max: number; hint: string }[] = [
  {key:"name",label:"账号名称",max:40,hint:"例如：我的影视 AIGC 账号"},
  {key:"audience",label:"目标用户",max:100,hint:"你希望谁来看？他们关心什么？"},
  {key:"focus",label:"账号定位",max:300,hint:"这个账号持续为用户提供什么？"},
  {key:"pillars",label:"内容支柱",max:300,hint:"用顿号分隔，例如：作品展示、制作流程、踩坑记录"},
  {key:"persona",label:"账号人设",max:200,hint:"你的真实身份、经历和擅长的事"},
  {key:"tone",label:"表达语气",max:200,hint:"例如：真诚、具体，像给朋友分享经验"},
];

export default function Home() {
  const [account,setAccount]=useState<Account>("film"), [source,setSource]=useState(""), [subject,setSubject]=useState("");
  const [sessions,setSessions]=useState<Record<Account,Session>>({film:initial(),course:initial()});
  const [profiles,setProfiles]=useState(DEFAULT_PROFILES), [settings,setSettings]=useState(false), [profileEdit,setProfileEdit]=useState<Profile>(DEFAULT_PROFILES.film);
  const [library,setLibrary]=useState(false), [saved,setSaved]=useState<Draft[]>([]), [loadingSaved,setLoadingSaved]=useState(false), [loadError,setLoadError]=useState("");
  const [saving,setSaving]=useState(false), [savingProfile,setSavingProfile]=useState(false), [pending,setPending]=useState<(()=>void)|null>(null), [authNeeded,setAuthNeeded]=useState(false);
  const [booting,setBooting]=useState(true), [workspaceError,setWorkspaceError]=useState("");
  const [view,setView]=useState("topics"), [mode,setMode]=useState<Engine>("ai"), [count,setCount]=useState(6), [busy,setBusy]=useState<"topics"|"draft"|null>(null);
  const [aiSettings,setAiSettings]=useState(false), [keyInput,setKeyInput]=useState(""), [model,setModel]=useState("gpt-5.4-mini"), [modelInput,setModelInput]=useState("gpt-5.4-mini");
  const [hasKey,setHasKey]=useState(false), [aiVerified,setAiVerified]=useState(false), [poolSaving,setPoolSaving]=useState(false);
  const credentials=useRef(""), leavingForSignin=useRef(false), restored=useRef(false), operation=useRef(false);
  const active=sessions[account];
  const live=useRef({account,source,subject,profiles,sessions,mode,count,busy}); live.current={account,source,subject,profiles,sessions,mode,count,busy};
  async function api<T=unknown>(path:string, options?:RequestInit, quietAuth=false) {
    const response=await fetch(path,{...options,headers:{"Content-Type":"application/json",...options?.headers}});
    if(response.status===401){if(!quietAuth)setAuthNeeded(true);throw new Error("请先登录，再读取、保存或使用 OpenAI。当前输入会保留。");}
    const data=await response.json().catch(()=>({error:"服务暂时没有响应，请稍后重试。"})) as {error?:string};
    if(!response.ok)throw new Error(data.error||"暂时无法连接，请稍后重试。当前输入会保留。");return data as T;
  }
  useEffect(()=>{
    try{const raw=sessionStorage.getItem("ip-studio-signin-recovery");if(raw){const data=recoverySchema.safeParse(JSON.parse(raw));if(data.success){restored.current=true;setAccount(data.data.account);setSource(data.data.source);setSubject(data.data.subject);setSessions(data.data.sessions);if(data.data.pendingProfile){setProfileEdit(data.data.pendingProfile);setSettings(true);}}sessionStorage.removeItem("ip-studio-signin-recovery");}}catch{}
    let cancelled=false;
    Promise.allSettled([api<{profiles:Record<Account,Profile>}>("/api/profiles",undefined,true),api<{pools:TopicPool[]}>("/api/topics",undefined,true)]).then(results=>{
      if(cancelled)return;
      if(results[0].status==="fulfilled")setProfiles(results[0].value.profiles);
      if(results[1].status==="fulfilled"&&!restored.current){
        const pools=results[1].value.pools;
        setSessions(prev=>{const next={...prev};for(const pool of pools)next[pool.account]={...initial(),topics:pool.topics,snapshot:pool.source,theme:pool.subject,engine:pool.engine,poolSaved:true};return next;});
        const film=pools.find(p=>p.account==="film");if(film){setSource(film.source);setSubject(film.subject);}
      }
      const failed=results.find(r=>r.status==="rejected");
      if(failed?.status==="rejected"){if((failed.reason as Error).message.includes("请先登录"))setAuthNeeded(true);else setWorkspaceError("已保存的账号或选题暂时未能载入。为避免覆盖，请刷新重试。");}
      setBooting(false);
    });return()=>{cancelled=true;};
  },[]);
  function update(patch:Partial<Session>,key:Account=account){setSessions(prev=>({...prev,[key]:{...prev[key],...patch}}));}
  function protect(action:()=>void,dirty=active.dirty){if(dirty)setPending(()=>action);else action();}
  function prepareSignin(e: React.MouseEvent<HTMLAnchorElement>){try{const s=live.current;sessionStorage.setItem("ip-studio-signin-recovery",JSON.stringify({account:s.account,source:s.source,subject:s.subject,sessions:s.sessions,...(settings?{pendingProfile:profileEdit}:{})}));leavingForSignin.current=true;}catch{e.preventDefault();toast.error("无法暂存输入，请先复制内容后再登录。");}}
  function configureAI(){setKeyInput("");setModelInput(model);setAiSettings(true);}
  function activateAI(){if(keyInput.trim().length<12||keyInput.trim().length>1000){toast.error("请填写有效的 OpenAI API Key。");return;}if(!/^[a-zA-Z0-9._:-]{1,100}$/.test(modelInput.trim())){toast.error("请检查模型名称。");return;}credentials.current=keyInput.trim();setModel(modelInput.trim());setKeyInput("");setHasKey(true);setAiVerified(false);setMode("ai");setAiSettings(false);toast.success("已启用 OpenAI，生成时将验证连接");}
  async function persistPool(pool:TopicPool){await api("/api/topics",{method:"POST",body:JSON.stringify(pool)});update({poolSaved:true},pool.account);}
  async function savePool(){if(poolSaving||active.topics.length===0)return;setPoolSaving(true);try{await persistPool({account,topics:active.topics,source:active.snapshot,subject:active.theme,engine:active.engine,updatedAt:Date.now()});toast.success("选题已保存，下次打开可以继续");}catch(e){toast.error((e as Error).message);}finally{setPoolSaving(false);}}
  async function runTopics(){
    if(operation.current)return;
    if(mode==="ai"&&!credentials.current){configureAI();return;}
    operation.current=true;setBusy("topics");const key=account,notes=source,theme=subject,engine=mode;
    try{
      const topics=engine==="ai"?(await api<{topics:Topic[]}>("/api/generate",{method:"POST",body:JSON.stringify({action:"topics",account:key,source:notes,subject:theme,count,profile:profiles[key],apiKey:credentials.current,model})})).topics:makeTopics(notes,theme,key,profiles[key],count);
      if(engine==="ai")setAiVerified(true);
      update({topics,snapshot:notes,theme,selected:-1,draft:null,dirty:false,engine,poolSaved:false},key);setView("topics");
      try{await persistPool({account:key,topics,source:notes,subject:theme,engine,updatedAt:Date.now()});toast.success(`已生成并保存 ${topics.length} 个选题`);}catch(e){toast.warning(`已生成 ${topics.length} 个选题，尚未保存。${(e as Error).message}`);}
    }catch(e){toast.error((e as Error).message);}finally{operation.current=false;setBusy(null);}
  }
  async function choose(topic:Topic,index:number){
    if(operation.current)return;
    if(active.selected===index&&active.draft){setView("draft");return;}
    if(mode==="ai"&&!credentials.current){configureAI();return;}
    protect(()=>void runDraft(topic,index));
  }
  async function runDraft(topic:Topic,index:number){
    if(operation.current)return;operation.current=true;setBusy("draft");const key=account,notes=active.snapshot;
    try{
      const draft=mode==="ai"?(await api<{draft:Draft}>("/api/generate",{method:"POST",body:JSON.stringify({action:"draft",account:key,source:notes,subject:active.theme,count,profile:profiles[key],topic,apiKey:credentials.current,model})})).draft:makeDraft(topic,notes,key,profiles[key]);
      if(mode==="ai")setAiVerified(true);update({selected:index,draft,dirty:true},key);setView("draft");toast.success("脚本已生成，补全细节后即可保存");
    }catch(e){toast.error((e as Error).message);}finally{operation.current=false;setBusy(null);}
  }
  function editDraft(field:"title"|"content"|"materials",value:string){if(active.draft)update({draft:{...active.draft,[field]:value},dirty:true});}
  async function saveDraft(){
    if(!active.draft||saving)return;if(!active.draft.title.trim()||!active.draft.content.trim()){toast.error("请填写标题和正文后再保存。");return;}
    const draft=active.draft,key=account;setSaving(true);
    try{const data=await api<{draft:Draft}>("/api/drafts",{method:"POST",body:JSON.stringify(draft)});setSessions(prev=>({...prev,[key]:{...prev[key],draft:prev[key].draft?.id===draft.id?{...prev[key].draft!,updatedAt:data.draft.updatedAt}:prev[key].draft,dirty:prev[key].draft===draft?false:prev[key].dirty}}));toast.success("脚本已保存到内容库");}catch(e){toast.error((e as Error).message);}finally{setSaving(false);}
  }
  async function loadDrafts(){setLibrary(true);setLoadingSaved(true);setLoadError("");try{const data=await api<{drafts:Draft[]}>("/api/drafts");setSaved(data.drafts);}catch(e){setLoadError((e as Error).message);}finally{setLoadingSaved(false);}}
  function openSaved(draft:Draft){protect(()=>{setAccount(draft.account);setSource(draft.source);setSubject("");update({snapshot:draft.source,theme:"",topics:[],selected:-1,draft,dirty:false,poolSaved:false},draft.account);setLibrary(false);setView("draft");},sessions[draft.account].dirty||(sessions[draft.account].topics.length>0&&!sessions[draft.account].poolSaved));}
  async function copyDraft(){if(!active.draft)return;try{await navigator.clipboard.writeText(draftText(active.draft));toast.success("标题、脚本和素材清单已复制");}catch{toast.error("浏览器未允许复制，请选中文字后手动复制。");}}
  async function saveProfile(){
    if(!profileEdit.name.trim()||!profileEdit.audience.trim()||!profileEdit.focus.trim()){toast.error("请填写账号名称、目标用户和账号定位。");return;}
    const key=account,profile={...profileEdit};setSavingProfile(true);
    try{await api("/api/profiles",{method:"POST",body:JSON.stringify({account:key,profile})});setProfiles(prev=>({...prev,[key]:profile}));setSettings(false);toast.success("账号画像已保存，下次生成时使用新定位");}catch(e){toast.error((e as Error).message);}finally{setSavingProfile(false);}
  }
  useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(!leavingForSignin.current&&(sessions.film.dirty||sessions.course.dirty||[sessions.film,sessions.course].some(s=>s.topics.length&&!s.poolSaved)||busy)){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",handler);return()=>window.removeEventListener("beforeunload",handler);},[sessions,busy]);
  useEffect(()=>{
    type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
    const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>unknown}}).modelContext;
    if(!context?.registerTool)return;const lifecycle=new AbortController();
    const tools:Tool[]=[{name:"get_content_workspace",title:"读取内容工作台",description:"读取当前账号画像、素材、选题和草稿。不包含密钥。",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>{const s=live.current;return{account:s.account,profile:s.profiles[s.account],source:s.source,topics:s.sessions[s.account].topics,draft:s.sessions[s.account].draft,unsaved:s.sessions[s.account].dirty};}},
      {name:"generate_topic_options",title:"整理模板选题",description:"根据账号画像与素材生成 6 至 10 个模板选题，只更新页面，不调用 OpenAI、不保存。不会替换未保存内容。",inputSchema:{type:"object",properties:{account:{type:"string",enum:["film","course"]},source:{type:"string",maxLength:5000},subject:{type:"string",maxLength:80},count:{type:"integer",enum:[6,8,10]}},required:["account"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:(input)=>{
        const parsed=z.object({account:z.enum(["film","course"]),source:z.string().max(5000).default(""),subject:z.string().max(80).default(""),count:z.union([z.literal(6),z.literal(8),z.literal(10)]).default(6)}).strict().safeParse(input);if(!parsed.success)throw new Error("账号或素材格式不正确。");
        const v=parsed.data,s=live.current.sessions[v.account];if(operation.current||live.current.busy||s.dirty||(s.topics.length&&!s.poolSaved))throw new Error("请等待生成完成，并先保存目标账号的内容。");const topics=makeTopics(v.source,v.subject,v.account,live.current.profiles[v.account],v.count);
        flushSync(()=>{setAccount(v.account);setSource(v.source);setSubject(v.subject);update({...initial(),topics,snapshot:v.source,theme:v.subject},v.account);setView("topics");});return{account:v.account,topics,engine:"template"};
      }}];
    for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}return()=>lifecycle.abort();
  },[]);
  const disabled=booting||!!busy||!!workspaceError;
  const isStale=active.topics.length>0&&(source!==active.snapshot||subject!==active.theme);
  return <main className={`studio ${account}`}><Toaster position="top-center" theme="light"/>
    <header className="topbar"><div className="brand"><span className="brand-mark"><Layers2 size={23}/></span><strong>IP 灵感库<span>双轨内容工作台</span></strong></div><div className="top-actions"><Button variant="ghost" className="ai-connect" onClick={configureAI} disabled={!!busy}><KeyRound/>{hasKey?(aiVerified?"OpenAI 已连接":"OpenAI 已配置"):"连接 OpenAI"}</Button><Button variant="outline" className="library-button" onClick={loadDrafts} disabled={!!busy}><FolderOpen/>内容库</Button></div></header>
    <div className="workspace-heading"><div><p className="eyebrow">账号定位 → 选题 → 脚本</p><h1>今天，<span>给你的账号一个好选题。</span></h1></div><p className="heading-note">影视 AIGC / AI＋IP 学习</p></div>
    {workspaceError&&<div className="workspace-alert" role="alert">{workspaceError}<Button variant="outline" onClick={()=>window.location.reload()}>刷新重试</Button></div>}
    <div className="workspace"><aside className="input-panel">
      <div className="section-heading"><span className="step">01</span><h2>账号定位卡</h2></div>
      <Tabs value={account} onValueChange={v=>{setAccount(v as Account);setView("topics");}} className="account-tabs"><TabsList className="account-list" aria-label="内容账号"><TabsTrigger value="film" className="account-choice" disabled={disabled}><Clapperboard size={21}/><span>影视 AIGC<small>作品与制作过程</small></span></TabsTrigger><TabsTrigger value="course" className="account-choice" disabled={disabled}><BookOpen size={21}/><span>AI＋IP 学习<small>学习与实操复盘</small></span></TabsTrigger></TabsList><TabsContent value={account} className="profile-summary"><div><strong>{profiles[account].name}</strong><Button variant="ghost" size="icon" aria-label="编辑账号定位" disabled={disabled} onClick={()=>{setProfileEdit({...profiles[account]});setSettings(true);}}><Settings2/></Button></div><p>{profiles[account].focus}</p><small>写给 {profiles[account].audience}</small><div className="pillar-tags">{profiles[account].pillars.split(/[、，,；;\n]/).filter(Boolean).map((p,i)=><span key={i}>{p.trim()}</span>)}</div><div className="voice-summary"><span>表达语气</span>{profiles[account].tone}</div></TabsContent></Tabs>
      <div className="input-divider"/><div className="section-heading"><span className="step">02</span><h2>今天想聊什么？</h2></div>
      <div className="field"><label htmlFor="subject">内容方向 <span>选填</span></label><Input id="subject" value={subject} maxLength={80} disabled={disabled} onChange={e=>setSubject(e.target.value)} placeholder="例如：AI 视频、第一次实操复盘"/></div>
      <div className="field"><div className="label-line"><label htmlFor="source">真实笔记 / 实操经历 <span>选填</span></label><button className="text-button" disabled={disabled} onClick={()=>{setSource(EXAMPLE);setSubject("雨夜街头镜头");}}>填入示例</button></div><Textarea id="source" className="source-input" value={source} maxLength={5000} disabled={disabled} onChange={e=>setSource(e.target.value)} placeholder="做了什么？遇到什么问题？实际结果如何？\n没有素材也可以直接按账号定位生成选题。"/><div className="source-meta"><span>{source===EXAMPLE?"这是示例素材，请替换成你的经历":"不编造经历，缺失细节标为待补充"}</span><span>{source.length}/5000</span></div></div>
      <div className="generation-options"><div><label>生成方式</label><Tabs value={mode} onValueChange={v=>setMode(v as Engine)}><TabsList aria-label="生成方式"><TabsTrigger value="ai" disabled={disabled}>OpenAI</TabsTrigger><TabsTrigger value="template" disabled={disabled}>模板试用</TabsTrigger></TabsList></Tabs></div><div><label>选题数量</label><Tabs value={String(count)} onValueChange={v=>setCount(Number(v))}><TabsList aria-label="选题数量">{[6,8,10].map(n=><TabsTrigger key={n} value={String(n)} disabled={disabled}>{n} 个</TabsTrigger>)}</TabsList></Tabs></div></div>
      <Button className="generate-button" disabled={disabled||poolSaving} onClick={()=>protect(()=>void runTopics(),active.dirty||(active.topics.length>0&&!active.poolSaved))}>{busy==="topics"?<LoaderCircle className="spin"/>:<Sparkles/>}{busy==="topics"?"正在构思选题…":`生成 ${count} 个选题`}<ArrowRight size={17}/></Button>
      <p className="template-note">{mode==="ai"?(hasKey?"按你的账号画像生成，每次调用使用你的 API 额度。":"首次使用先连接 OpenAI，也可切换模板试用。"):"模板按固定结构整理，适合先体验完整流程。"}</p>
    </aside>
    <section className="output-panel" aria-busy={!!busy||booting}>
      <div className="section-heading output-heading"><span className="step">03</span><h2>从灵感到一条内容</h2><span className="account-badge">{account==="film"?<Clapperboard/>:<BookOpen/>}{account==="film"?"影视 AIGC":"AI＋IP 学习"}</span></div>
      <Tabs value={view} onValueChange={setView} className="output-tabs"><TabsList className="output-tab-list" aria-label="创作步骤"><TabsTrigger value="topics"><Lightbulb/>选题池{active.topics.length>0&&<span className="tab-count">{active.topics.length}</span>}</TabsTrigger><TabsTrigger value="draft"><PencilLine/>脚本编辑{active.dirty&&<span className="unsaved-dot" aria-label="未保存"/>}</TabsTrigger></TabsList>
        <TabsContent value="topics">
          <div className="pool-heading"><p>{booting?"正在读取你的工作台…":active.topics.length?`${active.engine==="ai"?"OpenAI 生成":"模板选题"} · 选一个方向展开脚本`:"先选账号，再找适合它的内容方向"}</p>{active.topics.length>0&&<Button variant="ghost" size="sm" onClick={savePool} disabled={active.poolSaved||poolSaving||!!busy}>{active.poolSaved?<Check/>:<Save/>}{poolSaving?"保存中…":active.poolSaved?"选题已保存":"保存选题"}</Button>}</div>
          {isStale&&<p className="stale-note">输入已修改，重新生成后更新选题。当前脚本仍使用原来的素材。</p>}
          {busy&&<div className="generation-progress" role="status"><LoaderCircle className="spin"/>{busy==="topics"?"正在结合账号定位、受众和素材构思选题…":"正在编排开头、正文结构和完整口播稿…"}</div>}
          {active.topics.length?<div className="topic-grid">{active.topics.map((topic,index)=><button key={topic.id} className={`topic-card ${active.selected===index?"selected":""}`} disabled={disabled||saving} onClick={()=>void choose(topic,index)} aria-pressed={active.selected===index}><div className="topic-top"><span>{topic.angle}</span><span className="topic-number">{String(index+1).padStart(2,"0")}</span></div><h3>{topic.title}</h3><p>{topic.hook}</p><div className="topic-reason"><strong>为什么适合你</strong>{topic.reason}</div><div className="topic-action">{active.selected===index?<><Check size={15}/>继续编辑脚本</>:<>生成短视频脚本<ArrowRight size={15}/></>}</div></button>)}</div>:<Empty className="pool-empty"><EmptyHeader><EmptyMedia className="empty-symbol"><Lightbulb size={28}/></EmptyMedia><EmptyTitle>好的选题，从认识账号开始</EmptyTitle><EmptyDescription>填写想聊的方向，或直接按账号定位生成。<br/>每个选题都有标题、内容角度和推荐理由。</EmptyDescription></EmptyHeader><div className="empty-chips"><span>作品与过程</span><span>学习与实践</span><span>真实表达</span></div><Button variant="outline" disabled={disabled} onClick={()=>void runTopics()}><Sparkles/>按账号定位生成</Button></Empty>}
        </TabsContent>
        <TabsContent value="draft"><section className="draft-panel" aria-label="短视频脚本"><div className="draft-heading"><div><PencilLine size={19}/><h2>短视频脚本</h2>{active.draft&&<span className="draft-status">{active.dirty?"未保存":"已保存"}</span>}</div><span className="format-note">开头 · 结构 · 口播 · 互动</span></div>
          {!active.draft?<Empty className="draft-empty"><EmptyHeader><EmptyMedia className="empty-symbol"><FileText size={28}/></EmptyMedia><EmptyTitle>先挑选一个你想讲的题目</EmptyTitle><EmptyDescription>选定后生成可编辑脚本，缺少的真实细节会标为「待补充」。</EmptyDescription></EmptyHeader><Button variant="outline" onClick={()=>setView("topics")}>返回选题池<ArrowRight/></Button></Empty>:<div className="draft-editor"><label htmlFor="draft-title">发布标题</label><Input id="draft-title" maxLength={200} value={active.draft.title} onChange={e=>editDraft("title",e.target.value)} className="draft-title"/><label htmlFor="draft-content">脚本全文</label><Textarea id="draft-content" value={active.draft.content} maxLength={20000} onChange={e=>editDraft("content",e.target.value)} className="draft-content"/><label htmlFor="draft-materials">需要准备的素材</label><Textarea id="draft-materials" value={active.draft.materials} maxLength={5000} onChange={e=>editDraft("materials",e.target.value)} className="materials-input"/><div className="draft-footer"><span>{(active.draft.content.match(/待补充/g)||[]).length} 处待补充 · {active.draft.content.length} 字</span><div><Button variant="outline" onClick={copyDraft}><Copy/>复制全文</Button><Button onClick={saveDraft} disabled={saving}><Save/>{saving?"正在保存…":"保存到内容库"}</Button></div></div></div>}
        </section></TabsContent>
      </Tabs>
      <p className="workspace-tip"><span>同一份实践，两种表达</span>影视账号展示画面与制作过程，学习账号记录方法与思考。</p>
    </section></div>
    <footer className="site-footer"><span>IP 灵感库 / 每次实践，都值得被记录</span><span>你的账号定位与草稿仅自己可见</span></footer>
    {authNeeded&&<div className="auth-note"><span>登录后可保存内容并使用 OpenAI。</span><a href="/signin-with-chatgpt?return_to=/" target="_top" onClick={prepareSignin}>登录</a><button aria-label="关闭登录提示" onClick={()=>setAuthNeeded(false)}><X size={16}/></button></div>}
    <Dialog open={settings} onOpenChange={v=>{if(!savingProfile)setSettings(v);}}><DialogContent className="settings-dialog"><DialogTitle>编辑账号定位</DialogTitle><DialogDescription>{account==="film"?"影视 AIGC":"AI＋IP 学习"} · 每次生成都会参考这些信息。</DialogDescription><div className="profile-form">{profileFields.map(field=><div className="field" key={field.key}><label htmlFor={`profile-${field.key}`}>{field.label}{["name","audience","focus"].includes(field.key)&&<span>必填</span>}</label>{field.key==="focus"||field.key==="pillars"?<Textarea id={`profile-${field.key}`} value={profileEdit[field.key]} maxLength={field.max} disabled={savingProfile} onChange={e=>setProfileEdit({...profileEdit,[field.key]:e.target.value})} placeholder={field.hint}/>:<Input id={`profile-${field.key}`} value={profileEdit[field.key]} maxLength={field.max} disabled={savingProfile} onChange={e=>setProfileEdit({...profileEdit,[field.key]:e.target.value})} placeholder={field.hint}/>}</div>)}</div>{authNeeded&&<a className="dialog-signin" href="/signin-with-chatgpt?return_to=/" target="_top" onClick={prepareSignin}>先登录，保留已填写的定位</a>}<Button onClick={saveProfile} disabled={savingProfile}><Save/>{savingProfile?"正在保存…":"保存账号定位"}</Button></DialogContent></Dialog>
    <Dialog open={aiSettings} onOpenChange={v=>{setAiSettings(v);if(!v)setKeyInput("");}}><DialogContent className="settings-dialog ai-dialog"><DialogTitle>连接 OpenAI</DialogTitle><DialogDescription>使用你自己的 OpenAI API Key 生成选题和脚本。</DialogDescription><div className="connection-note">生成时，账号画像、当前素材和所选题目会发送给 OpenAI。密钥仅保留在当前页面内存，经过本站服务转发，不写入内容库；刷新后需要重新填写。</div><div className="field"><label htmlFor="api-key">OpenAI API Key</label><Input id="api-key" type="password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} maxLength={1000} autoComplete="off" spellCheck={false} placeholder={hasKey?"输入新密钥以更换":"sk-…"}/></div><div className="field"><label htmlFor="ai-model">模型名称</label><Input id="ai-model" value={modelInput} onChange={e=>setModelInput(e.target.value)} maxLength={100} spellCheck={false}/><small>需为支持 Responses 和结构化输出的模型。</small></div><p className="api-help">API 调用单独计费。<a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">管理 API Key ↗</a></p>{authNeeded&&<a className="dialog-signin" href="/signin-with-chatgpt?return_to=/" target="_top" onClick={prepareSignin}>先登录，再填写密钥</a>}<Button onClick={activateAI}><KeyRound/>启用 OpenAI</Button>{hasKey&&<Button variant="outline" onClick={()=>{credentials.current="";setKeyInput("");setHasKey(false);setAiVerified(false);setMode("template");setAiSettings(false);toast.success("已清除本次页面中的密钥");}}>清除密钥，改用模板</Button>}</DialogContent></Dialog>
    <Dialog open={library} onOpenChange={setLibrary}><DialogContent className="library-dialog"><DialogTitle>内容库 <span className="library-count">{saved.length} 篇</span></DialogTitle><DialogDescription>两个账号的已保存内容，随时回来继续编辑。</DialogDescription>{authNeeded&&<a className="dialog-signin" href="/signin-with-chatgpt?return_to=/" target="_top" onClick={prepareSignin}>登录后读取内容库</a>}{loadingSaved?<p className="loading-line"><LoaderCircle className="spin"/>正在读取内容…</p>:loadError?<div className="load-error"><p>{loadError}</p><Button variant="outline" onClick={loadDrafts}>重新加载</Button></div>:saved.length?<div className="saved-list">{saved.map(draft=><button key={draft.id} onClick={()=>openSaved(draft)}><span className={`saved-icon ${draft.account}`}>{draft.account==="film"?<Clapperboard/>:<BookOpen/>}</span><span><strong>{draft.title}</strong><small>{draft.account==="film"?"影视 AIGC":"AI＋IP 学习"} · {new Date(draft.updatedAt).toLocaleString("zh-CN")}</small></span><ArrowRight size={17}/></button>)}</div>:<Empty><EmptyHeader><EmptyMedia><FolderOpen/></EmptyMedia><EmptyTitle>你的第一条内容，从一个选题开始</EmptyTitle><EmptyDescription>生成脚本并保存后，就会出现在这里。</EmptyDescription></EmptyHeader></Empty>}</DialogContent></Dialog>
    <AlertDialog open={!!pending} onOpenChange={v=>{if(!v)setPending(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>替换未保存的内容？</AlertDialogTitle><AlertDialogDescription>当前账号有尚未保存的选题或脚本。继续会替换它们，可以先返回保存。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>返回保存</AlertDialogCancel><AlertDialogAction onClick={()=>{const action=pending;setPending(null);action?.();}}>继续替换</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>;
}
