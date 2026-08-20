import { Target, Wrench, Briefcase, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import type { Dimensions, CalibrationMeta } from "@/lib/types";
import { ScoreRing } from "./ScoreRing";
import { cleanSummaryMismatch } from "@/lib/aiService";

interface Props {
  score: number;
  summary: string;
  dimensions: Dimensions;
  calibrationMeta?: CalibrationMeta;
}

function DimensionBar({
  icon: Icon,
  label,
  value,
  iconBg,
  barGradient,
}: {
  icon: any;
  label: string;
  value: number;
  iconBg: string;
  barGradient: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: iconBg }}
          >
            <Icon
              className="w-3.5 h-3.5 text-white"
              strokeWidth={2.4}
            />
          </span>
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-slate-800">
          {clamped}
          <span className="text-slate-400 font-normal text-xs ml-0.5">/100</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${clamped}%`, background: barGradient }}
        />
      </div>
    </div>
  );
}

export function MatchDiagnostics({ score, summary, dimensions, calibrationMeta }: Props) {
  const bandLabel = score >= 90 ? "极致匹配" : score >= 75 ? "资深强相关" : score >= 55 ? "潜力应届" : score >= 30 ? "弱匹配" : "不匹配";
  const bandColor = score >= 90 ? "#56665f" : score >= 75 ? "#5f7387" : score >= 55 ? "#8a7962" : score >= 30 ? "#c07d7d" : "#8a6b6b";

  // 渲染期最后一道防线：清洗 summary 中与 match_score 不一致的数字分数与档位标签
  const safeSummary = cleanSummaryMismatch(summary, score);

  return (
    <section className="glass-card rounded-2xl p-6 lg:p-7 animate-slide-up">
      <header className="flex items-center gap-2.5 mb-6">
        <span className="w-9 h-9 rounded-lg bg-[#EAF0EB] flex items-center justify-center">
          <Target className="w-5 h-5 text-[#4A6B82]" strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            模块一 · 匹配度诊断
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Match Score & Dimension Breakdown
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border"
            style={{ color: bandColor, borderColor: bandColor + "40", background: bandColor + "12" }}
          >
            <ShieldCheck className="w-3 h-3" />
            Rubric: {bandLabel}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="flex justify-center">
          <ScoreRing score={score} />
        </div>
        <div className="space-y-5">
          <DimensionBar
            icon={Wrench}
            label="技能对齐度"
            value={dimensions.skill_match}
            iconBg="linear-gradient(135deg, #788ea3 0%, #5f7387 100%)"
            barGradient="linear-gradient(90deg, #b0c2ce 0%, #788ea3 50%, #5f7387 100%)"
          />
          <DimensionBar
            icon={Briefcase}
            label="经历相关性"
            value={dimensions.experience_relevance}
            iconBg="linear-gradient(135deg, #7d8e7f 0%, #56665f 100%)"
            barGradient="linear-gradient(90deg, #a8b8aa 0%, #7d8e7f 50%, #56665f 100%)"
          />
          <DimensionBar
            icon={TrendingUp}
            label="量化成果度"
            value={dimensions.quantification_level}
            iconBg="linear-gradient(135deg, #b8a68a 0%, #8a7962 100%)"
            barGradient="linear-gradient(90deg, #d4c59a 0%, #b8a68a 50%, #8a7962 100%)"
          />
        </div>
      </div>

      <div className="mt-7 pt-6 border-t border-dashed border-[#d5d0c8]">
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[#C5D0C5]/70" style={{ background: 'linear-gradient(90deg, #EEF3EE 0%, #ffffff 50%, #F4F6F8 100%)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: '#ffffff', border: '1px solid #C5D0C5' }}>
            <span className="text-base">💡</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-sage-700 mb-1">
              AI 总评摘要
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{safeSummary}</p>
          </div>
        </div>
      </div>

      {calibrationMeta && (
        <div className="mt-3 p-3.5 rounded-xl border border-[#E4DCC8] bg-gradient-to-br from-[#FAF3EB]/60 to-white">
          <div className="flex items-center gap-2 mb-2.5">
            <ShieldCheck className="w-4 h-4 text-[#8a7962]" />
            <span className="text-xs font-bold text-[#6b5f47]">
              Rubric 校准详情
            </span>
            <span className="text-[10px] text-[#a89580]">工业级评分量规 · 服务端强制校准</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <CalibrationItem
              label="核心技能缺失"
              value={calibrationMeta.missing_hard_skills}
              max={6}
              good={false}
            />
            <CalibrationItem
              label="已命中技能"
              value={calibrationMeta.matched_hard_skills.length}
              max={6}
              good={true}
            />
            <CalibrationItem
              label="量化指标数"
              value={calibrationMeta.quant_count}
              max={10}
              good={calibrationMeta.quant_count >= 3}
            />
            <CalibrationItem
              label="口水话密度"
              value={calibrationMeta.vague_count}
              max={10}
              good={calibrationMeta.vague_count < 5}
              warning={calibrationMeta.vague_count >= 5}
            />
          </div>
          {calibrationMeta.senior_fuse_applied && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#c07d7d] bg-[#f7e8e8] border border-[#e5c0c0] rounded-lg px-2 py-1">
              <AlertTriangle className="w-3 h-3" />
              <span>经历层级熔断已触发：JD 要求资深经验，但候选人背景为应届生/初级，经历相关性已封顶 55 分</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CalibrationItem({
  label,
  value,
  max,
  good,
  warning,
}: {
  label: string;
  value: number;
  max: number;
  good: boolean;
  warning?: boolean;
}) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  const color = warning ? "#c07d7d" : good ? "#56665f" : "#8a7962";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
