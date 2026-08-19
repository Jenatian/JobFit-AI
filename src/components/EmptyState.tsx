import { Sparkles, ArrowRight, Wand2 } from "lucide-react";

export function EmptyState() {
  return (
    <div className="h-full min-h-[600px] flex items-center justify-center px-8">
      <div className="max-w-2xl w-full text-center animate-fade-in">
        {/* 装饰圆环 */}
        <div className="relative mx-auto w-40 h-40 mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sage-100 via-sand-100 to-dusty-100 animate-pulse-slow" />
          <div className="absolute inset-3 rounded-full bg-white/70 backdrop-blur-sm border border-white shadow-xl flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4A6B82] to-[#3B5569] flex items-center justify-center shadow-lg shadow-[#4A6B82]/25">
              <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
          </div>
          {/* 三个浮动图标 */}
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-white shadow-lg border border-[#d5d0c8] flex items-center justify-center rotate-12">
            <span className="text-lg">📄</span>
          </div>
          <div className="absolute -bottom-1 -left-3 w-10 h-10 rounded-xl bg-white shadow-lg border border-[#d5d0c8] flex items-center justify-center -rotate-12">
            <span className="text-lg">🎯</span>
          </div>
          <div className="absolute top-1/2 -right-5 w-10 h-10 rounded-xl bg-white shadow-lg border border-[#d5d0c8] flex items-center justify-center">
            <span className="text-lg">✨</span>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">
          等待开始你的简历智能诊断
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          在左侧填入「简历」与「目标岗位 JD」，点击下方的
          <span className="font-semibold text-sage-700 mx-1">
            🚀 开始分析
          </span>
          按钮，AI 将从 4 大维度为你输出深度对齐报告。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {[
            {
              icon: "🎯",
              title: "匹配度诊断",
              desc: "综合得分 + 技能 / 经历 / 量化三维度",
            },
            {
              icon: "♻️",
              title: "项目取舍看板",
              desc: "增补 / 删减 / 重心重构三大策略",
            },
            {
              icon: "🔑",
              title: "关键词鸿沟",
              desc: "直击 JD 要求但你简历漏掉的关键技能",
            },
            {
              icon: "✍️",
              title: "逐段 Diff 改写",
              desc: "原描述 → 优化版 + 改写理由 + 一键复制",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group p-3.5 rounded-xl bg-white/60 border border-[#d5d0c8]/80 hover:bg-white hover:border-sage-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-sage-700 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-dashed border-[#d5d0c8]">
          <p className="text-xs text-[#a8a298] flex items-center justify-center gap-2">
            <Wand2 className="w-3.5 h-3.5" />
            <span>没有数据？试试右上角的</span>
            <span className="inline-flex items-center gap-1 text-sage-600 font-medium">
              加载演示样例 <ArrowRight className="w-3 h-3" />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
