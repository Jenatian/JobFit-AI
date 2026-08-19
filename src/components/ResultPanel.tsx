import type { AnalysisResult } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { MatchDiagnostics } from "./MatchDiagnostics";
import { ProjectStrategyPanel } from "./ProjectStrategyPanel";
import { KeywordGap } from "./KeywordGap";
import { DiffRewriteFlow } from "./DiffRewriteFlow";

interface Props {
  result: AnalysisResult | null;
  loading: boolean;
}

export function ResultPanel({ result, loading }: Props) {
  if (loading) {
    return (
      <div className="h-full overflow-y-auto pr-2 -mr-2">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!result) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2 -mr-2 pb-4">
      <MatchDiagnostics
        score={result.match_score}
        summary={result.summary}
        dimensions={result.dimensions}
        calibrationMeta={result._calibration_meta}
      />
      <ProjectStrategyPanel strategy={result.project_strategy} />
      <KeywordGap keywords={result.missing_keywords} />
      <DiffRewriteFlow suggestions={result.suggestions} />

      <footer className="text-center text-xs text-slate-400 pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-[#d5d0c8]/70">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
          以上建议由大模型生成，建议结合个人情况做二次校对与润色。
        </div>
      </footer>
    </div>
  );
}
