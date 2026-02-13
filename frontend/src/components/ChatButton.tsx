import { useState } from 'react'
import { ChatBox } from './ChatBox'

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all hover:scale-110 z-50"
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[450px] h-[600px] z-50 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="relative h-full">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-lg z-10 shadow-lg transition-colors"
              aria-label="Close chat"
            >
              ×
            </button>
            <ChatBox />
          </div>
        </div>
      )}
    </>
  )
}
