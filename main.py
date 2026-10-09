from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import math

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from database import init_db, engine
from models import (
    Metric, MetricCreate, MetricUpdate,
    LogEntry, LogEntryCreate,
    Task, TaskCreate, TaskUpdate,
    CategoryStat,
)

# --- Startup: ensure Energy, Mood, and the five category rows always exist ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with Session(engine) as session:
        energy = session.exec(select(Metric).where(Metric.role == "energy")).first()
        if energy is None:
            session.add(Metric(name="Energy", type="number", role="energy", min_value=1, max_value=10))
        mood = session.exec(select(Metric).where(Metric.role == "mood")).first()
        if mood is None:
            session.add(Metric(name="Mood", type="number", role="mood", min_value=1, max_value=10))

        for cat in ("discipline", "body", "mind", "order", "social"):
            existing = session.exec(select(CategoryStat).where(CategoryStat.category == cat)).first()
            if existing is None:
                session.add(CategoryStat(category=cat, xp=0))

        session.commit()
    yield

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Metrics ---

@app.post("/metrics")
def create_metric(metric: MetricCreate):
    thisMetric = Metric(
        name=metric.name, type=metric.type, role=metric.role,
        body_part=metric.body_part, category=metric.category,
    )
    with Session(engine) as session:
        session.add(thisMetric)
        session.commit()
        session.refresh(thisMetric)
    return thisMetric

@app.get("/metrics")
def read_metric():
    with Session(engine) as session:
        return session.exec(select(Metric)).all()

@app.delete("/metrics/{metricId}")
def delete_metric(metricId: int):
    with Session(engine) as session:
        deletingMetric = session.get(Metric, metricId)
        if deletingMetric is None:
            raise HTTPException(status_code=404, detail="Metric not found")
        if deletingMetric.role in ("energy", "mood"):
            raise HTTPException(status_code=400, detail="This metric is required by the app and can't be deleted")

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
        if editingMetric.role in ("energy", "mood") and update.model_dump(exclude_unset=True).get("archived") is True:
            raise HTTPException(status_code=400, detail="This metric is required by the app and can't be archived")

        for key, value in update.model_dump(exclude_unset=True).items():
            setattr(editingMetric, key, value)

        session.commit()
        session.refresh(editingMetric)
    return editingMetric

# --- Logs, plus the XP reward calculation ---

def closeness_bonus(value, min_value, max_value):
    """0-5 bonus XP based on how close a numeric value is to the metric's healthy range."""
    if min_value is None or max_value is None:
        return 0
    if min_value <= value <= max_value:
        return 5
    span = max(max_value - min_value, 1)
    distance = (min_value - value) if value < min_value else (value - max_value)
    score = max(0, 100 - (distance / span) * 100)
    return round(score / 20)

@app.post("/logs")
def create_log(entry: LogEntryCreate):
    with Session(engine) as session:
        metric = session.get(Metric, entry.metric_id)
        if metric is None:
            raise HTTPException(status_code=404, detail="Metric not found")

        newEntry = LogEntry(
            metric_id=entry.metric_id,
            note=entry.note,
            timestamp=entry.timestamp if entry.timestamp else datetime.utcnow(),
        )

        if metric.type == "number":
            try:
                value = float(entry.value)
            except ValueError:
                raise HTTPException(status_code=400, detail="Value must be a number")
            if metric.min_value is not None and value < metric.min_value:
                raise HTTPException(status_code=400, detail=f"Value must be at least {metric.min_value}")
            if metric.max_value is not None and value > metric.max_value:
                raise HTTPException(status_code=400, detail=f"Value must be at most {metric.max_value}")
            newEntry.value_number = value

        elif metric.type == "boolean":
            if entry.value.lower() not in ("true", "false"):
                raise HTTPException(status_code=400, detail="Value must be true or false")
            newEntry.value_bool = entry.value.lower() == "true"

        else:
            newEntry.value_text = entry.value

        # Award XP to this metric's category, if it has one
        if metric.category is not None:
            categoryStat = session.exec(
                select(CategoryStat).where(CategoryStat.category == metric.category)
            ).first()
            if categoryStat is None:
                raise HTTPException(status_code=404, detail="Stat category not set up")

            if metric.type == "number":
                bonusXp = closeness_bonus(newEntry.value_number, metric.min_value, metric.max_value)
            elif metric.type == "boolean":
                bonusXp = 5 if newEntry.value_bool else 0
            else:
                bonusXp = 0

            categoryStat.xp += bonusXp + 5

        session.add(newEntry)
        session.commit()
        session.refresh(newEntry)

    return newEntry

