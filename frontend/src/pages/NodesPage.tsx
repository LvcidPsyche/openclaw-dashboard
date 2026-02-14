import { useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { usePolling } from '../hooks/usePolling';
import EmptyState from '../components/common/EmptyState';
import { Network, Smartphone, Check, X, RefreshCw, ShieldOff, RotateCcw } from 'lucide-react';
import * as api from '../api/endpoints';

export default function NodesPage() {
  const toast = useToast();
  const [nodes, setNodes] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [n, d] = await Promise.all([api.fetchNodes(), api.fetchNodeDevices()]);
      setNodes(n.nodes || []);
      setDevices(d.devices || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  usePolling(loadData, 15000);

  const handleAction = async (deviceId: string, action: string) => {
    try {
      if (action === 'approve') await api.approveDevice(deviceId);
      else if (action === 'reject') await api.rejectDevice(deviceId);
      else if (action === 'revoke') await api.revokeDevice(deviceId);
      else if (action === 'rotate') await api.rotateDeviceToken(deviceId);
      toast.success(`Device ${action}d`);
      loadData();
    } catch {
      toast.error(`Failed to ${action} device`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading nodes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Nodes & Devices</h1>
        <button onClick={loadData} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Nodes Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <Network size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Connected Nodes</h2>
          <span className="text-xs text-slate-500 ml-auto">{nodes.length} nodes</span>
        </div>
        {nodes.length === 0 ? (
          <div className="p-6"><EmptyState message="No connected nodes" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Node ID</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Platform</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Capabilities</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {nodes.map((node: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-700/20">
                    <td className="px-5 py-3 text-sm text-white font-mono">{node.id || node.nodeId || `node-${i}`}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full ${
                        node.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'connected' ? 'bg-green-500' : 'bg-slate-500'}`} />
                        {node.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400">{node.platform || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">
                      {(node.capabilities || []).join(', ') || '-'}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400">{node.lastSeen ? new Date(node.lastSeen).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Devices Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <Smartphone size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Paired Devices</h2>
          <span className="text-xs text-slate-500 ml-auto">{devices.length} devices</span>
        </div>
        {devices.length === 0 ? (
          <div className="p-6"><EmptyState message="No paired devices" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Device</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Platform</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Last Used</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {devices.map((dev: any, i: number) => (
                  <tr key={i} className={`hover:bg-slate-700/20 ${dev.status === 'pending' ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="text-sm text-white font-mono">{dev.device_id || dev.deviceId}</div>
                      <div className="text-xs text-slate-500">{dev.client_id || dev.clientId}</div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400">{dev.platform}</td>
                    <td className="px-5 py-3 text-sm text-slate-400 capitalize">{dev.role}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{dev.last_used || dev.lastUsed || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{dev.created_at || dev.createdAt || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 justify-end">
                        {dev.status === 'pending' && (
                          <>
                            <button onClick={() => handleAction(dev.device_id || dev.deviceId, 'approve')}
                              className="p-1.5 rounded-lg hover:bg-slate-700 text-green-400" title="Approve">
                              <Check size={14} />
                            </button>
                            <button onClick={() => handleAction(dev.device_id || dev.deviceId, 'reject')}
                              className="p-1.5 rounded-lg hover:bg-slate-700 text-red-400" title="Reject">
                              <X size={14} />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleAction(dev.device_id || dev.deviceId, 'revoke')}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-red-400" title="Revoke token">
                          <ShieldOff size={14} />
                        </button>
                        <button onClick={() => handleAction(dev.device_id || dev.deviceId, 'rotate')}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title="Rotate token">
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
