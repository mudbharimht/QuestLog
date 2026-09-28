import { useState, useEffect } from "react"
import { getTasks, createTask, completeTask, deleteTask } from "../api/client"

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState("")
  const [energyCost, setEnergyCost] = useState(5)
  const [moodCost, setMoodCost] = useState(5)
  const [error, setError] = useState(null)
  const [cooldownDays, setCooldownDays] = useState(0)


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

  async function handleAdd(e) {
    e.preventDefault()
    try {
      setError(null)
      await createTask(title, energyCost, moodCost, cooldownDays)
      setTitle("")
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleComplete(id) {
    try {
      await completeTask(id)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTask(id)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }
  const cooldownOptions = [
  { label: "One-time", days: 0 },
  { label: "Daily", days: 1 },
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Every 3 months", days: 90 },
  { label: "Every 6 months", days: 182 },
  { label: "Yearly", days: 365 },
]

function cooldownLabel(days) {
  const match = cooldownOptions.find((o) => o.days === days)
  if (match) return match.label
  return days ? "Every " + days + " days" : "One-time"
}

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="px-panel p-4 flex flex-col gap-4">
        <input
          type="text" required placeholder="Task title" value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-bg border-2 border-line px-3 py-2 text-ink placeholder:text-ink-muted"
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
  className="bg-bg border-2 border-line px-3 py-2 text-ink"
>
  {cooldownOptions.map((o) => (
    <option key={o.days} value={o.days}>{o.label}</option>
  ))}
</select>
        <button type="submit" className="px-btn">Add task</button>
      </form>

      {error && <p className="text-accent">{error}</p>}

      <div className="flex flex-col gap-3">
        {tasks.map((t) => (
          <div key={t.id} className="px-panel p-3 flex justify-between items-center gap-3">
            <div>
              <p className={"font-pixel " + (t.status === "done" ? "line-through text-ink-muted" : "")}>
                {t.title}
              </p>
              <p className="text-ink-muted text-sm">E {t.energyCost} · M {t.moodCost} · {cooldownLabel(t.cooldown_days)}</p>
            </div>
            <div className="flex gap-2">
              {t.status !== "done" && (
                <button className="px-btn" onClick={() => handleComplete(t.id)}>Done</button>
              )}
              <button className="px-btn" onClick={() => handleDelete(t.id)}>X</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}