"""Pydantic response models for all API endpoints."""

from typing import List, Optional
from pydantic import BaseModel


# --- Overview ---
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


# --- Jobs ---
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
    action: str  # enable, disable, run_now, clear_errors


# --- Metrics ---
class TokenMetrics(BaseModel):
    model: str
    provider: str
    input_tokens: int
    output_tokens: int
    cost: float
    cache_hits: int
    cache_writes: int


class TimeSeriesPoint(BaseModel):
    timestamp: str
    value: float
    label: Optional[str] = None


# --- System ---
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


# --- Discovery ---
class PipelineStage(BaseModel):
    name: str
    status: str = "unknown"


class Pipeline(BaseModel):
    id: str
    name: str
    icon: str
    color: str
    directory: str = ""
    path: str = ""
    stages: List[str] = []
    metrics: List[str] = []
    status: str = "unknown"
    source: str = "filesystem"


class Agent(BaseModel):
    name: str
    type: str = "general"
    icon: str = "bot"
    color: str = "#6366f1"
    config_path: str = ""
    capabilities: List[str] = []
    source: str = "config"
    status: str = "unknown"


class SkillInfo(BaseModel):
    name: str
    path: str = ""
    category: str = "general"
    has_readme: bool = False
    description: str = ""


class DiscoveryResult(BaseModel):
    detected_at: str
    workspace: str
    pipelines: List[Pipeline] = []
    agents: List[Agent] = []
    skills: List[SkillInfo] = []
    custom_modules: List[dict] = []
    metrics: dict = {}


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    session_id: str = "dashboard"
    model: Optional[str] = None


# --- Sessions ---
class SessionInfo(BaseModel):
    id: str
    started: str = ""
    last_activity: str = ""
    messages: int = 0
    model: str = "unknown"
    status: str = "unknown"
