import { useMemo } from "react"

const CATEGORIES = [
    { id: "discipline", label: "DISCIPLINE" },
    { id: "body", label: "BODY" },
    { id: "mind", label: "MIND" },
    { id: "order", label: "ORDER" },
    { id: "social", label: "SOCIAL" },
]

const SIZE = 280
const CENTER = SIZE / 2
const RADIUS = 83
const LABEL_RADIUS = 119
const MAX_XP = 500

function pointAt(index, radius) {
    const angle = (-90 + index * 72) * Math.PI / 180

    return {
        x: CENTER + Math.cos(angle) * radius,
        y: CENTER + Math.sin(angle) * radius,
    }
}

function polygonPoints(radiusForIndex) {
    return CATEGORIES.map((_, index) => {
        const point = pointAt(index, radiusForIndex(index))
        return `${point.x},${point.y}`
    }).join(" ")
}

export default function StatPentagon({ stats = [] }) {
    const data = useMemo(
        () => CATEGORIES.map((category) => ({
            ...category,
            xp: stats.find((stat) => stat.category === category.id)?.xp ?? 0,
        })),
        [stats]
    )

    const totalXp = data.reduce((sum, stat) => sum + stat.xp, 0)

    return (
        <section
            className="min-w-0 p-3 flex flex-col"
            style={{
                background: "var(--panel)",
                border: "var(--bw) solid var(--line)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
            }}
        > <div className="flex items-center justify-between gap-2 mb-1"> <h2 className="font-pixel text-sm">ATTRIBUTES</h2>
               </div>

            <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="img"
                aria-label="Five-axis character stat chart"
                className="w-full h-auto overflow-visible"
            >
                <defs>
                    <linearGradient id="statFacet" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--facet-hi)" stopOpacity="0.7" />
                        <stop offset="55%" stopColor="var(--facet-1)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--facet-3)" stopOpacity="0.65" />
                    </linearGradient>
                </defs>

                {[0.25, 0.5, 0.75, 1].map((scale) => (
                    <polygon
                        key={scale}
                        points={polygonPoints(() => RADIUS * scale)}
                        fill="none"
                        stroke="var(--line)"
                        strokeWidth={scale === 1 ? 2 : 1}
                        strokeDasharray={scale === 1 ? undefined : "3 4"}
                    />
                ))}

                {CATEGORIES.map((category, index) => {
                    const point = pointAt(index, RADIUS)
                    return (
                        <line
                            key={category.id}
                            x1={CENTER}
                            y1={CENTER}
                            x2={point.x}
                            y2={point.y}
                            stroke="var(--line)"
                            strokeWidth="1"
                        />
                    )
                })}

                <polygon
                    points={polygonPoints((index) =>
                        RADIUS * Math.max(0.035, Math.min(data[index].xp / MAX_XP, 1))
                    )}
                    fill="url(#statFacet)"
                    stroke="var(--facet-hi)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 0 4px var(--glow))" }}
                />

                {data.map((stat, index) => {
                    const valuePoint = pointAt(
                        index,
                        RADIUS * Math.max(0.035, Math.min(stat.xp / MAX_XP, 1))
                    )
                    const labelPoint = pointAt(index, LABEL_RADIUS)
                    const anchor =
                        index === 1 || index === 2 ? "middle" :
                            index === 3 ? "end" :
                                index === 4 ? "start" : "middle"

                    return (
                        <g key={stat.id}>
                            <circle
                                cx={valuePoint.x}
                                cy={valuePoint.y}
                                r="4"
                                fill="var(--facet-hi)"
                                stroke="var(--panel)"
                                strokeWidth="1.5"
                            />
                            <text
                                x={labelPoint.x}
                                y={labelPoint.y}
                                textAnchor={anchor}
                                dominantBaseline="middle"
                                fill="var(--ink)"
                                fontSize="15"
                                fontWeight="bold"
                                style={{ fontFamily: "var(--f-body)" }}
                            >
                                {stat.label}
                            </text>
                            <text
                                x={labelPoint.x}
                                y={labelPoint.y + 13}
                                textAnchor={anchor}
                                fill="var(--ink-muted)"
                                fontSize="9"
                                style={{ fontFamily: "var(--f-body)" }}
                            >
                                {stat.xp} XP
                            </text>
                        </g>
                    )
                })}
            </svg>

            <p
                className="text-center text-xs mt-1"
                style={{ color: "var(--ink-muted)" }}
            >
                PERMANENT CHARACTER PROGRESSION
            </p>
        </section>


    )
}
