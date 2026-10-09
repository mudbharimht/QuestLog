import { useState, useEffect, useRef } from "react";
import { getMetrics, getSuggestions, postLog, completeTask, getTasks, getRoomStatus } from "../api/client";

const ANCHORS = {
  discipline: { x: 65,  y: 215, side: "left"  },  // desk and computer
  mind:       { x: 163, y: 295, side: "left"  },  // briefcase
  social:     { x: 249, y: 80,  side: "right" },  // family photo
  order:      { x: 250, y: 345, side: "right" },  // laundry basket
  body:       { x: 205, y: 250, side: "right" },  // open space, no furniture yet
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

export default function Today() {
  const [energy, setEnergy] = useState(5)
  const [mood, setMood] = useState(5)
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState(null)
  const [zoneTask, setZoneTask] = useState([])
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)

  // --- bubble positions, draggable and saved per device ---
  const [positions, setPositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("roomCardPositions") || "{}") }
    catch { return {} }
  })
  const containerRef = useRef(null)


  async function refresh() {
    try {
      const [scored, recentTask] = await Promise.all([getRoomStatus(), getTasks()])
      setZoneTask(scored)
      setTasks(recentTask)
    } catch (err) {
      setError(err.message)
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  function handleDrag(taskId, top, left) {
    setPositions((prev) => {
      const next = { ...prev, [taskId]: { top, left } }
      localStorage.setItem("roomCardPositions", JSON.stringify(next))
      return next
    })
  }
   // Tapping a bubble both filters the history table and opens the log sheet for that metric
 function handleTap(taskId) {
  if (!taskId) return
  const found = tasks.find((t) => t.id === taskId)
  setSelectedTask(found || null)
}
  async function handleDone(taskId) {
    try {
      setError(null)
      const metrics = await getMetrics()
      const energyMetric = metrics.find((m) => m.role === "energy")
      const moodMetric = metrics.find((m) => m.role === "mood")
      if (!energyMetric || !moodMetric) {
        setError("energy or mood metric is missing or its role is not set")
        return
      }
      await completeTask(taskId)

      await postLog(energyMetric.id, energy, "")
      await postLog(moodMetric.id, mood, "")
      setSuggestions(suggestions.filter((s) => s.id !== taskId))
      await refresh()
    } catch (err) {
      setError(err.message)

    }
  }

  async function handleCheckIn() {
    try {
      setError(null)
      const result = await getSuggestions(energy, mood)
      setSuggestions(result)
    } catch (err) {
      setError(err.message)
    }
  }
  // --- group scored tasks by zone part, and compute each bubble's on-screen position ---
  const grouped = {}
  for (const m of zoneTask) {
    if (!grouped[m.room_zone]) grouped[m.room_zone] = []
    grouped[m.room_zone].push(m)
  }
  const cards = []
  for (const [part, group] of Object.entries(grouped)) {
    const anchor = ANCHORS[part] || { x: 100, y: 200, side: "left" }
    const cardX = CARD_X[anchor.side]
    const cardYs = stackY(anchor.y, group.length)
    group.forEach((m, i) => {
      const pos = positions[m.id] || pct(cardX, cardYs[i])
      cards.push({ task: m, anchor, pos })
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-accent">{error}</p>}
      <div
        ref={containerRef}
        className="px-panel relative overflow-visible mx-auto"
        style={{
          width: "100%", maxWidth: "360px",
          aspectRatio: `${VB_WIDTH} / 400`,
          background: "radial-gradient(ellipse at 50% 30%, var(--panel-alt), var(--bg))",
        }}
      >
        <svg viewBox={`${VB_X_MIN} 0 ${VB_WIDTH} 500`} className="absolute inset-0 w-full h-full">
          <defs>
            <filter id="roomGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <rect x={VB_X_MIN} y="320" width={VB_WIDTH} height="80" fill="var(--facet-3)" opacity="0.5" />
          <line x1={VB_X_MIN} y1="320" x2={VB_X_MIN + VB_WIDTH} y2="320" stroke="var(--line)" strokeWidth="2" />

          <g filter="url(#roomGlow)" stroke="var(--bg)" strokeWidth="1.5" strokeLinejoin="round">
            {/* Computer desk */}
            <rect x="30" y="260" width="70" height="8" fill="var(--facet-2)" />
            <rect x="35" y="268" width="6" height="52" fill="var(--facet-3)" />
            <rect x="89" y="268" width="6" height="52" fill="var(--facet-3)" />
            <rect x="45" y="205" width="40" height="30" rx="2" fill="var(--facet-1)" />
            <rect x="50" y="210" width="30" height="20" fill="var(--bg)" />
            <rect x="60" y="235" width="10" height="8" fill="var(--facet-2)" />
            <rect x="52" y="243" width="26" height="4" fill="var(--facet-2)" />

            {/* Briefcase */}
            <rect x="140" y="290" width="46" height="32" rx="3" fill="var(--facet-2)" />
            <rect x="155" y="280" width="16" height="12" rx="2" fill="none" stroke="var(--facet-2)" strokeWidth="4" />
            <rect x="140" y="303" width="46" height="4" fill="var(--facet-3)" />
            <circle cx="163" cy="306" r="3" fill="var(--facet-hi)" />

            {/* Family photo, wall-mounted */}
            <rect x="220" y="60" width="58" height="46" rx="2" fill="var(--facet-1)" strokeWidth="3" />
            <rect x="228" y="68" width="42" height="30" fill="var(--facet-3)" />
            <circle cx="240" cy="84" r="6" fill="var(--facet-hi)" />
            <circle cx="256" cy="84" r="6" fill="var(--facet-hi)" />
            <path d="M232,94 Q240,86 248,94 Z" fill="var(--facet-hi)" />
            <path d="M248,94 Q256,86 264,94 Z" fill="var(--facet-hi)" />

            {/* Laundry basket */}
            <path d="M225,330 L275,330 L268,370 L232,370 Z" fill="var(--facet-2)" />
            <line x1="231" y1="340" x2="269" y2="340" stroke="var(--facet-3)" strokeWidth="2" />
            <line x1="229" y1="352" x2="271" y2="352" stroke="var(--facet-3)" strokeWidth="2" />
            <path d="M232,330 Q250,310 268,330 Z" fill="var(--facet-1)" opacity="0.85" />
            <path d="M238,330 Q250,314 262,330 Z" fill="var(--facet-hi)" opacity="0.7" />
          </g>
          {/* Dashed tails from each anchor point to its bubble */}
          {cards.map(({ task, anchor, pos }) => {
            const tip = invPct(pos.left, pos.top)
            return (
              <line key={"line-" + task.id} x1={anchor.x} y1={anchor.y} x2={tip.x} y2={tip.y}
                stroke={scoreColor(task.score)} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
            )
          })}
          {Object.keys(grouped).map((part) => {
            const a = ANCHORS[part] || { x: 100, y: 200 }
            return <circle key={"dot-" + part} cx={a.x} cy={a.y} r="4" fill="var(--ink)" stroke="var(--bg)" strokeWidth="1" />
          })}
        </svg>
        {/* Draggable bubbles, one per body-zoned task */}
        {cards.map(({ task, pos }) => {
          const color = scoreColor(task.score)
          return (
            <DraggableCard key={task.id} id={task.id} top={pos.top} left={pos.left}
              containerRef={containerRef} onDrag={handleDrag} onTap={handleTap}>
              <div
                className={"px-panel rounded-full flex flex-col items-center justify-center " + scoreAnimClass(task.score)}
                style={{ width: "64px", height: "64px", borderColor: color, boxShadow: "0 0 12px 0 " + color }}
              >
                <span className="font-pixel text-[9px] text-center px-1" style={{ color }}>{task.title}</span>
                <span className="font-pixel text-base" style={{ color }}>
                  {task.score === null ? "–" : task.score}
                </span>
              </div>
            </DraggableCard>
          )
        })}
      </div>
      {selectedTask && (
  <div className="px-panel p-3 flex justify-between items-center gap-3">
    <div>
      <p className="font-pixel">{selectedTask.title}</p>
      <p className="text-ink-muted text-sm">E {selectedTask.energyCost} · M {selectedTask.moodCost}</p>
    </div>
    <div className="flex gap-2">
      <button
        className="px-btn"
        onClick={() => { handleDone(selectedTask.id); setSelectedTask(null) }}
      >
        Done
      </button>
      <button className="px-btn" onClick={() => setSelectedTask(null)}>Close</button>
    </div>
  </div>
)}
      <div className="px-panel p-4 flex flex-col gap-4">
        <label className="block">
          <span className="font-pixel text-accent">ENERGY {energy}</span>
          <input
            type="range" min="1" max="10" value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </label>

        <label className="block">
          <span className="font-pixel text-accent">MOOD {mood}</span>
          <input
            type="range" min="1" max="10" value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </label>

        <button className="px-btn" onClick={handleCheckIn}>Check in</button>
      </div>

      {error && <p className="text-accent">{error}</p>}

      <div className="flex flex-col gap-3">
        {suggestions.map((s, i) => (
          <div key={s.id} className={"px-panel p-3 " + (i === 0 ? "px-glow" : "")}>
            <div>
              <p className="font-pixel">{s.title}</p>
              <p className="text-ink-muted text-sm">E {s.energyCost} · M {s.moodCost}</p>
            </div>
            <button className="px-btn" onClick={() => handleDone(s.id)}>Done</button>
          </div>
        ))}
      </div>
    </div>
  )
}