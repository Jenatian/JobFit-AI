import type { AnalysisResult } from "./types";

export function generateMarkdownReport(
  result: AnalysisResult,
  context?: { resume?: string; jd?: string; extraProjects?: string }
): string {
  const lines: string[] = [];
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  lines.push(`# JobFit AI · 简历诊断报告`);
  lines.push(``);
  lines.push(`> 生成时间：${timestamp}`);
  lines.push(``);

  lines.push(`## 📊 匹配度总览`);
  lines.push(``);
  lines.push(`**综合匹配分：${result.match_score}/100**`);
  lines.push(``);
  lines.push(`| 维度 | 得分 |`);
  lines.push(`|------|------|`);
  lines.push(`| 技能关键词对齐 | ${result.dimensions.skill_match}/100 |`);
  lines.push(`| 经历场景相关性 | ${result.dimensions.experience_relevance}/100 |`);
  lines.push(`| 量化/数据化成果 | ${result.dimensions.quantification_level}/100 |`);
  lines.push(``);

  lines.push(`### 📝 诊断摘要`);
  lines.push(``);
  lines.push(result.summary);
  lines.push(``);

  lines.push(`## 🔍 JD 关键缺词`);
  lines.push(``);
  if (result.missing_keywords?.length > 0) {
    lines.push(result.missing_keywords.map((k) => `- ${k}`).join("\n"));
  } else {
    lines.push(`_暂无明显缺词_`);
  }
  lines.push(``);

  lines.push(`## 🎯 项目战略取舍`);
  lines.push(``);

  if (result.project_strategy?.recommended_additions?.length > 0) {
    lines.push(`### ✅ 推荐加入简历的项目`);
    lines.push(``);
    result.project_strategy.recommended_additions.forEach((item, i) => {
      lines.push(`**${i + 1}. ${item.project_name}**`);
      lines.push(`- **为什么加：** ${item.why_add}`);
      lines.push(`- **操作建议：** ${item.action_advice}`);
      lines.push(``);
    });
  }

  if (result.project_strategy?.recommended_removals?.length > 0) {
    lines.push(`### ❌ 建议删除/降权的项目`);
    lines.push(``);
    result.project_strategy.recommended_removals.forEach((item, i) => {
      lines.push(`**${i + 1}. ${item.project_name}**`);
      lines.push(`- **删除理由：** ${item.why_remove}`);
      lines.push(``);
    });
  }

  if (result.project_strategy?.project_pivots?.length > 0) {
    lines.push(`### 🔄 建议重构叙事的项目`);
    lines.push(``);
    result.project_strategy.project_pivots.forEach((item, i) => {
      lines.push(`**${i + 1}. ${item.project_name}**`);
      lines.push(`- **调整建议：** ${item.pivot_advice}`);
      lines.push(``);
    });
  }

  lines.push(`## ✏️ 逐段改写建议`);
  lines.push(``);
  result.suggestions.forEach((s, i) => {
    lines.push(`### ${i + 1}. ${s.section}`);
    lines.push(``);
    lines.push(`**原文：**`);
    lines.push(``);
    lines.push(`> ${s.original}`);
    lines.push(``);
    lines.push(`**推荐优化：**`);
    lines.push(``);
    lines.push(s.improved);
    lines.push(``);
    lines.push(`**改写理由：** ${s.reason}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  });

  lines.push(`## 📎 输入原文（供参考）`);
  lines.push(``);
  if (context?.resume) {
    lines.push(`<details><summary>简历原文</summary>`);
    lines.push(``);
    lines.push("```");
    lines.push(context.resume);
    lines.push("```");
    lines.push(``);
    lines.push(`</details>`);
    lines.push(``);
  }
  if (context?.jd) {
    lines.push(`<details><summary>目标岗位 JD</summary>`);
    lines.push(``);
    lines.push("```");
    lines.push(context.jd);
    lines.push("```");
    lines.push(``);
    lines.push(`</details>`);
    lines.push(``);
  }
  if (context?.extraProjects) {
    lines.push(`<details><summary>素材库</summary>`);
    lines.push(``);
    lines.push("```");
    lines.push(context.extraProjects);
    lines.push("```");
    lines.push(``);
    lines.push(`</details>`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`_本报告由 JobFit AI 自动生成，仅供参考，请结合个人实际情况进行二次校对。_`);

  return lines.join("\n");
}

const STORAGE_KEY = "jobfit_ai_state_v1";

interface StoredState {
  resume: string;
  jd: string;
  extraProjects: string;
  result: AnalysisResult | null;
}

export function loadFromStorage(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    return parsed;
  } catch {
    return null;
  }
}

export function saveToStorage(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
