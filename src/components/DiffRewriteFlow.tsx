import { useState, useMemo } from "react";
import {
  PenLine,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileDiff,
  AlertTriangle,
  Target,
  Rocket,
  Lightbulb,
  Sparkles,
  BookOpen,
} from "lucide-react";
import type { Suggestion, SuggestionType } from "@/lib/types";

interface Props {
  suggestions: Suggestion[];
}

/**
 * 安全解析建议字段：将对象/数组/原始值统一转为多行字符串
 * 解决 LLM 返回 { improved: {...} } 时 JSX 渲染出 [object Object] 的问题
 *
 * 支持的输入：
 * - 字符串：直接返回（含 \n 换行符，配合 whitespace-pre-line 可分行展示）
 * - 数字/布尔：转字符串
 * - 数组：每项前加 "N. "，嵌套对象提取 title/description
 * - 对象：按蓝图常见字段（项目名称/背景/技术方案/成果/步骤等）提取并格式化
 */
export function safeSuggestionText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item, idx) => {
        if (item == null) return null;
        if (typeof item === "string") return `${idx + 1}. ${item}`;
        if (typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const title = String(
            obj.title || obj.name || obj.label || obj.step || ""
          );
          const desc = String(
            obj.description ||
              obj.content ||
              obj.text ||
              obj.value ||
              obj.detail ||
              ""
          );
          const bullets = Array.isArray(obj.bullets)
            ? obj.bullets
                .map((b) =>
                  typeof b === "string" ? `  - ${b}` : `  - ${JSON.stringify(b)}`
                )
                .join("\n")
            : "";
          return [title, desc, bullets]
            .filter(Boolean)
            .map((s, i) => (i === 0 ? `${idx + 1}. ${s}` : s))
            .join("\n");
        }
        return `${idx + 1}. ${String(item)}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const lines: string[] = [];

    // 蓝图常见字段映射（按优先级顺序匹配中英文字段名）
    const fieldMap: Array<[string, string[]]> = [
      ["项目名称", ["name", "title", "project_name", "projectName", "项目名称"]],
      ["背景与痛点", ["background", "pain_point", "painPoint", "context", "背景", "痛点", "problem"]],
      ["核心行动", ["action", "actions", "core_action", "coreAction", "核心行动", "行动"]],
      ["技术方案", ["tech_stack", "techStack", "solution", "architecture", "技术方案", "技术栈"]],
      ["成果量化", ["result", "results", "outcome", "成果", "结果", "量化", "metrics"]],
      ["动手步骤", ["steps", "action_steps", "actionSteps", "动手步骤", "步骤", "guide"]],
      ["说明", ["description", "content", "text", "说明", "描述", "summary", "detail"]],
    ];

    const knownKeys = new Set<string>();
    for (const [, keys] of fieldMap) keys.forEach((k) => knownKeys.add(k));

    // 已知字段按蓝图顺序输出
    for (const [label, keys] of fieldMap) {
      for (const key of keys) {
        if (obj[key] == null) continue;
        const v = obj[key];
        if (typeof v === "string" && v.trim()) {
          lines.push(`【${label}】${v}`);
        } else if (Array.isArray(v) && v.length) {
          lines.push(`【${label}】`);
          v.forEach((item, idx) => {
            if (typeof item === "string") lines.push(`  ${idx + 1}. ${item}`);
            else if (item && typeof item === "object") {
              const t = String(
                (item as Record<string, unknown>).title ||
                  (item as Record<string, unknown>).name || ""
              );
              const d = String(
                (item as Record<string, unknown>).description ||
                  (item as Record<string, unknown>).content || ""
              );
              lines.push(
                `  ${idx + 1}. ${[t, d].filter(Boolean).join("：")}`
              );
            } else lines.push(`  ${idx + 1}. ${String(item)}`);
          });
        } else if (typeof v === "object") {
          lines.push(`【${label}】${JSON.stringify(v)}`);
        }
        break;
      }
    }

    // 未识别字段兜底输出（避免遗漏信息）
    for (const key of Object.keys(obj)) {
      if (knownKeys.has(key)) continue;
      const v = obj[key];
      if (typeof v === "string" && v.trim()) lines.push(`【${key}】${v}`);
      else if (Array.isArray(v) && v.length) {
        lines.push(`【${key}】`);
        v.forEach((item, idx) =>
          lines.push(
            `  ${idx + 1}. ${
              typeof item === "string" ? item : JSON.stringify(item)
            }`
          )
        );
      } else if (typeof v === "object" && v != null) {
        lines.push(`【${key}】${JSON.stringify(v)}`);
      }
    }

    return lines.length > 0 ? lines.join("\n") : JSON.stringify(value, null, 2);
  }

  return String(value);
}

interface TypeStyle {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBorder: string;
  cardHeader: string;
  icon: React.ReactNode;
  label: string;
  panelColor: string;
  reasonLabel: string;
}

function getTypeStyle(type?: SuggestionType, categoryTag?: string): TypeStyle {
  if (
    type === "new_project_blueprint" ||
    (categoryTag && categoryTag.includes("蓝图"))
  ) {
    return {
      badgeBg: "linear-gradient(135deg, #EDE8F0 0%, #D8CFE0 100%)",
      badgeText: "#6B5B7A",
      badgeBorder: "#c5b8d8",
      cardBorder: "#c5b8d8",
      cardHeader: "#5B4B6E",
      icon: <Rocket className="w-3.5 h-3.5" />,
      label: "🔥 推荐自建实战项目蓝图",
      panelColor: "#6B5B7A",
      reasonLabel: "蓝图详解 · 动手步骤",
    };
  }
  if (
    type === "section_addition" ||
    (categoryTag && categoryTag.includes("补充"))
  ) {
    return {
      badgeBg: "linear-gradient(135deg, #FAF3EB 0%, #E8DCC8 100%)",
      badgeText: "#8a6b47",
      badgeBorder: "#d8c5a8",
      cardBorder: "#d8c5a8",
      cardHeader: "#7a5f3a",
      icon: <Lightbulb className="w-3.5 h-3.5" />,
      label: "💡 关键板块补充",
      panelColor: "#8a6b47",
      reasonLabel: "补充指南 · 行动建议",
    };
  }
  return {
    badgeBg: "linear-gradient(135deg, #EAF0EB 0%, #C8D8CC 100%)",
    badgeText: "#56665f",
    badgeBorder: "#b8ccbf",
    cardBorder: "#c8d5cc",
    cardHeader: "#4a5c52",
    icon: <FileDiff className="w-3.5 h-3.5" />,
    label: "✏️ 现有描述精修",
    panelColor: "#56665f",
    reasonLabel: "改写理由 · Why this works",
  };
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
    if (match.index > lastIndex) {
      parts.push(safe.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={`ph-${key++}`}
        className="inline-block bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded border border-amber-200 text-[11px] align-baseline"
        title="此为占位符，请替换为你的真实数据"
      >
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < safe.length) {
    parts.push(safe.slice(lastIndex));
  }
  return parts;
}

function containsPlaceholder(text: string): boolean {
  return /\[[^\]]+\]/.test(text);
}

function getSectionColor(section: string): { bg: string; text: string; border: string } {
  if (section.includes("个人") || section.includes("简介") || section.includes("评价")) {
    return { bg: "#EAF0EB", text: "#6E8B74", border: "#c8d8cc" };
  }
  if (section.includes("项目") || section.includes("经历")) {
    return { bg: "#FAF3EB", text: "#C48B71", border: "#e0cfb8" };
  }
  if (section.includes("技能") || section.includes("技术") || section.includes("标签")) {
    return { bg: "#E4EBF0", text: "#5F7387", border: "#c5d0da" };
  }
  if (section.includes("缺失") || section.includes("新增")) {
    return { bg: "#EDE8F0", text: "#7A6B8A", border: "#d5cde0" };
  }
  return { bg: "#EDE8F0", text: "#7A6B8A", border: "#d5cde0" };
}

function SuggestionCard({
  s,
  index,
  compact,
}: {
  s: Suggestion;
  index: number;
  compact: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // 安全解析：将 LLM 可能返回的对象/数组转为多行字符串，杜绝 [object Object]
  const improvedText = useMemo(() => safeSuggestionText(s.improved), [s.improved]);
  const originalText = useMemo(() => safeSuggestionText(s.original), [s.original]);
  const reasonText = useMemo(() => safeSuggestionText(s.reason), [s.reason]);

  const improvedHasPlaceholder = useMemo(
    () => containsPlaceholder(improvedText),
    [improvedText]
  );

  const ts = getTypeStyle(s.type, s.category_tag);
  const colors = getSectionColor(s.section);
  const isBlueprint =
    s.type === "new_project_blueprint" ||
    (s.category_tag?.includes("蓝图") ?? false);
  const isAddition =
    s.type === "section_addition" ||
    (s.category_tag?.includes("补充") ?? false);
  const isRewrite = !isBlueprint && !isAddition;
  const isNewContent = isBlueprint || isAddition;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(improvedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {
      // ignore
    }
  };

  const originalLabel = isNewContent ? "原简历" : "原描述";
  const originalValue =
    isNewContent && originalText.includes("缺失")
      ? "原简历缺失此内容"
      : originalText;

  return (
    <div
      className="group rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 animate-slide-up print:break-inside-avoid print:page-break-inside-avoid"
      style={{
        animationDelay: `${index * 70 + 160}ms`,
        padding: compact ? "14px 18px" : "20px",
        border: `1.5px solid ${ts.cardBorder}`,
      }}
    >
      {/* 类型标签行 */}
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold shadow-inner flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.border} 100%)`,
            color: colors.text,
          }}
        >
          {index + 1}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border shadow-sm whitespace-nowrap"
          style={{
            background: ts.badgeBg,
            color: ts.badgeText,
            borderColor: ts.badgeBorder,
          }}
        >
          {ts.icon}
          {ts.label}
        </span>
        <div className="ml-auto flex items-center gap-1.5 min-w-0">
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border whitespace-nowrap max-w-[180px] truncate"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.border,
            }}
            title={s.section}
          >
            <Target className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{s.section}</span>
          </span>
        </div>
      </div>

      {/* 内容区 */}
      <div
        className={`grid gap-3 ${
          compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {/* 原描述/原简历 */}
        <div
          className="relative rounded-xl border p-3.5"
          style={{
            borderColor: isNewContent ? "#d8c5a8" : "#d5c8c8",
            background: isNewContent
              ? "linear-gradient(135deg, #faf5ed/80 0%, #ffffff 100%)"
              : "linear-gradient(135deg, #efe8e8/80 0%, #ffffff 100%)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isNewContent ? "#c4a06a" : "#c4a8a8" }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: isNewContent ? "#8a6b47" : "#8a6b6b" }}
            >
              {originalLabel}
            </span>
            <span
              className="ml-auto text-[9px]"
              style={{ color: isNewContent ? "#b8a588" : "#b8a8a8" }}
            >
              {isNewContent ? "Missing" : "Original"}
            </span>
          </div>
          <p
            className={`text-xs text-slate-700 leading-relaxed whitespace-pre-line ${
              compact ? "line-clamp-4" : ""
            }`}
          >
            {originalValue}
          </p>
          {isNewContent && (
            <div className="mt-1.5 flex items-center gap-1 text-[9px] text-[#a88860]">
              <BookOpen className="w-3 h-3" />
              <span>建议补充全新内容</span>
            </div>
          )}
        </div>

        {/* 建议版本 */}
        <div
          className="relative rounded-xl border p-3.5"
          style={{
            borderColor: ts.cardBorder,
            background: isBlueprint
              ? "linear-gradient(135deg, #ede8f0/80 0%, #ffffff 100%)"
              : isAddition
              ? "linear-gradient(135deg, #faf3eb/80 0%, #ffffff 100%)"
              : "linear-gradient(135deg, #e4ebe5/80 0%, #ffffff 100%)",
          }}
        >
          <button
            onClick={onCopy}
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-0.5 text-[10px] font-medium shadow-sm hover:bg-sage-50 transition-all z-10"
            style={{ borderColor: ts.cardBorder, color: ts.panelColor }}
            type="button"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                一键复制
              </>
            )}
          </button>
          <div className="flex items-center gap-1.5 mb-1.5 pr-16">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: ts.panelColor }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: ts.panelColor }}
            >
              {isBlueprint
                ? "项目蓝图"
                : isAddition
                ? "板块内容"
                : "推荐优化"}
            </span>
            <span
              className="ml-auto text-[9px]"
              style={{ color: ts.panelColor + "99" }}
            >
              {isBlueprint ? "Blueprint" : isAddition ? "Addition" : "Improved"}
            </span>
          </div>
          <p
            className={`text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium ${
              compact ? "line-clamp-4" : ""
            }`}
          >
            {highlightPlaceholders(improvedText)}
          </p>
          {improvedHasPlaceholder && !compact && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#8a7962] bg-sand-50/80 border border-sand-200 rounded-lg px-2 py-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>
                请将 <b>[X]</b> 替换为你的真实数据
              </span>
            </div>
          )}
          {isBlueprint && !compact && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#6B5B7A] bg-[#EDE8F0]/60 border border-[#c5b8d8] rounded-lg px-2 py-1">
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              <span>
                此为完整项目蓝图模板，按步骤动手即可落地
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 理由/行动指南区 */}
      <div className="mt-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-2 rounded-xl border bg-gradient-to-r from-[#e4eaf0]/60 via-white to-[#e4eaf0]/40 px-3.5 py-2 transition-all group/btn"
          style={{ borderColor: ts.cardBorder }}
          type="button"
        >
          <div
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide"
            style={{ color: ts.panelColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: ts.panelColor }}
            />
            {ts.reasonLabel}
          </div>
          {expanded ? (
            <ChevronUp
              className="w-3.5 h-3.5 group-hover/btn:-translate-y-0.5 transition-transform"
              style={{ color: ts.panelColor }}
            />
          ) : (
            <ChevronDown
              className="w-3.5 h-3.5 group-hover/btn:translate-y-0.5 transition-transform"
              style={{ color: ts.panelColor }}
            />
          )}
        </button>
        <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              expanded ? "max-h-[800px] opacity-100 mt-2.5" : "max-h-0 opacity-0"
            }`}
          >
            <div
              className="rounded-xl bg-white/70 p-3.5"
              style={{ border: `1px solid ${ts.cardBorder}70` }}
            >
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {highlightPlaceholders(reasonText)}
              </p>
            {improvedHasPlaceholder && (
              <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-[#8a7962] bg-sand-50/60 rounded-lg px-2 py-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  本条建议包含 <b>[X]</b> 占位符，请根据实际情况替换为具体数据。
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiffRewriteFlow({ suggestions }: Props) {
  const list = suggestions || [];

  const { rewriteCount, blueprintCount, additionCount } = useMemo(() => {
    let r = 0,
      b = 0,
      a = 0;
    for (const s of list) {
      const isBp =
        s.type === "new_project_blueprint" ||
        (s.category_tag?.includes("蓝图") ?? false);
      const isAd =
        s.type === "section_addition" ||
        (s.category_tag?.includes("补充") ?? false);
      if (isBp) b++;
      else if (isAd) a++;
      else r++;
    }
    return { rewriteCount: r, blueprintCount: b, additionCount: a };
  }, [list]);

  const placeholderCount = list.reduce(
    (acc, s) => acc + (containsPlaceholder(s.improved) ? 1 : 0),
    0
  );

  const compact = list.length > 4;

  return (
    <section
      className="glass-card rounded-2xl p-6 lg:p-7 animate-slide-up print:break-inside-avoid print:page-break-inside-avoid"
      style={{ animationDelay: "180ms" }}
    >
      <header className="flex items-center gap-2.5 mb-5">
        <span className="w-9 h-9 rounded-lg bg-[#EAF0EB] flex items-center justify-center">
          <PenLine className="w-5 h-5" style={{ color: "#6E8B74" }} strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            模块四 · 深度进阶建议体系
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            从 0 到 1 的实战蓝图 + 现有经历精修 + 缺失板块补齐
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className="badge bg-gradient-to-r from-[#f0ead8] to-[#e4dcc8] text-[#6b5f47] border border-[#d5c9a8] text-[11px] font-semibold shadow-sm">
            共 {list.length} 条深度进阶建议
          </span>
          {blueprintCount > 0 && (
            <span className="badge bg-gradient-to-r from-[#EDE8F0] to-[#D8CFE0] text-[#6B5B7A] border border-[#c5b8d8] text-[11px] font-semibold gap-1 shadow-sm">
              <Rocket className="w-3 h-3" />
              {blueprintCount} 个实战项目蓝图
            </span>
          )}
          {additionCount > 0 && (
            <span className="badge bg-gradient-to-r from-[#FAF3EB] to-[#E8DCC8] text-[#8a6b47] border border-[#d8c5a8] text-[11px] font-semibold gap-1 shadow-sm">
              <Lightbulb className="w-3 h-3" />
              {additionCount} 个板块补充
            </span>
          )}
          {placeholderCount > 0 && (
            <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[11px] gap-1">
              <AlertTriangle className="w-3 h-3" />
              {placeholderCount} 处待补充
            </span>
          )}
          {compact && (
            <span className="badge bg-slate-100 text-slate-500 border border-slate-200 text-[10px]">
              紧凑模式
            </span>
          )}
        </div>
      </header>

      {list.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-400 italic">
          暂无深度进阶建议 📝
        </div>
      ) : (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          {list.map((s, i) => (
            <SuggestionCard key={i} s={s} index={i} compact={compact} />
          ))}
        </div>
      )}
    </section>
  );
}