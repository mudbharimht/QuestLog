from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime

# --- Metric: a tracked category of data (sleep, mood, nicotine, etc.) ---

class MetricCreate(SQLModel):
    name: str
    type: str
    role: Optional[str] = None
    body_part: Optional[str] = None
    category: Optional[str] = None  # "discipline" | "body" | "mind" | "order" | "social"

class Metric(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str  # "number" | "boolean" | "text"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    logs: list["LogEntry"] = Relationship(back_populates="metric")
    role: Optional[str] = None          # "energy" | "mood", drives the suggestion engine
    archived: bool = False
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    body_part: Optional[str] = None     # anatomical placement on the Body figure
    category: Optional[str] = None      # which stat this metric's XP feeds

class MetricUpdate(SQLModel):
    name: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    archived: Optional[bool] = None
    body_part: Optional[str] = None
    category: Optional[str] = None

# --- CategoryStat: permanent XP per life-area, never decreases ---

class CategoryStat(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category: str
    xp: int = Field(default=0)

# --- LogEntry: one timestamped value against a Metric ---

class LogEntryCreate(SQLModel):
    metric_id: int
    value: str
    note: Optional[str] = None
    timestamp: Optional[datetime] = None

class LogEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    metric_id: int = Field(foreign_key="metric.id")
    metric: Optional["Metric"] = Relationship(back_populates="logs")
    value_number: Optional[float] = None
    value_bool: Optional[bool] = None
    value_text: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- Task: a to-do item, optionally recurring, optionally shown in the Room ---

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    energyCost: int
    moodCost: int
    status: str = Field(default="pending")
    cooldown_days: Optional[int] = None   # 0 or None = one-time
    last_completed_at: Optional[datetime] = None
    room_zone: Optional[str] = None       # which Room bubble this shows as
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(SQLModel):
    title: str
    energyCost: int
    moodCost: int
    cooldown_days: int = 0
    room_zone: Optional[str] = None

class TaskUpdate(SQLModel):
    title: str
    energyCost: int
    moodCost: int
    cooldown_days: int = 0
    room_zone: Optional[str] = None
