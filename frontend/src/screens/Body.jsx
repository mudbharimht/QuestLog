import { useState, useEffect, useRef } from "react"
import { getMetrics, getRecentLogs, postLog, deleteLog, getBodyStatus } from "../api/client"

// --- Fixed anchor points where a body-zoned metric's bubble attaches ---
const ANCHORS = {
  head: { x: 100, y: 20, side: "right" },
  heart: { x: 118, y: 95, side: "right" },
  right_arm: { x: 150, y: 120, side: "right" },
  left_arm: { x: 50, y: 120, side: "left" },
  torso: { x: 100, y: 150, side: "left" },
  legs: { x: 100, y: 300, side: "left" },
}

// --- Coordinate helpers: figure space (viewBox units) <-> CSS percentages ---
const VB_X_MIN = -60
const VB_WIDTH = 320
const CARD_X = { left: -22, right: 222 }

function pct(x, y) {
  return { left: ((x - VB_X_MIN) / VB_WIDTH) * 100, top: (y / 400) * 100 }
}
function invPct(leftPercent, topPercent) {
  return { x: VB_X_MIN + (leftPercent / 100) * VB_WIDTH, y: (topPercent / 100) * 400 }
}
function stackY(anchorY, count) {
  if (count <= 1) return [anchorY]
  const spacing = 46
  const out = []
  for (let i = 0; i < count; i++) out.push(anchorY + (i - (count - 1) / 2) * spacing)
  return out
}

// --- Score -> color/animation mapping, shared by every bubble ---
function scoreColor(score) {
  if (score === null) return "var(--ink-muted)"
  if (score >= 70) return "#3ddc84"
  if (score >= 40) return "#ffcc4d"
  return "var(--accent)"
}
function scoreAnimClass(score) {
  if (score === null) return "zone-calm"
  if (score >= 70) return "zone-calm"
  if (score >= 40) return "zone-unsettled"
  return "zone-jittery"
}

// --- Drag-or-tap bubble: distinguishes a drag from a tap by movement distance ---
const DRAG_THRESHOLD = 6

// Tapping a bubble both filters the history table and opens the log sheet for that metric
function handleTap(metricId) {
  if (!metricId) return
  setFilterMetricId(metricId)
  openSheet(metricId)
}

function DraggableCard({ id, top, left, containerRef, onDrag, onTap, children }) {
  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = containerRef.current.getBoundingClientRect()
    const startX = e.clientX, startY = e.clientY
    const startTop = top, startLeft = left
    let moved = false

    function handleMove(ev) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved = true
      const newLeft = Math.min(100, Math.max(0, startLeft + (dx / rect.width) * 100))
      const newTop = Math.min(100, Math.max(0, startTop + (dy / rect.height) * 100))
      onDrag(id, newTop, newLeft)
    }
    function handleUp(ev) {
      ev.currentTarget.removeEventListener("pointermove", handleMove)
      ev.currentTarget.removeEventListener("pointerup", handleUp)
      if (!moved) onTap(id)
    }
    e.currentTarget.addEventListener("pointermove", handleMove)
    e.currentTarget.addEventListener("pointerup", handleUp)
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
      style={{ top: top + "%", left: left + "%", touchAction: "none" }}
    >
      {children}
    </div>
  )
}

