export type Account = "film" | "course";
export type Profile = { name: string; audience: string; focus: string; persona: string; tone: string; pillars: string };
export type Topic = { id: string; angle: string; title: string; hook: string; reason: string; audience: string; subject: string; kind: number };
export type Draft = { id: string; account: Account; title: string; content: string; materials: string; source: string; updatedAt: number };
export type Engine = "template" | "ai";
export type TopicPool = { account: Account; topics: Topic[]; source: string; subject: string; engine: Engine; updatedAt: number };
export const EXAMPLE = "今天尝试用 AI 做一个雨夜街头镜头。第一次生成的人物动作很僵硬，调整描述后自然了一些，但还没完全解决。想把这次创作过程记录下来。";
export const DEFAULT_PROFILES: Record<Account, Profile> = {
  film: { name: "我的影视 AIGC 账号", audience: "想用 AI 做影视、漫剧和短视频的创作者", focus: "用真实作品和制作过程，分享 AI 影像创作中的尝试与问题。", persona: "正在实践的 AI 影像创作者", tone: "直观、具体，先展示画面再解释过程", pillars: "作品展示、制作流程、工具体验、提示词技巧、制作踩坑" },
  course: { name: "我的 AI＋IP 学习记录", audience: "从零学习 AI＋IP、准备开始做账号的人", focus: "记录 AI＋IP 操盘手课程学习、实操过程和账号定位思考。", persona: "边学边做、如实记录的学习者", tone: "真诚、易懂，分享过程，不冒充专家", pillars: "学习笔记、实操复盘、IP 定位、AI 应用、自媒体成长" },
};
export function makeTopics(source: string, subject: string, account: Account, profile: Profile, count = 6): Topic[] {
  if (source.length > 5000 || subject.length > 80 || ![6, 8, 10].includes(count)) throw new Error("请检查素材长度和选题数量。");
  const pillars = profile.pillars.split(/[、，,；;\n]/).map(s => s.trim()).filter(Boolean);
  const specific = subject.trim() || source.trim().split(/[。！？\n]/)[0].slice(0, 24);
  const angles = account === "film" ? ["作品展示", "过程拆解", "问题观察", "工具体验", "提示词练习", "镜头拆解", "制作清单", "创作选择", "下次实验", "观众提问"] : ["学习记录", "实操复盘", "方法整理", "定位思考", "问题清单", "工具应用", "练习计划", "概念理解", "阶段回看", "同学讨论"];
  return Array.from({ length: count }, (_, kind) => {
    const key = specific || pillars[kind % Math.max(pillars.length, 1)] || profile.focus.slice(0, 24);
    const filmTitles = [`「${key}」：一条作品背后的创作想法`, `「${key}」从素材到画面，过程怎么拆？`, `「${key}」有哪些值得检查的细节？`, `做「${key}」，工具到底能帮哪一步？`, `围绕「${key}」，怎么设计一次提示词练习？`, `用一个镜头讲清「${key}」`, `开始「${key}」之前，我会准备什么？`, `「${key}」的两种创作思路，你会怎么选？`, `下一次做「${key}」，我想测试什么？`, `关于「${key}」，你最想看哪一步？`];
    const courseTitles = [`「${key}」：我想弄懂的一个问题`, `把「${key}」按目标、行动、结果复盘`, `「${key}」的练习清单，怎么整理？`, `「${key}」适合我的账号吗？`, `学「${key}」，先把问题列清楚`, `把「${key}」用到一次具体任务里`, `下一次练习「${key}」，只设一个小目标`, `用自己的话解释「${key}」`, `回看「${key}」：哪些地方还需要验证？`, `同样在学「${key}」，你卡在哪里？`];
    const filmHooks = ["先放一段已有画面，再讲创作意图。", "展示起点、关键操作和当前结果。", "停在一个细节，让观众一起观察。", "从一个具体任务看工具的适用范围。", "一次只调整一个描述，记录可核对的变化。", "从构图、动作或节奏中选一个点展开。", "把拍摄或生成前的准备整理出来。", "说明选择依据，保留还没验证的判断。", "提出一个实验问题，明确要观察的结果。", "从观众的问题反推下一条制作内容。"];
    const courseHooks = ["从真实笔记出发，讲清一个还想弄懂的问题。", "记录做了什么、看到了什么、下一步怎么试。", "把内容整理成下次能照着做的清单。", "联系账号受众，说明这件事为什么值得讲。", "把已理解和还不理解的部分分开写。", "从具体任务出发，记录学习如何用于实践。", "缩小练习范围，明确一个可观察的目标。", "用一个例子检验自己是否真的理解。", "回看已有记录，区分事实、想法和计划。", "分享一个具体困惑，邀请同路人交流。"];
    const angle = angles[kind];
    return { id: `${account}-${crypto.randomUUID()}`, angle, title: (account === "film" ? filmTitles : courseTitles)[kind], hook: (account === "film" ? filmHooks : courseHooks)[kind], reason: `用「${angle}」回应${profile.audience}的关注，贴合账号方向「${profile.focus}」。`, audience: profile.audience, subject: key, kind };
  });
}
export function makeDraft(topic: Topic, source: string, account: Account, profile: Profile): Draft {
  const hook = account === "film" ? `这个关于「${topic.subject}」的画面，你会先关注哪个细节？` : `关于「${topic.subject}」，有一个问题我想和同样在学习的你聊聊。`;
  const record = source.trim() || "【待补充：与选题相关的真实笔记或实践经历】";
  const cta = account === "film" ? "你更想看作品效果，还是具体制作过程？可以留言告诉我。" : "如果你也在学习这个方向，你现在最想弄懂哪一步？一起交流。";
  const structure = account === "film" ? "0–3 秒｜先展示与选题对应的已有片段或进度截图。\n3–15 秒｜说明目标和起始素材。\n15–45 秒｜展示一次真实操作，以及当前观察到的结果。\n45–60 秒｜提出还没解决的问题，邀请观众讨论。" : "0–3 秒｜抛出本次学习的问题。\n3–15 秒｜说明为什么关注这个问题。\n15–45 秒｜讲真实经历、一个具体观察和自己的理解。\n45–60 秒｜提出下一次练习计划，邀请同路人交流。";
  const spoken = account === "film" ? `${hook}\n\n${record}\n\n这次我想呈现的是【待补充：创作目标】。这里可以结合实际素材，看看【待补充：一个可展示的画面细节】。\n\n关于「${topic.angle}」，我想重点记录【待补充：实际做过的操作与对应结果】。目前还需要继续验证的是【待补充：尚未解决的问题】。\n\n${cta}` : `${hook}\n\n${record}\n\n我想把这件事按「${topic.angle}」整理一下。对我来说，值得继续思考的是【待补充：由这次记录得到的理解】。支撑这个想法的例子是【待补充：真实细节】。\n\n下一次练习，我准备【待补充：一个具体行动】。这只是我当前的学习记录，还有不确定的地方会继续验证。\n\n${cta}`;
  const materials = account === "film" ? "□ 与选题对应的作品片段或进度截图\n□ 实际使用的工具、提示词或操作记录\n□ 如有对比，准备前后画面\n□ 补全口播中的真实细节" : "□ 原始课程笔记\n□ 实操截图或过程记录\n□ 能支撑理解的具体例子\n□ 下一次练习的一个行动";
  return { id: crypto.randomUUID(), account, title: topic.title, source, content: `【3 秒开头钩子】\n${hook}\n\n【正文结构｜约 60 秒】\n${structure}\n\n【完整口播稿】\n${spoken}\n\n【结尾互动】\n${cta}\n\n【发布文案】\n${topic.title}\n${record}\n\n【表达参考】\n人设：${profile.persona}\n语气：${profile.tone}`, materials, updatedAt: Date.now() };
}
export function draftText(draft: Draft) { return `${draft.title}\n\n${draft.content}\n\n【素材清单】\n${draft.materials}`; }
