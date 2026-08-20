import type { AnalysisResult } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { MatchDiagnostics } from "./MatchDiagnostics";
import { ProjectStrategyPanel } from "./ProjectStrategyPanel";
import { KeywordGap } from "./KeywordGap";
import { DiffRewriteFlow } from "./DiffRewriteFlow";
import type { Phase1Result } from "@/lib/aiService";
import { useEffect, useState } from "react";

/** 第二阶段未返回时的轮播骨架卡片 */
const ROTATING_MESSAGES: string[] = [
  "正在结合 JD 痛点重构项目叙事重心...",
  "正在校验 STAR 量化指标占位符...",
  "正在按画像 A/B/C 分流，匹配实战蓝图深度...",
  "正在补齐 JD 中缺失的核心硬技能树...",
  "正在生成可直接抄用的 5~8 条行动建议...",
];

function Phase2SkeletonCard({ resultKey }: { resultKey: number }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % ROTATING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      key={`d-skeleton-${resultKey}`}
      className="animate-stagger-4 glass-card rounded-2xl p-6 border border-dashed border-[#d8c5a8] bg-gradient-to-br from-[#FAF7F1] to-white"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8DCC8] to-[#d4c59a] flex items-center justify-center shadow-inner">
          <span className="text-lg">✍️</span>
          <span className="absolute inset-0 rounded-xl animate-pulse-ring pointer-events-none" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[#7a5f3a] text-[14px] leading-tight">
            深度 STAR 精修与行动蓝图生成中...
          </div>
          <div className="text-[11.5px] text-slate-500 mt-1 transition-opacity duration-300">
            {ROTATING_MESSAGES[msgIdx]}
          </div>
        </div>
        <div className="ml-2 w-32 h-2 rounded-full bg-[#EDE8F0] overflow-hidden flex-shrink-0 hidden sm:block">
          <div
            className="h-full animate-pulse-slow rounded-full"
            style={{
              width: "75%",
              background:
                "linear-gradient(90deg, #a8b8c8 0%, #96a597 50%, #d4c59a 100%)",
            }}
          />
        </div>
      </div>

      {/* 骨架卡片阵列（拟真最终建议卡片的视觉占位） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[#ebe5d5] bg-white/70 p-3.5 space-y-2.5"
            style={{
              animation: `fadeSlideUp 0.55s ${i * 90 + 120}ms ease-out both`,
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-12 h-3.5 rounded bg-gradient-to-r from-[#EDE8F0] to-[#DCD8E4]" />
              <div className="w-20 h-3 rounded bg-[#F2EBD9]" />
            </div>
            <div className="w-3/4 h-3 rounded bg-[#EDE8F0]" />
            <div className="w-full h-2.5 rounded bg-[#F1ECE0]" />
            <div className="w-5/6 h-2.5 rounded bg-[#F1ECE0]" />
            <div className="w-2/3 h-2.5 rounded bg-[#F1ECE0]" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  /** 完整合成后的 result（若存在则优先使用）—— 兼容 analyzeResume 老调用方 */
  result: AnalysisResult | null;
  /** 阶段一结果（P1 先到）：仪表盘 + 战略 + 关键词 */
  phase1Result: Phase1Result | null;
  /** 阶段二结果（P2 后到）：改写/蓝图建议 */
  phase2Suggestions: AnalysisResult["suggestions"] | null;
  loading: boolean;
  /** bump on each NEW P1 arrival (start of analysis) → triggers animations remount */
  resultKey?: number;
}

export function ResultPanel({
  result,
  phase1Result,
  phase2Suggestions,
  loading,
  resultKey,
}: Props) {
  // Loading 场景：并行架构下不展示骨架屏 —— 改为展示 EmptyState（P1 到了立刻出真内容）
  // 保留骨架屏仅用于 loading=true 但 P1 还没到的极短瞬间（前 300ms）
  if (loading && !phase1Result && !result) {
    return (
      <div className="h-full overflow-y-auto pr-2 -mr-2">
        <LoadingSkeleton />
      </div>
    );
  }

  // 优先使用合成 result；否则取 phase1 + phase2 拼接
  const merged: AnalysisResult | null = result
    ? result
    : phase1Result
      ? ({
          ...phase1Result,
          suggestions: phase2Suggestions ?? [],
        } as AnalysisResult)
      : null;

  if (!merged) return <EmptyState />;

  const k = resultKey ?? 0;
  const hasPhase2 =
    !!(result && result.suggestions && result.suggestions.length > 0) ||
    !!(phase2Suggestions && phase2Suggestions.length > 0);
  const suggestions = merged.suggestions;

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2 -mr-2 pb-4">
      <div key={`m-${k}`} className="animate-stagger-1">
        <MatchDiagnostics
          score={merged.match_score}
          summary={merged.summary}
          dimensions={merged.dimensions}
          calibrationMeta={merged._calibration_meta}
        />
      </div>
      <div key={`p-${k}`} className="animate-stagger-2">
        <ProjectStrategyPanel strategy={merged.project_strategy} />
      </div>
      <div key={`kw-${k}`} className="animate-stagger-3">
        <KeywordGap keywords={merged.missing_keywords} />
      </div>
      {hasPhase2 ? (
        <div key={`d-${k}`} className="animate-stagger-4">
          <DiffRewriteFlow suggestions={suggestions} />
        </div>
      ) : (
        <Phase2SkeletonCard resultKey={k} />
      )}

      {hasPhase2 && (
        <footer
          key={`f-${k}`}
          className="text-center text-xs text-slate-400 pt-4 pb-2 animate-stagger-5"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-[#d5d0c8]/70">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
            以上建议由大模型生成，建议结合个人情况做二次校对与润色。
          </div>
        </footer>
      )}
    </div>
  );
}

