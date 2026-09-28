import { useState } from "react";
import { getMetrics,getSuggestions,postLog, completeTask} from "../api/client";

export default function Today(){
    const [energy, setEnergy] = useState(5)
    const [mood, setMood] = useState(5)
    const [suggestions, setSuggestions]=useState([])
    const [error, setError] = useState(null)
    async function handleDone(taskId){
      try {
        setError(null)
        const metrics = await getMetrics()
        const energyMetric = metrics.find((m)=> m.role ==="energy")
        const moodMetric = metrics.find((m)=> m.role === "mood")
        if(!energyMetric || !moodMetric){
          setError("energy or mood metric is missing or its role is not set")
          return
        }
        await completeTask(taskId)
        
        await postLog(energyMetric.id ,energy,"")
        await postLog(moodMetric.id, mood, "")
        setSuggestions(suggestions.filter((s) => s.id !== taskId))
      } catch (err) {
        setError(err.message)

      }
    }
    async function handleCheckIn(){
        try{
            setError(null)
            const result = await getSuggestions(energy, mood)
            setSuggestions(result)
        } catch(err){
            setError(err.message)
        }
    }

    return (
          <div className="flex flex-col gap-4">
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