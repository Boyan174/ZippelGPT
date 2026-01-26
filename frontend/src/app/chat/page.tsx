'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { ChatWindow } from '@/components/chat-window'
import {
  getSession,
  signOut,
  getChatSessions,
  deleteChatSession,
  ChatSession,
} from '@/lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (!session) {
          router.push('/')
          return
        }
        await loadSessions()
      } catch {
        router.push('/')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const loadSessions = async () => {
    try {
      const data = await getChatSessions()
      setSessions(data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const handleNewChat = () => {
    setCurrentSessionId(null)
  }

  const handleNewSession = (session: ChatSession) => {
    setSessions(prev => [session, ...prev])
    setCurrentSessionId(session.id)
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="flex-shrink-0">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          onLogout={handleLogout}
        />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <ChatWindow
          sessionId={currentSessionId}
          onNewSession={handleNewSession}
        />
      </div>
    </div>
  )
}
