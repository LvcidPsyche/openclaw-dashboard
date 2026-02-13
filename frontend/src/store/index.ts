import { create } from 'zustand';
import type {
  DashboardOverview, JobStatus, SystemResources, Pipeline, Agent, SkillInfo,
  SkillCategory, TimeSeriesPoint, MetricsBreakdown, ChatMessage, LogFile,
} from '../api/types';
import * as api from '../api/endpoints';

interface DashboardStore {
  // Data
  overview: DashboardOverview | null;
  jobs: JobStatus[];
  system: SystemResources | null;
  pipelines: Pipeline[];
  agents: Agent[];
  skills: SkillInfo[];
  skillCategories: SkillCategory[];
  skillsTotal: number;
  timeseries: TimeSeriesPoint[];
  breakdown: MetricsBreakdown | null;
  chatMessages: ChatMessage[];
  logFiles: LogFile[];
  sidebarOpen: boolean;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  fetchAll: () => Promise<void>;
  fetchOverview: () => Promise<void>;
  fetchJobs: () => Promise<void>;
  fetchSystem: () => Promise<void>;
  fetchPipelines: () => Promise<void>;
  fetchAgents: () => Promise<void>;
  fetchSkills: (params?: { category?: string; search?: string; page?: number }) => Promise<void>;
  fetchSkillCategories: () => Promise<void>;
  fetchTimeseries: (metric?: string, hours?: number) => Promise<void>;
  fetchBreakdown: () => Promise<void>;
  controlJob: (jobId: string, action: string) => Promise<void>;
  addChatMessage: (msg: ChatMessage) => void;
  fetchLogFiles: () => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<DashboardStore>((set, get) => ({
  overview: null,
  jobs: [],
  system: null,
  pipelines: [],
  agents: [],
  skills: [],
  skillCategories: [],
  skillsTotal: 0,
  timeseries: [],
  breakdown: null,
  chatMessages: [],
  logFiles: [],
  sidebarOpen: true,
  loading: true,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [ov, jobsData, sys] = await Promise.all([
        api.fetchOverview(),
        api.fetchJobs(),
        api.fetchSystemResources(),
      ]);
      set({ overview: ov, jobs: jobsData, system: sys, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchOverview: async () => {
    try {
      const ov = await api.fetchOverview();
      set({ overview: ov });
    } catch {}
  },

  fetchJobs: async () => {
    try {
      const data = await api.fetchJobs();
      set({ jobs: data });
    } catch {}
  },

  fetchSystem: async () => {
    try {
      const sys = await api.fetchSystemResources();
      set({ system: sys });
    } catch {}
  },

  fetchPipelines: async () => {
    try {
      const { pipelines } = await api.fetchPipelines();
      set({ pipelines });
    } catch {}
  },

  fetchAgents: async () => {
    try {
      const { agents } = await api.fetchAgents();
      set({ agents });
    } catch {}
  },

  fetchSkills: async (params) => {
    try {
      const { skills, total } = await api.fetchSkills({ ...params, limit: 50 });
      set({ skills, skillsTotal: total });
    } catch {}
  },

  fetchSkillCategories: async () => {
    try {
      const { categories } = await api.fetchSkillCategories();
      set({ skillCategories: categories });
    } catch {}
  },

  fetchTimeseries: async (metric = 'tokens', hours = 24) => {
    try {
      const { data } = await api.fetchTimeseries(metric, hours);
      set({ timeseries: data });
    } catch {}
  },

  fetchBreakdown: async () => {
    try {
      const bd = await api.fetchBreakdown();
      set({ breakdown: bd });
    } catch {}
  },

  controlJob: async (jobId, action) => {
    await api.controlJob(jobId, action);
    get().fetchJobs();
  },

  addChatMessage: (msg) => {
    set((s) => ({ chatMessages: [...s.chatMessages, msg] }));
  },

  fetchLogFiles: async () => {
    try {
      const { files } = await api.fetchLogFiles();
      set({ logFiles: files });
    } catch {}
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
