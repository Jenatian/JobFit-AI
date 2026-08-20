/**
 * 前端直连智谱 AI (ZhipuAI) 服务
 *
 * 设计目标：彻底移除对本地 Express 后端的依赖，
 * 让项目可作为纯静态站点部署到 Cloudflare Pages / Vercel / Netlify。
 *
 * - 请求地址：https://open.bigmodel.cn/api/paas/v4/chat/completions
 * - 主模型：glm-4-flash（永久免费）
 * - 回退模型：glm-4-flash-turbo
 * - System Prompt 完整内嵌，包含 Rubric 评分量规、防幻觉占位符、0到1实战项目蓝图规则
 * - 服务端校准逻辑（calibrateScores）在前端复刻执行，确保评分拉开差距
 */
import type { AnalysisResult } from "@/lib/types";

export type PipelineStageId = 1 | 2 | 3 | 4;

export interface PipelineStageUpdate {
  stageId: PipelineStageId;
  status: "pending" | "active" | "done";
  detail: string;
  progress: number;
}

export type PipelineStageCallback = (update: PipelineStageUpdate) => void;

export const PIPELINE_STAGES = [
  {
    id: 1 as PipelineStageId,
    icon: "🔍",
    title: "解构岗位 JD 核心能力画像",
    activeText: "解析中...",
    doneTextPrefix: "已提取",
    doneTextSuffix: "个硬技能与门槛指标",
  },
  {
    id: 2 as PipelineStageId,
    icon: "⚖️",
    title: "简历经历与素材库语义交叉比对",
    activeText: "比对中...",
    doneTextPrefix: "发现",
    doneTextSuffix: "个高 ROI 置换项目",
  },
  {
    id: 3 as PipelineStageId,
    icon: "📊",
    title: "触发工业级 Rubric 量规打分与熔断检测",
    activeText: "计算中...",
    doneTextPrefix: "命中",
    doneTextSuffix: "项规则约束",
  },
  {
    id: 4 as PipelineStageId,
    icon: "✍️",
    title: "执行病灶自适应分流与 STAR 逐段精修",
    activeText: "正在生成可落地的行动蓝图...",
    doneTextPrefix: "",
    doneTextSuffix: "",
  },
];

// ==================== 阶段一 Prompt（宏观诊断 Fast <3s） ====================
// 仅输出 match_score / dimensions / missing_keywords / project_strategy / summary
export const PHASE1_PROMPT = `你是「人岗对齐宏观诊断引擎」，只做评分+战略看板，不生成改写建议。严格按JSON输出。

【必须字段】
{
  "match_score": 0-100整数,
  "score_breakdown": {"skill_match":0-100,"experience_relevance":0-100,"quantification_level":0-100},
  "dimensions": 与score_breakdown完全相同,
  "summary": "60字以内一句话：[画像判定]+核心优势+关键差距+下一步指引。画像判定须与 match_score 同档（90-100极致型/75-89资深型/55-74潜力型/30-54弱匹配型/0-29完全不对口型）。严禁在 summary 中出现与 match_score 不一致的分数数字（若需引用，必须等于 match_score 本身）。示例：「潜力型：缺少 RAG/Agent 核心硬技能，建议补齐大模型应用栈并加 2 段量化成果」（不要写死具体分数）",
  "missing_keywords": ["6-12个JD要求但简历缺失的核心关键词标签"],
  "project_strategy": {
    "recommended_additions": [{"project_name":"素材库/可新增项目名","why_add":"命中JD哪项能力","action_advice":"1-2步操作"}],
    "recommended_removals": [{"project_name":"要删的原项目名","why_remove":"与JD无关/低价值"}],
    "project_pivots": [{"project_name":"要改写的原项目名","pivot_advice":"调整叙事重心的1句话策略"}]
  }
}

【Rubric 5档量规】
90-100极致：对口+一线+技能≥90%+深度量化
75-89资深：2年+垂直+技能75~85%+有业务量化
55-74潜力应届：1-2个完整项目+技能50~70%+少量量化
30-54弱匹配：无实操+核心缺+口水话+零量化
0-29完全不对口：无交叉+核心全缺

【熔断惩罚】
- JD要资深/3年+而候选人应届：experience_relevance≤55
- 核心硬技能每缺1项skill_match扣8，缺≥3项→skill_match≤50
- 零量化：quantification_level≤50；仅1-2处：≤65
- 口水话≥5次且量化<3处：experience_relevance-10，不得≥75

【加权公式】match_score = skill_match*0.4 + experience_relevance*0.4 + quantification_level*0.2，取整。三维度差值≥5。

【硬约束】
- 严禁捏造数字/金额，缺则 [X] 占位（本阶段不需要具体数字）
- missing_keywords 仅列 JD 真实关键词，优先列核心硬技能（如 RAG/Agent/LangChain/向量库）
- project_strategy 三类各 1-2 条，简短直接，不展开
- summary 必须为一句话，60字以内，精准画像
- 【一致性红线】summary 中若出现数字分数（如「XX分」），该数字必须严格等于本次实际 match_score！严禁写死「76分」「85分」等示例数字。画像分档必须落在 match_score 对应的档位（90-100/75-89/55-74/30-54/0-29）
- 纯 JSON，无 markdown 包裹，可 JSON.parse
- 不要任何 suggestions 字段！不要任何建议型描述！
- 输出尽量短，max_tokens 2000 即可`;

