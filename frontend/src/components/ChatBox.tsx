import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  streaming?: boolean
}

interface ChatBoxProps {
  apiUrl?: string
  gatewayToken?: string
}

export function ChatBox({
  apiUrl = 'http://localhost:18789',
  gatewayToken
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check Gateway connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`, { method: 'GET' })
        setIsConnected(response.ok)
      } catch {
        setIsConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [apiUrl])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    // Optimistic UI update
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      // Use EventSource for streaming (if supported)
      if (typeof EventSource !== 'undefined') {
        await sendMessageStreaming(userMessage, assistantMessageId)
      } else {
        // Fallback to regular fetch
        await sendMessageRegular(userMessage, assistantMessageId)
      }
    } catch (error) {
      console.error('Error sending message:', error)

      // Update with error message
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`, streaming: false }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessageStreaming = async (userMessage: Message, assistantId: string) => {
    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${apiUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(gatewayToken && { 'Authorization': `Bearer ${gatewayToken}` })
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: 'dashboard-chat',
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.content) {
                accumulatedContent += data.content

                // Update message with streaming content
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, content: accumulatedContent, streaming: true }
                    : msg
                ))
              }

              if (data.done) {
                // Finalize message
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, streaming: false }
                    : msg
                ))
                break
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      abortControllerRef.current = null
    }
  }

  const sendMessageRegular = async (userMessage: Message, assistantId: string) => {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken && { 'Authorization': `Bearer ${gatewayToken}` })
      },
      body: JSON.stringify({
        message: userMessage.content,
        sessionId: 'dashboard-chat'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // Update assistant message with response
    setMessages(prev => prev.map(msg =>
      msg.id === assistantId
        ? { ...msg, content: data.response || data.message || 'No response', streaming: false }
        : msg
    ))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as any)
    }
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)

      // Mark last streaming message as stopped
      setMessages(prev => prev.map(msg =>
        msg.streaming ? { ...msg, streaming: false, content: msg.content + '\n\n[Stopped by user]' } : msg
      ))
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full bg-slate-800/50 backdrop-blur-lg rounded-xl border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="text-lg font-semibold text-white">OpenClaw Chat</h3>
          <span className="text-xs text-slate-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={clearChat}
          className="px-3 py-1 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg mb-2">Start a conversation with OpenClaw</p>
            <p className="text-sm text-slate-500">Ask questions, run commands, or manage your workflows</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-slate-700/50 text-slate-100'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.content || (message.streaming ? '...' : '')}
                {message.streaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                )}
              </div>
              <div className="text-xs mt-2 opacity-60">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700">
        <form onSubmit={sendMessage} className="flex items-end space-x-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-slate-700/50 text-white placeholder-slate-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none min-h-[60px] max-h-[200px]"
            rows={2}
            disabled={isLoading || !isConnected}
          />

          {isLoading ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex-shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !isConnected}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg flex-shrink-0"
            >
              Send
            </button>
          )}
        </form>

        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>Gateway: {apiUrl}</span>
          {isLoading && <span className="text-blue-400 animate-pulse">Thinking...</span>}
        </div>
      </div>
    </div>
  )
}
