import { useEffect, useMemo, useState } from "react"
import { getBodyStatus } from "../api/client"

const ZONES = [
    {
        id: "head", label: "HEAD", paths: [
            "M100 15 C82 15 72 28 73 45 L77 59 L83 65 L83 76 L117 76 L117 65 L123 59 L127 45 C128 28 118 15 100 15 Z",
        ]
    },
    {
        id: "chest", label: "CHEST", paths: [
            "M83 78 L65 86 L55 113 L69 126 L79 105 L83 133 L117 133 L121 105 L131 126 L145 113 L135 86 L117 78 Z",
        ]
    },
    {
        id: "arms", label: "ARMS", paths: [
            "M65 86 L55 113 L43 147 L50 151 L69 126 L79 105 Z",
            "M135 86 L145 113 L157 147 L150 151 L131 126 L121 105 Z",
        ]
    },
    {
        id: "core", label: "CORE", paths: [
            "M83 133 L79 105 L121 105 L117 133 L114 161 L86 161 Z",
        ]
    },
    {
        id: "legs", label: "LEGS", paths: [
            "M86 161 L114 161 L112 195 L109 231 L97 231 L95 194 L93 231 L81 231 L84 195 Z",
        ]
    },
]

function resolveZone(bodyPart) {
    const part = String(bodyPart ?? "").toLowerCase().trim()

    if (part === "heart" || part.includes("heart")) return "chest"
    if (part.includes("chest") || part.includes("lung") || part.includes("breath")) return "chest"

    if (part.includes("head") || part.includes("mind") || part.includes("brain")) return "head"
    if (part.includes("arm") || part.includes("hand") || part.includes("shoulder")) return "arms"
    if (part.includes("leg") || part.includes("foot") || part.includes("knee")) return "legs"
    if (part.includes("core") || part.includes("torso") || part.includes("stomach") || part.includes("body")) return "core"

    return null
}

console.log("heart →", resolveZone("heart"))
console.log("head →", resolveZone("head"))
console.log("torso →", resolveZone("torso"))
function getHealth(score) {
    if (score == null) return "unknown"
    if (score < 40) return "neglected"
    if (score < 70) return "attention"
    return "healthy"
}

export default function BodyMap({ onSelectZone }) {
    const [metrics, setMetrics] = useState([])
    const [error, setError] = useState("")
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        let alive = true

        getBodyStatus()
            .then((data) => {
                if (alive) setMetrics(data)
            })
            .catch((err) => {
                if (alive) setError(err.message)
            })

        return () => {
            alive = false
        }

    }, [])

    const zones = useMemo(() => {
        console.log(
            "BODY METRICS",
            metrics.map((m) => ({
                name: m.name,
                body_part: m.body_part,
                resolved: resolveZone(m.body_part),
                score: m.score,
            }))
        )
        return ZONES.map((zone) => {
            const linked = metrics.filter(
                (metric) => resolveZone(metric.body_part) === zone.id
            )
            const scored = linked.filter((metric) => metric.score != null)

            const score = scored.length
                ? Math.round(scored.reduce((sum, metric) => sum + metric.score, 0) / scored.length)
                : null

            return {
                ...zone,
                metrics: linked,
                score,
                health: getHealth(score),
            }
        })

    }, [metrics])

    function selectZone(zone) {
        setSelected(zone.id)

        onSelectZone?.({
            zone: zone.id,
            score: zone.score,
            metrics: zone.metrics,
        })
    }


    return (
        <section
            className="min-w-0 p-3 flex flex-col"
            style={{
                background: "var(--panel)",
                border: "var(--bw) solid var(--line)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
            }}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="font-pixel text-sm">BODY STATUS</h2>

                <button
                    onClick={() => {
                        setSelected(null)
                        onSelectZone?.(null)
                    }}
                    className="text-xs px-2 py-1"
                    style={{
                        border: "var(--bw) solid var(--line)",
                        borderRadius: "var(--radius)",
                        color: "var(--ink-muted)",
                        background: "transparent",
                    }}
                >
                    CLEAR ✕
                </button>
            </div>




            <svg
                viewBox="0 0 200 245"
                role="group"
                aria-label="Selectable body health zones"
                className="w-full h-auto mx-auto"
                style={{ maxHeight: 310 }}
            >
                {/* Neutral body silhouette */}
                <g
                    fill="var(--panel-alt)"
                    stroke="var(--line)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                >
                    <circle cx="100" cy="43" r="28" />
                    <path d="M83 69 L117 69 L124 82 L145 91 L159 145 L150 151 L131 111 L126 155 L121 166 L117 231 L105 231 L100 177 L95 231 L83 231 L79 166 L74 155 L69 111 L50 151 L41 145 L55 91 L76 82 Z" />
                </g>

                {zones.map((zone) => {
                    const color =
                        zone.health === "healthy" ? "var(--facet-1)" :
                            zone.health === "attention" ? "var(--accent)" :
                                zone.health === "neglected" ? "var(--facet-3)" :
                                    "var(--secondary)"

                    const isSelected = selected === zone.id

                    return (
                        <g
                            key={zone.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${zone.label}: ${zone.score == null ? "no recent data" : zone.score + " percent"}`}
                            aria-pressed={isSelected}
                            onClick={() => selectZone(zone)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    selectZone(zone)
                                }
                            }}
                            className={
                                zone.health === "neglected"
                                    ? "body-zone zone-jittery body-zone-alert"
                                    : zone.health === "attention"
                                        ? "body-zone zone-unsettled"
                                        : zone.health === "healthy"
                                            ? "body-zone zone-calm"
                                            : "body-zone"
                            }
                            style={{ cursor: "pointer", outline: "none" }}
                        >
                            {zone.paths.map((path, index) => (
                                <path
                                    key={index}
                                    d={path}
                                    fill={color}
                                    fillOpacity={
                                        isSelected ? 0.95 :
                                            zone.health === "unknown" ? 0.28 : 0.65
                                    }
                                    stroke={isSelected ? "var(--facet-hi)" : "var(--line)"}
                                    strokeWidth={isSelected ? 2.5 : 1.2}
                                    strokeLinejoin="round"
                                />
                            ))}
                            
                        </g>
                    )
                })}

                <text
                    x="100"
                    y="243"
                    textAnchor="middle"
                    fontSize="8"
                    fill="var(--ink-muted)"
                    style={{ fontFamily: "var(--f-body)" }}
                >
                    SELECT A ZONE
                </text>
            </svg>




            {error && (
                <p className="text-xs mt-2" style={{ color: "var(--accent)" }}>
                    Could not load body status: {error}
                </p>
            )}

            <p
                className="text-center text-xs mt-3"
                style={{ color: "var(--ink-muted)" }}
            >
                RECENT HEALTH · NOT CHARACTER XP
            </p>
        </section>

    )
}