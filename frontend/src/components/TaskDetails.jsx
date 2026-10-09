import { useEffect, useState } from "react";
import {
    getTasks,
    completeTask,
    deleteTask,
    resetTask,updateTask
} from "../api/client";

// Cooldown labels
function cooldownLabel(days) {
    const options = [
        { label: "One-time", days: 0 },
        { label: "Daily", days: 1 },
        { label: "Weekly", days: 7 },
        { label: "Monthly", days: 30 },
        { label: "Every 3 months", days: 90 },
        { label: "Every 6 months", days: 182 },
        { label: "Yearly", days: 365 },
    ];


    return options.find((option) => option.days === days)?.label
        ?? (days ? `Every ${days} days` : "One-time");


}

function cooldownInfo(task) {
    if (!task.last_completed_at) {
        return { onCooldown: false, daysLeft: 0 };
    }


    const days = task.cooldown_days || 0;

    if (days === 0) {
        return {
            onCooldown: task.status === "done",
            daysLeft: 0,
        };
    }

    const completedAt = new Date(task.last_completed_at + "Z").getTime();
    const elapsed = (Date.now() - completedAt) / 86400000;
    const daysLeft = Math.ceil(days - elapsed);

    return {
        onCooldown: daysLeft > 0,
        daysLeft,
    };


}

