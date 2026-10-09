import { useState, useEffect } from "react"
import { getTasks, createTask, completeTask, deleteTask, resetTask } from "../api/client"

// Cooldown presets: days until a completed task becomes available again. 0 = one-time.
const cooldownOptions = [
  { label: "One-time", days: 0 },
  { label: "Daily", days: 1 },
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Every 3 months", days: 90 },
  { label: "Every 6 months", days: 182 },
  { label: "Yearly", days: 365 },
]

// Which Room bubble this task shows up as, if any.
const roomZoneOptions = ["", "discipline", "body", "mind", "order", "social"]

function cooldownLabel(days) {
  const match = cooldownOptions.find((o) => o.days === days)
  if (match) return match.label
  return days ? "Every " + days + " days" : "One-time"
}

// Works out whether a task is currently on cooldown, and how many days remain.
function cooldownInfo(task) {
  if (!task.last_completed_at) return { onCooldown: false, daysLeft: 0 }
  const days = task.cooldown_days || 0
  if (days === 0) return { onCooldown: task.status === "done", daysLeft: 0 }
  const elapsed = (Date.now() - new Date(task.last_completed_at + "Z").getTime()) / 86400000
  const daysLeft = Math.ceil(days - elapsed)
  return { onCooldown: daysLeft > 0, daysLeft }
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState(null)

  // --- new task form ---
  const [title, setTitle] = useState("")
  const [energyCost, setEnergyCost] = useState(5)
  const [moodCost, setMoodCost] = useState(5)
  const [cooldownDays, setCooldownDays] = useState(0)
  const [roomZone, setRoomZone] = useState("")

  async function loadTasks() {
    try {
      setTasks(await getTasks())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // --- create ---
  async function handleAdd(e) {
    e.preventDefault()
    try {
      setError(null)
      await createTask(title, energyCost, moodCost, cooldownDays, roomZone)
      setTitle("")
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  // --- complete / redo / delete ---
  async function handleComplete(id) {
    try {
      await completeTask(id)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReset(id) {
    try {
      await resetTask(id)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this entry?")) return
    try {
      await deleteTask(id)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  const field = "bg-bg border-2 border-line px-3 py-2 text-ink"

  return (
    <div className="flex flex-col gap-4">
      {/* New task form */}
      <form onSubmit={handleAdd} className="px-panel p-4 flex flex-col gap-4">
        <input
          type="text" required placeholder="Task title" value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={field + " placeholder:text-ink-muted"}
        />

        <label className="block">
          <span className="font-pixel text-accent">ENERGY COST {energyCost}</span>
          <input
            type="range" min="1" max="10" value={energyCost}
            onChange={(e) => setEnergyCost(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </label>

        <label className="block">
          <span className="font-pixel text-accent">MOOD COST {moodCost}</span>
          <input
            type="range" min="1" max="10" value={moodCost}
            onChange={(e) => setMoodCost(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </label>

        <select
          value={cooldownDays}
          onChange={(e) => setCooldownDays(Number(e.target.value))}
          className={field}
        >
          {cooldownOptions.map((o) => (
            <option key={o.days} value={o.days}>{o.label}</option>
          ))}
        </select>

        <select
          value={roomZone}
          onChange={(e) => setRoomZone(e.target.value)}
          className={field}
        >
          {roomZoneOptions.map((z) => (
            <option key={z} value={z}>{z || "No zone"}</option>
          ))}
        </select>

        <button type="submit" className="px-btn">Add task</button>
      </form>

      {error && <p className="text-accent">{error}</p>}

      {/* Task list */}
      <div className="flex flex-col gap-3">
        {tasks.map((t) => {
          const { onCooldown, daysLeft } = cooldownInfo(t)
          return (
            <div key={t.id} className="px-panel p-3 flex justify-between items-center gap-3">
              <div>
                <p className={"font-pixel " + (onCooldown ? "line-through text-ink-muted" : "")}>
                  {t.title} {onCooldown && daysLeft > 0 ? "⏰ " + daysLeft + "d" : ""}
                </p>
                <p className="text-ink-muted text-sm">
                  E {t.energyCost} · M {t.moodCost} · {cooldownLabel(t.cooldown_days)}
                </p>
              </div>
              <div className="flex gap-2">
                {!onCooldown && (
                  <button className="px-btn" onClick={() => handleComplete(t.id)}>Done</button>
                )}
                {onCooldown && (
                  <button className="px-btn" onClick={() => handleReset(t.id)}>Redo</button>
                )}
                <button className="px-btn" onClick={() => handleDelete(t.id)}>X</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}