def _serialize_log(log: LogEntry):
    return {
        "id": log.id, "metric_id": log.metric_id, "metric_name": log.metric.name,
        "value_number": log.value_number, "value_bool": log.value_bool,
        "value_text": log.value_text, "note": log.note, "timestamp": log.timestamp,
    }

@app.get("/logs")
def read_logs():
    with Session(engine) as session:
        logs = session.exec(select(LogEntry)).all()
        return [_serialize_log(l) for l in logs]

@app.get("/logs/recent")
def read_recent_logs(limit: int = 50, metric_id: int | None = None):
    with Session(engine) as session:
        statement = select(LogEntry)
        if metric_id is not None:
            statement = statement.where(LogEntry.metric_id == metric_id)
        statement = statement.order_by(LogEntry.timestamp.desc()).limit(limit)
        logs = session.exec(statement).all()
        return [_serialize_log(l) for l in logs]

    
@app.delete("/logs/{logId}")
def delete_log(logId: int):
    with Session(engine) as session:
        deletingLog = session.get(LogEntry, logId)
        if deletingLog is None:
            raise HTTPException(status_code=404, detail="Log not found")
        session.delete(deletingLog)
        session.commit()
    return {"message": "deleted log"}

# --- Tasks ---

@app.post("/tasks")
def create_task(task: TaskCreate):
    thisTask = Task(
        title=task.title, energyCost=task.energyCost, moodCost=task.moodCost,
        cooldown_days=task.cooldown_days, room_zone=task.room_zone,
    )
    with Session(engine) as session:
        session.add(thisTask)
        session.commit()
        session.refresh(thisTask)
    return thisTask

@app.get("/tasks")
def read_task():
    with Session(engine) as session:
        return session.exec(select(Task)).all()

@app.delete("/tasks/{taskId}")
def delete_task(taskId: int):
    with Session(engine) as session:
        deletingTask = session.get(Task, taskId)
        if deletingTask is None:
            raise HTTPException(status_code=404, detail="Task not found")
        session.delete(deletingTask)
        session.commit()
    return {"message": "deleted task"}

@app.patch("/tasks/{taskId}")
def edit_task(taskId: int, update: TaskUpdate):
    with Session(engine) as session:
        editingTask = session.get(Task, taskId)

        if editingTask is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        for key, value in update.model_dump(exclude_unset=True).items():
            setattr(editingTask, key, value)

        session.commit()
        session.refresh(editingTask)

    return editingTask


@app.patch("/tasks/{taskId}/complete")
def complete_task(taskId: int):
    with Session(engine) as session:
        completedTask = session.get(Task, taskId)
        if completedTask is None:
            raise HTTPException(status_code=404, detail="Task not found")

        now = datetime.utcnow()
        earned = task_xp(completedTask, now)  # must run BEFORE last_completed_at is overwritten

        if completedTask.room_zone is not None:
            stat = session.exec(
                select(CategoryStat).where(CategoryStat.category == completedTask.room_zone)
            ).first()
            if stat is not None:
                stat.xp += earned

        if not completedTask.cooldown_days:
            completedTask.status = "done"
        completedTask.last_completed_at = now
        session.commit()
        session.refresh(completedTask)
        result = {**completedTask.model_dump(), "xp_earned": earned}
    return result

@app.patch("/tasks/{taskId}/reset")
def reset_task(taskId: int):
    with Session(engine) as session:
        task = session.get(Task, taskId)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        task.last_completed_at = None
        if task.cooldown_days == 0:
            task.status = "pending"
        session.commit()
        session.refresh(task)
    return task

@app.get("/tasks/suggest")
def suggest_task(energy: int, mood: int):
    with Session(engine) as session:
        allTask = session.exec(select(Task).where(
            Task.energyCost <= energy,
            Task.moodCost <= mood,
            Task.status == "pending",
        ))

        nested = []
        for task in allTask:
            if task.last_completed_at is not None and (datetime.utcnow() - task.last_completed_at).days < (task.cooldown_days or 0):
                continue
            energy_diff = energy - task.energyCost
            mood_diff = mood - task.moodCost
            distance = math.sqrt(energy_diff**2 + mood_diff**2)
            nested.append({
                "id": task.id, "title": task.title,
                "energyCost": task.energyCost, "moodCost": task.moodCost,
                "distance": distance,
            })
    return sorted(nested, key=lambda t: t["distance"])

