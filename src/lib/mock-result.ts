import type { AnalysisResult } from "./types";

export const mockAnalysisResult: AnalysisResult = {
  match_score: 72,
  summary:
    "候选人具备扎实的 B 端产品功底与 0-1 落地经验，但在 AI/大模型领域的专业度展示不足。核心差距在于：简历未体现对 LLM、RAG、Agent 等技术栈的理解与实践，建议用 Side Project 的 RAG 项目置换掉相对通用的 A/B 实验平台，并重构所有项目叙事围绕「AI 产品能力」展开。",
  dimensions: {
    skill_match: 58,
    experience_relevance: 75,
    quantification_level: 82,
  },
  missing_keywords: [
    "LLM",
    "RAG",
    "Agent",
    "Prompt Engineering",
    "Embedding",
    "Vector DB",
    "LangChain",
    "Milvus",
    "多模态",
    "Fine-tuning",
    "模型评估",
    "AI 安全性",
  ],
  project_strategy: {
    recommended_additions: [
      {
        project_name: "RAG 知识库检索优化系统（Side Project）",
        why_add:
          "完美命中 JD 中 RAG、向量数据库、LangChain、模型评估体系等核心要求，是当前最能撬动面试机会的项目。",
        action_advice:
          "建议替换原简历中「用户增长 A/B 实验平台」项目，放在项目经历的第一条，重点突出 Chunking 策略、HyDE 查询增强、Rerank 二阶段重排、RAGAS 评估流水线等技术细节。",
      },
      {
        project_name: "全国大学生 AI 创新大赛 · 智能诊疗助手",
        why_add:
          "体现了多模态大模型的产品设计经验和团队协作能力，是加分项中「多模态」「AI 比赛」的强佐证。",
        action_advice:
          "可作为补充项目放在最后，篇幅控制在 2-3 行，强调「产品负责人」身份和 87% 准确率的量化结果。",
      },
    ],
    recommended_removals: [
      {
        project_name: "用户增长 A/B 实验平台",
        why_remove:
          "该项目偏通用增长方向，与 AI 产品经理 JD 的核心要求（LLM/RAG/Agent）关联度低，占用了宝贵的项目版面。其量化成果（30+ 实验并行、效率提升 3 倍）可以浓缩为 1 句话合并到工作经历中。",
      },
    ],
    project_pivots: [
      {
        project_name: "企业知识管理系统 V2",
        pivot_advice:
          "将叙事重心从「功能设计」转向「AI 能力预埋」。强调：1）全文检索模块如何为后续接入向量检索 + RAG 做了架构预留；2）权限体系与 AI 回答引用溯源的结合点；3）如果重来会如何引入 LLM 重构问答体验。用「AI 产品思维」包装传统项目。",
      },
      {
        project_name: "协作文档（在线表格模块重构）",
        pivot_advice:
          "把「加载速度提升 40%」的成果保留，但新增 1-2 句关于 AI 功能的思考：例如曾探索用 LLM 做公式智能推荐、自然语言转公式等 POC，验证了用户付费意愿。展示你在现有工作中已经主动拥抱 AI。",
      },
    ],
  },
  suggestions: [
    {
      section: "个人简介",
      original:
        "3 年互联网产品经理经验，专注 B 端 SaaS 产品设计，主导过 2 款千万级 ARR 产品从 0 到 1 落地。具备较强的用户调研、需求分析和项目推进能力，熟悉 OKR 管理方法。",
      improved:
        "3 年 B 端产品经验，其中 1 年+ 深度聚焦 AI/大模型应用方向。主导过千万级 ARR SaaS 产品 0-1 落地，具备 RAG 知识库系统、Prompt 体系搭建等 AI 产品实战经验（GitHub 开源 1.2k Stars）。擅长将 LLM 能力与业务场景结合，用数据驱动的方法验证 AI 产品价值。",
      reason:
        "第一句即锚定「AI 产品」定位，用 Side Project 的真实成果作为背书，同时呼应 JD 中「数据驱动」「与算法团队协作」等关键词。",
    },
    {
      section: "工作经历 - XX科技 · 协作文档",
      original:
        "主导在线表格模块重构，加载速度提升 40%，用户满意度 NPS 从 32 上升至 58",
      improved:
        "主导在线表格模块重构（性能 +40%，NPS 32→58）；同步探索 AI 功能 POC：主导「自然语言转 Excel 公式」功能设计，基于 Prompt Engineering 实现 82% 的 top-3 准确率，用户调研显示 68% 付费意愿，为 V3 版本 AI 能力路线图提供依据。",
      reason:
        "保留原有量化成果的同时，植入 AI 产品思维与 Prompt Engineering 实战，击破 JD 中「设计 AI 产品核心交互流程」「Prompt Engineering 实践」的要求。",
    },
    {
      section: "技能标签",
      original:
        "产品设计、需求分析、Axure、Figma、SQL、数据分析、用户调研、SaaS、B端产品",
      improved:
        "AI 产品设计｜RAG/LLM 应用｜Prompt Engineering｜LangChain｜Milvus｜A/B 实验｜SQL/Python 数据分析｜Figma/Axure｜SaaS 0-1 搭建",
      reason:
        "用「|」分隔并按优先级排序，将 AI 相关技能前置并加粗视觉权重，直接命中 JD 技能关键词，提升 ATS 系统和人工初筛的通过率。",
    },
  ],
};
