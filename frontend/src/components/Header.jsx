const XP_PER_LEVEL = 500

// Segmented loading ring: one arc per daily task, filled left-to-right as tasks get done today.
function SegmentRing({ done, total }) {
  const size = 60
  const c = size / 2
  const r = 24
  const gap = 10 // degrees between segments

  function point(deg) {
    const rad = (deg * Math.PI) / 180
    return [c + r * Math.cos(rad), c + r * Math.sin(rad)]
  }

  function arc(i) {
    const sweep = 360 / total
    const [x1, y1] = point(-90 + i * sweep + gap / 2)
    const [x2, y2] = point(-90 + (i + 1) * sweep - gap / 2)
    const large = sweep - gap > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {total === 0 && (
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth="6" strokeDasharray="3 4" />
        )}
        {total === 1 && (
          <circle cx={c} cy={c} r={r} fill="none" strokeWidth="6"
            stroke={done >= 1 ? "var(--accent)" : "var(--line)"} />
        )}
        {total > 1 && Array.from({ length: total }, (_, i) => (
          <path
            key={i} d={arc(i)} fill="none" strokeWidth="6"
            stroke={i < done ? "var(--accent)" : "var(--line)"}
            style={i < done ? { filter: "drop-shadow(0 0 3px var(--glow))" } : undefined}
          />
        ))}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-pixel text-xs">
        {total === 0 ? "–" : done + "/" + total}
      </span>
    </div>
  )
}

export default function Header({ stats, tasks }) {
  // Overall level = total XP across all five stats
  const totalXp = stats.reduce((sum, s) => sum + s.xp, 0)
  const level = Math.floor(totalXp / XP_PER_LEVEL)
  const into = totalXp % XP_PER_LEVEL
  const pct = (into / XP_PER_LEVEL) * 100

  // Daily ring: tasks with a 1-day cooldown, counted as done if completed on today's local date
  const today = new Date().toDateString()
  const daily = tasks.filter((t) => t.cooldown_days === 1)
  const done = daily.filter(
    (t) => t.last_completed_at && new Date(t.last_completed_at + "Z").toDateString() === today
  ).length

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  })

  return (
    <div className="flex flex-col gap-2">
      <p className="text-right text-ink-muted text-sm">{dateLabel}</p>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-pixel text-3xl leading-none">LV {level}</p>
          <p className="text-ink-muted text-xs mt-1">{into} / {XP_PER_LEVEL} XP</p>
        </div>
        <SegmentRing done={done} total={daily.length} />
      </div>

      <div
        className="h-3 w-full"
        style={{ background: "var(--panel-alt)", border: "var(--bw) solid var(--line)", borderRadius: "var(--radius)" }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{ width: pct + "%", background: "var(--primary)", borderRadius: "var(--radius)" }}
        />
      </div>
    </div>
  )
}