import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Send, Plug, WifiOff } from 'lucide-react';

export default function ChatPage() {
  const { chatMessages, addChatMessage } = useStore();
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [model, setModel] = useState('kimi-k2.5');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Check gateway status on mount
  useEffect(() => {
    fetch('/api/chat/status')
      .then((r) => r.json())
      .then((d) => setGatewayUp(d.available))
      .catch(() => setGatewayUp(false));
  }, []);

  const connect = () => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${proto}//${window.location.host}/ws/chat`);
    socket.onopen = () => {
      setConnected(true);
      addChatMessage({ id: crypto.randomUUID(), role: 'system', content: 'Connected to OpenClaw gateway', timestamp: Date.now() });
    };
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connection_error') {
          addChatMessage({ id: crypto.randomUUID(), role: 'system', content: data.error, timestamp: Date.now() });
          return;
        }
        addChatMessage({
          id: crypto.randomUUID(), role: 'assistant',
          content: data.content || data.message || JSON.stringify(data),
          timestamp: Date.now(),
        });
      } catch {
        addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: e.data, timestamp: Date.now() });
      }
    };
    socket.onerror = () => {
      setGatewayUp(false);
    };
    socket.onclose = () => {
      setConnected(false);
    };
    setWs(socket);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    addChatMessage({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ role: 'user', content: text, model }));
    } else {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId: 'dashboard' }),
        });
        const data = await res.json();
        if (data.error) {
          addChatMessage({ id: crypto.randomUUID(), role: 'system', content: data.error, timestamp: Date.now() });
        } else {
          addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: data.response || JSON.stringify(data), timestamp: Date.now() });
        }
      } catch {
        addChatMessage({ id: crypto.randomUUID(), role: 'system', content: 'Failed to send — gateway may be offline', timestamp: Date.now() });
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">AI Chat</h1>
        <div className="flex items-center gap-3">
          {gatewayUp === false && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <WifiOff size={12} />
              Gateway offline
            </span>
          )}
          <button
            onClick={connect}
            disabled={connected}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${connected ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Plug size={14} />
            {connected ? 'Connected' : 'Connect'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-y-auto p-4 space-y-3 mb-4">
        {chatMessages.length === 0 && (
          <div className="text-center py-12">
            {gatewayUp === false ? (
              <div className="space-y-2">
                <WifiOff size={32} className="mx-auto text-slate-600" />
                <p className="text-sm text-slate-400">OpenClaw gateway is not running</p>
                <p className="text-xs text-slate-500">Start it with: <code className="bg-slate-800 px-2 py-0.5 rounded">openclaw gateway start</code></p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Send a message to start chatting with OpenClaw</p>
            )}
          </div>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
              msg.role === 'user' ? 'bg-blue-600 text-white' :
              msg.role === 'system' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-slate-700/50 text-slate-200'
            }`}>
              <div className="text-xs opacity-60 mb-1">{msg.role}</div>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <select value={model} onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 text-sm">
          <option value="kimi-k2.5">Kimi K2.5</option>
          <option value="pony-alpha">Pony Alpha</option>
          <option value="claude-sonnet">Claude Sonnet</option>
        </select>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