export default function Body() {
  // --- data ---
  const [bodyMetrics, setBodyMetrics] = useState([]) // metrics with a body_part set, each carrying a live score
  const [metrics, setMetrics] = useState([])          // every metric, used for the log sheet's picker
  const [logs, setLogs] = useState([])
  const [filterMetricId, setFilterMetricId] = useState(null)
  const [error, setError] = useState(null)

  // --- bubble positions, draggable and saved per device ---
  const [positions, setPositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bodyCardPositions") || "{}") }
    catch { return {} }
  })
  const containerRef = useRef(null)

  // --- log sheet ---
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMetricId, setSheetMetricId] = useState(null)
  const [value, setValue] = useState("")
  const [note, setNote] = useState("")
  const [travelDate, setTravelDate] = useState("")

  async function loadMetrics() {
    try {
      setMetrics(await getMetrics())
    } catch (err) {
      setError(err.message)
    }
  }

  async function refresh() {
    try {
      const [scored, recentLogs] = await Promise.all([getBodyStatus(), getRecentLogs(50)])
      setBodyMetrics(scored)
      setLogs(recentLogs)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadMetrics()
    refresh()
  }, [])

  function handleDrag(metricId, top, left) {
    setPositions((prev) => {
      const next = { ...prev, [metricId]: { top, left } }
      localStorage.setItem("bodyCardPositions", JSON.stringify(next))
      return next
    })
  }

  function openSheet(metricId) {
    setSheetMetricId(metricId)
    setValue("")
    setNote("")
    setSheetOpen(true)
  }

  // Tapping a bubble both filters the history table and opens the log sheet for that metric
  function handleTap(metricId) {
    if (!metricId) return
    setFilterMetricId(metricId)
    openSheet(metricId)
  }

  function handleFabClick() {
    openSheet(sheetMetricId ?? filterMetricId ?? (loggableMetrics[0] && loggableMetrics[0].id) ?? null)
  }

  async function handleAdd(e) {
    e.preventDefault()
    try {
      setError(null)
      const timestamp = travelDate ? travelDate + "T12:00:00" : null
      await postLog(sheetMetricId, value, note, timestamp)
      setSheetOpen(false)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteLog(id) {
    try {
      await deleteLog(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  // --- group scored metrics by body part, and compute each bubble's on-screen position ---
  const grouped = {}
  for (const m of bodyMetrics) {
    if (!grouped[m.body_part]) grouped[m.body_part] = []
    grouped[m.body_part].push(m)
  }
  const cards = []
  for (const [part, group] of Object.entries(grouped)) {
    const anchor = ANCHORS[part] || { x: 100, y: 200, side: "left" }
    const cardX = CARD_X[anchor.side]
    const cardYs = stackY(anchor.y, group.length)
    group.forEach((m, i) => {
      const pos = positions[m.id] || pct(cardX, cardYs[i])
      cards.push({ metric: m, anchor, pos })
    })
  }

  const sheetMetric = metrics.find((m) => m.id === sheetMetricId) || null
  const loggableMetrics = metrics.filter((m) => m.role !== "energy" && m.role !== "mood")
  const visibleLogs = filterMetricId ? logs.filter((l) => l.metric_id === filterMetricId) : logs
  const sortedLogs = [...visibleLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const field = "bg-bg border-2 border-line px-3 py-2 text-ink w-full"

  return (
    <div className="flex flex-col gap-4 relative" style={{ paddingBottom: "80px" }}>
      {error && <p className="text-accent">{error}</p>}

      {/* Figure + bubbles */}
      <div
        ref={containerRef}
        className="px-panel relative overflow-visible mx-auto"
        style={{
          width: "100%", maxWidth: "360px",
          aspectRatio: `${VB_WIDTH} / 400`,
          background: "radial-gradient(ellipse at 50% 30%, var(--panel-alt), var(--bg))",
        }}
      >
        <svg viewBox={`${VB_X_MIN} 0 ${VB_WIDTH} 400`} className="absolute inset-0 w-full h-full">
          <defs>
            <filter id="figureGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Decorative low-poly figure, purely visual, no logic depends on these paths */}
          <g filter="url(#figureGlow)" stroke="var(--bg)" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M100,15 L78,45 L100,45 Z" fill="var(--facet-1)" />
            <path d="M100,15 L122,45 L100,45 Z" fill="var(--facet-2)" />
            <path d="M78,45 L100,45 L100,75 L88,68 Z" fill="var(--facet-2)" />
            <path d="M122,45 L100,45 L100,75 L112,68 Z" fill="var(--facet-3)" />
            <path d="M92,75 L108,75 L110,88 L90,88 Z" fill="var(--facet-3)" />
            <path d="M100,85 L62,96 L76,165 L100,165 Z" fill="var(--facet-1)" />
            <path d="M100,85 L138,96 L124,165 L100,165 Z" fill="var(--facet-2)" />
            <path d="M96,95 L100,88 L104,95 L100,150 Z" fill="var(--facet-hi)" />
            <path d="M100,165 L76,165 L74,182 L100,188 Z" fill="var(--facet-2)" />
            <path d="M100,165 L124,165 L126,182 L100,188 Z" fill="var(--facet-3)" />
            <path d="M74,182 L100,188 L94,258 L68,255 Z" fill="var(--facet-1)" />
            <path d="M68,255 L94,258 L90,338 L64,335 Z" fill="var(--facet-2)" />
            <path d="M64,335 L90,338 L92,350 L58,350 Z" fill="var(--facet-3)" />
            <path d="M100,188 L126,182 L132,255 L106,258 Z" fill="var(--facet-2)" />
            <path d="M106,258 L132,255 L136,335 L110,338 Z" fill="var(--facet-3)" />
            <path d="M136,335 L110,338 L108,350 L142,350 Z" fill="var(--facet-3)" />
            <path d="M62,96 L48,102 L38,150 L53,147 Z" fill="var(--facet-1)" />
            <path d="M38,150 L53,147 L46,204 L32,204 Z" fill="var(--facet-2)" />
            <path d="M32,204 L46,204 L44,216 L30,216 Z" fill="var(--facet-3)" />
            <path d="M138,96 L152,102 L162,150 L147,147 Z" fill="var(--facet-2)" />
            <path d="M162,150 L147,147 L154,204 L168,204 Z" fill="var(--facet-3)" />
            <path d="M168,204 L154,204 L156,216 L170,216 Z" fill="var(--facet-3)" />
          </g>

          {/* Dashed tails from each anchor point to its bubble */}
          {cards.map(({ metric, anchor, pos }) => {
            const tip = invPct(pos.left, pos.top)
            return (
              <line key={"line-" + metric.id} x1={anchor.x} y1={anchor.y} x2={tip.x} y2={tip.y}
                stroke={scoreColor(metric.score)} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
            )
          })}
          {Object.keys(grouped).map((part) => {
            const a = ANCHORS[part] || { x: 100, y: 200 }
            return <circle key={"dot-" + part} cx={a.x} cy={a.y} r="4" fill="var(--ink)" stroke="var(--bg)" strokeWidth="1" />
          })}
        </svg>

        {/* Draggable bubbles, one per body-zoned metric */}
        {cards.map(({ metric, pos }) => {
          const color = scoreColor(metric.score)
          return (
            <DraggableCard key={metric.id} id={metric.id} top={pos.top} left={pos.left}
              containerRef={containerRef} onDrag={handleDrag} onTap={handleTap}>
              <div
                className={"px-panel rounded-full flex flex-col items-center justify-center " + scoreAnimClass(metric.score)}
                style={{ width: "64px", height: "64px", borderColor: color, boxShadow: "0 0 12px 0 " + color }}
              >
                <span className="font-pixel text-[9px] text-center px-1" style={{ color }}>{metric.name}</span>
                <span className="font-pixel text-base" style={{ color }}>
                  {metric.score === null ? "–" : metric.score}
                </span>
              </div>
            </DraggableCard>
          )
        })}

        {/* Opens the log sheet; defaults to whatever metric was last used */}
        <button
          onClick={handleFabClick}
          className="absolute rounded-full flex items-center justify-center font-pixel text-2xl"
          style={{
            width: "48px", height: "48px", top: "10px", right: "10px",
            background: "var(--primary)", color: "var(--on-primary)",
            border: "var(--bw) solid var(--ink)", boxShadow: "var(--btn-shadow)", zIndex: 10,
          }}
        >
          +
        </button>
      </div>

      {/* Log history, filterable by tapping a bubble */}
      <div className="flex justify-between items-center">
        <p className="text-ink-muted text-sm">
          {filterMetricId ? "Showing: " + (metrics.find((m) => m.id === filterMetricId)?.name ?? "") : "Showing all logs"}
        </p>
        {filterMetricId && (
          <button className="px-btn" onClick={() => setFilterMetricId(null)}>Show all</button>
        )}
      </div>

      <div className="px-panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-pixel text-accent border-b-2 border-line">
              <th className="p-2">WHEN</th>
              <th className="p-2">METRIC</th>
              <th className="p-2">VALUE</th>
              <th className="p-2">NOTE</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((l) => {
              const when = new Date(l.timestamp + "Z")
              return (
                <tr key={l.id} className="border-b border-line">
                  <td className="p-2 text-ink-muted whitespace-nowrap">
                    {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </td>
                  <td className="p-2">{l.metric_name}</td>
                  <td className="p-2 font-pixel">{String(l.value_number ?? l.value_bool ?? l.value_text)}</td>
                  <td className="p-2 text-ink-muted">{l.note}</td>
                  <td className="p-2">
                    <button className="px-btn" onClick={() => handleDeleteLog(l.id)}>X</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Log sheet: backdrop + sliding panel */}
      <div
        onClick={() => setSheetOpen(false)}
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: sheetOpen ? 1 : 0,
          pointerEvents: sheetOpen ? "auto" : "none",
          zIndex: 50,
        }}
      />

      <div
        className="fixed left-0 right-0 bottom-0 px-panel transition-transform duration-300 flex flex-col gap-3 p-4"
        style={{
          transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          zIndex: 60,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <div className="flex justify-between items-center">
          <span className="font-pixel text-accent">LOG</span>
          <div className="flex justify-center items-center gap-2">
            <label className="px-btn relative inline-block">
              🕐 {travelDate
                ? new Date(travelDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : "Today"}
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                style={{ colorScheme: "dark" }}
              />
            </label>
            {travelDate && <button className="px-btn" onClick={() => setTravelDate("")}>Reset</button>}
            <button className="px-btn" onClick={() => setSheetOpen(false)}>X</button>
          </div>
        </div>

        <select
          value={sheetMetricId ?? ""}
          onChange={(e) => { setSheetMetricId(Number(e.target.value)); setValue("") }}
          className={field}
        >
          <option value="" disabled>Choose a metric</option>
          {loggableMetrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          {sheetMetric?.type === "boolean" ? (
            <select required value={value} onChange={(e) => setValue(e.target.value)} className={field}>
              <option value="">Choose...</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              required placeholder="Value" value={value}
              type={sheetMetric?.type === "number" ? "number" : "text"}
              step="any"
              min={sheetMetric?.min_value ?? undefined}
              max={sheetMetric?.max_value ?? undefined}
              onChange={(e) => setValue(e.target.value)}
              className={field}
            />
          )}
          <input
            placeholder="Note (optional)" value={note}
            onChange={(e) => setNote(e.target.value)} className={field}
          />
          <button type="submit" className="px-btn" disabled={!sheetMetricId}>Add log</button>
        </form>
      </div>
    </div>
  )
}