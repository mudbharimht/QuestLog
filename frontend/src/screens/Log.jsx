import { useState, useEffect } from "react"
import { getMetrics, getLogs, postLog, deleteLog} from "../api/client"

export default function Log() {
  const [metrics, setMetrics] = useState([])
  const [logs, setLogs] = useState([])
  const [metricId, setMetricId] = useState(null)
  const [value, setValue] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState(null)

  async function load() {
    try {
      const m = await getMetrics()
      setMetrics(m)
      setLogs(await getLogs())
      if (m.length > 0 && metricId === null) setMetricId(m[0].id)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selectedMetric = metrics.find((m) => m.id === metricId)

  async function handleAdd(e) {
    e.preventDefault()
    try {
      setError(null)
      await postLog(metricId, value, note)
      setValue("")
      setNote("")
      await load()
    } catch (err) {
      setError(err.message)
    }
  }
  async function handleDelete(id){
    if (!window.confirm("Delete this entry?")) return
    try {
      setError(null)
      await deleteLog(id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="px-panel p-4 flex flex-col gap-4">
        <select
          value={metricId ?? ""}
          onChange={(e) => {
            setMetricId(Number(e.target.value))
            setValue("")
          }}
          className="bg-bg border-2 border-line px-3 py-2 text-ink"
        >
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {selectedMetric?.type === "boolean" ? (
          <select
            required value={value}
            onChange={(e) => setValue(e.target.value)}
            className="bg-bg border-2 border-line px-3 py-2 text-ink"
          >
            <option value="">Choose...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : (
          <input
            required placeholder="Value" value={value}
            type={selectedMetric?.type === "number" ? "number" : "text"}
            step="any"
            onChange={(e) => setValue(e.target.value)}
            className="bg-bg border-2 border-line px-3 py-2 text-ink placeholder:text-ink-muted"
          />
        )}

        <input
          placeholder="Note (optional)" value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-bg border-2 border-line px-3 py-2 text-ink placeholder:text-ink-muted"
        />

        <button type="submit" className="px-btn">Add log</button>
      </form>

      {error && <p className="text-accent">{error}</p>}

      <div className="px-panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-pixel text-accent border-b-2 border-line">
              <th className="p-2">DATE</th>
              <th className="p-2">METRIC</th>
              <th className="p-2">VALUE</th>
              <th className="p-2">NOTE</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {[...logs].reverse().map((l) => {
              const when = new Date(l.timestamp + "Z")
              return (
                <tr key={l.id} className="border-b border-line">
                  <td className="p-2 text-ink-muted whitespace-nowrap">
                    {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </td>
                  <td className="p-2">{l.metric_name}</td>
                  <td className="p-2 font-pixel">
                    {String(l.value_number ?? l.value_bool ?? l.value_text)}
                  </td>
                  <td className="p-2 text-ink-muted">{l.note}</td>
                  <td className="p-2">
  <button className="px-btn" onClick={() => handleDelete(l.id)}>X</button>
</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}