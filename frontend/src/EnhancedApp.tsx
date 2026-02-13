import { useEffect, useState, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

const API_BASE = '/api/v2'

interface SystemResources {
  cpu_percent: number
  memory_percent: number
  memory_used_gb: number
  memory_total_gb: number
  disk_percent: number
  disk_used_gb: number
  disk_total_gb: number
  load_average: number[]
}

interface JobStatus {
  id: string
  name: string
  enabled: boolean
  schedule: string
  last_run: string | null
  last_status: string | null
  last_duration: number | null
  consecutive_errors: number
  next_run: string | null
  error_message: string | null
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

function EnhancedApp() {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'system' | 'chat'>('overview')
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null)
  const [jobs, setJobs] = useState<JobStatus[]>([])
  const [timeseriesData, setTimeseriesData] = useState<any[]>([])
  const [breakdown, setBreakdown] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatWs, setChatWs] = useState<WebSocket | null>(null)
  const [selectedModel, setSelectedModel] = useState('kimi-k2.5')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchData = async () => {
    try {
      const [resourcesRes, jobsRes, timeseriesRes, breakdownRes] = await Promise.all([
        fetch(`${API_BASE}/system/resources`),
        fetch('/api/v1/jobs'),
        fetch(`${API_BASE}/metrics/timeseries?metric=tokens&hours=12`),
        fetch(`${API_BASE}/metrics/breakdown`)
      ])

      setSystemResources(await resourcesRes.json())
      setJobs(await jobsRes.json())
      const tsData = await timeseriesRes.json()
      setTimeseriesData(tsData.data || [])
      setBreakdown(await breakdownRes.json())
    } catch (error) {
      console.error('Fetch error:', error)
    }
  }

  const controlJob = async (jobId: string, action: string) => {
    try {
      const response = await fetch(`${API_BASE}/jobs/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, action })
      })

      if (response.ok) {
        fetchData()
        alert(`Job ${action} successful`)
      }
    } catch (error) {
      alert(`Failed to ${action} job`)
    }
  }

  const connectChat = () => {
    const ws = new WebSocket(`ws://localhost:8766/ws/chat`)

    ws.onopen = () => {
      console.log('Chat connected')
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: 'Connected to OpenClaw gateway',
        timestamp: new Date().toISOString()
      }])
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content || data.message || JSON.stringify(data),
          timestamp: new Date().toISOString()
        }])
      } catch {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: event.data,
          timestamp: new Date().toISOString()
        }])
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: 'Connection error - check if OpenClaw gateway is running',
        timestamp: new Date().toISOString()
      }])
    }

    ws.onclose = () => {
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: 'Disconnected from gateway',
        timestamp: new Date().toISOString()
      }])
    }

    setChatWs(ws)
  }

  const sendMessage = () => {
    if (!chatInput.trim() || !chatWs) return

    const message = {
      role: 'user',
      content: chatInput,
      model: selectedModel
    }

    chatWs.send(JSON.stringify(message))
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    }])
    setChatInput('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">OpenClaw Dashboard</h1>
              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full">
                ENHANCED v2
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-300">
                CPU: {systemResources?.cpu_percent.toFixed(1)}% |
                MEM: {systemResources?.memory_percent.toFixed(1)}% |
                DISK: {systemResources?.disk_percent.toFixed(1)}%
              </div>
              <a
                href="https://github.com/openclaw"
                target="_blank"
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-all"
              >
                ⭐ GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-700 bg-slate-800/30">
        <div className="max-w-full mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'jobs', label: '⚙️ Jobs & Control' },
              { id: 'system', label: '💻 System Metrics' },
              { id: 'chat', label: '💬 AI Chat' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-full mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <div className="text-sm text-slate-400">Total Jobs</div>
                <div className="text-3xl font-bold text-white mt-2">{jobs.length}</div>
                <div className="text-xs text-green-400 mt-2">
                  {jobs.filter(j => j.enabled).length} enabled
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <div className="text-sm text-slate-400">CPU Usage</div>
                <div className="text-3xl font-bold text-white mt-2">
                  {systemResources?.cpu_percent.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Load: {systemResources?.load_average[0].toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <div className="text-sm text-slate-400">Memory</div>
                <div className="text-3xl font-bold text-white mt-2">
                  {systemResources?.memory_used_gb.toFixed(1)}GB
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  of {systemResources?.memory_total_gb.toFixed(1)}GB
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <div className="text-sm text-slate-400">Disk Usage</div>
                <div className="text-3xl font-bold text-white mt-2">
                  {systemResources?.disk_used_gb.toFixed(1)}GB
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  of {systemResources?.disk_total_gb.toFixed(1)}GB
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Token Usage Over Time */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Token Usage (12h)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timeseriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Token Usage by Model */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Token Usage by Model</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={breakdown?.by_model || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="model" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    />
                    <Bar dataKey="tokens" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Job Control Panel</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Job Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Last Run</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Schedule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${job.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span className="text-sm font-medium text-white">{job.name}</span>
                        </div>
                        {job.error_message && (
                          <div className="text-xs text-red-400 mt-1 ml-5">
                            {job.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {job.last_status === 'success' && (
                          <span className="px-2 py-1 text-xs text-green-400 bg-green-500/10 rounded-full">✓ Success</span>
                        )}
                        {job.last_status === 'error' && (
                          <span className="px-2 py-1 text-xs text-red-400 bg-red-500/10 rounded-full">✗ Error</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{job.schedule}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {job.enabled ? (
                            <button
                              onClick={() => controlJob(job.id, 'disable')}
                              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                            >
                              Disable
                            </button>
                          ) : (
                            <button
                              onClick={() => controlJob(job.id, 'enable')}
                              className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                            >
                              Enable
                            </button>
                          )}
                          <button
                            onClick={() => controlJob(job.id, 'run_now')}
                            className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                          >
                            Run Now
                          </button>
                          {job.consecutive_errors > 0 && (
                            <button
                              onClick={() => controlJob(job.id, 'clear_errors')}
                              className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                            >
                              Clear Errors
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">System Resources</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">CPU Usage</span>
                    <span className="text-white font-bold">{systemResources?.cpu_percent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${systemResources?.cpu_percent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Memory</span>
                    <span className="text-white font-bold">
                      {systemResources?.memory_used_gb.toFixed(1)}GB / {systemResources?.memory_total_gb.toFixed(1)}GB
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${systemResources?.memory_percent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Disk</span>
                    <span className="text-white font-bold">
                      {systemResources?.disk_used_gb.toFixed(1)}GB / {systemResources?.disk_total_gb.toFixed(1)}GB
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-pink-500 h-2 rounded-full transition-all"
                      style={{ width: `${systemResources?.disk_percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Cost Breakdown</h3>
              {breakdown?.by_model && (
                <div className="space-y-3">
                  {breakdown.by_model.map((model: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                      <div>
                        <div className="text-white font-medium">{model.model}</div>
                        <div className="text-xs text-slate-400">{model.requests} requests</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">${model.cost}</div>
                        <div className="text-xs text-slate-400">{model.tokens.toLocaleString()} tokens</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">AI Chat (OpenClaw Gateway)</h2>
                <button
                  onClick={connectChat}
                  disabled={chatWs?.readyState === WebSocket.OPEN}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {chatWs?.readyState === WebSocket.OPEN ? '🟢 Connected' : 'Connect'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : msg.role === 'system'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-slate-700 text-white'
                    }`}>
                      <div className="text-xs opacity-75 mb-1">{msg.role}</div>
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                  >
                    <option value="kimi-k2.5">Kimi K2.5</option>
                    <option value="pony-alpha">Pony Alpha</option>
                    <option value="claude-sonnet">Claude Sonnet</option>
                  </select>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatWs || chatWs.readyState !== WebSocket.OPEN}
                    className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 text-left">
                  📊 Show system status
                </button>
                <button className="w-full px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 text-left">
                  🔧 List all jobs
                </button>
                <button className="w-full px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 text-left">
                  💰 Calculate costs
                </button>
                <button className="w-full px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 text-left">
                  🚀 Start new task
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default EnhancedApp
