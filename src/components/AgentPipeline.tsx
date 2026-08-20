import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Cpu, Sparkles } from "lucide-react";
import {
  PIPELINE_STAGES,
  type PipelineStageId,
  type PipelineStageUpdate,
} from "@/lib/aiService";

interface StageState {
  status: "pending" | "active" | "done";
  detail: string;
}

/** 阶段二实时思考流轮播文案（6 秒一条，淡入淡出） */
const THINKING_STREAM_TEXTS: string[] = [
  "🔍 正在识别原简历中的薄弱表述与高潜力经历...",
  "⚖️ 正在结合目标 JD 核心要求重塑项目叙事重心...",
  "✍️ 正在采用 STAR 原则深度精修项目行动与技术方案...",
  "🎯 正在规划可直接落地的 0 到 1 实战项目蓝图与步骤...",
  "📊 正在注入量化指标占位符与防幻觉核验...",
];

interface Props {
  /** true 表示流水线已启动（P1 请求已发） */
  running: boolean;
  /** 请求起始毫秒（用于显示耗时计时器），为 null 则重置 */
  startMs: number | null;
  /** 全部完成时刻（阶段四 done 的时间戳），用于冻结计时器；null=继续计时 */
  endMs: number | null;
  /** P1 是否已返回（用于在 5s 前提前跳到 35% 段；可缺省，靠真实时间也可工作） */
  phase1Arrived?: boolean;
}

/**
 * S-curve 平滑进度计算（适配 60-90s 真实深度生成周期）
 * 0~8s    : 0%  → 25%   (阶段一宏观诊断，线性推进)
 * 8~50s   : 25% → 75%   (阶段二 STAR/蓝图生成，匀速平稳 ~1.2%/s)
 * 50~80s  : 75% → 92%   (细腻微步推进，末端保持温和脉冲微光)
 * 80~120s : 92% → 97%   (超长等待期缓慢爬升，避免假死)
 * 120s+   : 97% (保持)
 * 完成时  : 100% 瞬间拉满并淡入呈现（与最终跳跃仅差 ≤3%，丝滑过渡）
 */
function computeProgress(elapsedMs: number, allDone: boolean): number {
  if (allDone) return 100;
  const s = elapsedMs / 1000;
  if (s < 0) return 0;
  if (s < 8) {
    // 0~8s 线性 0 → 25
    return Math.max(0, Math.min(25, (s / 8) * 25));
  }
  if (s < 50) {
    // 8~50s 平滑 25 → 75，用 ease-out 使曲线略呈 S
    const t = (s - 8) / 42; // 0..1
    const eased = t * (2 - t); // ease-out quad
    return 25 + eased * 50;
  }
  if (s < 80) {
    // 50~80s 细腻微步 75 → 92
    const t = (s - 50) / 30;
    return 75 + t * 17;
  }
  if (s < 120) {
    // 80~120s 超长等待期缓慢爬升 92 → 97（避免假死停滞）
    const t = (s - 80) / 40;
    return 92 + t * 5;
  }
  return 97;
}

