import { useState, useCallback, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { InputPanel } from "@/components/InputPanel";
import { ResultPanel } from "@/components/ResultPanel";
import { PrintReport } from "@/components/PrintReport";
import { AgentPipeline, dispatchPipelineUpdate } from "@/components/AgentPipeline";
import { demoResume, demoJD, demoExtraProjects } from "@/lib/demo-data";
import { loadFromStorage, saveToStorage, clearStorage } from "@/lib/storage";
import {
  analyzePhase1,
  analyzePhase2,
  type Phase1Result,
} from "@/lib/aiService";
import type { AnalysisResult } from "@/lib/types";
import type { PipelineStageUpdate } from "@/lib/aiService";

interface ToastState {
  visible: boolean;
  type: "error" | "success" | "info";
  title: string;
  message: string;
}

function ErrorToast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(onClose, 8000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, onClose]);

  if (!toast.visible) return null;

  const bgColor =
    toast.type === "error"
      ? "from-[#b8a68a] to-[#a89578]"
      : toast.type === "success"
        ? "from-[#7d8e7f] to-[#6b7f7a]"
        : "from-[#a8b8c8] to-[#8ea3b5]";

  const icon =
    toast.type === "error" ? "⛔" : toast.type === "success" ? "✅" : "ℹ️";

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-[slideIn_0.3s_ease-out]"
      role="alert"
    >
      <div
        className={`flex items-start gap-3 bg-gradient-to-r ${bgColor} text-white rounded-xl shadow-2xl px-5 py-4 w-full`}
      >
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-1">{toast.title}</div>
          <div className="text-xs leading-relaxed opacity-95 break-words whitespace-pre-line">
            {toast.message}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors flex-shrink-0 text-lg leading-none"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [resume, setResume] = useState("");
  const [jd, setJD] = useState("");
  const [extraProjects, setExtraProjects] = useState("");
  // loading = true 表示并行请求未全部结束（P1+P2任一未完成仍loading）
  const [loading, setLoading] = useState(false);
  // p1Done = P1 返回后立即置 true（用于让 LoadingSkeleton 立刻消失）
  const [phase1Result, setPhase1Result] = useState<Phase1Result | null>(null);
  const [phase2Suggestions, setPhase2Suggestions] = useState<
    AnalysisResult["suggestions"] | null
  >(null);
  // 兼容老合成完整 result（如 demo / 历史缓存 / 单请求）
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [requestStartMs, setRequestStartMs] = useState<number | null>(null);
  const [requestEndMs, setRequestEndMs] = useState<number | null>(null);
  const [resultKey, setResultKey] = useState<number>(0);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "error",
    title: "",
    message: "",
  });
  const isHydrating = useRef(true);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setResume(stored.resume || "");
      setJD(stored.jd || "");
      setExtraProjects(stored.extraProjects || "");
      setResult(stored.result || null);
      if (stored.resume || stored.jd || stored.result) {
        setToast({
          visible: true,
          type: "info",
          title: "数据已恢复",
          message: "已从上次会话恢复你的输入和诊断结果",
        });
        setTimeout(() => {
          setToast((p) => ({ ...p, visible: false }));
        }, 4000);
      }
    }
    isHydrating.current = false;
  }, []);

  useEffect(() => {
    if (isHydrating.current) return;
    saveToStorage({ resume, jd, extraProjects, result });
  }, [resume, jd, extraProjects, result]);

  const showErrorToast = useCallback((title: string, message: string) => {
    setToast({ visible: true, type: "error", title, message });
  }, []);

  const showSuccessToast = useCallback((title: string, message: string) => {
    setToast({ visible: true, type: "success", title, message });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleLoadDemo = useCallback(() => {
    setResume(demoResume);
    setJD(demoJD);
    setExtraProjects(demoExtraProjects);
    setResult(null);
    setPhase1Result(null);
    setPhase2Suggestions(null);
  }, []);

  const handleClearAll = useCallback(() => {
    if (!confirm("确定要清空所有输入和结果吗？此操作不可撤销。")) return;
    setResume("");
    setJD("");
    setExtraProjects("");
    setResult(null);
    setPhase1Result(null);
    setPhase2Suggestions(null);
    clearStorage();
    showSuccessToast("已清空", "所有输入和诊断结果已清空");
  }, [showSuccessToast]);

  const handleSubmit = useCallback(async () => {
    if (!resume.trim() || !jd.trim()) return;
    const startAt = Date.now();
    setRequestStartMs(startAt);
    setRequestEndMs(null);
    setLoading(true);
    setResult(null);
    setPhase1Result(null);
    setPhase2Suggestions(null);
    setToast((prev) => ({ ...prev, visible: false }));

    const payload = {
      resume: resume.trim(),
      jd: jd.trim(),
      extra_projects: extraProjects.trim(),
    };

    // Wire: aiService.callback → CustomEvent → AgentPipeline sink
    const onStage = (u: PipelineStageUpdate) => dispatchPipelineUpdate(u);

    console.log(
      `[前端] 双阶段并行提交: resume=${payload.resume.length}字, jd=${payload.jd.length}字, extra=${payload.extra_projects.length}字`
    );

    let p1: Phase1Result | null = null;
    let p1Error: Error | null = null;

    // === 双阶段同时发起（真正并行）：Promise.allSettled 结构但各自处理 ===
    // P1 先回 -> 立刻渲染仪表盘+战略+关键词（2~3s即达，不再假等）
    // P2 后回 -> 渲染建议卡片
    const p1Promise = (async () => {
      try {
        const p = await analyzePhase1(
          payload.resume,
          payload.jd,
          payload.extra_projects,
          onStage
        );
        p1 = p;
        setPhase1Result(p);
        setResultKey((k) => k + 1);
        console.log(
          `[前端][P1] ${Date.now() - startAt}ms, score=${p.match_score}, missing=${p.missing_keywords.length}`
        );
        return { ok: true, p } as const;
      } catch (e: any) {
        p1Error = e;
        return { ok: false, err: e } as const;
      }
    })();

    // P2 需要画像上下文才能分流精准 → 等待 P1 完成后携带 P1 结果调用
    // 但依然并行于用户体验：P1 到就显示前三模块，P2 再补最后
    const p2Promise = (async () => {
      try {
        // 等待 P1 画像结果（~2-3s）
        const p1Out = await p1Promise;
        if (!p1Out.ok) {
          // P1 已失败：P2 不跑（统一抛错交给外层合并处理）
          return { ok: false, skip: true } as const;
        }
        const suggestions = await analyzePhase2(
          payload.resume,
          payload.jd,
          payload.extra_projects,
          p1Out.p,
          onStage
        );
        setPhase2Suggestions(suggestions);
        console.log(
          `[前端][P2] ${Date.now() - startAt}ms, suggestions=${suggestions.length}`
        );
        return { ok: true, suggestions } as const;
      } catch (e: any) {
        return { ok: false, err: e } as const;
      }
    })();

    try {
      const [p1OutFinal, p2OutFinal] = await Promise.all([p1Promise, p2Promise]);
      const endAt = Date.now();
      setRequestEndMs(endAt);

      if (!p1OutFinal.ok) {
        throw p1OutFinal.err instanceof Error ? p1OutFinal.err : new Error(String(p1OutFinal.err || "阶段一失败"));
      }
      if (!p2OutFinal.ok) {
        if ((p2OutFinal as any).skip) {
          // P1 failed already, was thrown above
        } else {
          throw p2OutFinal.err instanceof Error
            ? p2OutFinal.err
            : new Error(String((p2OutFinal as any).err || "阶段二失败"));
        }
      }

      // 合并为完整 AnalysisResult（用于缓存、打印）
      const full: AnalysisResult = {
        ...p1OutFinal.p,
        suggestions: (p2OutFinal as any).suggestions ?? [],
      } as AnalysisResult;
      setResult(full);
      console.log(
        `[前端] 双阶段全部完成 ${endAt - startAt}ms, score=${full.match_score}, suggestions=${full.suggestions.length}`
      );
    } catch (e: any) {
      console.error("[前端] AI 调用失败:", e?.message || e);
      setRequestEndMs(Date.now());
      // 回滚：清空中间态（避免停在 P1 成功 P2 失败的"半截"）
      setPhase1Result(null);
      setPhase2Suggestions(null);
      showErrorToast(
        e?.message?.includes("API Key")
          ? "API Key 未配置"
          : e?.message?.includes("网络异常")
            ? "网络异常"
            : e?.message?.includes("阶段一") || e?.message?.includes("阶段二")
              ? "AI 返回异常"
              : "分析失败",
        e?.message ||
          "AI 调用失败，请稍后重试。若反复失败，请检查 API Key 配置。"
      );
    } finally {
      setLoading(false);
    }
  }, [resume, jd, extraProjects, showErrorToast]);

  return (
    <>
      <div className="min-h-screen flex flex-col app-main">
        <ErrorToast toast={toast} onClose={closeToast} />

        <Header
          onLoadDemo={handleLoadDemo}
          onClearAll={handleClearAll}
          result={result}
          context={{ resume, jd, extraProjects }}
          onToast={showSuccessToast}
        />

        <main className="flex-1 w-full px-4 md:px-6 lg:px-10 py-6">
          <div className="max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <section className="lg:col-span-5 xl:col-span-4">
                <div className="lg:sticky lg:top-24 glass-card rounded-2xl p-5 sm:p-6 w-full">
                  <InputPanel
                    resume={resume}
                    jd={jd}
                    extraProjects={extraProjects}
                    loading={loading}
                    onChangeResume={setResume}
                    onChangeJD={setJD}
                    onChangeExtra={setExtraProjects}
                    onSubmit={handleSubmit}
                  />
                </div>
              </section>

              <section className="lg:col-span-7 xl:col-span-8 min-w-0">
                <AgentPipeline
                  running={loading}
                  startMs={requestStartMs}
                  endMs={requestEndMs}
                />
                <ResultPanel
                  result={result}
                  phase1Result={phase1Result}
                  phase2Suggestions={phase2Suggestions}
                  loading={loading && !phase1Result && !result}
                  resultKey={resultKey}
                />
              </section>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#d5d0c8]/60 mt-10">
          <div className="max-w-[1800px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8a8a8a]">
            <div>
              © {new Date().getFullYear()} JobFit AI · 基于大模型的简历-JD
              智能对齐工作台
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by Vite · React · Tailwind · Lucide</span>
            </div>
          </div>
        </footer>
      </div>

      {result && (
        <div id="print-report-root" className="print-report-wrapper">
          <PrintReport
            result={result}
            context={{ resume, jd, extraProjects }}
          />
        </div>
      )}
    </>
  );
}