export default function TaskDetails() {
    const [tasks, setTasks] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState("");
    const [busyTaskId, setBusyTaskId] = useState(null);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [selectedZone, setSelectedZone] = useState("");
    async function loadTasks() {
        try {
            setTasks(await getTasks());
            setError("");
        } catch (err) {
            setError(err.message || "Failed to load tasks.");
        }
    }

    useEffect(() => {
        loadTasks();
    }, []);

    async function handleAction(id, action) {
        try {
            setBusyTaskId(id);
            setError("");

            if (action === "complete") {
                await completeTask(id);
            } else if (action === "reset") {
                await resetTask(id);
            } else if (action === "delete") {
                if (!window.confirm("Delete this task?")) return;
                await deleteTask(id);
            }

            await loadTasks();
        } catch (err) {
            setError(err.message || "Task action failed.");
        } finally {
            setBusyTaskId(null);
        }
    }

    const sortedTasks = [...tasks].sort((a, b) => {
        const energyDifference =
            (a.energyCost ?? a.energy_cost ?? 0) -
            (b.energyCost ?? b.energy_cost ?? 0);

        if (energyDifference !== 0) return energyDifference;

        return (
            (a.moodCost ?? a.mood_cost ?? 0) -
            (b.moodCost ?? b.mood_cost ?? 0)
        );
    });

    return (
        <section
            className="min-w-0 p-4"
            style={{
                background: "var(--panel)",
                border: "var(--bw) solid var(--line)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
            }}
        >
            {/* Tappable header */}
            <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="w-full flex items-center justify-between gap-3 text-left"
                aria-expanded={expanded}
            >
                <div className="min-w-0">
                    <h2 className="font-pixel text-sm">
                        TASK DETAILS
                    </h2>
                    <p
                        className="text-xs mt-1"
                        style={{ color: "var(--ink-muted)" }}
                    >
                        {expanded
                            ? "YOUR TASKS · LOWEST COST FIRST"
                            : "TAP TO VIEW AND COMPLETE TASKS"}
                    </p>
                </div>

                <div className="text-right shrink-0">
                    <p
                        className="font-pixel text-xl"
                        style={{ color: "var(--facet-hi)" }}
                    >
                        {tasks.length}
                    </p>
                    <p
                        className="text-xs"
                        style={{ color: "var(--ink-muted)" }}
                    >
                        TASKS {expanded ? "▲" : "▼"}
                    </p>
                </div>
            </button>

            {expanded && (
                <>
                    <div
                        className="h-px my-4"
                        style={{ background: "var(--line)" }}
                    />

                    {error && (
                        <p
                            className="text-sm mb-3"
                            style={{ color: "var(--facet-hi)" }}
                        >
                            {error}
                        </p>
                    )}

                    {sortedTasks.length === 0 ? (
                        <p
                            className="text-sm py-3"
                            style={{ color: "var(--ink-muted)" }}
                        >
                            No tasks yet.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {sortedTasks.map((task) => {
                                const { onCooldown, daysLeft } =
                                    cooldownInfo(task);

                                const energy =
                                    task.energyCost ?? task.energy_cost ?? 0;
                                const mood =
                                    task.moodCost ?? task.mood_cost ?? 0;
                                const busy = busyTaskId === task.id;

                                return (
                                    <div
                                        key={task.id}
                                        className="min-w-0 p-3"
                                        style={{
                                            background: "var(--panel-alt)",
                                            border: "var(--bw) solid var(--line)",
                                            borderRadius: "var(--radius)",
                                            opacity: onCooldown ? 0.8 : 1,
                                        }}
                                    > <div className="flex items-center justify-between gap-3">
                                            {/* Task information */} <div className="min-w-0 flex-1">
                                                <p
                                                    className={`font-pixel text-sm leading-relaxed break-words ${onCooldown ? "line-through" : ""
                                                        }`}
                                                    style={{
                                                        color: onCooldown
                                                            ? "var(--ink-muted)"
                                                            : "var(--ink)",
                                                    }}
                                                >
                                                    {task.title} </p>


                                                {/* Costs */}
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                    <span
                                                        className="text-xs"
                                                        style={{ color: "var(--ink-muted)" }}
                                                    >
                                                        ENERGY <strong style={{ color: "var(--ink)" }}>{energy}</strong>
                                                    </span>

                                                    <span
                                                        className="text-xs"
                                                        style={{ color: "var(--ink-muted)" }}
                                                    >
                                                        MOOD <strong style={{ color: "var(--ink)" }}>{mood}</strong>
                                                    </span>
                                                </div>

                                                {/* Frequency and cooldown */}
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <span
                                                        className="text-xs px-2 py-1"
                                                        style={{
                                                            color: "var(--facet-hi)",
                                                            border: "var(--bw) solid var(--line)",
                                                            borderRadius: "var(--radius)",
                                                        }}
                                                    >
                                                        ↻ {cooldownLabel(
                                                            task.cooldown_days ?? task.cooldownDays ?? 0
                                                        )}
                                                    </span>

                                                    {onCooldown && daysLeft > 0 && (
                                                        <span
                                                            className="text-xs px-2 py-1 font-bold"
                                                            style={{
                                                                color: "var(--facet-hi)",
                                                                background: "var(--panel)",
                                                                borderRadius: "var(--radius)",
                                                            }}
                                                        >
                                                            AVAILABLE IN {daysLeft}D
                                                        </span>
                                                    )}

                                                    {task.room_zone && (
                                                        <span
                                                            className="text-xs"
                                                            style={{ color: "var(--ink-muted)" }}
                                                        >
                                                            {`⌖ ${String(task.room_zone)
                                                                .replace(/_/g, " ")
                                                                .replace(/\b\w/g, (c) => c.toUpperCase())}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 shrink-0">
                                                {!onCooldown && (
                                                    <button
                                                        type="button"
                                                        className="px-btn"
                                                        disabled={busy}
                                                        onClick={() => handleAction(task.id, "complete")}
                                                    >
                                                        {busy ? "..." : "DONE"}
                                                    </button>
                                                )}

                                                {onCooldown && (
                                                    <button
                                                        type="button"
                                                        className="px-btn"
                                                        disabled={busy}
                                                        onClick={() => handleAction(task.id, "reset")}
                                                    >
                                                        {busy ? "..." : "REDO"}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="px-btn"
                                                    disabled={busy}
                                                    onClick={() => handleAction(task.id, "delete")}
                                                    aria-label={`Delete ${task.title}`}
                                                >
                                                    X
                                                </button>
                                            </div>
                                        </div>
                                    </div>


                                );

                            })}
                        </div>
                    )}
                </>
            )}
        </section>
    );


}
