import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { usePolling } from '../hooks/usePolling';
import { fetchSystemHealth, fetchDevices, fetchSessions } from '../api/endpoints';
import type { DeviceInfo, SessionInfo } from '../api/types';

export default function SystemPage() {
  const { system, fetchSystem } = useStore();
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  usePolling(fetchSystem, 5000);

  useEffect(() => {
    fetchSystemHealth().then(setHealth).catch(() => {});
    fetchDevices().then(setDevices).catch(() => {});
    fetchSessions().then((d) => setSessions(d.sessions)).catch(() => {});
  }, []);

  const gauge = (label: string, value: number, color: string) => (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-bold">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">System</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resources */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">System Resources</h3>
          <div className="space-y-4">
            {gauge('CPU Usage', system?.cpu_percent ?? 0, '#3b82f6')}
            {gauge('Memory', system?.memory_percent ?? 0, '#8b5cf6')}
            {gauge('Disk', system?.disk_percent ?? 0, '#ec4899')}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-slate-400 text-xs">Memory</div>
              <div className="text-white">{system?.memory_used_gb?.toFixed(1)}GB / {system?.memory_total_gb?.toFixed(1)}GB</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-slate-400 text-xs">Disk</div>
              <div className="text-white">{system?.disk_used_gb?.toFixed(0)}GB / {system?.disk_total_gb?.toFixed(0)}GB</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-slate-400 text-xs">Load Average</div>
              <div className="text-white">{system?.load_average?.map((l) => l.toFixed(2)).join(', ')}</div>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Health Checks</h3>
          {health?.checks && (
            <div className="space-y-2">
              {Object.entries(health.checks).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 bg-slate-700/30 rounded-lg">
                  <span className="text-sm text-slate-300">{key.replace(/_/g, ' ')}</span>
                  <span className={`text-sm font-medium ${val ? 'text-green-400' : 'text-slate-500'}`}>
                    {typeof val === 'boolean' ? (val ? 'OK' : 'No') : String(val || 'N/A')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Paired Devices ({devices.length})</h3>
          <div className="space-y-2">
            {devices.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="text-sm text-white">{d.platform}</div>
                  <div className="text-xs text-slate-400">{d.device_id}</div>
                </div>
                <span className="text-xs text-slate-400">{d.role}</span>
              </div>
            ))}
            {devices.length === 0 && <div className="text-sm text-slate-500">No paired devices</div>}
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Active Sessions ({sessions.length})</h3>
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="text-sm text-white font-mono">{s.id.slice(0, 12)}...</div>
                  <div className="text-xs text-slate-400">{s.model} - {s.messages} msgs</div>
                </div>
                <span className={`text-xs ${s.status === 'active' ? 'text-green-400' : 'text-slate-400'}`}>{s.status}</span>
              </div>
            ))}
            {sessions.length === 0 && <div className="text-sm text-slate-500">No active sessions</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
