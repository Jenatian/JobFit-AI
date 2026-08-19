import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  PlayCircle,
  Download,
  Copy,
  Printer,
  Trash2,
  ChevronDown,
  Check,
  FileText,
} from "lucide-react";
import { generateMarkdownReport } from "@/lib/storage";
import type { AnalysisResult } from "@/lib/types";

interface HeaderProps {
  onLoadDemo: () => void;
  onClearAll: () => void;
  result: AnalysisResult | null;
  context: { resume: string; jd: string; extraProjects: string };
  onToast: (title: string, message: string) => void;
}

export function Header({
  onLoadDemo,
  onClearAll,
  result,
  context,
  onToast,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCopyMarkdown = async () => {
    if (!result) return;
    try {
      const md = generateMarkdownReport(result, context);
      await navigator.clipboard.writeText(md);
      onToast("导出成功", "Markdown 报告已复制到剪贴板");
    } catch {
      onToast("导出失败", "无法访问剪贴板，请手动复制");
    }
    setMenuOpen(false);
  };

  const handlePrint = () => {
    if (!result) return;
    setMenuOpen(false);
    window.print();
  };

  const hasResult = !!result;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-[#d5d0c8]/60 print:static print:bg-white print:backdrop-blur-0">
      <div className="max-w-[1800px] w-full mx-auto px-4 md:px-6 lg:px-10 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A6B82] to-[#3B5569] flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.4} />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#4a4a4a] via-[#56665f] to-[#6b7f7a] bg-clip-text text-transparent truncate">
                JobFit AI
              </h1>
              <span className="badge bg-sage-50 text-sage-700 border border-sage-200">
                Beta
              </span>
            </div>
            <p className="text-xs text-[#8a8a8a] leading-tight mt-0.5 truncate max-w-[280px] sm:max-w-md">
              基于大模型的简历-JD 智能深度对齐与改写工作台
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onLoadDemo}
            className="btn-ghost group"
            type="button"
          >
            <PlayCircle className="w-4 h-4 text-sage-600 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">加载演示</span>
            <span className="hidden md:inline text-xs text-[#a8a298] pl-1 border-l border-[#d5d0c8] ml-1">
              AI 产品经理
            </span>
          </button>

          <button
            onClick={onClearAll}
            className="btn-ghost group !px-3"
            type="button"
            title="清空所有输入和结果"
          >
            <Trash2 className="w-4 h-4 text-[#8a8a8a] group-hover:text-[#b8a68a] transition-colors" />
            <span className="hidden sm:inline">清空</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              disabled={!hasResult}
              className={`btn-ghost group !px-3 ${!hasResult ? "opacity-50 cursor-not-allowed" : ""}`}
              type="button"
              title={hasResult ? "导出诊断报告" : "请先生成诊断结果"}
            >
              <Download className="w-4 h-4 text-sage-600" />
              <span className="hidden sm:inline">导出报告</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#a8a298] transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && hasResult && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-[#d5d0c8] py-2 z-50 animate-[slideIn_0.15s_ease-out]">
                <button
                  onClick={handleCopyMarkdown}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#f5f4f1] transition-colors"
                  type="button"
                >
                  <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
                    <Copy className="w-4 h-4 text-sage-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">复制 Markdown 报告</div>
                    <div className="text-[11px] text-[#a8a298]">
                      复制完整报告到剪贴板
                    </div>
                  </div>
                </button>

                <div className="h-px bg-[#ebe7df] my-1" />

                <button
                  onClick={handlePrint}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#f5f4f1] transition-colors"
                  type="button"
                >
                  <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
                    <Printer className="w-4 h-4 text-sage-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">📥 导出 PDF 报告</div>
                    <div className="text-[11px] text-[#a8a298]">
                      专业 A4 排版，通过浏览器保存为 PDF
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
