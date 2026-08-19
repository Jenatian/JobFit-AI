import { useState, useCallback, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { InputPanel } from "@/components/InputPanel";
import { ResultPanel } from "@/components/ResultPanel";
import { PrintReport } from "@/components/PrintReport";
import { demoResume, demoJD, demoExtraProjects } from "@/lib/demo-data";
import { loadFromStorage, saveToStorage, clearStorage } from "@/lib/storage";
import { analyzeResume } from "@/lib/aiService";
import type { AnalysisResult } from "@/lib/types";

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
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
  }, []);

  const handleClearAll = useCallback(() => {
    if (!confirm("确定要清空所有输入和结果吗？此操作不可撤销。")) return;
    setResume("");
    setJD("");
    setExtraProjects("");
    setResult(null);
    clearStorage();
    showSuccessToast("已清空", "所有输入和诊断结果已清空");
  }, [showSuccessToast]);

  const handleSubmit = useCallback(async () => {
    if (!resume.trim() || !jd.trim()) return;
    setLoading(true);
    setResult(null);
    setToast((prev) => ({ ...prev, visible: false }));

    const payload = {
      resume: resume.trim(),
      jd: jd.trim(),
      extra_projects: extraProjects.trim(),
    };

    console.log(
      `[前端] 提交分析请求: resume=${payload.resume.length}字, jd=${payload.jd.length}字, extra=${payload.extra_projects.length}字`
    );

    try {
      const data = await analyzeResume(
        payload.resume,
        payload.jd,
        payload.extra_projects
      );
      console.log(
        `[前端] 分析成功: match_score=${data?.match_score ?? "N/A"}`
      );
      setResult(data);
    } catch (e: any) {
      console.error("[前端] AI 调用失败:", e?.message || e);
      showErrorToast(
        e?.message?.includes("API Key")
          ? "API Key 未配置"
          : e?.message?.includes("网络异常")
            ? "网络异常"
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
                <ResultPanel result={result} loading={loading} />
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
