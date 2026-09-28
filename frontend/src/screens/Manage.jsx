import { useState, useEffect } from "react"
import { getMetrics, createMetric, updateMetric, deleteMetric } from "../api/client"

export default function Manage() {
  const [metrics, setMetrics] = useState([])
  const [name, setName] = useState("")
  const [type, setType] = useState("number")
  const [role, setRole] = useState("")
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ name: "", min: "", max: "" })

  async function load() {
    try {
      setMetrics(await getMetrics())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    try {
      setError(null)
      await createMetric(name, type, role || null)
      setName("")
      setRole("")
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(m) {
    setEditingId(m.id)
    setDraft({ name: m.name, min: m.min_value ?? "", max: m.max_value ?? "" })
  }

  async function saveEdit(m) {
    try {
      setError(null)
      const changes = { name: draft.name }
      if (m.type === "number") {
        changes.min_value = draft.min === "" ? null : Number(draft.min)
        changes.max_value = draft.max === "" ? null : Number(draft.max)
      }
      await updateMetric(m.id, changes)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function setArchived(m, value) {
    try {
      setError(null)
      await updateMetric(m.id, { archived: value })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(m) {
    if (!window.confirm("Delete " + m.name + " and ALL its logs? This cannot be undone.")) return
    try {
      setError(null)
      await deleteMetric(m.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const active = metrics.filter((m) => m.archived !== true)
  const archived = metrics.filter((m) => m.archived == true)

  const field = "bg-bg border-2 border-line px-3 py-2 text-ink placeholder:text-ink-muted"

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="px-panel p-4 flex flex-col gap-4">
        <input
          required placeholder="Metric name" value={name}
          onChange={(e) => setName(e.target.value)} className={field}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
          <option value="number">Number</option>
          <option value="boolean">Yes / No</option>
          <option value="text">Text</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
          <option value="">No special role</option>
          <option value="energy">Energy (drives suggestions)</option>
          <option value="mood">Mood (drives suggestions)</option>
        </select>
        <button type="submit" className="px-btn">Add metric</button>
      </form>

      {error && <p className="text-accent">{error}</p>}

      <h2 className="text-xl">ACTIVE</h2>
      <div className="flex flex-col gap-3">
        {active.map((m) => (
          <div key={m.id} className="px-panel p-3 flex flex-col gap-3">
            {editingId === m.id ? (
              <>
                <input
                  value={draft.name} className={field}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                {m.type === "number" && (
                  <div className="flex gap-2">
                    <input
                      type="number" step="any" placeholder="Min" value={draft.min} className={field + " w-full"}
                      onChange={(e) => setDraft({ ...draft, min: e.target.value })}
                    />
                    <input
                      type="number" step="any" placeholder="Max" value={draft.max} className={field + " w-full"}
                      onChange={(e) => setDraft({ ...draft, max: e.target.value })}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="px-btn" onClick={() => saveEdit(m)}>Save</button>
                  <button className="px-btn" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center gap-3">
                <div>
                  <p className="font-pixel">{m.name}</p>
                  <p className="text-ink-muted text-sm">
                    {m.type}
                    {m.role ? " · role: " + m.role : ""}
                    {m.min_value != null || m.max_value != null
                      ? " · " + (m.min_value ?? "–") + " to " + (m.max_value ?? "–")
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-btn" onClick={() => startEdit(m)}>Edit</button>
                  <button className="px-btn" onClick={() => setArchived(m, true)}>Archive</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {archived.length > 0 && <h2 className="text-xl">ARCHIVED</h2>}
      <div className="flex flex-col gap-3">
        {archived.map((m) => (
          <div key={m.id} className="px-panel p-3 flex justify-between items-center gap-3">
            <p className="font-pixel text-ink-muted">{m.name}</p>
            <div className="flex gap-2">
              <button className="px-btn" onClick={() => setArchived(m, false)}>Restore</button>
              <button className="px-btn" onClick={() => handleDelete(m)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}