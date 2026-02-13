import { apiFetch, apiPost } from './client';
import type {
  DashboardOverview, JobStatus, SystemResources, TokenMetricsResponse,
  TimeSeriesPoint, MetricsBreakdown, Pipeline, Agent, SkillInfo,
  SkillCategory, DiscoveryResult, SessionInfo, DeviceInfo, LogFile,
} from './types';

// Overview
export const fetchOverview = () => apiFetch<DashboardOverview>('/api/overview');

// Jobs
export const fetchJobs = () => apiFetch<JobStatus[]>('/api/jobs');
export const fetchJobHistory = (id: string) => apiFetch<{ history: unknown[] }>(`/api/jobs/${id}/history`);
export const controlJob = (job_id: string, action: string) =>
  apiPost<{ status: string }>('/api/jobs/control', { job_id, action });

// Metrics
export const fetchTokenMetrics = (days = 7) =>
  apiFetch<TokenMetricsResponse>(`/api/metrics/tokens?days=${days}`);
export const fetchTimeseries = (metric = 'tokens', hours = 24) =>
  apiFetch<{ data: TimeSeriesPoint[] }>(`/api/metrics/timeseries?metric=${metric}&hours=${hours}`);
export const fetchBreakdown = () => apiFetch<MetricsBreakdown>('/api/metrics/breakdown');

// System
export const fetchSystemResources = () => apiFetch<SystemResources>('/api/system/resources');
export const fetchSystemHealth = () => apiFetch<Record<string, unknown>>('/api/system/health');
export const fetchDevices = () => apiFetch<DeviceInfo[]>('/api/devices');

// Sessions
export const fetchSessions = () => apiFetch<{ sessions: SessionInfo[] }>('/api/sessions');

// Discovery
export const fetchDiscovery = () => apiFetch<DiscoveryResult>('/api/discovery');
export const refreshDiscovery = () => apiPost<{ status: string }>('/api/discovery/refresh', {});
export const fetchPipelines = () => apiFetch<{ pipelines: Pipeline[] }>('/api/pipelines');
export const fetchAgents = () => apiFetch<{ agents: Agent[] }>('/api/agents');
export const fetchSkills = (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.category) q.set('category', params.category);
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return apiFetch<{ skills: SkillInfo[]; total: number; page: number }>(`/api/skills?${q}`);
};
export const fetchSkillCategories = () => apiFetch<{ categories: SkillCategory[] }>('/api/skills/categories');
export const fetchSkillDetail = (name: string) => apiFetch<SkillInfo>(`/api/skills/${name}`);

// Logs
export const fetchLogFiles = () => apiFetch<{ files: LogFile[] }>('/api/logs/files');
export const fetchLogTail = (file: string, lines = 100) =>
  apiFetch<{ lines: string[]; total: number }>(`/api/logs/tail?file=${encodeURIComponent(file)}&lines=${lines}`);

// Chat
export const sendChatMessage = (message: string) =>
  apiPost<Record<string, unknown>>('/api/chat', { message });

// Health
export const fetchHealth = () => apiFetch<{ status: string }>('/health');
