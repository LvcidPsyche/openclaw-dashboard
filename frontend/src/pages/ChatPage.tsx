import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Send, WifiOff, Loader2, Brain, Wifi } from 'lucide-react';
import * as api from '../api/endpoints';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2000;

export default function ChatPage() {
  const { chatMessages, addChatMessage, updateLastChatMessage } = useStore();
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [thinking, setThinking] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<(attempt?: number) => void>(() => {});

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const connectWs = useCallback((attempt = 0) => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${proto}//${window.location.host}/ws/chat`);

    socket.onopen = () => {
      setConnected(true);
      setReconnectCount(0);
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connection_error') {
          addChatMessage({ id: crypto.randomUUID(), role: 'system', content: data.error, timestamp: Date.now() });
          return;
        }
        if (data.type === 'system') {
          addChatMessage({ id: crypto.randomUUID(), role: 'system', content: data.content, timestamp: Date.now() });
          setGatewayUp(true);
          return;
        }
        if (data.type === 'delta') {
          setStreamingId((prev) => {
            if (!prev) {
              const newId = crypto.randomUUID();
              addChatMessage({ id: newId, role: 'assistant', content: data.content, timestamp: Date.now() });
              return newId;
            }
            updateLastChatMessage(data.content);
            return prev;
          });
          return;
        }
        if (data.type === 'message' || data.type === 'done') {
          setStreamingId(null);
          setSending(false);
        }
      } catch {
        addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: e.data, timestamp: Date.now() });
      }
    };

    socket.onerror = () => setGatewayUp(false);

    socket.onclose = () => {
      setConnected(false);
      setStreamingId(null);
      setSending(false);

      // Auto-reconnect with exponential backoff
      const nextAttempt = attempt + 1;
      if (nextAttempt <= MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(1.5, attempt);
        setReconnectCount(nextAttempt);
        reconnectTimer.current = setTimeout(() => connectRef.current(nextAttempt), delay);
      } else {
        setReconnectCount(0);
      }
    };

    setWs(socket);
  }, [addChatMessage, updateLastChatMessage]);

  // Keep connectRef current so the recursive setTimeout reference is always fresh
  useEffect(() => {
    connectRef.current = connectWs;
  }, [connectWs]);

  useEffect(() => {
    fetch('/api/chat/status')
      .then((r) => r.json())
      .then((d) => {
        setGatewayUp(d.available);
        if (d.available) connectWs(0);
      })
      .catch(() => setGatewayUp(false));
    api.fetchModels().then((d) => setModels(d.models || [])).catch(() => {});

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws?.close();
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    setSending(true);
    setStreamingId(null);
    addChatMessage({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ content: text, model: selectedModel || undefined, thinking }));
    } else {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, model: selectedModel || undefined }),
        });
        const data = await res.json();
        addChatMessage({
          id: crypto.randomUUID(),
          role: data.error ? 'system' : 'assistant',
          content: data.error || data.response || JSON.stringify(data),
          timestamp: Date.now(),
        });
      } catch {
        addChatMessage({
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Failed to send — gateway may be offline',
          timestamp: Date.now(),
        });
      }
      setSending(false);
    }
  };

  const connectionStatus = connected
    ? { label: 'Connected', cls: 'text-green-400 bg-green-500/10 border-green-500/30', icon: Wifi }
    : reconnectCount > 0
    ? { label: `Reconnecting ${reconnectCount}/${MAX_RECONNECT_ATTEMPTS}…`, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: WifiOff }
    : gatewayUp === false
    ? { label: 'Gateway offline', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: WifiOff }
    : { label: 'Connecting…', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: Loader2 };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">AI Chat</h1>
        <div className="flex items-center gap-2">
          {models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Default model</option>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {models.map((m: any, i: number) => (
                <option key={i} value={m.id || m.name || m}>{m.name || m.id || m}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setThinking(!thinking)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              thinking
                ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Extended Thinking"
          >
            <Brain size={13} />
            {thinking ? 'Thinking ON' : 'Thinking'}
          </button>

          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${connectionStatus.cls}`}>
            <connectionStatus.icon size={12} className={reconnectCount > 0 ? 'animate-spin' : ''} />
            {connectionStatus.label}
          </div>

          {!connected && reconnectCount === 0 && gatewayUp !== false && (
            <button
              onClick={() => connectWs(0)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-y-auto p-4 space-y-3 mb-4">
        {chatMessages.length === 0 && (
          <div className="text-center py-12">
            {gatewayUp === false ? (
              <div className="space-y-2">
                <WifiOff size={32} className="mx-auto text-slate-600" />
                <p className="text-sm text-slate-400">OpenClaw gateway is not running</p>
                <p className="text-xs text-slate-500">
                  Start it with:{' '}
                  <code className="bg-slate-800 px-2 py-0.5 rounded">openclaw gateway start</code>
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Send a message to start chatting with OpenClaw</p>
            )}
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-amber-600/80 text-white'
                  : msg.role === 'system'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-slate-700/50 text-slate-200'
              }`}
            >
              <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">{msg.role}</div>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {sending && !streamingId && (
          <div className="flex justify-start">
            <div className="bg-slate-700/50 text-slate-400 rounded-xl px-4 py-3">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={connected ? 'Type a message…' : 'Connecting to gateway…'}
          disabled={!connected && gatewayUp !== true}
          className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={sending || (!connected && gatewayUp !== true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:hover:bg-amber-600"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
