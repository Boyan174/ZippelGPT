'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getSession } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (session) {
          router.push('/chat')
          return
        }
      } catch {
        // Not logged in, continue to login page
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const handleAuthSuccess = () => {
    router.push('/chat')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <AuthForm onSuccess={handleAuthSuccess} />
      <p className="text-center text-muted-foreground text-sm mt-8">
        Ein KI-Mentor auf dem Weg zur Exzellenz und Haltung
      </p>
    </main>
  )
}
