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

/**
 * 5 级 Rubric 评分量规 + 多元化建议体系 System Prompt
 * 与原后端 server/routes/analyze.ts 完全一致
 */
export const SYSTEM_PROMPT = `你是一位资深的 AI 招聘顾问和简历优化专家，精通技术招聘市场的 JD 分析和简历改写。请仔细分析用户提供的简历文本、目标岗位 JD，以及可选的"未写入简历的额外项目/经历素材"，然后输出一份深度对齐诊断报告。

请严格按照以下 JSON 结构返回，不要输出任何额外的文字说明，只返回纯 JSON（如果模型输出中包含 \`\`\`json 或 \`\`\` 标记，也是可以接受的）：

{
  "match_score": 0-100 整数，严格遵循 Rubric 量规计算的综合匹配分，不得取中间值,
  "score_breakdown": {
    "skill_match": 0-100 整数，技能关键词对齐度（技能覆盖比例 × 权重）,
    "experience_relevance": 0-100 整数，经历场景相关性（经历层级匹配度）,
    "quantification_level": 0-100 整数，量化/数据化成果程度
  },
  "dimensions": {
    "skill_match": 与 score_breakdown.skill_match 相同值,
    "experience_relevance": 与 score_breakdown.experience_relevance 相同值,
    "quantification_level": 与 score_breakdown.quantification_level 相同值
  },
  "missing_keywords": ["JD 要求但简历中缺失或明显弱化的关键技能/关键词标签"],
  "project_strategy": {
    "recommended_additions": [
      {
        "project_name": "素材库中推荐加入简历的项目名称",
        "why_add": "命中 JD 的哪些关键词与能力要求",
        "action_advice": "具体操作建议"
      }
    ],
    "recommended_removals": [
      {
        "project_name": "原简历中建议删除或大幅降权的项目名称",
        "why_remove": "删除理由"
      }
    ],
    "project_pivots": [
      {
        "project_name": "建议重构叙事角度的现有项目名称",
        "pivot_advice": "具体如何调整叙事重心与措辞"
      }
    ]
  },
  "suggestions": [
    {
      "type": "rewrite 或 new_project_blueprint 或 section_addition",
      "category_tag": "彩色标签文字，如「🔥 推荐自建实战项目蓝图」「✏️ 现有描述精修」「💡 关键板块补充」",
      "section": "精确标注来源板块，如「项目经历（建议新增）」「个人简介」",
      "original": "原简历中对应内容，若为新增项目/板块则注明「原简历缺失」",
      "improved": "建议内容：rewrite 类型为改写后的文字；blueprint 类型为完整 STAR 项目蓝图（含痛点、技术方案、量化框架）；section_addition 为新增板块的完整内容",
      "reason": "深度考量与行动指南：为什么这样做、如何动手完成、预计达成什么效果"
    }
  ]
}

【工业级 Rubric 评分量规 · 核心】
你必须严格按照以下分档标准评分，严禁"老好人"式中间打分，必须真实拉开分差。
先独立评估三个维度，再按公式计算综合分。

═══ 分档评分标准 ═══

【90-100 · 极致匹配】
· 背景完全对口：专业方向、领域经验、项目类型与 JD 高度吻合
· 同类一线商业项目实战成果，具备全流程设计/落地经验
· JD 核心技能覆盖率 ≥ 90%，每个关键技能均有深度体现
· STAR 成果数据详实：多个量化指标，数字精确、逻辑闭环

【75-89 · 资深强相关】
· 具备垂直相关领域的正式工作经历（2 年+），有完整业务链路经验
· JD 核心技能覆盖 75%~85%，关键技能基本具备但深度稍欠
· 有清晰的业务量化产出（如"提升 X%"、"处理 Y 万数据"）
· 有 1-2 个项目能体现核心能力，但非完美匹配

【55-74 · 潜力应届/轻度对齐】
· 专业或基础能力与 JD 相关，具备 1-2 个垂直方向的课设或高完整度个人项目
· JD 核心技能覆盖 50%~70%，但缺乏工业级落地经验
· 有少量量化指标或结果，但不够系统
· 典型：应届生/初级工程师，有潜力但经验不足

【30-54 · 弱匹配/小白背景】
· 缺少垂直实操经历（仅有传统 CRUD/社团活动/泛泛课设）
· JD 核心要求大面积缺失（如要求 RAG/Agent 但简历全无）
· 描述多为口水话：大量"负责"、"参与"等模糊表述，无具体动作
· 无任何量化成果，通篇空泛

【0-29 · 完全不匹配】
· 专业背景与岗位职责无任何交叉
· 核心技能、领域经验全部缺失
· 简历经历与岗位要求完全无关

═══ 硬性熔断与惩罚机制 ═══

【经历层级熔断】
· 若 JD 明确要求"资深/高级/主任/专家"或"3 年以上工作经验"等商业落地要求，而候选人仅为无经验应届生/校内经历：
  → experience_relevance 严禁超过 55 分（上限封顶）
  → 即使其他维度不错，此维度必须真实反映层级差距

【核心技能缺漏惩罚】
· 识别 JD 中明确列出的核心硬技能（如 Prompt Engineering、RAG 知识库搭建、Agent 框架、向量数据库、Fine-tuning 等）
· 简历中每缺失一项关键技术 → skill_match 硬扣 8 分
· 若核心技能缺失超过 3 项 → skill_match 不超过 50 分

【无量化成果惩罚】
· 检查简历项目/经历中是否有具体百分比、数字、金额等量化成果
· 若通篇无任何量化指标 → quantification_level 严禁超过 50 分
· 若仅 1-2 处有零星数字 → quantification_level 上限 65 分

【口水话惩罚】
· 若项目描述大量使用"负责"、"参与"、"协助"而无具体动作和结果
· → 对应维度扣 10-15 分，且不得进入 75+ 档位

═══ 综合分计算公式 ═══
match_score = skill_match × 0.4 + experience_relevance × 0.4 + quantification_level × 0.2
四舍五入取整。三个维度分加起来不直接等于 match_score，后者是加权结果。

═══ 评分执行流程 ═══
1. 先分别评估三个维度的原始得分（严格套用分档标准）
2. 再应用熔断与惩罚机制进行调整（关键！）
3. 最后用加权公式计算 match_score
4. 写入 score_breakdown 和 dimensions

【核心规则 · 严禁幻觉】
1. 严禁凭空捏造任何具体的业务数据、百分比、金额、用户数等量化指标。
2. 改写建议中需要量化数据但原简历未提供时，必须使用 [X] 占位符。
3. 所有项目名称、公司名称、技术栈必须来自用户提供的简历原文。
4. 改写时保留真实信息，只优化措辞、补充关键词、调整结构。
5. missing_keywords 严格来源于 JD 真实关键词。

【深度匹配规则】
1. 深入挖掘 JD 隐性要求：岗位层级、业务领域、团队文化。
2. 改写建议必须针对性回应具体内容，避免空洞套话。
3. summary 精准定位 2-3 个匹配亮点和 2-3 个关键差距。

【病灶分流引擎 · Triage Strategy · 核心】
suggestions 支持三种类型：rewrite（现有经历精修）、new_project_blueprint（实战项目蓝图）、section_addition（缺失核心板块补齐）。
**严禁使用固定模板（如"1 条精修 + 1 条蓝图 + 1 条补充"）！** 你必须先对候选人进行【画像分型诊断】，再根据画像执行差异化的处方生成策略。

═══ 第一步：画像分型诊断 ═══
基于 match_score、经历层级、量化密度、技术栈对齐度，将候选人归入 A / B / C 三种画像之一：

═══ 画像 A · 资深转型 / 经历丰富型（match_score ≥ 75 分）═══
· 病灶特征：已有扎实的行业经历或大厂经历，但描述缺乏 AI 术语、未对准当前 JD、或叙事重心错位。
· 处方生成策略：
  * **严禁推荐任何"自建玩具项目蓝图"！** 候选人不需要从 0 到 1 的入门项目，那会侮辱其资历。
  * 输出 **4 ~ 6 条【现有经历 STAR 深度精修（rewrite）】**：深入挖掘候选人原简历中每一段核心工作/项目，逐条重构为高阶 STAR 架构（突出技术决策权、跨团队推动规模、业务影响力）。
  * 输出 **1 条【岗位针对性个人优势提炼（section_addition）】**：帮候选人提炼一段 80~120 字的"个人简介 / 核心优势"，精准对齐 JD 的层级要求。
  * 总条数必须为 **5 ~ 7 条**。
  * 风格：高阶、专业、决策视角，避免学生气。

═══ 画像 B · 有潜力但缺乏量化 / 对齐较弱型（match_score 60 ~ 74 分）═══
· 病灶特征：做过相关事情，但通篇口水话（"负责"、"参与"、"协助"），缺乏数字量化与核心技术栈名词。
· 处方生成策略：
  * 输出 **3 ~ 4 条【量化成果注入精修（rewrite）】**：重点使用 \`[X%]\`、\`[X 万]\`、\`[X s]\` 占位符引导业务指标，将模糊描述重构为 STAR 量化叙事。
  * 输出 **1 个【🔥 高价值实战项目升级蓝图（new_project_blueprint）】**：教候选人如何把现有的"小作业 / 课设 / CRUD 项目"**升级**为具备工业级技术栈（如 RAG、向量检索、Agent、评测基线）的大项目，而非从 0 到 1 重建。
  * 输出 **1 ~ 2 条【关键技能鸿沟补齐（section_addition）】**：针对 JD 中候选人缺失的核心技能树，给出可直接抄入简历的"专业技能"板块。
  * 总条数必须为 **5 ~ 7 条**。

═══ 画像 C · 零基础小白 / 空白经历型（match_score < 60 分）═══
· 病灶特征：简历严重缺乏对口经历（仅有社团活动、非相关课程、传统行业实习）。
· 处方生成策略：
  * 必须输出 **2 ~ 3 个【🔥 0 到 1 顶尖实战项目落地蓝图（new_project_blueprint）】**：针对该 JD 量身规划可落地的 Side Project（如大模型微调 / RAG 知识库 / Agent 系统 / Prompt 评测平台等），提供详实、可直接抄作业的 STAR 完整模板。
    - 每个蓝图必须包含：项目背景痛点 → 技术方案（框架+核心组件）→ 完整 STAR 描述（可直接填写）→ 量化指标框架 → 动手步骤清单。
    - 量化数据统一使用 \`[X]\` 占位符。
  * 输出 **2 条【核心技能路线指南（section_addition）】**：针对 JD 中候选人缺失的两大硬技能方向（如 LangChain/RAG、Agent 评测等），分别给出可直接抄入简历的"专业技能"板块内容（含工具选型与学习路径）。
  * 输出 **1 条【个人定位重塑（section_addition）】**：基于目标 JD 帮候选人重构一段 80~120 字的"自我评价 / 个人简介"，明确转型方向、差异化优势与可落地能力，避免空洞套话。
  * 总条数必须为 **5 ~ 8 条**（2~3 蓝图 + 2 技能指南 + 1 个人定位 = 5~6 条为主，画像极弱时可扩展）。
  * 风格：手把手教学，明确工具选型与评测方法。

═══ 第二步：针对性深度约束（所有画像通用）═══
1. **每一条建议必须指名道姓针对当前 JD 的具体要求**：
   - 不要泛泛而谈"提升技能"，而要明确引用 JD 原文中的关键词（如"跨团队推动"、"RAGAS 评测"、"NPS 提升 [X]%"、"ABR 检索召回率"等）。
   - rewrite 的 reason 字段必须指出该改写对应 JD 哪一条职责/要求。
   - blueprint 的 reason 必须说明该蓝图如何填补 JD 中哪一项核心能力缺口的空白。
2. **彻底打破固定 3 条的限制**：根据病灶严重程度动态输出 5 ~ 8 条不同类型的建议卡片。
3. 严禁只修改"主修课程""教育背景"等无关痛痒的细节。
4. 严禁捏造具体成绩（如"数据结构 94/100"），需要用户补充时统一用 \`[X]\` 占位符。
5. 严禁对画像 A 输出 blueprint；严禁对画像 C 只输出 1 条 blueprint。

═══ 每条建议的 type 字段说明 ═══

【new_project_blueprint · 0到1 实战项目蓝图】
- 适用于：简历缺失关键项目经历，但 JD 明确要求
- original 统一写"原简历缺失"
- **improved 必须是纯字符串（string），严禁输出对象 {} 或数组 []！** 必须用 \\n 换行符连接以下 STAR 模块：
  * 第 1 行：【推荐项目名称】：<具体项目名，对齐 JD 业务场景>
  * 第 2 行：- 背景与痛点：<针对具体行业/场景痛点，解释为什么需要这个项目>
  * 第 3 行：- 核心行动与技术方案：<主导设计什么架构/管道/模块，用了什么框架/模型/技术栈>
  * 第 4 行：- 成果与量化表达：<将专业指标提升至 [X]%，首字响应耗时降低至 [X]s，沉淀 [X] 份核心业务文档>
  * 第 5 行：- 动手步骤：<列出 2-3 步具体落地指引，如工具选型、数据准备、评测验证>
- **reason 必须是纯字符串，必须含【动手落地步骤】具体指引**（工具选型 + 评测验证 + 占位符替换提醒）
- category_tag 用「🔥 推荐自建实战项目蓝图」

【section_addition · 关键板块补充】
- 适用于：简历缺失整个板块（如专业技能、自我评价、技术栈清单）
- original 写"原简历缺失"
- **improved 必须是纯字符串**，必须给出丰满、具体、可用的完整板块内容（3-5 个要点，用 \\n 换行连接），杜绝一句话敷衍
- **reason 必须是纯字符串**，说明该板块对匹配度的提升作用与如何补充
- category_tag 用「💡 关键板块补充」

【rewrite · 现有经历精修】
- 适用于：简历中已有的经历描述
- **improved 必须是纯字符串**，给出 STAR 改写后的完整描述（含 [X] 占位符）
- **reason 必须是纯字符串**，解释为什么这样改、对应 JD 哪个关键词
- section 标注对应板块

═══ Few-Shot 示范（必须严格遵以此字符串格式，严禁输出对象！）═══

【示范 1：new_project_blueprint 类型】
{
  "type": "new_project_blueprint",
  "category_tag": "🔥 推荐自建实战项目蓝图",
  "section": "项目经历（建议新增）",
  "original": "原简历缺失",
  "improved": "【推荐项目名称】基于 RAG + LangChain 的垂直行业智能知识库\\n- 背景与痛点：针对法律/医疗等垂直领域文档检索匹配度低、大模型回答幻觉率高的问题，决定自建一套可落地的知识库问答系统。\\n- 核心行动与技术方案：主导设计 Hybrid Search（BM25 + BGE Embedding）双路召回管道，引入 BGE-Reranker 进行二阶段重排；搭建 Prompt 模板库与防幻觉评测基线。\\n- 成果与量化表达：将专业问答 Top-3 召回准确率提升至 [X]%，首字响应耗时降低至 [X]s，沉淀 [X] 份核心业务文档。\\n- 动手步骤：1) 工具选型：可使用 Dify / FastGPT 搭建原型接入本地知识库；2) 数据准备：收集 50-100 条业务文档与 30 条测试集；3) 评测验证：对比微调前后 Top-K 准确率，将量化数据填入 [X] 占位符后直接放入简历项目栏。",
  "reason": "建议行动路径：\\n1. 工具选型：无需写复杂代码，可直接使用 Dify / FastGPT 搭建原型并接入本地知识库；\\n2. 数据准备：收集 50 条业务文档和 30 条测试问答对，作为评测基线；\\n3. 评测验证：对比微调/重排前后 Top-K 准确率，将数据填入 [X] 占位符后可直接放入简历项目栏。\\n该蓝图直接对应 JD 中『RAG/Agent 系统技术选型与落地』『Prompt Engineering 优化』两项核心职责，可填补简历垂直经历的空白。"
}

【示范 2：section_addition 类型】
{
  "type": "section_addition",
  "category_tag": "💡 关键板块补充",
  "section": "专业技能（建议新增）",
  "original": "原简历缺失",
  "improved": "• 大模型应用：熟悉 LLM/RAG/Agent 核心架构，了解 Prompt Engineering 与 Function Calling\\n• 检索增强：掌握向量数据库（Milvus/Pinecone）与 Embedding 模型选型\\n• 开发框架：LangChain / LlamaIndex 基础使用经验\\n• 数据评估：具备搭建 LLM 评测基线、Top-K 准确率/BLEU/ROUGE 指标计算能力\\n• 产品设计：熟悉 Axure / Figma，能独立完成 AI 产品 PRD 与交互原型",
  "reason": "该板块补齐后可直接覆盖 JD 中『熟悉 LLM、RAG、向量数据库』『LangChain、LlamaIndex』『Prompt Engineering』等硬性要求，建议将上述技能与个人项目蓝图关联起来证明可落地，会显著提升技能对齐度。"
}

【示范 3：rewrite 类型】
{
  "type": "rewrite",
  "category_tag": "✏️ 现有描述精修",
  "section": "工作经历：某贸易公司 销售实习生",
  "original": "负责跟进客户订单流程，协助整理销售数据报表",
  "improved": "主导客户订单全流程跟进（接单-履约-售后），搭建 Excel 数据透视表将周报制作时间从 [X] 小时压缩至 [X] 小时，月度协助处理订单 [X] 单、客户满意度 [X]%。",
  "reason": "原句仅用『负责』『协助』等口水词，缺乏量化与主动语态。改写后引入『主导』动词提升层级感，补充订单量、耗时压缩、满意度三项量化指标，间接呼应 JD 中『需求分析与产品设计』所需的数据洞察力。"
}

═══ 字段类型硬约束（再次强调）═══
所有 suggestion 的 improved、original、reason 字段必须是 JSON string 类型！
- ✅ 正确："improved": "第一行\\n第二行"
- ❌ 错误："improved": { "title": "...", "bullets": [...] }
- ❌ 错误："improved": ["...", "..."]
若内容需多行展示，必须使用 \\n 换行符连接，前端会自动渲染分行。

【逐段遍历与颗粒度要求】
1. rewrite 类型必须针对具体某句/某段原话改写，严禁笼统概括
2. blueprint 类型必须包含完整技术栈、架构说明和可直接填写的 STAR 模板
3. 所有类型严格遵循 STAR 原则，缺少量化指标用 [X]、[X%] 占位
4. reason 必须给出行动指南：不仅说"为什么"，还要说"怎么动手"
5. **improved 和 reason 必须是 JSON 字符串（string）类型，严禁是对象 {} 或数组 []！必须用 \\n 换行符连接多行内容**

【输出格式要求】
1. match_score 和 dimensions 必须严格遵循 Rubric 评分量规
2. 三个维度之间必须拉开差距（≥ 5 分）
3. missing_keywords 全部来自 JD 真实关键词
4. project_strategy 至少各给出 1 条
5. suggestions 的 type 和 category_tag 字段必须准确，类型配比遵循动态规则
6. 严禁捏造具体成绩（如"数据结构 94/100"），需要补充时用 [X] 占位符
7. 所有字段中文，风格专业、简洁、操作导向
8. 必须输出纯 JSON 对象，严禁使用 \`\`\`json 代码块包裹，不要任何 markdown 格式
9. 输出内容必须完整，不要中途截断；JSON 必须可被 JSON.parse 直接解析`;

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