// ==================== 阶段二 Prompt（深度 STAR 建议体系 ~8s） ====================
// 携带画像上下文，只生成 suggestions 数组
export const PHASE2_PROMPT = `你是「简历病灶 STAR 精修专家」，只生成 suggestions 数组，不重复评分与战略。

【输出唯一字段】
{ "suggestions": [  {  ...  },  ...  ] }

【suggestion item 结构】
{
  "type": "rewrite" | "new_project_blueprint" | "section_addition",
  "category_tag": "🔥 推荐自建实战项目蓝图" | "✏️ 现有描述精修" | "💡 关键板块补充",
  "section": "精确标注：如「项目经历(第1段)」「个人简介」「项目经历·新增」「专业技能板块·新增」",
  "original": "简历原文对应片段，若为新增则写「原简历缺失」",
  "improved": "纯字符串，多行用 \\\\n 分隔；严禁对象/数组！",
  "reason": "纯字符串；80-150字，对应JD哪项+怎么干（工具/数据/验证步骤）"
}

【画像分流规则（关键！严格配比数量和类型）】
根据提供的画像诊断分流：
- 画像A（match_score≥75）：**严禁任何 blueprint**！
  4-6条 rewrite（高阶STAR+决策权/跨团队/业务影响，用[X%]占位量化） + 1条 section_addition（80-120字对齐JD层级的个人优势提炼）= 合计5-7条
- 画像B（60≤score<75）：
  3-4条 rewrite（量化注入+[X%][X万][Xs]占位） + 1条 blueprint（把现有小项目升级为工业级：RAG/Agent/向量库/评测基线） + 1-2条 section_addition（补缺失的核心技能树）= 合计5-7条
- 画像C（score<60）：
  2-3条 blueprint（0到1 STAR完整模板：背景→技术方案→可填STAR→[X]量化框架→2-3步落地） + 2条 section_addition（2大硬技能方向，含工具选型+学习路径） + 1条 section_addition（80-120字个人定位重塑） = 合计5-8条

【improved格式】
- rewrite：STAR结构改写后的单段（~100-180字），用[X]占位缺的数字
- blueprint：纯字符串，5行，每行前缀清晰：
  第1行【推荐项目名称】：xxx
  第2行- 背景与痛点：xxx
  第3行- 核心行动与技术方案：xxx
  第4行- 成果与量化表达：[X%]/[X]
  第5行- 动手步骤：3步落地
- section_addition：3-5条要点，用 \\\\n- 连接

【通用规则】
- 每条 improved 120-220字，reason 80-150字，杜绝套话
- 每条建议必须指名道姓引用 JD 原文关键词（如 RAG/LangChain/评测/Top-K）
- 画像A绝无 blueprint；画像C blueprint≥2
- 所有公司名/项目名/技术栈必须来自简历或 JD
- 缺数字统一 [X] / [X%] / [X 万] / [X s] 占位，严禁捏造
- 纯字符串，禁止 improved/reason 是对象/数组
- 只输出 JSON，无 markdown 包裹；不输出任何非 suggestions 字段

【输入上下文】下方将提供：画像诊断结果（score/dimensions/missing_keywords）、原文简历、目标JD、额外素材。请严格按画像分流配比生成。`;

