// Story 1.1 sample — proves the DESIGN.md tokens + dual-script fonts render.
// This is a scaffold placeholder; the real map (Story 1.2) replaces it.
export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-5xl font-medium tracking-tight">
            Mapsake
          </h1>
          <p className="font-serif text-lg italic text-text-muted">
            你走過的世界，留成回憶。
          </p>
        </header>

        {/* memory-card-like surface */}
        <section className="rounded-md border border-region-border bg-card p-6">
          <h2 className="font-serif text-2xl font-medium">京都 · Kyoto</h2>
          <p className="mt-1 text-sm text-text-muted">2022 年 4 月</p>
          <p className="mt-3 text-base leading-relaxed">
            第一天整天都在下雨，但我們一點也不介意——在車站附近找到了整趟旅程最好吃的拉麵。
          </p>

          <div className="mt-5 flex items-center gap-4">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              新增照片
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-terracotta-text hover:underline"
            >
              稍後再補充
            </button>
          </div>
        </section>

        {/* token swatches — visual proof the palette is wired */}
        <section className="flex flex-wrap gap-3">
          {[
            ["canvas", "bg-canvas border border-region-border"],
            ["surface", "bg-surface border border-region-border"],
            ["visited", "bg-region-visited"],
            ["terracotta-text", "bg-terracotta-text"],
            ["accent-glow", "bg-accent-glow"],
          ].map(([label, cls]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className={`h-12 w-12 rounded-md ${cls}`} />
              <span className="text-xs text-text-muted">{label}</span>
            </div>
          ))}
        </section>

        <p className="text-sm text-text-muted">
          Scaffold ready · light-only v1 · zh-TW primary. The map arrives in
          Story 1.2.
        </p>
      </div>
    </main>
  );
}
