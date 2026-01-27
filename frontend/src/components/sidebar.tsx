'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ChatSession } from '@/lib/supabase'
import { PlusIcon, LogOutIcon, TrashIcon, XIcon } from 'lucide-react'

type SidebarProps = {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string | null) => void
  onNewChat: () => void
  onDeleteSession: (sessionId: string) => void
  onLogout: () => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onLogout,
  isOpen,
  onClose,
}: SidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null)

  const handleDeleteClick = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation()
    setSessionToDelete(session)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete.id)
    }
    setDeleteDialogOpen(false)
    setSessionToDelete(null)
  }

  const sidebarContent = (
    <div className="w-64 min-w-[256px] max-w-[256px] bg-card h-full flex flex-col border-r overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold">ZippelGPT</h1>
        {/* Close button - only visible on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onClose}
        >
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Neue Unterhaltung
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 w-full">
        <div className="space-y-1 py-2 px-3 w-full max-w-full">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Keine Unterhaltungen
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group grid grid-cols-[1fr_auto] items-center rounded-lg transition-colors',
                  currentSessionId === session.id
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                )}
              >
                <button
                  onClick={() => onSelectSession(session.id)}
                  className="text-left px-3 py-2 text-sm truncate"
                >
                  {session.title}
                </button>
                <button
                  type="button"
                  className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 max-md:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteClick(e, session)}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Logout Button */}
      <div className="p-3 border-t">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
        >
          <LogOutIcon className="h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <div className="hidden md:block flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile sidebar - overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}

    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogHeader>
        <DialogTitle>Chat löschen</DialogTitle>
        <DialogDescription>
          Bist du sicher, dass du &quot;{sessionToDelete?.title}&quot; löschen möchtest?
          Diese Aktion kann nicht rückgängig gemacht werden.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
          Abbrechen
        </Button>
        <Button variant="destructive" onClick={handleConfirmDelete}>
          Löschen
        </Button>
      </DialogFooter>
    </Dialog>
    </>
  )
}