// ==================== 单请求合并 Prompt（兼容 analyzeResume 旧 API） ====================
export const COMBINED_PROMPT = PHASE1_PROMPT.replace(
  "不要任何 suggestions 字段！不要任何建议型描述！",
  ""
).replace(
  "输出尽量短，max_tokens 2000 即可",
  ""
) + "\n\n除此之外，额外附上" + PHASE2_PROMPT.split("根据提供的画像诊断")[0]
  .replace("{ \"suggestions\": [  {  ...  },  ...  ] }", "suggestions:[...]")
  .replace("【画像分流规则（关键！严格配比数量和类型）】\n根据提供的画像诊断分流：\n", "")
  .replace("画像A（match_score≥75）", "画像A（match_score≥75）") + "请同时填充 suggestions 字段（按上方面板分流）。完整输出一份包含 match_score/dimensions/summary/missing_keywords/project_strategy/suggestions 的合并 JSON。";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 从 LLM 输出中提取 JSON
 * 兼容：纯 JSON、```json 代码块包裹、文本中夹杂 JSON 三种情况
 */
function extractJson(raw: string): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch (_) {
        // continue
      }
    }
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

/** 阶段一校验：必须有 match_score + dimensions + missing_keywords + project_strategy；suggestions 可选 */
function isValidPhase1Result(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.match_score !== "number") return false;
  const d = obj.dimensions || obj.score_breakdown;
  if (!d || typeof d !== "object") return false;
  if (
    typeof d.skill_match !== "number" ||
    typeof d.experience_relevance !== "number" ||
    typeof d.quantification_level !== "number"
  )
    return false;
  if (!Array.isArray(obj.missing_keywords)) return false;
  const ps = obj.project_strategy;
  if (!ps || typeof ps !== "object") return false;
  if (
    !Array.isArray(ps.recommended_additions) ||
    !Array.isArray(ps.recommended_removals) ||
    !Array.isArray(ps.project_pivots)
  )
    return false;
  return true;
}

/** 阶段二校验：仅含 suggestions 数组 */
function isValidSuggestionsOnly(obj: any): obj is { suggestions: any[] } {
  if (!obj || typeof obj !== "object") return false;
  return Array.isArray(obj.suggestions);
}

/** 完整结果校验（用于 analyzeResume 合并 API 与兜底合并校验） */
function isValidResult(obj: any): boolean {
  if (!isValidPhase1Result(obj)) return false;
  if (!Array.isArray(obj.suggestions)) return false;
  return true;
}

/**
 * 服务端评分校准器：基于 Rubric 规则对 LLM 返回的分数进行强制校准
 * 解决"老好人打分"问题，确保分差拉得开
 * 与原后端 calibrateScores 完全一致
 */
function calibrateScores(raw: any, resume: string, jd: string): any {
  const d =
    raw.dimensions ||
    raw.score_breakdown || {
      skill_match: 60,
      experience_relevance: 60,
      quantification_level: 60,
    };

  let sm = Number(d.skill_match) || 60;
  let er = Number(d.experience_relevance) || 60;
  let ql = Number(d.quantification_level) || 60;

  const jdLower = jd.toLowerCase();
  const resumeLower = resume.toLowerCase();

  const hardSkills = [
    "prompt engineering",
    "prompt设计",
    "rag",
    "retrieval augmented",
    "agent",
    "agents",
    "agent框架",
    "workflow",
    "vector database",
    "向量数据库",
    "milvus",
    "pinecone",
    "faiss",
    "chroma",
    "embedding",
    "embeddings",
    "fine-tuning",
    "fine tuning",
    "微调",
    "llm",
    "large language model",
    "大模型",
    "gpt",
    "transformer",
    "langchain",
    "llama-index",
    "function calling",
    "多模态",
    "multimodal",
    "vision",
  ];

  let missingHardSkills = 0;
  const matchedHardSkills: string[] = [];
  for (const skill of hardSkills) {
    if (jdLower.includes(skill)) {
      if (resumeLower.includes(skill)) {
        matchedHardSkills.push(skill);
      } else {
        missingHardSkills++;
      }
    }
  }

  // 【核心技能缺漏惩罚】每缺一项扣 8 分，超过 3 项上限 50
  if (missingHardSkills > 0) {
    const penalty = missingHardSkills * 8;
    sm = sm - penalty;
    if (missingHardSkills >= 3) {
      sm = Math.min(sm, 50);
    }
    sm = clamp(sm, 10, 100);
  }

  // 【无量化成果惩罚】
  const quantPattern =
    /(\d+[％%]|\d+\.?\d*\s*(万|千|k|m|用户|人|次|请求|数据|量|率))|\d{2,}[+]?/g;
  const quantMatches = resume.match(quantPattern);
  const quantCount = quantMatches ? quantMatches.length : 0;
  if (quantCount === 0) {
    ql = Math.min(ql, 50);
  } else if (quantCount <= 2) {
    ql = Math.min(ql, 65);
  }
  ql = clamp(ql, 5, 100);

  // 【经历层级熔断】
  const seniorKeywords = [
    "资深",
    "高级",
    "主任",
    "专家",
    "架构师",
    "负责人",
    "lead",
    "senior",
    "staff",
    "principal",
  ];
  const fresherKeywords = [
    "应届",
    "实习",
    "intern",
    "fresh",
    "graduate",
    "毕业生",
    "校招",
  ];
  const requiresSenior = seniorKeywords.some((k) =>
    jdLower.includes(k.toLowerCase())
  );
  const isFresher = fresherKeywords.some((k) =>
    resumeLower.includes(k.toLowerCase())
  );
  if (requiresSenior && isFresher) {
    er = Math.min(er, 55);
  }

  // 【口水话惩罚】
  const vagueWords = ["负责", "参与", "协助", "跟进", "推动", "协调"];
  let vagueCount = 0;
  for (const w of vagueWords) {
    const re = new RegExp(w, "g");
    const matches = resumeLower.match(re);
    if (matches) vagueCount += matches.length;
  }
  const hasQuantInProjects = quantCount >= 3;
  if (vagueCount >= 5 && !hasQuantInProjects) {
    er = clamp(er - 10, 5, 100);
    sm = clamp(sm - 5, 5, 100);
  }

  // 【分档强制约束】防止 LLM 给出 60-70 中间分
  const avgScore = (sm + er + ql) / 3;
  if (avgScore >= 62 && avgScore <= 72) {
    if (missingHardSkills >= 2 || quantCount <= 1) {
      sm = clamp(Math.min(sm, 58), 5, 100);
      er = clamp(Math.min(er, 62), 5, 100);
      ql = clamp(Math.min(ql, 55), 5, 100);
    } else if (matchedHardSkills.length >= 3 && quantCount >= 3) {
      sm = clamp(Math.max(sm, 78), 5, 100);
      er = clamp(Math.max(er, 75), 5, 100);
      ql = clamp(Math.max(ql, 72), 5, 100);
    }
  }

  sm = clamp(sm, 5, 100);
  er = clamp(er, 5, 100);
  ql = clamp(ql, 5, 100);

  const matchScore = Math.round(sm * 0.4 + er * 0.4 + ql * 0.2);

  raw.match_score = matchScore;
  raw.score_breakdown = {
    skill_match: sm,
    experience_relevance: er,
    quantification_level: ql,
  };
  raw.dimensions = {
    skill_match: sm,
    experience_relevance: er,
    quantification_level: ql,
  };

  raw._calibration_meta = {
    missing_hard_skills: missingHardSkills,
    matched_hard_skills: matchedHardSkills,
    quant_count: quantCount,
    vague_count: vagueCount,
    senior_fuse_applied: requiresSenior && isFresher,
  };

  // 补齐 summary
  if (!raw.summary || typeof raw.summary !== "string") {
    raw.summary =
      `综合匹配度 ${matchScore} 分。` +
      `技能对齐度 ${sm}，经历相关性 ${er}，量化成果度 ${ql}。` +
      (missingHardSkills > 0
        ? `JD 中 ${missingHardSkills} 项核心硬技能在简历中缺失，建议补齐。`
        : "") +
      (quantCount === 0
        ? "简历缺乏量化成果数据，需补充具体数字指标。"
        : "");
  }

  // 补齐 project_strategy
  if (
    !raw.project_strategy ||
    !Array.isArray(raw.project_strategy.recommended_additions)
  ) {
    raw.project_strategy = raw.project_strategy || {};
    raw.project_strategy.recommended_additions =
      raw.project_strategy.recommended_additions || [];
    raw.project_strategy.recommended_removals =
      raw.project_strategy.recommended_removals || [];
    raw.project_strategy.project_pivots =
      raw.project_strategy.project_pivots || [];
  }

  // 补齐 suggestions 的 type / category_tag 字段
  if (Array.isArray(raw.suggestions)) {
    for (const s of raw.suggestions) {
      if (!s.type) {
        s.type = String(s.original || "").includes("缺失")
          ? "section_addition"
          : "rewrite";
      }
      if (!s.category_tag) {
        if (s.type === "new_project_blueprint")
          s.category_tag = "🔥 推荐自建实战项目蓝图";
        else if (s.type === "section_addition")
          s.category_tag = "💡 关键板块补充";
        else s.category_tag = "✏️ 现有描述精修";
      }
    }
  }

  return raw as AnalysisResult;
}

/** 仅用于阶段二：补齐 suggestions 类型字段 */
function fixSuggestionsFields(arr: any[]): any[] {
  if (!Array.isArray(arr)) return [];
  for (const s of arr) {
    if (!s.type) {
      s.type = String(s.original || "").includes("缺失")
        ? "section_addition"
        : "rewrite";
    }
    if (!s.category_tag) {
      if (s.type === "new_project_blueprint")
        s.category_tag = "🔥 推荐自建实战项目蓝图";
      else if (s.type === "section_addition")
        s.category_tag = "💡 关键板块补充";
      else s.category_tag = "✏️ 现有描述精修";
    }
  }
  return arr;
}

/**
 * 智能清洗 summary 中的不一致分数
 *
 * 检测 summary 文本中出现的「XX分」「XX 百分」等数字分数，若与实际 match_score 不一致，
 * 自动替换为真实 match_score，确保圆环显示数字与摘要文字 100% 对齐一致。
 *
 * 同时若 summary 缺失分数而画像档位与实际 score 不符，会前置正确的档位标签。
 */
export function cleanSummaryMismatch(summary: string, matchScore: number): string {
  if (!summary || typeof summary !== "string") return summary || "";
  const score = Math.round(matchScore);
  const scoreStr = String(score);

  // 档位判定
  const correctBand =
    score >= 90
      ? "极致匹配型"
      : score >= 75
        ? "资深型"
        : score >= 55
          ? "潜力型"
          : score >= 30
            ? "弱匹配型"
            : "完全不对口型";

  // 1) 替换所有"N分"中的不一致分数
  // 匹配 0-100 后紧跟「分」的数字
  let cleaned = summary.replace(/(\d{1,3})\s*分/g, (full, numStr: string) => {
    const n = parseInt(numStr, 10);
    if (n >= 0 && n <= 100 && n !== score) {
      return `${scoreStr}分`;
    }
    return full;
  });

  // 2) 替换"N分"N/N百分 形式（仅当不一致）
  cleaned = cleaned.replace(
    /(\d{1,3})\s*(?:%|百分|百分点)/g,
    (full, numStr: string) => {
      const n = parseInt(numStr, 10);
      if (n >= 0 && n <= 100 && n !== score) {
        return `${scoreStr}%`;
      }
      return full;
    }
  );

  // 3) 若 summary 中已无任何「N分」字样，但开头出现错误档位（如「资深型」「极致匹配型」等），
  //    且与 score 不符，则替换档位为正确档位
  const bandPatterns: Array<{ pattern: RegExp; band: string }> = [
    { pattern: /极致匹配型?/, band: "极致匹配型" },
    { pattern: /资深型|资深潜力型/, band: "资深型" },
    { pattern: /潜力型|潜力应届型?/, band: "潜力型" },
    { pattern: /弱匹配型?/, band: "弱匹配型" },
    { pattern: /完全不对口型?|不匹配型?/, band: "完全不对口型" },
  ];

  const mentionedBand = bandPatterns.find((b) => b.pattern.test(cleaned));
  if (mentionedBand && mentionedBand.band !== correctBand) {
    // 替换为正确档位
    cleaned = cleaned.replace(mentionedBand.pattern, correctBand);
  }

  // 4) 若清洗后 summary 仍以非档位词开头但 match_score 极端（<30 或 ≥90），
  //    前置档位标签以强调一致性
  const startsWithBand = bandPatterns.some((b) =>
    new RegExp("^\\s*" + b.pattern.source).test(cleaned)
  );
  if (!startsWithBand && (score < 30 || score >= 90)) {
    cleaned = `${correctBand}：${cleaned.replace(/^[\u4e00-\u9fa5]+?[：:]/, "")}`;
  }

  return cleaned;
}

/**
 * 获取智谱 API Key
 * 优先级：VITE_ZHIPU_API_KEY 环境变量 → localStorage 缓存 → 默认值
 */
export function getApiKey(): string | null {
  // 1. Vite 构建期注入的环境变量（Cloudflare Pages 部署时配置）
  const fromEnv = (import.meta as any).env?.VITE_ZHIPU_API_KEY as
    | string
    | undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  // 2. 运行时 localStorage（用户可在设置中自定义）
  try {
    const cached = localStorage.getItem("zhipu_api_key");
    if (cached && cached.trim()) return cached.trim();
  } catch (_) {
    // localStorage 不可用（隐私模式等），忽略
  }

  // 3. 兜底：返回 null，由调用方提示用户配置
  return null;
}

/**
 * 保存用户自定义 API Key 到 localStorage
 */
export function saveApiKey(key: string): void {
  try {
    localStorage.setItem("zhipu_api_key", key.trim());
  } catch (_) {
    // ignore
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem("zhipu_api_key");
  } catch (_) {
    // ignore
  }
}

const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

// 轻量公共 fetch 封装：调用智谱 chat.completions，带模型回退
async function callZhipu(
  apiKey: string,
  {
    systemPrompt,
    userText,
    maxTokens,
    temp,
  }: { systemPrompt: string; userText: string; maxTokens: number; temp: number }
): Promise<{ content: string }> {
  const doFetch = async (model: string) =>
    fetch(ZHIPU_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
        temperature: temp,
        max_tokens: maxTokens,
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

  let resp: Response;
  try {
    resp = await doFetch("glm-4-flash");
  } catch (e: any) {
    throw new Error(
      `网络异常：无法连接到智谱 API（${e?.message || "未知错误"}）。请检查网络后重试。`
    );
  }
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(
        `智谱 API Key 无效或权限不足（HTTP ${resp.status}）。请检查 VITE_ZHIPU_API_KEY 配置。`
      );
    }
    let resp2: Response | null = null;
    try {
      resp2 = await doFetch("glm-4-flash-turbo");
    } catch (_) {
      /* ignore */
    }
    if (!resp2 || !resp2.ok) {
      const code = resp2 ? resp2.status : "timeout";
      throw new Error(
        `智谱 API 调用失败（主模型 ${resp.status} / 回退模型 ${code}）。请稍后重试。`
      );
    }
    resp = resp2;
  }

  const data = await resp.json().catch(() => null);
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    "";
  if (!content) throw new Error("智谱 API 返回内容为空，请稍后重试。");
  return { content };
}

// 真实阶段状态驱动：仅更新 status/detail；progress 不在此处硬跳，
// 改由 AgentPipeline 的 S-curve 平滑曲线统一驱动（避免进度条暴跳）
const PROGRESS_AUTO = -1;
function stage(
  cb: PipelineStageCallback | undefined,
  stageId: PipelineStageId,
  status: "pending" | "active" | "done",
  detail: string
): void {
  if (!cb) return;
  cb({ stageId, status, detail, progress: PROGRESS_AUTO });
}

function initStages(cb: PipelineStageCallback | undefined): void {
  stage(cb, 1, "active", PIPELINE_STAGES[0].activeText);
  stage(cb, 2, "pending", "");
  stage(cb, 3, "pending", "");
  stage(cb, 4, "pending", "");
}

// 返回用于 Types.Suggestion 的类型
type SuggestionArray = AnalysisResult["suggestions"];

export interface Phase1Result {
  match_score: number;
  score_breakdown: { skill_match: number; experience_relevance: number; quantification_level: number };
  dimensions: { skill_match: number; experience_relevance: number; quantification_level: number };
  summary: string;
  missing_keywords: string[];
  project_strategy: AnalysisResult["project_strategy"];
  _calibration_meta?: AnalysisResult["_calibration_meta"];
}

/**
 * 阶段一 · 宏观人岗对齐诊断（Fast <3s）
 * 真实 Promise 驱动节点 1/2/3 的 active → done。
 */
export async function analyzePhase1(
  resume: string,
  jd: string,
  extraProjects: string,
  onPipelineStage?: PipelineStageCallback
): Promise<Phase1Result> {
  initStages(onPipelineStage);
  // 阶段1请求开始：节点1 active，并激活节点2/3 pending→active（语义比对并行在LLM内）
  stage(onPipelineStage, 1, "active", PIPELINE_STAGES[0].activeText);
  stage(onPipelineStage, 2, "active", PIPELINE_STAGES[1].activeText);
  stage(onPipelineStage, 3, "active", PIPELINE_STAGES[2].activeText);

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "未配置智谱 API Key。请在环境变量 VITE_ZHIPU_API_KEY 中设置，或在浏览器中通过设置面板配置。"
    );
  }

  const userText = [
    "【简历原文】",
    resume.trim(),
    "",
    "【目标岗位 JD】",
    jd.trim(),
    "",
    "【额外素材（可选）】",
    extraProjects.trim() || "（无）",
  ].join("\n");

  const t0 = Date.now();
  const { content } = await callZhipu(apiKey, {
    systemPrompt: PHASE1_PROMPT,
    userText,
    maxTokens: 2400,
    temp: 0.22,
  });

  const parsed = extractJson(content);
  if (!isValidPhase1Result(parsed)) {
    console.error("[aiService][P1] 无效JSON:", content.slice(0, 300));
    throw new Error("阶段一诊断返回格式异常，请重试。");
  }

  // 前端校准：真实校准 _calibration_meta
  const calibrated = calibrateScores(
    {
      ...parsed,
      suggestions: [], // 占位避免 calibrateScores 内部 fallback 报警
    },
    resume,
    jd
  );
  // 节点 1/2/3 微步级联打勾（400ms 间隔），填真实数据
  // 节点 1 立即完成；节点 2 延迟 400ms；节点 3 延迟 800ms
  const kw = calibrated.missing_keywords.length;
  stage(onPipelineStage, 1, "done", `已提取 ${Math.max(3, kw)} 个硬技能与门槛指标`);
  const adds = Math.max(
    1,
    calibrated.project_strategy.recommended_additions.length +
      calibrated.project_strategy.project_pivots.length
  );
  window.setTimeout(
    () => stage(onPipelineStage, 2, "done", `发现 ${adds} 个高 ROI 置换项目`),
    400
  );
  const meta = calibrated._calibration_meta;
  const fuseCount =
    (meta?.senior_fuse_applied ? 1 : 0) +
    ((meta?.missing_hard_skills ?? 0) > 0 ? 1 : 0) +
    ((meta?.quant_count ?? 3) === 0 ? 1 : 0) +
    ((meta?.vague_count ?? 0) >= 5 ? 1 : 0) +
    1;
  window.setTimeout(
    () => stage(onPipelineStage, 3, "done", `命中 ${Math.min(6, fuseCount)} 项规则约束`),
    800
  );

  // 把 suggestions 占位字段清掉再返回（避免污染）
  const { suggestions: _ignored, ...rest } = calibrated;
  console.log(
    `[aiService][P1] 完成 ${Date.now() - t0}ms  score=${rest.match_score}`
  );
  return rest as Phase1Result;
}

/**
 * 阶段二 · 深度 STAR 行动建议体系（~8s）
 * 真实 Promise 驱动节点 4 的 active → done。
 * 必须传入 phase1Result 画像上下文，作为分流依据。
 */
export async function analyzePhase2(
  resume: string,
  jd: string,
  extraProjects: string,
  phase1Result: Phase1Result | null,
  onPipelineStage?: PipelineStageCallback
): Promise<SuggestionArray> {
  // 节点4立即激活（用户发起阶段二并行请求时）
  stage(onPipelineStage, 4, "active", PIPELINE_STAGES[3].activeText);

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "未配置智谱 API Key。请在环境变量 VITE_ZHIPU_API_KEY 中设置，或在浏览器中通过设置面板配置。"
    );
  }

  const score = phase1Result?.match_score ?? 0;
  const dims = phase1Result?.dimensions ?? null;
  const missing = phase1Result?.missing_keywords ?? [];
  const addList =
    phase1Result?.project_strategy?.recommended_additions ?? [];
  const pivotList =
    phase1Result?.project_strategy?.project_pivots ?? [];
  const strategySummary = [
    ...addList.map((x) => `增补: ${x.project_name}(${x.why_add || ""})`),
    ...pivotList.map((x) => `重构: ${x.project_name}(${x.pivot_advice || ""})`),
  ].join("；");

  const userText = [
    "【画像诊断结果（分流依据，请严格遵守数量/类型配比）】",
    JSON.stringify(
      {
        match_score: score,
        dimensions: dims,
        missing_keywords: missing,
      },
      null,
      0
    ),
    "",
    "【战略看板摘要（便于P2对齐）】",
    strategySummary || "（无）",
    "",
    "【简历原文】",
    resume.trim(),
    "",
    "【目标岗位 JD】",
    jd.trim(),
    "",
    "【额外素材（可选）】",
    extraProjects.trim() || "（无）",
  ].join("\n");

  const t0 = Date.now();
  const { content } = await callZhipu(apiKey, {
    systemPrompt: PHASE2_PROMPT,
    userText,
    maxTokens: 6144,
    temp: 0.26,
  });

  const parsed = extractJson(content);
  if (!isValidSuggestionsOnly(parsed)) {
    // 兼容：LLM 误返回整份 AnalysisResult（含 match_score）时，剥出 suggestions
    const anyParsed = parsed as any;
    if (
      anyParsed &&
      Array.isArray((anyParsed as any).suggestions) &&
      (anyParsed as any).suggestions.length > 0
    ) {
      const fixed = fixSuggestionsFields((anyParsed as any).suggestions);
      stage(onPipelineStage, 4, "done", "✅ 病灶分流处方生成完成");
      console.log(
        `[aiService][P2] fallback-compat 完成 ${Date.now() - t0}ms  suggestions=${fixed.length}`
      );
      return fixed as SuggestionArray;
    }
    console.error("[aiService][P2] 无效JSON:", content.slice(0, 400));
    throw new Error("阶段二建议返回格式异常，请重试。");
  }

  const fixed = fixSuggestionsFields(parsed.suggestions);
  stage(onPipelineStage, 4, "done", "✅ 病灶分流处方生成完成");
  console.log(
    `[aiService][P2] 完成 ${Date.now() - t0}ms  suggestions=${fixed.length}`
  );
  return fixed as SuggestionArray;
}

/**
 * 合并式兼容 API（保持原有调用者不破）：P1 + P2 串行合并
 */
export async function analyzeResume(
  resume: string,
  jd: string,
  extraProjects: string,
  onPipelineStage?: PipelineStageCallback
): Promise<AnalysisResult> {
  const p1 = await analyzePhase1(resume, jd, extraProjects, onPipelineStage);
  const suggestions = await analyzePhase2(
    resume,
    jd,
    extraProjects,
    p1,
    onPipelineStage
  );
  return {
    ...p1,
    suggestions,
  } as AnalysisResult;
}
