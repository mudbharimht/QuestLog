
async function request(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(response.status + " from " + url + ": " + body)
  }
  return await response.json()
}

export function getMetrics() {
  return request("/metrics")
}

export function getSuggestions(energy, mood) {
  return request(`/tasks/suggest?energy=${energy}&mood=${mood}`)
}

export function postLog(metricId, value, note, timestamp) {
  const body = { metric_id: metricId, value: String(value), note: note }
  if (timestamp) body.timestamp = timestamp
  return request("/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
export function getRecentLogs(limit = 50, metricId = null) {
  const extra = metricId ? `&metric_id=${metricId}` : ""
  return request(`/logs/recent?limit=${limit}${extra}`)
}

export function getTasks() {
  return request("/tasks")
}


export function deleteTask(id) {
  return request("/tasks/" + id, { method: "DELETE" })
}

export function createTask(title, energyCost, moodCost, cooldownDays, roomZone) {
  return request("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title,
      energyCost: energyCost,
      moodCost: moodCost,
      cooldown_days: Number(cooldownDays),
      room_zone: roomZone || null
    })
  });
}

export async function updateTask(taskId, updates) {
    return request(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
    });
}
export function completeTask(taskId) {
  return request(`/tasks/${taskId}/complete`, { method: "PATCH" })
}
export function resetTask(taskId) {
  return request(`/tasks/${taskId}/reset`, { method: "PATCH" })
}
export function getLogs() {
  return request("/logs")
}
export function createMetric(name, type, role, body, category) {
  return request("/metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      type: type,
      role: role,
      body_part: body || null,
      category: category || null
    })
  });
}

export function getStats() {
  return request("/stats")
}
export function deleteMetric(id) {
  return request(`/metrics/${id}`, { method: "DELETE" })

}
export function getBodyStatus() {
  return request("/metrics/body-status")
}

export function getRoomStatus() {
  return request("/tasks/zone-status")
}
export function updateMetric(id, changes) {
  return request(`/metrics/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes)
  });
}

export function deleteLog(id) {
  return request(`/logs/${id}`, { method: "DELETE" })

}
