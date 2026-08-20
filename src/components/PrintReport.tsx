import type { AnalysisResult } from "@/lib/types";
import { safeSuggestionText } from "@/components/DiffRewriteFlow";
import { cleanSummaryMismatch } from "@/lib/aiService";

interface PrintReportProps {
  result: AnalysisResult;
  context: { resume: string; jd: string; extraProjects: string };
}

function getCandidateName(resume: string): string {
  const match = resume.match(/(?:姓名|候选人|姓\s*名)[：:]\s*([^\n\r，,。\s]{2,20})/);
  if (match) return match[1];
  const firstLine = resume.trim().split("\n")[0] || "";
  const nameMatch = firstLine.match(/^([^\s，,。\d]{2,10})/);
  if (nameMatch) return nameMatch[1];
  return "未填写";
}

function getJobTitle(jd: string): string {
  const match = jd.match(/(?:岗位|职位|应聘|招聘)[名称]?[：:]\s*([^\n\r，,。]{2,30})/);
  if (match) return match[1];
  const firstLine = jd.trim().split("\n")[0] || "";
  if (firstLine) return firstLine.slice(0, 30);
  return "未填写";
}

function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function highlightPlaceholders(text: string): React.ReactNode[] {
  // 防御性：若上游传入非字符串，先调用 safeSuggestionText 兜底
  const safe = typeof text === "string" ? text : safeSuggestionText(text);
  const parts: React.ReactNode[] = [];
  const regex = /\[[^\]]+\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(safe)) !== null) {
    if (match.index > lastIndex) parts.push(safe.slice(lastIndex, match.index));
    parts.push(
      <span
        key={`ph-${key++}`}
        className="print-placeholder"
      >
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < safe.length) parts.push(safe.slice(lastIndex));
  return parts;
}

