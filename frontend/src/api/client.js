async function request(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) {
      const body = await response.text()
    throw new Error(response.status + " from " + url +": "+ body)
  }
  return await response.json()
}

export function getMetrics() {
  return request("/metrics")
}

export function getSuggestions(energy,mood){
    return request(`/tasks/suggest?energy=${energy}&mood=${mood}`)
}

export function postLog(metricId, value, note){
    return request("/logs", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ 
          metric_id: metricId ,
          value: String(value),
          note: note 
        })
    });
}

export function getTasks() {
  return request("/tasks")
}

export function deleteTask(id) {
  return request("/tasks/" + id, { method: "DELETE" })
}

export function createTask(title, energyCost, moodCost, cooldownDays){
    return request("/tasks", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ 
          title: title ,
          energyCost: energyCost,
          moodCost: moodCost,
          cooldown_days: Number(cooldownDays)
        })
    });
}


export function completeTask(taskId){
    return request(`/tasks/${taskId}/complete`,{method: "PATCH"})
}

export function getLogs(){
  return request("/logs")
}
export function createMetric(name, type, role){
  return request("/metrics", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
            name: name,
            type: type,
            role: role
          })
      });
}
export function deleteMetric(id){
      return request(`/metrics/${id}`,{method: "DELETE"})

}

export function updateMetric(id, changes){
  return request(`/metrics/${id}`,{
    method: "PATCH",
    headers:  { "Content-Type": "application/json" },
    body: JSON.stringify(changes)
  });
}

export function deleteLog(id){
  return request(`/logs/${id}`, { method: "DELETE" })
    
}
