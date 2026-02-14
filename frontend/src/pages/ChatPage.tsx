import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Send, WifiOff, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const { chatMessages, addChatMessage, updateLastChatMessage } = useStore();
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Check gateway status on mount
  useEffect(() => {
    fetch('/api/chat/status')
      .then((r) => r.json())
      .then((d) => {
        setGatewayUp(d.available);
        // Auto-connect if gateway is up
        if (d.available) connectWs();
      })
      .catch(() => setGatewayUp(false));
  }, []);

  const connectWs = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${proto}//${window.location.host}/ws/chat`);
    socket.onopen = () => setConnected(true);
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

        // Streaming delta — append to the last assistant message
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

        // Final complete message
        if (data.type === 'message') {
          setStreamingId(null);
          setSending(false);
          // If we were streaming, the last message already has the full text via deltas
          // But replace it with the final version for accuracy
          return;
        }

        // Done signal
        if (data.type === 'done') {
          setStreamingId(null);
          setSending(false);
          return;
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
    };
    setWs(socket);
  }, [addChatMessage, updateLastChatMessage]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    setSending(true);
    setStreamingId(null);
    addChatMessage({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ content: text }));
    } else {
      // HTTP fallback
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
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
      setSending(false);
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
          {connected && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-lg">
              Connected
            </span>
          )}
          {!connected && gatewayUp && (
            <button
              onClick={connectWs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={connected ? "Type a message..." : "Connecting to gateway..."}
          disabled={!connected && gatewayUp !== true}
          className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button onClick={sendMessage}
          disabled={sending || (!connected && gatewayUp !== true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
