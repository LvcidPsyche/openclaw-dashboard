export interface DashboardOverview {
  total_jobs: number;
  active_jobs: number;
  error_jobs: number;
  tokens_today: number;
  cost_today: number;
  uptime_percent: number;
  active_sessions: number;
  last_updated: string;
  pipelines_count: number;
  agents_count: number;
  skills_count: number;
}

export interface JobStatus {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  last_run: string | null;
  last_status: string | null;
  last_duration: number | null;
  consecutive_errors: number;
  next_run: string | null;
  error_message: string | null;
}

export interface CronJobCreate {
  name: string;
  scheduleType: 'cron' | 'interval';
  cronExpression?: string;
  intervalMs?: number;
  agent?: string;
  model?: string;
  message?: string;
  timeout?: number;
  enabled?: boolean;
}

export interface CronJobUpdate extends Partial<CronJobCreate> {
  id?: string;
}

export interface CronJobRun {
  ts: number;
  status: string;
  durationMs?: number;
  error?: string;
  jobId?: string;
}

export interface SystemResources {
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  load_average: number[];
}

export interface TokenMetricsResponse {
  period_days: number;
  models: TokenModel[];
  total_tokens: number;
  total_cost: number;
}

export interface TokenModel {
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  cache_hits: number;
  cache_writes: number;
  requests: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label: string;
}

export interface MetricsBreakdown {
  by_model: { model: string; tokens: number; cost: number; requests: number }[];
  daily_trend: { date: string; tokens: number; cost: number }[];
}

export interface Pipeline {
  id: string;
  name: string;
  icon: string;
  color: string;
  directory: string;
  path: string;
  stages: string[];
  metrics: string[];
  status: string;
  source: string;
}

export interface Agent {
  name: string;
  type: string;
  icon: string;
  color: string;
  config_path: string;
  capabilities: string[];
  source: string;
  status: string;
}

export interface SkillInfo {
  name: string;
  path: string;
  category: string;
  has_readme: boolean;
  description: string;
  readme?: string;
}

export interface SkillCategory {
  name: string;
  count: number;
}

export interface DiscoveryResult {
  detected_at: string;
  workspace: string;
  pipelines: Pipeline[];
  agents: Agent[];
  skills: SkillInfo[];
  custom_modules: { name: string; path: string; type: string; status: string }[];
  metrics: Record<string, number>;
}

export interface SessionInfo {
  id: string;
  started: string;
  last_activity: string;
  messages: number;
  model: string;
  status: string;
}

export interface DeviceInfo {
  device_id: string;
  platform: string;
  client_id: string;
  role: string;
  last_used: string;
  created_at: string;
  status?: string;
}

export interface LogFile {
  name: string;
  size_bytes: number;
  size_mb: number;
  modified: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
}

// Config types
export interface ConfigData {
  [key: string]: any;
}

// Node types
export interface NodeInfo {
  id: string;
  status: string;
  platform?: string;
  capabilities?: string[];
  lastSeen?: string;
}

// Debug types
export interface GatewayStatus {
  connected: boolean;
  latency_ms: number;
  gateway_url: string;
  protocol_version: number;
  error?: string;
}

export interface FilesystemCheck {
  path: string;
  exists: boolean;
  readable: boolean;
}

// Session management types
export interface SessionDetail {
  id: string;
  model?: string;
  messages?: number;
  status?: string;
  started?: string;
  last_activity?: string;
  thinking?: boolean;
  reasoningLevel?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cost?: number;
  };
}

export interface ModelInfo {
  id?: string;
  name?: string;
  provider?: string;
  context_length?: number;
}