export function PrintReport({ result, context }: PrintReportProps) {
  const candidateName = getCandidateName(context.resume);
  const jobTitle = getJobTitle(context.jd);
  const reportDate = formatDate();

  const d = result.dimensions;

  return (
    <div className="print-report">
      <header className="print-header">
        <div className="print-header-bar">
          <div className="print-logo">
            <span className="print-logo-icon">✦</span>
            <div className="print-logo-text">
              <span className="print-brand">JobFit AI</span>
              <span className="print-brand-tag">Career Intelligence</span>
            </div>
          </div>
          <h1 className="print-title">简历与 JD 深度对齐诊断报告</h1>
          <div className="print-report-label">CONFIDENTIAL</div>
        </div>

        <div className="print-meta">
          <div className="print-meta-item">
            <span className="print-meta-label">候选人</span>
            <span className="print-meta-value">{candidateName}</span>
          </div>
          <div className="print-meta-divider" />
          <div className="print-meta-item">
            <span className="print-meta-label">目标岗位</span>
            <span className="print-meta-value">{jobTitle}</span>
          </div>
          <div className="print-meta-divider" />
          <div className="print-meta-item">
            <span className="print-meta-label">生成日期</span>
            <span className="print-meta-value">{reportDate}</span>
          </div>
          <div className="print-meta-divider" />
          <div className="print-meta-item">
            <span className="print-meta-label">评测引擎</span>
            <span className="print-meta-value">GLM-4-Flash</span>
          </div>
        </div>
      </header>

      <main className="print-body">
        <section className="print-section">
          <div className="print-section-header">
            <span className="print-section-num">01</span>
            <h2 className="print-section-title">综合匹配度与能力看板</h2>
            <div className="print-section-line" />
          </div>

          <div className="print-score-board">
            <div className="print-score-ring">
              <svg viewBox="0 0 120 120" className="print-score-svg">
                <circle cx="60" cy="60" r="52" className="print-score-bg" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  className="print-score-fg"
                  style={{
                    strokeDasharray: `${(result.match_score / 100) * 326.7} 326.7`,
                  }}
                />
              </svg>
              <div className="print-score-number">
                <span className="print-score-value">{result.match_score}</span>
                <span className="print-score-unit">/100</span>
              </div>
            </div>

            <div className="print-dimensions">
              <div className="print-dim">
                <div className="print-dim-label">
                  <span>技能关键词对齐</span>
                  <span className="print-dim-score">{d.skill_match}</span>
                </div>
                <div className="print-bar">
                  <div
                    className="print-bar-fill print-bar-fill-blue"
                    style={{ width: `${d.skill_match}%` }}
                  />
                </div>
              </div>
              <div className="print-dim">
                <div className="print-dim-label">
                  <span>经历场景相关性</span>
                  <span className="print-dim-score">{d.experience_relevance}</span>
                </div>
                <div className="print-bar">
                  <div
                    className="print-bar-fill print-bar-fill-indigo"
                    style={{ width: `${d.experience_relevance}%` }}
                  />
                </div>
              </div>
              <div className="print-dim">
                <div className="print-dim-label">
                  <span>量化成果程度</span>
                  <span className="print-dim-score">{d.quantification_level}</span>
                </div>
                <div className="print-bar">
                  <div
                    className="print-bar-fill print-bar-fill-teal"
                    style={{ width: `${d.quantification_level}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="print-summary">
            <span className="print-summary-icon">▸</span>
            <p>{cleanSummaryMismatch(result.summary, result.match_score)}</p>
          </div>
        </section>

        {result.project_strategy &&
          (result.project_strategy.recommended_additions?.length > 0 ||
            result.project_strategy.recommended_removals?.length > 0 ||
            result.project_strategy.project_pivots?.length > 0) && (
            <section className="print-section">
              <div className="print-section-header">
                <span className="print-section-num">02</span>
                <h2 className="print-section-title">经历素材取舍与置换策略</h2>
                <div className="print-section-line" />
              </div>

              <div className="print-strategy-grid">
                {result.project_strategy.recommended_additions?.length > 0 && (
                  <div className="print-strategy-col">
                    <div className="print-strategy-col-header print-strategy-add">
                      <span className="print-strategy-col-icon">🟢</span>
                      <span>建议增补</span>
                    </div>
                    {result.project_strategy.recommended_additions.map(
                      (item, i) => (
                        <div
                          key={i}
                          className="print-strategy-card print-strategy-card-add"
                        >
                          <h3>{item.project_name}</h3>
                          <p className="print-strategy-why">
                            <strong>为什么加：</strong>
                            {item.why_add}
                          </p>
                          <p className="print-strategy-how">
                            <strong>操作建议：</strong>
                            {item.action_advice}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {result.project_strategy.recommended_removals?.length > 0 && (
                  <div className="print-strategy-col">
                    <div className="print-strategy-col-header print-strategy-remove">
                      <span className="print-strategy-col-icon">🔴</span>
                      <span>建议精简</span>
                    </div>
                    {result.project_strategy.recommended_removals.map(
                      (item, i) => (
                        <div
                          key={i}
                          className="print-strategy-card print-strategy-card-remove"
                        >
                          <h3>{item.project_name}</h3>
                          <p>
                            <strong>删除理由：</strong>
                            {item.why_remove}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {result.project_strategy.project_pivots?.length > 0 && (
                  <div className="print-strategy-col">
                    <div className="print-strategy-col-header print-strategy-pivot">
                      <span className="print-strategy-col-icon">🟡</span>
                      <span>重心重构</span>
                    </div>
                    {result.project_strategy.project_pivots.map((item, i) => (
                      <div
                        key={i}
                        className="print-strategy-card print-strategy-card-pivot"
                      >
                        <h3>{item.project_name}</h3>
                        <p>
                          <strong>调整建议：</strong>
                          {item.pivot_advice}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

        {result.missing_keywords?.length > 0 && (
          <section className="print-section">
            <div className="print-section-header">
              <span className="print-section-num">03</span>
              <h2 className="print-section-title">核心技能差距 · Keywords Gap</h2>
              <div className="print-section-line" />
            </div>

            <div className="print-keywords">
              {result.missing_keywords.map((kw, i) => (
                <span key={i} className="print-keyword-tag">
                  {kw}
                </span>
              ))}
            </div>
            <p className="print-keywords-hint">
              以上关键词为 JD 明确要求但简历中缺失或弱化的核心技能，建议优先补充。
            </p>
          </section>
        )}

        {result.suggestions?.length > 0 && (
          <section className="print-section print:break-inside-avoid">
            <div className="print-section-header">
              <span className="print-section-num">04</span>
              <h2 className="print-section-title">
                深度进阶建议体系
                <span className="print-section-count">
                  共 {result.suggestions.length} 条深度进阶建议
                </span>
              </h2>
              <div className="print-section-line" />
            </div>

            <div className="print-suggestions">
              {result.suggestions.map((s, i) => {
                const isBlueprint = s.type === "new_project_blueprint" || s.category_tag?.includes("蓝图");
                const isAddition = s.type === "section_addition" || s.category_tag?.includes("补充");
                const typeLabel = isBlueprint ? "实战项目蓝图" : isAddition ? "板块补充" : "Diff 改写";
                // 安全解析：防止 LLM 返回对象导致 [object Object]
                const improvedText = safeSuggestionText(s.improved);
                const originalText = safeSuggestionText(s.original);
                const reasonText = safeSuggestionText(s.reason);
                return (
                <div
                  key={i}
                  className="print-suggestion"
                >
                  <div className="print-suggestion-header">
                    <span className="print-suggestion-num">{i + 1}</span>
                    <span className="print-suggestion-section-tag">{s.section}</span>
                    <span className="print-suggestion-tag">{typeLabel}</span>
                  </div>

                  <div className="print-suggestion-grid">
                    <div className="print-suggestion-col print-suggestion-col-orig">
                      <div className="print-suggestion-col-label print-label-orig">
                        {isBlueprint || isAddition ? "原简历" : "原描述"}
                      </div>
                      <p className="print-suggestion-text">{highlightPlaceholders(originalText)}</p>
                    </div>
                    <div className="print-suggestion-col print-suggestion-col-new">
                      <div className="print-suggestion-col-label print-label-new">
                        {isBlueprint ? "项目蓝图" : isAddition ? "板块内容" : "推荐优化"}
                      </div>
                      <p className="print-suggestion-text print-text-improved">
                        {highlightPlaceholders(improvedText)}
                      </p>
                    </div>
                  </div>

                  <div className="print-suggestion-reason">
                    <div className="print-suggestion-reason-label">
                      {isBlueprint ? "蓝图详解 · 动手步骤" : isAddition ? "补充指南" : "改写逻辑"}
                    </div>
                    <p className="print-suggestion-text">{highlightPlaceholders(reasonText)}</p>
                  </div>
                </div>
              )})}
            </div>
          </section>
        )}
      </main>

      <footer className="print-footer">
        <div className="print-footer-line" />
        <div className="print-footer-content">
          <span>
            本报告由 <strong>JobFit AI</strong> 自动生成 · 遵循 STAR
            原则与大模型人岗匹配算法
          </span>
          <span className="print-footer-page" />
        </div>
      </footer>
    </div>
  );
}
