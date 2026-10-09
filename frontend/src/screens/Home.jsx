import { useState, useEffect } from "react"
import { getStats, getTasks, getRecentLogs } from "../api/client"
import Header from "../components/Header"
import StatPentagon from "../components/StatPentagon"
import BodyMap from "../components/BodyMap"
import BodyZoneDetails from "../components/BodyZoneDetails"
import TaskDetails from "../components/TaskDetails";
export default function Home() {
    const [stats, setStats] = useState([])
    const [tasks, setTasks] = useState([])
    const [error, setError] = useState(null)
    const [selectedZone, setSelectedZone] = useState(null)
    const [allLogs, setAllLogs] = useState([]);
    async function refresh() {
        try {
            const [s, t, l] = await Promise.all([
                getStats(),
                getTasks(),
                getRecentLogs(200),
            ])

            setStats(s)
            setTasks(t)
            setAllLogs(l);

        } catch (err) {
            setError(err.message || "Failed to load Dashboard")
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    return (
        <div className="flex flex-col gap-4">
            {error && (
                <p className="text-accent">{error}</p>
            )}

            <Header stats={stats} tasks={tasks} />


            {/* Dashboard panels */}
            <div className="grid grid-cols-5 gap-2 items-start">

                <div className="col-span-3">
                    <StatPentagon stats={stats} />
                </div>


                <div className="col-span-2">
                    <BodyMap onSelectZone={setSelectedZone} />
                </div>            </div>

            {/* Full-width body details */}
            <BodyZoneDetails
                selection={selectedZone}
                allLogs={allLogs}
            />
            <TaskDetails />
            {/* ToDo section comes next */}


        </div>
    )
}