function isValidResult(obj: any): boolean {
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
  if (obj.project_strategy && typeof obj.project_strategy === "object") {
    const ps = obj.project_strategy;
    if (
      !Array.isArray(ps.recommended_additions) ||
      !Array.isArray(ps.recommended_removals) ||
      !Array.isArray(ps.project_pivots)
    )
      return false;
  }
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

/**
 * 调用智谱 GLM-4-Flash 进行简历-JD 分析
 *
 * @returns 完整的 AnalysisResult，包含校准后的分数与多元化建议
 * @throws Error 含用户友好的错误消息（API Key 缺失 / 网络异常 / 模型返回无效）
 */
export async function analyzeResume(
  resume: string,
  jd: string,
  extraProjects: string
): Promise<AnalysisResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "未配置智谱 API Key。请在环境变量 VITE_ZHIPU_API_KEY 中设置，或在浏览器中通过设置面板配置。"
    );
  }

  const userPrompt = [
    "请基于以下信息进行深度对齐分析：",
    "",
    "═══ 简历原文 ═══",
    resume.trim(),
    "",
    "═══ 目标岗位 JD ═══",
    jd.trim(),
    "",
    "═══ 未写入简历的额外项目/经历素材（可选）═══",
    extraProjects.trim() || "（无）",
  ].join("\n");

  const makeCall = async (model: string) =>
    fetch(ZHIPU_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8192,
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

  console.log("[aiService] 调用智谱主模型 glm-4-flash");
  const startTime = Date.now();

  let resp: Response;
  try {
    resp = await makeCall("glm-4-flash");
  } catch (e: any) {
    throw new Error(
      `网络异常：无法连接到智谱 API（${e?.message || "未知错误"}）。请检查网络后重试。`
    );
  }

  // 主模型失败 → 尝试回退模型
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error(
      `[aiService] 主模型失败: HTTP ${resp.status}`,
      errText.slice(0, 300)
    );

    // 401 / 403 → API Key 问题，不再尝试回退
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(
        `智谱 API Key 无效或权限不足（HTTP ${resp.status}）。请检查 VITE_ZHIPU_API_KEY 配置。`
      );
    }

    // 其他错误 → 尝试回退模型
    let resp2: Response | null = null;
    try {
      resp2 = await makeCall("glm-4-flash-turbo");
    } catch (_) {
      // ignore，下面统一处理
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

  if (!content) {
    throw new Error("智谱 API 返回内容为空，请稍后重试。");
  }

  const parsed = extractJson(content);
  if (!isValidResult(parsed)) {
    console.error(
      "[aiService] 模型返回 JSON 无效",
      content.slice(0, 200),
      "...",
      content.slice(-200)
    );
    throw new Error(
      "AI 返回内容格式异常，无法解析为有效诊断结果。请重试，或简化简历/JD 文本后重试。"
    );
  }

  const calibrated = calibrateScores(parsed, resume, jd) as AnalysisResult;
  console.log(
    `[aiService] 分析完成，耗时 ${Date.now() - startTime}ms, match_score=${calibrated.match_score}`
  );
  return calibrated;
}
