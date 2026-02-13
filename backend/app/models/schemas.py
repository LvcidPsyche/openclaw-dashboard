"""Pydantic response models used by routers."""

from typing import List, Optional
from pydantic import BaseModel


class DashboardOverview(BaseModel):
    total_jobs: int
    active_jobs: int
    error_jobs: int
    tokens_today: int
    cost_today: float
    uptime_percent: float
    active_sessions: int
    last_updated: str
    pipelines_count: int = 0
    agents_count: int = 0
    skills_count: int = 0


class JobStatus(BaseModel):
    id: str
    name: str
    enabled: bool
    schedule: str
    last_run: Optional[str] = None
    last_status: Optional[str] = None
    last_duration: Optional[int] = None
    consecutive_errors: int = 0
    next_run: Optional[str] = None
    error_message: Optional[str] = None


class JobControl(BaseModel):
    job_id: str
    action: str


class SystemResources(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    load_average: List[float]


class DeviceInfo(BaseModel):
    device_id: str
    platform: str
    client_id: str
    role: str
    last_used: str
    created_at: str