export function AgentPipeline({ running, startMs, endMs, phase1Arrived }: Props) {
  const [stages, setStages] = useState<Record<PipelineStageId, StageState>>(() => ({
    1: { status: "pending", detail: "" },
    2: { status: "pending", detail: "" },
    3: { status: "pending", detail: "" },
    4: { status: "pending", detail: "" },
  }));
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // 本轮是否已完成（用于触发 100% 拉满 + 淡出）
  const [donePulse, setDonePulse] = useState(false);
  // 完成后 2s 淡出隐藏（在新一轮 startMs 变化时会被重置为 false）
  const [hidden, setHidden] = useState(false);
  // 阶段二实时思考流轮播索引
  const [thinkingIdx, setThinkingIdx] = useState(0);

  // Reset when a new run starts
  useEffect(() => {
    if (running && startMs != null) {
      setStages({
        1: { status: "active", detail: PIPELINE_STAGES[0].activeText },
        2: { status: "pending", detail: "" },
        3: { status: "pending", detail: "" },
        4: { status: "pending", detail: "" },
      });
      setProgress(0);
      setElapsed(0);
      setDonePulse(false);
      // 关键：重置 hidden，否则上一轮 2s 淡出后留下的 hidden=true 会让下一轮直接 return null
      setHidden(false);
      setThinkingIdx(0);
    }
  }, [running, startMs]);

  // External stage-update sink: aiService.ts → CustomEvent → 这里
  useEffect(() => {
    const sink = (e: Event) => {
      const ev = e as CustomEvent<PipelineStageUpdate>;
      const u = ev.detail;
      if (!u) return;
      setStages((prev) => ({
        ...prev,
        [u.stageId]: { status: u.status, detail: u.detail },
      }));
      // 不再用 stage 推送的 progress（值为 -1），交给 S-curve 统一驱动
    };
    const evName = "__jobfit_pipeline_update__";
    window.addEventListener(evName, sink as EventListener);
    return () => window.removeEventListener(evName, sink as EventListener);
  }, []);

  const allDone = useMemo(
    () => (Object.values(stages) as StageState[]).every((s) => s.status === "done"),
    [stages]
  );

  // 阶段一并发期：节点 1/2/3 同时 active
  const stage1Concurrent = useMemo(
    () =>
      stages[1].status === "active" &&
      stages[2].status === "active" &&
      stages[3].status === "active",
    [stages]
  );

  // 阶段二聚焦期：节点 1/2/3 已 done，节点 4 正在 active
  const stage2Active = useMemo(
    () =>
      stages[1].status === "done" &&
      stages[2].status === "done" &&
      stages[3].status === "done" &&
      stages[4].status === "active",
    [stages]
  );

  // 阶段二实时思考流轮播（6 秒切换一条，淡入淡出）
  useEffect(() => {
    if (!stage2Active) {
      setThinkingIdx(0);
      return;
    }
    const id = window.setInterval(
      () => setThinkingIdx((i) => (i + 1) % THINKING_STREAM_TEXTS.length),
      6000
    );
    return () => window.clearInterval(id);
  }, [stage2Active]);

  // 主驱动 rAF：每帧计算 elapsed + S-curve progress
  useEffect(() => {
    // 完成态兜底：父组件 setLoading(false) 会让 running 立即变 false，
    // 此时 rAF 早返回，但 donePulse 还没机会被设置 → 卡片永远停留 + 进度走不满 100%。
    // 这里在 effect 入口先做兜底：只要 allDone && !donePulse，无论 running 状态，立即拉满。
    if (allDone && !donePulse) {
      setProgress(100);
      setDonePulse(true);
    }
    if (!running || startMs == null) {
      if (endMs && startMs) {
        setElapsed((endMs - startMs) / 1000);
      }
      return;
    }
    let raf = 0;
    const tick = () => {
      const now = endMs ?? Date.now();
      const elapsedMs = now - startMs;
      setElapsed(elapsedMs / 1000);
      // 完成瞬间触发拉满 + 淡出
      if (allDone && !donePulse) {
        setProgress(100);
        setDonePulse(true);
      } else if (!donePulse) {
        setProgress(computeProgress(elapsedMs, allDone));
      }
      // 若已 endMs 锁定，不再 raf；否则继续
      if (!endMs && !donePulse) {
        raf = window.requestAnimationFrame(tick);
      } else if (donePulse) {
        // 完成后短暂保持 100% 再交给父组件卸载；无需继续 raf
      } else {
        raf = window.requestAnimationFrame(tick);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [running, startMs, endMs, allDone, donePulse]);

  // 完成后延迟 2s 隐藏（让 100% 拉满 + CSS 过渡 + 强光高亮充分展示）
  useEffect(() => {
    if (!donePulse) return;
    const t = window.setTimeout(() => setHidden(true), 2000);
    return () => window.clearTimeout(t);
  }, [donePulse]);

  if (!running && !allDone) return null;
  if (hidden) return null;

  const progressPct = Math.max(0, Math.min(100, progress));
  const showShimmer = !allDone && progressPct < 100;

  return (
    <section
      className={`glass-card rounded-2xl p-5 lg:p-6 mb-6 print:hidden transition-opacity duration-500 ${
        donePulse ? "opacity-90" : "opacity-100 animate-fade-in"
      }`}
      style={{ animationDelay: "60ms" }}
    >
      <header className="flex items-center gap-2.5 mb-4">
        <span className="w-9 h-9 rounded-lg bg-[#E4EBF0] flex items-center justify-center">
          <Cpu className="w-5 h-5" style={{ color: "#5F7387" }} strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {allDone ? "✅ 全维度诊断完成" : "Agent 推理流水线 · 双阶段并行"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {allDone
              ? "顶部诊断指标已就绪，建议体系正在平滑展开..."
              : "全维度人岗匹配 · STAR 行动蓝图与项目置换深度编排中"}
          </p>
        </div>
        {/* 右上角耗时提示：精简为清晰优雅的计时标签 */}
        <div
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm border"
          style={{
            background: allDone
              ? "linear-gradient(90deg, #EAF0EB, #DCE8DF)"
              : "linear-gradient(90deg, #FAF3EB, #F4E7D2)",
            borderColor: allDone ? "#c5d5cc" : "#e0cfb8",
          }}
        >
          <Clock
            className="w-3.5 h-3.5"
            style={{ color: allDone ? "#56665f" : "#9a7a3f" }}
          />
          <span
            className="font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: allDone ? "#4a5c52" : "#7a5f3a" }}
          >
            {allDone
              ? `⏱️ 共耗时 ${elapsed.toFixed(1)}s`
              : `⏱️ 已耗时 ${elapsed.toFixed(1)}s · 预计 60-90 秒`}
          </span>
        </div>
      </header>

      {/* S-curve 平滑进度条（60FPS rAF 驱动 + 短时 CSS 过渡兜底） */}
      <div className="relative h-2.5 rounded-full bg-[#EDE8F0] overflow-hidden mb-5 shadow-inner">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-150 ease-out"
          style={{
            width: `${progressPct}%`,
            background:
              "linear-gradient(90deg, #4A6B82 0%, #6E8B74 50%, #C48B71 100%)",
            boxShadow:
              "0 0 12px rgba(74,107,130,0.45), 0 0 8px rgba(196,139,113,0.25)",
          }}
        />
        {showShimmer && (
          <div
            className="absolute top-0 h-full w-20 animate-shimmer"
            style={{
              left: `${Math.max(0, progressPct - 12)}%`,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
            }}
          />
        )}
        {/* 末端微光脉冲呼吸（50s+ 末端 75→97% 阶段） */}
        {!allDone && progressPct >= 85 && (
          <div
            className="absolute top-0 h-full rounded-full animate-pulse-slow"
            style={{
              right: 0,
              width: "8%",
              background:
                "radial-gradient(circle, rgba(196,139,113,0.6) 0%, transparent 80%)",
            }}
          />
        )}
        {/* 100% 完成时的强光高亮（donePulse 触发） */}
        {donePulse && (
          <div
            className="absolute inset-0 rounded-full animate-fade-in"
            style={{
              background:
                "linear-gradient(90deg, #4A6B82 0%, #6E8B74 50%, #C48B71 100%)",
              boxShadow: "0 0 18px rgba(110,139,116,0.7)",
            }}
          />
        )}
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-5 right-[19px] h-0.5 bg-[#E4E3E8] rounded hidden lg:block" />
        <ol className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-3 relative z-[1]">
          {PIPELINE_STAGES.map((st, idx) => {
            const s = stages[st.id];
            const isDone = s.status === "done";
            const isActive = s.status === "active";
            // 节点 4 在阶段二聚焦期：增强高亮（金边更亮 + scale + 阴影更重）
            const isStage2Focus = stage2Active && st.id === 4;
            // 阶段一并发期：节点 1/2/3 的 detail 统一覆盖为「⚡ 并发多维计算中...」
            const isStage1Concurrent =
              stage1Concurrent && (st.id === 1 || st.id === 2 || st.id === 3);

            return (
              <li key={st.id} className="relative z-[1]">
                <div
                  className={[
                    "relative rounded-2xl p-3.5 border-1.5 transition-all duration-300",
                    isDone
                      ? "bg-gradient-to-br from-[#F2F6F3] to-[#E9F1EA] border-[#b8ccbf] shadow-[0_4px_18px_rgba(150,165,151,0.12)]"
                      : isStage2Focus
                      ? "bg-gradient-to-br from-[#FBF4E6] to-[#FFFFFF] border-[#c9a55c] shadow-[0_10px_32px_rgba(212,197,154,0.42)] scale-[1.025]"
                      : isActive
                      ? "bg-gradient-to-br from-[#F7F4EE] to-[#FFFFFF] border-[#d8c5a8] shadow-[0_6px_22px_rgba(212,197,154,0.22)]"
                      : "bg-white/60 border-[#E4E3E8] opacity-80",
                  ].join(" ")}
                  style={{ borderWidth: 1.5 }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className={[
                        "relative flex items-center justify-center w-9 h-9 rounded-xl text-[15px] flex-shrink-0 shadow-inner transition-transform duration-300",
                        isDone
                          ? "bg-gradient-to-br from-[#C8D8CC] to-[#96a597]"
                          : isStage2Focus
                          ? "bg-gradient-to-br from-[#E5C97A] to-[#b89060] scale-110"
                          : isActive
                          ? "bg-gradient-to-br from-[#E8DCC8] to-[#d4c59a]"
                          : "bg-gradient-to-br from-[#ECEAEF] to-[#DCD8E4]",
                      ].join(" ")}
                    >
                      {isDone ? (
                        <Check
                          className="w-4.5 h-4.5"
                          style={{ color: "#fff" }}
                          strokeWidth={2.8}
                        />
                      ) : (
                        <span>{st.icon}</span>
                      )}
                      {isActive && (
                        <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
                      )}
                      {isStage2Focus && (
                        <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={[
                          "text-[12.5px] font-bold leading-tight truncate",
                          isDone
                            ? "text-[#4a5c52]"
                            : isStage2Focus
                            ? "text-[#7a4f1a]"
                            : isActive
                            ? "text-[#7a5f3a]"
                            : "text-slate-500",
                        ].join(" ")}
                      >
                        {st.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Stage {idx + 1} / 4
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 border",
                      isDone
                        ? st.id === 4
                          ? "bg-[#FBF1DE]/90 border-[#d8b878] text-[#7a4f1a]"
                          : "bg-[#EAF0EB]/80 border-[#c5d8cc] text-[#4a5c52]"
                        : isStage2Focus
                        ? "bg-[#FBF1DE]/90 border-[#d8b878] text-[#7a4f1a]"
                        : isActive
                        ? "bg-[#FAF3EB]/80 border-[#e0cfb8] text-[#8a6b47]"
                        : "bg-slate-50/60 border-slate-200 text-slate-400",
                    ].join(" ")}
                  >
                    {isActive && (
                      <Sparkles
                        className="w-3 h-3 flex-shrink-0 animate-spin-slow"
                        style={{ color: "#b89060" }}
                      />
                    )}
                    <span
                      key={isStage2Focus ? `thinking-${thinkingIdx}` : `status-${st.id}-${s.status}`}
                      className="text-[11px] font-semibold leading-tight animate-fade-in"
                      style={{ minHeight: 14 }}
                    >
                      {s.status === "pending"
                        ? "等待中..."
                        : isStage1Concurrent
                        ? "⚡ 并发多维计算中..."
                        : isStage2Focus
                        ? THINKING_STREAM_TEXTS[thinkingIdx]
                        : st.id === 4 && isDone
                        ? "✅ 已完成 STAR 精修与自适应建议生成"
                        : s.detail || (isDone ? "已完成" : st.activeText)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Helper: dispatch pipeline update event from anywhere */
export function dispatchPipelineUpdate(update: PipelineStageUpdate): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("__jobfit_pipeline_update__", { detail: update })
    );
  } catch (_) {
    // ignore
  }
}
