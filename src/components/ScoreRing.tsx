interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({
  score,
  size = 176,
  strokeWidth = 14,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  // 根据分数区间选择颜色
  const getColor = (s: number) => {
    if (s >= 85) return { from: "#10b981", to: "#059669" }; // emerald
    if (s >= 70) return { from: "#0e8eff", to: "#0070e6" }; // brand blue
    if (s >= 55) return { from: "#f59e0b", to: "#d97706" }; // amber
    return { from: "#ef4444", to: "#dc2626" }; // rose
  };

  // 确定性 ID，避免 SSR/CSR hydration mismatch
  const gradId = `score-grad-${clamped}-${size}-${strokeWidth}`;
  const color = getColor(clamped);

  const getLabel = (s: number) => {
    if (s >= 85) return "高度匹配";
    if (s >= 70) return "整体契合";
    if (s >= 55) return "部分匹配";
    if (s >= 40) return "差距较大";
    return "匹配度低";
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ filter: "drop-shadow(0 8px 24px rgba(14,142,255,0.12))" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.from} />
            <stop offset="100%" stopColor={color.to} />
          </linearGradient>
        </defs>
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-5xl font-black tabular-nums text-slate-900 leading-none"
          style={{ color: '#2d3748' }}
        >
          {clamped}
          <span className="text-3xl font-bold text-slate-500 ml-0.5">%</span>
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-500">
          综合匹配度
        </div>
        <div
          className="mt-1.5 badge text-[11px] px-2.5 py-0.5"
          style={{
            background:
              clamped >= 70
                ? "rgba(14,142,255,0.08)"
                : clamped >= 55
                ? "rgba(245,158,11,0.1)"
                : "rgba(239,68,68,0.08)",
            color:
              clamped >= 70
                ? "#0070e6"
                : clamped >= 55
                ? "#d97706"
                : "#dc2626",
          }}
        >
          {getLabel(clamped)}
        </div>
      </div>
    </div>
  );
}
