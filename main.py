from datetime import datetime

from fastapi import FastAPI, HTTPException
from database import init_db, engine
from sqlmodel import Session, select
from models import MetricCreate, Metric, LogEntry, LogEntryCreate, Task, TaskCreate, MetricUpdate
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import math

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    pass

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return {"message": "Quest log is alive"}

#metrics

@app.post("/metrics")
def create_metric(metric: MetricCreate):
    thisMetric = Metric(name= metric.name, type=metric.type, role=metric.role)
    with Session(engine) as session:
        session.add(thisMetric)
        session.commit()
        session.refresh(thisMetric)
    return thisMetric

@app.get("/metrics")
def read_metric():
    with Session(engine) as session:
        statement =  select(Metric)
        results = session.exec(statement).all()
    return results

@app.delete("/metrics/{metricId}")
def delete_metric(metricId: int):
    with Session(engine) as session:
        deletingMetric = session.get(Metric,metricId)
        if deletingMetric is None:
            raise HTTPException(status_code=404, detail="Metric not found")
        if deletingMetric.logs:
            for log in list(deletingMetric.logs):
                session.delete(log)
        session.delete(deletingMetric)
        session.commit()
    return {"message": "deleted metric", "metric": deletingMetric}



@app.patch("/metrics/{metricId}")
def edit_metric(metricId: int, update: MetricUpdate):
    with Session(engine) as session:
        editingMetric = session.get(Metric, metricId)
        if editingMetric is None:
            raise HTTPException(status_code=404, detail="Metric not found")
        for key, value in update.model_dump(exclude_unset=True).items():
            setattr(editingMetric, key, value)
        
        session.commit()
        session.refresh(editingMetric)
    return editingMetric

#logs

@app.post("/logs")
def create_log(entry: LogEntryCreate):
    with Session(engine) as session:
        metric = session.get(Metric, entry.metric_id)
        if metric is None:
            raise HTTPException(status_code=404, detail="Metric not found")

        newEntry = LogEntry(metric_id=entry.metric_id, note=entry.note)

        if metric.type == "number":
            try:
                newEntry.value_number = float(entry.value)
            except ValueError:
                raise HTTPException(status_code=400, detail="Value must be a number")
        elif metric.type == "boolean":
            if entry.value.lower() not in ("true", "false"):
                raise HTTPException(status_code=400, detail="Value must be a bool")
            newEntry.value_bool = entry.value.lower() =="true"
        else:
            newEntry.value_text = entry.value

        session.add(newEntry)
        session.commit()
        session.refresh(newEntry)

    return newEntry

@app.get("/logs")
def read_logs():
    with Session(engine) as session:
        statement = select(LogEntry)
        logs = session.exec(statement).all()

        nested = []
        for log in logs:
            nested.append({
                "id": log.id,
                "metric_id": log.metric_id,
                "metric_name": log.metric.name,
                "value_number": log.value_number,
                "value_bool": log.value_bool,
                "value_text": log.value_text,
                "note": log.note,
                "timestamp": log.timestamp
            })

    return nested

@app.delete("/logs/{logId}")
def delete_log(logId: int):
    with Session(engine) as session:
        deletingLog = session.get(LogEntry,logId)
        if deletingLog is None:
            raise HTTPException(status_code=404, detail="Log not found")
        session.delete(deletingLog)
        session.commit()
    return {"message": "deleted Log", "Log": deletingLog}


#tasks

@app.post("/tasks")
def create_task(task: TaskCreate):
    thisTask = Task(title= task.title, energyCost=task.energyCost, moodCost=task.moodCost,cooldown_days=task.cooldown_days)
    with Session(engine) as session:
        session.add(thisTask)
        session.commit()
        session.refresh(thisTask)
    return thisTask

@app.get("/tasks")
def read_task():
    with Session(engine) as session:
        statement =  select(Task)
        results = session.exec(statement).all()
    return results

@app.delete("/tasks/{taskId}")
def delete_task(taskId: int):
    with Session(engine) as session:
        deletingTask = session.get(Task,taskId)
        if deletingTask is None:
            raise HTTPException(status_code=404, detail="Task not found")
        session.delete(deletingTask)
        session.commit()
    return {"message": "deleted taks", "task": deletingTask}

@app.patch("/tasks/{taskId}/complete")
def complete_task(taskId:int):
    with Session(engine) as session:
        completedTask = session.get(Task,taskId)
        if completedTask is None:
            raise HTTPException(status_code=404, detail="Task not Found")
        if not completedTask.cooldown_days:
            completedTask.status = "done"
        completedTask.last_completed_at = datetime.utcnow()
        session.commit()
        session.refresh(completedTask)
    return completedTask

#suggest

@app.get("/tasks/suggest")
def suggest_task(energy: int, mood: int):
    with Session(engine) as session:
       
        allTask = session.exec(select(Task).where(Task.energyCost<=energy,
                                                  Task.moodCost <=mood,
                                                  Task.status == "pending"))
        
        nested = []
        for task in allTask:
            if task.last_completed_at is not None and (datetime.utcnow() - task.last_completed_at).days < (task.cooldown_days or 0):
                continue                    
            energy_diff = energy-task.energyCost
            mood_diff=mood-task.moodCost
            distance = math.sqrt((energy_diff)**2 +(mood_diff)**2)
            nested.append({
                "id": task.id,
                "title": task.title,
                "energyCost": task.energyCost,
                "moodCost": task.moodCost,
                "distance":distance
            })
    return sorted(nested ,key=lambda t: t["distance"])


@app.get("/debug/all")
def debug():
    with Session(engine) as session:
        statement = select(Metric)
        metrics = session.exec(statement).all()

        nested = []
        for metric in metrics:
            nested.append({
                "id": metric.id,
                "name": metric.name,
                "type": metric.type,
                "logs": metric.logs
            })

    return nested

