# 🚀 JobFit AI · 智能人岗深度对齐与简历战略优化工作台

> **基于大语言模型（LLM）构建的下一代 AI 原生求职决策顾问。**
> 突破传统 AI 工具单一的"语句润色"局限，通过**经历素材库挖掘、工业级 Rubric 评分量规、病灶自适应分流与防幻觉机制**，实现简历信息密度与人岗匹配 ROI 的最大化。

[![Live Demo](https://img.shields.io/badge/Live_Demo-在线体验-blue?style=for-the-badge&logo=cloudflare)](https://jobfit-ai-e15.pages.dev/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18_+_Vite_+_TailwindCSS-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![LLM](https://img.shields.io/badge/LLM-Zhipu_GLM--4--Flash-4E75EC?style=for-the-badge)](https://open.bigmodel.cn/)
[![Deploy](https://img.shields.io/badge/Deploy-Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare)](https://pages.cloudflare.com/)

🔗 **线上体验地址**： <https://jobfit-ai-e15.pages.dev/>

---

## 📖 产品背景与痛点洞察 (Problem Statement)

在当今招聘市场中，求职者海投回复率低，往往面临三大核心困境：

1. **经历取舍两难（一页纸空间约束）**：求职者沉淀了诸多副业、竞赛、项目经历，但不知道哪些与目标 JD 强匹配，导致低价值经历浪费版面；
2. **AI 工具的"老好人偏差"与"无米之炊困境"**：市面上的通用润色工具打分虚高、千篇一律；且对经历空白的初级小白只能敷衍修饰课程，无法提供从 0 到 1 的有效补充；
3. **模型幻觉与虚假量化死穴**：传统工具擅自捏造虚假指标（如"将效率提升35%"），求职者若直接使用会在真实面试中被迅速击穿。

针对上述痛点，**JobFit AI** 应运而生——从"句子级修图工具"跃升为**"战略级职业发展与简历架构师"**。

---

## ✨ 核心功能与 AI 原生交互设计 (Key Features)

### 1. 非结构化文档解析管线 (Document Ingestion)

- **100% 浏览器客户端直接解析**：集成 `pdfjs-dist` 与 `mammoth` 引擎，实现对 `.pdf`、`.docx`、`.txt`、`.md` 文件的毫秒级文字提取与排版清洗。
- **Human-in-the-Loop 透明化交互**：文件解析后自动回显纯文本至工作台，支持用户二次校对与微调，规避解析排版噪点。

### 2. 经历素材库与置换策略看板 (Strategic Portfolio Optimization)

- 首创**"经历素材库（Raw Experience Pool）"**机制，将候选人未写入简历的 Side Project、比赛、课设等冷数据进行二次交叉语义比对。
- 输出 **增补（Add & Swap）/ 删减（Prune）/ 重构（Pivot）** 三维置换矩阵，指导用户用高匹配素材置换低价值项目，实现版面 ROI 最大化。

### 3. 工业级 Rubric 评分量规与防聚拢校准 (Scoring Calibration)

- **拒绝均值回归**：制定 5 档严苛锚点评分量规（90-100分 极致匹配 → <30分 严重不匹配），彻底拉开候选人分差方差。
- **硬性门槛熔断与扣分机制**：JD 核心技能每缺失一项硬扣 8 分；无商业落地经历的经历分直接锁死上限在 55 分以内。

### 4. 病灶自适应分流体系 (Adaptive Triage Strategy)

废弃僵化的固定输出，依据候选人诊断画像执行自适应处方分流：

- **资深转型型（≥75分）**：输出 4~6 条深度 STAR 改写，杜绝推荐幼稚自建项目；
- **有经历缺量化型（60~74分）**：输出 3~4 条指标注入精修 + 1 个项目升级方案；
- **零基础空白型（<60分）**：主动输出 **2~3 个完整的 0 到 1 实战项目落地蓝图**（含完整 STAR 模板与落地步骤），手把手孵化经历。

### 5. 严格防伪与防幻觉机制 (Anti-Hallucination)

严禁凭空捏造虚假业务数据，强制采用 `[X%]`、`[X]` 占位符进行视觉高亮引导，并在理由中明确提醒候选人替换为真实业务成果。

### 6. A4 咨询级交付报告与莫兰迪视觉系统 (Deliverable & Morandi System)

- **分离式打印引擎**：采用定制化 CSS `@media print` 架构，导出时彻底剔除网页表单与按钮控件，生成排版精致、紧凑无空白的纯白底 1~2 页 PDF 诊断报告。
- **莫兰迪低饱和度配色**：雾霾蓝、鼠尾草绿与暖杏色搭配，呈现专业、沉稳、护眼的高质感体验。

---

## 🛠️ 技术架构与工程实现 (System Architecture)

```
[ 用户端 Browser (React 18 + Vite + TailwindCSS) ]
  │
  ├──> 📄 本地文档解析 (pdfjs-dist / mammoth.js / FileReader)
  ├──> 🎨 状态持久化 (LocalStorage Auto-Sync)
  └──> 🚀 Direct API Invocation (HTTPS + Bearer Auth)
        │
        ▼
[ 智谱大模型开放平台 (Zhipu GLM-4-Flash Engine) ]
  │
  ├─> ⚙️ Rubric Scoring Pipeline (量规打分与硬性熔断)
  ├─> 🧠 Persona Triage Engine (三维病灶分流)
  └─> 📦 Strict JSON Schema (结构化容错提取)
```

- **前端框架**：React 18 + TypeScript + Vite + Tailwind CSS
- **图标与动效**：Lucide React + 自研 60FPS S-Curve 进度动画
- **AI 算力**：智谱 AI `glm-4-flash`
- **托管平台**：Cloudflare Pages 全球 CDN（多端免翻墙秒级直连）

---

## 🚀 本地运行与快速开始 (Local Setup)

```bash
# 1. 克隆本项目
git clone https://github.com/Jenatian/JobFit-AI.git
cd JobFit-AI

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 在项目根目录下创建 .env.local 文件并填入你的智谱 API Key:
echo "VITE_ZHIPU_API_KEY=你的智谱API密钥" > .env.local

# 4. 启动本地开发服务
npm run dev
```

打开浏览器访问 <http://localhost:5173> 即可体验。

---

## 👨‍💻 作者 (Author)

**产品设计 & 全栈开发**：Jenatian

**求职方向**：AI 产品经理 / 大模型应用产品经理（校招）

**项目体验**：<https://jobfit-ai-e15.pages.dev/>
