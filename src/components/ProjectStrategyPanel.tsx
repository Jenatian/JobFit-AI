import {
  Layers,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ArrowRightLeft,
} from "lucide-react";
import type { ProjectStrategy } from "@/lib/types";

interface Props {
  strategy: ProjectStrategy;
}

function SectionCard({
  color,
  icon: Icon,
  title,
  subtitle,
  items,
  renderItem,
}: {
  color: "emerald" | "rose" | "amber";
  icon: any;
  title: string;
  subtitle: string;
  items: any[];
  renderItem: (item: any, idx: number, c: any) => React.ReactNode;
}) {
  const palette: Record<string, { bg: string; border: string; chipBg: string; chipText: string; chipBorder: string; iconBg: string; iconColor: string; dot: string; text: string; textLight: string }> = {
    emerald: {
      bg: "from-[#EEF3EE] to-white",
      border: "border-[#C5D0C5]/70",
      chipBg: "bg-[#EAF0EB]",
      chipText: "text-[#6E8B74]",
      chipBorder: "border-[#C5D0C5]",
      iconBg: "bg-[#EAF0EB]",
      iconColor: "#6E8B74",
      dot: "bg-[#6E8B74]",
      text: "text-[#6E8B74]",
      textLight: "text-[#8A9F8F]",
    },
    rose: {
      bg: "from-[#F5ECEC] to-white",
      border: "border-[#E0C8C8]/70",
      chipBg: "bg-[#F5ECEC]",
      chipText: "text-[#C07D7D]",
      chipBorder: "border-[#E0C8C8]",
      iconBg: "bg-[#F5ECEC]",
      iconColor: "#C07D7D",
      dot: "bg-[#C07D7D]",
      text: "text-[#C07D7D]",
      textLight: "text-[#D49999]",
    },
    amber: {
      bg: "from-[#FAF3EB] to-white",
      border: "border-[#E8D4BE]/70",
      chipBg: "bg-[#FAF3EB]",
      chipText: "text-[#C48B71]",
      chipBorder: "border-[#E8D4BE]",
      iconBg: "bg-[#FAF3EB]",
      iconColor: "#C48B71",
      dot: "bg-[#C48B71]",
      text: "text-[#C48B71]",
      textLight: "text-[#D4A48C]",
    },
  };
  const c = palette[color];

  return (
    <div
      className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-5`}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center`}
        >
          <Icon className="w-4 h-4" style={{ color: c.iconColor }} strokeWidth={2.2} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span
          className={`ml-auto badge ${c.chipBg} ${c.chipText} border ${c.chipBorder} text-[11px]`}
        >
          {items.length} 条
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 text-center italic">
          暂无建议，保持现状即可 ✨
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white shadow-sm"
            >
              {renderItem(it, idx, c)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectStrategyPanel({ strategy }: Props) {
  const additions = strategy.recommended_additions || [];
  const removals = strategy.recommended_removals || [];
  const pivots = strategy.project_pivots || [];

  return (
    <section className="glass-card rounded-2xl p-6 lg:p-7 animate-slide-up" style={{ animationDelay: "60ms" }}>
      <header className="flex items-center gap-2.5 mb-6">
        <span className="w-9 h-9 rounded-lg bg-[#FAF3EB] flex items-center justify-center">
          <Layers className="w-5 h-5" style={{ color: '#C48B71' }} strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            模块二 · 项目经历战略取舍与置换看板
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add & Swap · Prune · Pivot — 让每一行简历都命中靶心
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          color="emerald"
          icon={CheckCircle2}
          title="🟢 推荐增补 / 置换"
          subtitle="Add & Swap：素材库 → 简历的最优搬运"
          items={additions}
          renderItem={(item, idx, c) => (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {item.project_name}
                </h4>
              </div>
              <div className="pl-3.5 space-y-2">
                <div>
                  <div className={`text-[11px] font-semibold ${c.text} mb-1`}>
                    为什么值得加
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {item.why_add || item.why_addition || item.reason}
                  </p>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-dashed border-[#d5d0c8]">
                  <ArrowRightLeft className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0`} style={{ color: c.textLight }} />
                  <div>
                    <div className={`text-[11px] font-semibold ${c.text} mb-1`}>
                      操作建议
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.action_advice || item.why_addition || item.action}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        />

        <SectionCard
          color="rose"
          icon={Trash2}
          title="🔴 建议删减 / 降权"
          subtitle="Prune：腾出版面，让高相关度项目喘口气"
          items={removals}
          renderItem={(item, idx, c) => (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {item.project_name}
                </h4>
              </div>
              <div className="pl-3.5">
                <div className={`text-[11px] font-semibold ${c.text} mb-1`}>
                  删减理由
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {item.why_remove}
                </p>
              </div>
            </div>
          )}
        />

        <SectionCard
          color="amber"
          icon={RefreshCw}
          title="🟡 叙事重心重构"
          subtitle="Pivot：不换项目，换个角度击穿 JD"
          items={pivots}
          renderItem={(item, idx, c) => (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {item.project_name}
                </h4>
              </div>
              <div className="pl-3.5">
                <div className={`text-[11px] font-semibold ${c.text} mb-1`}>
                  重构建议
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {item.pivot_advice}
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </section>
  );
}