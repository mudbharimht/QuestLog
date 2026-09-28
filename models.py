from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime

class MetricCreate(SQLModel):
    name: str
    type: str
    role: Optional[str] = None

class Metric(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str  # "boolean", "number", "scale", "journal"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    logs: list["LogEntry"] = Relationship(back_populates="metric")
    role: Optional[str] = None
    archived: bool = False
    min_value: Optional[float] = None
    max_value: Optional[float] = None

class MetricUpdate(SQLModel):
    name: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    archived: Optional[bool] = None

class LogEntryCreate(SQLModel):
    metric_id: int
    value: str  # we'll keep this flexible as text for now, e.g. "true", "7", "felt good today"
    note: Optional[str] = None

class LogEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    metric_id: int = Field(foreign_key="metric.id")
    metric: Optional["Metric"] = Relationship(back_populates="logs")
    value_number: Optional[float] = None
    value_bool: Optional[bool] = None
    value_text: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    energyCost: int
    moodCost: int
    status: str = Field(default="pending")
    cooldown_days: Optional[int]
    last_completed_at: Optional[datetime] = None

class TaskCreate(SQLModel):
    title:str
    energyCost:int
    moodCost: int
    cooldown_days: int = 0