# --- Scoring: Body (metric health) and Room (task neglect) ---

def score_metric(session, metric):
    cutoff = datetime.utcnow() - timedelta(days=7)
    statement = select(LogEntry).where(
        LogEntry.metric_id == metric.id,
        LogEntry.timestamp >= cutoff,
    )
    logs = session.exec(statement).all()
    if not logs:
        return None

    if metric.type == "boolean":
        true_count = sum(1 for l in logs if l.value_bool)
        return round((true_count / len(logs)) * 100)

    if metric.type == "number":
        values = [l.value_number for l in logs if l.value_number is not None]
        if not values:
            return None
        avg = sum(values) / len(values)
        lo, hi = metric.min_value, metric.max_value
        if lo is None or hi is None:
            return 50
        if lo <= avg <= hi:
            return 100
        span = max(hi - lo, 1)
        distance = (lo - avg) if avg < lo else (avg - hi)
        return max(0, round(100 - (distance / span) * 100))

    return None

def task_xp(task, now):
    """10 XP when on time, sliding down to 1 XP when a full cooldown period overdue."""
    if not task.cooldown_days:
        return 10  # one-time tasks: flat reward
    anchor = task.last_completed_at if task.last_completed_at else task.created_at
    elapsed = (now - anchor).total_seconds() / 86400
    late = max(0, elapsed - task.cooldown_days)
    return round(10 - 9 * min(1, late / task.cooldown_days))

def score_task(task):
    if not task.cooldown_days:
        return 50 if task.status != "done" else 100
    if task.status == "done":
        return 100

    anchor = task.last_completed_at if task.last_completed_at else task.created_at
    lastActioned = (datetime.utcnow() - anchor).days

    ratio = lastActioned / (task.cooldown_days * 2)
    score = round(100 - ratio * 100)
    return max(0, min(100, score))

@app.get("/metrics/body-status")
def body_status():
    cutoff = datetime.utcnow() - timedelta(days=7)

    with Session(engine) as session:
        metrics = session.exec(
            select(Metric).where(Metric.body_part != None)
        ).all()

        result = []

        for metric in metrics:
            logs = session.exec(
                select(LogEntry)
                .where(
                    LogEntry.metric_id == metric.id,
                    LogEntry.timestamp >= cutoff,
                )
                .order_by(LogEntry.timestamp.desc())
            ).all()

            result.append({
                "id": metric.id,
                "name": metric.name,
                "body_part": metric.body_part,
                "score": score_metric(session, metric),
                "logs": [
                    {
                        "id": log.id,
                        "metric_id": log.metric_id,
                        "metric_name": metric.name,
                        "timestamp": log.timestamp,
                        "value_number": log.value_number,
                        "value_bool": log.value_bool,
                        "value_text": log.value_text,
                        "note": log.note,
                    }
                    for log in logs
                ],
            })

        return result



@app.get("/tasks/zone-status")
def task_zone_status():
    with Session(engine) as session:
        tasks = session.exec(select(Task).where(Task.room_zone != None)).all()
        return [
            {"id": t.id, "title": t.title, "room_zone": t.room_zone, "score": score_task(t)}
            for t in tasks
        ]

# --- Debug ---

@app.get("/debug/all")
def debug():
    with Session(engine) as session:
        metrics = session.exec(select(Metric)).all()
        return [{"id": m.id, "name": m.name, "type": m.type, "logs": m.logs} for m in metrics]

CATEGORIES = ("discipline", "body", "mind", "order", "social")

@app.get("/stats")
def get_stats():
    with Session(engine) as session:
        rows = session.exec(select(CategoryStat)).all()
        xp_by_category = {r.category: r.xp for r in rows}
    return [
        {
            "category": c,
            "xp": xp_by_category.get(c, 0),
            "level": xp_by_category.get(c, 0) // 100,
            "xp_into_level": xp_by_category.get(c, 0) % 100,
        }
        for c in CATEGORIES
    ]
# --- Frontend (must stay last: catches every unmatched route) ---

app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="app")