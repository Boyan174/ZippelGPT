'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './message-bubble'
import { sendMessageToAI } from '@/lib/api'
import {
  getMessages,
  addMessage,
  createChatSession,
  updateChatSessionTitle,
  ChatSession,
  Message,
} from '@/lib/supabase'
import { SendIcon, MenuIcon } from 'lucide-react'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ChatWindowProps = {
  sessionId: string | null
  onNewSession: (session: ChatSession) => void
  onMenuClick: () => void
}

export function ChatWindow({ sessionId, onNewSession, onMenuClick }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId)
    } else {
      setMessages([])
    }
  }, [sessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [sessionId])

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input])

  const loadMessages = async (sid: string) => {
    try {
      const data = await getMessages(sid)
      const loadedMessages = data.map((m: Message) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }))
      setMessages(loadedMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    let currentSessionId = sessionId

    try {
      // Create session if needed
      if (!currentSessionId) {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
        const newSession = await createChatSession(title)
        currentSessionId = newSession.id
        onNewSession(newSession)
      }

      // Save user message to Supabase
      const savedUserMsg = await addMessage(currentSessionId, 'user', userMessage)

      // Add user message to UI (avoid duplicates)
      setMessages(prev => {
        if (prev.some(m => m.id === savedUserMsg.id)) return prev
        return [...prev, {
          id: savedUserMsg.id,
          role: 'user',
          content: userMessage
        }]
      })

      // Add assistant message placeholder
      const assistantMsgId = crypto.randomUUID()
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }])
      setIsStreaming(true)

      // Prepare history for AI (excluding the placeholder)
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      // Send to AI and stream response
      const fullResponse = await sendMessageToAI(
        userMessage,
        history,
        (chunk) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
            )
          )
        }
      )

      // Save assistant response to Supabase
      const savedAssistantMsg = await addMessage(currentSessionId, 'assistant', fullResponse)

      // Update message ID to the real one from Supabase
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId ? { ...m, id: savedAssistantMsg.id } : m
        )
      )

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg?.role === 'assistant' && lastMsg.content === '') {
          return prev.slice(0, -1).concat({
            ...lastMsg,
            content: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
          })
        }
        return prev
      })
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile header - only visible on mobile */}
      <div className="md:hidden flex items-center gap-3 p-3 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">ZippelGPT</h1>
      </div>

      {/* Messages area - scrollable, takes remaining space */}
      <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[200px] md:min-h-[400px]">
            <div className="text-center text-muted-foreground max-w-md px-4">
              <h2 className="text-xl md:text-2xl font-bold mb-2">Willkommen bei ZippelGPT</h2>
              <p className="text-sm md:text-base">
                Ich bin Christian Zippel, dein philosophischer Mentor.
                Erzähle mir von deinen Herausforderungen und ich werde dir
                helfen, den Weg zur Exzellenz zu finden.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={
                  isStreaming &&
                  message.id === messages[messages.length - 1]?.id &&
                  message.role === 'assistant'
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        </div>
      </ScrollArea>

      {/* Input area - fixed at bottom with safe area for notched devices */}
      <div className="flex-shrink-0 border-t p-3 md:p-4 bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="flex gap-2 md:gap-3 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht schreiben..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{
              minHeight: '2.5rem',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="self-end">
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
