export function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* 模块一骨架：环形 + 三个进度条 */}
      <div className="glass-card rounded-2xl p-6">
        <div className="skeleton-bar h-5 w-40 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <div className="relative w-44 h-44">
              <div className="skeleton-bar w-full h-full rounded-full" />
            </div>
          </div>
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="skeleton-bar h-4 w-32" />
                  <div className="skeleton-bar h-4 w-10" />
                </div>
                <div className="skeleton-bar h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 模块二骨架：项目取舍看板 */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="skeleton-bar h-5 w-48" />
        {[1, 2, 3].map((b) => (
          <div key={b} className="space-y-3">
            <div className="skeleton-bar h-5 w-56" />
            <div className="space-y-2.5">
              {[1, 2].map((c) => (
                <div key={c} className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="skeleton-bar h-4 w-3/4" />
                  <div className="skeleton-bar h-3 w-full" />
                  <div className="skeleton-bar h-3 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 模块三骨架：关键词 Badge */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="skeleton-bar h-5 w-44" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton-bar h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* 模块四骨架：逐段 Diff */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="skeleton-bar h-5 w-52" />
        {[1, 2, 3].map((s) => (
          <div key={s} className="space-y-3 p-4 rounded-xl border border-slate-200">
            <div className="skeleton-bar h-4 w-28" />
            <div className="space-y-1.5">
              <div className="skeleton-bar h-3 w-full" />
              <div className="skeleton-bar h-3 w-11/12" />
              <div className="skeleton-bar h-3 w-4/5" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="skeleton-bar h-3 w-full" />
              <div className="skeleton-bar h-3 w-5/6" />
              <div className="skeleton-bar h-3 w-3/4" />
            </div>
            <div className="skeleton-bar h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
