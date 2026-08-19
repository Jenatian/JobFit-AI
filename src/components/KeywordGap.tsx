import { KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  keywords: string[];
}

export function KeywordGap({ keywords }: Props) {
  const list = keywords?.length ? keywords : [];
  return (
    <section
      className="glass-card rounded-2xl p-6 lg:p-7 animate-slide-up"
      style={{ animationDelay: "120ms" }}
    >
      <header className="flex items-center gap-2.5 mb-5">
        <span className="w-9 h-9 rounded-lg bg-[#F5ECEC] flex items-center justify-center">
          <KeyRound className="w-5 h-5" style={{ color: '#C07D7D' }} strokeWidth={2.2} />
        </span>
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            模块三 · 核心能力鸿沟
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Keywords Gap — JD 明确要求、但你简历中没有（或未强化）的关键技能标签
          </p>
        </div>
        {list.length > 0 && (
          <div className="flex items-center gap-1.5 badge bg-[#efe8e8] text-[#8a6b6b] border border-[#d5c8c8] text-[11px]">
            <AlertTriangle className="w-3 h-3" />
            缺失 {list.length} 项
          </div>
        )}
      </header>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sage-50 to-sage-100 border border-sage-200 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-sage-600" />
          </div>
          <div className="text-sm font-bold text-sage-700">
            关键词覆盖度满分
          </div>
          <div className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
            你的简历基本覆盖了 JD 中的所有核心技能关键词，继续聚焦在经历的叙事和量化成果上即可。
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {list.map((kw, i) => (
              <span
                key={`${kw}-${i}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-[#d5c8c8] bg-gradient-to-r from-[#efe8e8] to-[#f0ead8] px-3.5 py-1.5 text-sm font-medium text-[#8a6b6b] shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:from-[#e4d5d5] hover:to-[#e4dcc8] transition-all duration-200"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4a8a8] flex-shrink-0 animate-pulse" />
                {kw}
              </span>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-[#f5f4f1] via-white to-[#efe8e8]/40 border border-[#d5d0c8]/70">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#d5d0c8] flex items-center justify-center flex-shrink-0 text-base">
              🎯
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <b className="text-slate-800">落地建议：</b>
              不要生硬堆砌关键词，而是把它们{" "}
              <b className="text-[#8a6b6b]">埋入每一条项目的动作 / 成果句</b>
              里。例如把「我做了个搜索」改成
              「基于 <u>Elasticsearch</u> + <u>BGE Embedding</u> 搭建混合检索，<u>Top-K</u>{" "}
              准确率 +30%」——一句话补 3 个关键词。
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
