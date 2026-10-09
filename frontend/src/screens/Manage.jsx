import { useState, useEffect } from "react"
import { getMetrics, createMetric, updateMetric, deleteMetric } from "../api/client"

const BODY_PARTS = ["head", "heart", "torso", "arms", "legs"]
const CATEGORIES = ["discipline", "body", "mind", "order", "social"]

export default function Manage() {
  // --- data ---
  const [metrics, setMetrics] = useState([])
  const [error, setError] = useState(null)

  // --- new metric form ---
  const [name, setName] = useState("")
  const [type, setType] = useState("number")
  const [bodyPart, setBodyPart] = useState("")
  const [category, setCategory] = useState("")

  // --- inline edit state (one metric at a time) ---
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

  // --- create ---
  async function handleAdd(e) {
    e.preventDefault()
    try {
      setError(null)
      await createMetric(name, type, null, bodyPart, category)
      setName("")
      setBodyPart("")
      setCategory("")
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  // --- body zone / stat assignment (both are plain updates on the metric) ---
  async function handleBodyPartChange(metric, newPart) {
    try {
      setError(null)
      await updateMetric(metric.id, { body_part: newPart || null })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCategoryChange(metric, newCategory) {
    try {
      setError(null)
      await updateMetric(metric.id, { category: newCategory || null })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  // --- edit name / min / max ---
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

  // --- archive / restore / delete ---
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

  const active = metrics.filter((m) => !m.archived)
  const archived = metrics.filter((m) => m.archived)
  const field = "bg-bg border-2 border-line px-3 py-2 text-ink placeholder:text-ink-muted"

  return (
    <div className="flex flex-col gap-4">
      {/* New metric form */}
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
        <select value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} className={field}>
          <option value="">No body zone</option>
          {BODY_PARTS.map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
          <option value="">No stat (earns no XP)</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="px-btn">Add metric</button>
      </form>

      {error && <p className="text-accent">{error}</p>}

      {/* Active metrics */}
      <h2 className="text-xl">ACTIVE</h2>
      <div className="flex flex-col gap-3">
        {active.map((m) => {
          const isSystem = m.role === "energy" || m.role === "mood"
          return (
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
                <>
                  <div className="flex justify-between items-center gap-3">
                    <div>
                      <p className="font-pixel">{m.name}</p>
                      <p className="text-ink-muted text-sm">
                        {m.type}
                        {m.role ? " · role: " + m.role : ""}
                        {m.category ? " · " + m.category : ""}
                        {m.min_value != null || m.max_value != null
                          ? " · " + (m.min_value ?? "–") + " to " + (m.max_value ?? "–")
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-btn" onClick={() => startEdit(m)}>Edit</button>
                      {isSystem ? (
                        <span className="text-ink-muted text-sm px-2">permanent</span>
                      ) : (
                        <button className="px-btn" onClick={() => setArchived(m, true)}>Archive</button>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-ink-muted">Body zone:</span>
                    <select
                      value={m.body_part || ""}
                      onChange={(e) => handleBodyPartChange(m, e.target.value)}
                      className={field}
                    >
                      <option value="">None</option>
                      {BODY_PARTS.map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
                    </select>
                  </label>

                  {isSystem ? (
                    <p className="text-ink-muted text-sm">No XP (system metric)</p>
                  ) : (
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-ink-muted">Stat:</span>
                      <select
                        value={m.category || ""}
                        onChange={(e) => handleCategoryChange(m, e.target.value)}
                        className={field}
                      >
                        <option value="">None</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Archived metrics */}
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