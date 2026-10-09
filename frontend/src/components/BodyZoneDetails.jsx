import { useState } from "react";

export default function BodyZoneDetails({ selection, allLogs = [] }) {
    const [showAllLogs, setShowAllLogs] = useState(false);

    const logs = selection
        ? selection.metrics
            .flatMap((metric) => metric.logs ?? [])
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            )
        : showAllLogs
            ? [...allLogs].sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            )
            : [];

    function getValue(log) {
        if (log.value_number != null) {
            return Number(log.value_number.toFixed(2));
        }

        if (log.value_bool != null) {
            return log.value_bool ? "YES" : "NO";
        }

        return log.value_text || "—";
    }

    const canExpand = !selection;

    return (
        <section
            className={`min-w-0 p-4 ${canExpand ? "cursor-pointer" : ""}`}
            style={{
                background: "var(--panel)",
                border: "var(--bw) solid var(--line)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
            }}
            onClick={() => {
                if (canExpand) {
                    setShowAllLogs((current) => !current);
                }
            }}
            role={canExpand ? "button" : undefined}
            tabIndex={canExpand ? 0 : undefined}
            onKeyDown={(event) => {
                if (
                    canExpand &&
                    (event.key === "Enter" || event.key === " ")
                ) {
                    event.preventDefault();
                    setShowAllLogs((current) => !current);
                }
            }}
            aria-expanded={canExpand ? showAllLogs : undefined}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <h2 className="font-pixel text-sm">
                        {selection
                            ? selection.zone.toUpperCase()
                            : showAllLogs
                                ? "ALL RECENT LOGS"
                                : "BODY DETAILS"}
                    </h2>

                    <p
                        className="text-xs mt-1"
                        style={{ color: "var(--ink-muted)" }}
                    >
                        {selection
                            ? "BODY STATUS · LAST 7 DAYS"
                            : showAllLogs
                                ? "ALL METRICS · LAST 7 DAYS"
                                : "TAP TO VIEW ALL LOGS · LAST 7 DAYS"}
                    </p>
                </div>

                {selection ? (
                    <div className="text-right shrink-0">
                        <p
                            className="font-pixel text-2xl"
                            style={{ color: "var(--facet-hi)" }}
                        >
                            {selection.score == null
                                ? "—"
                                : `${selection.score}%`}
                        </p>
                        <p
                            className="text-xs"
                            style={{ color: "var(--ink-muted)" }}
                        >
                            FINAL SCORE
                        </p>
                    </div>
                ) : (
                    <span
                        className="font-pixel text-xs shrink-0"
                        style={{ color: "var(--facet-hi)" }}
                    >
                        {showAllLogs ? "▲ CLOSE" : "▼ OPEN"}
                    </span>
                )}
            </div>

            {/* Divider */}
            <div
                className="h-px mb-3"
                style={{ background: "var(--line)" }}
            />

            {/* Logs */}
            {(selection || showAllLogs) ? (
                <>
                    <div className="flex items-center justify-between mb-3 gap-2">
                        <h3 className="font-pixel text-xs">
                            RECENT LOGS
                        </h3>

                        <span
                            className="text-xs"
                            style={{ color: "var(--ink-muted)" }}
                        >
                            {logs.length} ENTRIES
                        </span>
                    </div>

                    {logs.length === 0 ? (
                        <p
                            className="text-sm py-3"
                            style={{ color: "var(--ink-muted)" }}
                        >
                            No logs recorded in the last 7 days.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {logs.map((log) => (
                                <div
                                    key={`${log.metric_id}-${log.id}`}
                                    className="min-w-0 p-3"
                                    style={{
                                        background: "var(--panel-alt)",
                                        border: "var(--bw) solid var(--line)",
                                        borderRadius: "var(--radius)",
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold">
                                                {log.metric_name}
                                            </p>

                                            <p
                                                className="text-xs mt-1"
                                                style={{
                                                    color: "var(--ink-muted)",
                                                }}
                                            >
                                                {new Date(
                                                    log.timestamp
                                                ).toLocaleString([], {
                                                    day: "numeric",
                                                    month: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>

                                        <span
                                            className="text-sm font-bold min-w-0 flex-1 text-right overflow-hidden text-ellipsis whitespace-nowrap"
                                            style={{ color: "var(--facet-hi)" }}
                                            title={String(getValue(log))}
                                        >
                                            {getValue(log)}
                                        </span>
                                    </div>

                                    {log.note && (
                                        <p
                                            className="text-sm mt-2 whitespace-pre-wrap"
                                            style={{
                                                color: "var(--ink-muted)",
                                            }}
                                        >
                                            {log.note}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <p
                    className="text-sm py-1"
                    style={{ color: "var(--ink-muted)" }}
                >
                </p>
            )}
        </section>
    );

}