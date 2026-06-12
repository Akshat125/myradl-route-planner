import { MessageSquare, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { submitFeedback, type FeedbackType } from '../lib/api'
import { fieldClass, primaryButtonClass } from '../lib/ui'

export type FeedbackModalDefaults = {
  type?: FeedbackType
}

type Props = {
  context: string | null
  defaults?: FeedbackModalDefaults
  onClose: () => void
}

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature request' },
  { value: 'other', label: 'Other' },
]

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function FeedbackModal({ context, defaults, onClose }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  const [type, setType] = useState<FeedbackType>(defaults?.type ?? 'other')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => messageRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.closest('[aria-hidden="true"]'))

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      setErrorMessage('Please enter a message.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMessage(null)
    try {
      await submitFeedback({
        type,
        message: trimmed,
        email: email.trim() || null,
        context,
        website,
      })
      setStatus('success')
      setMessage('')
      setEmail('')
      setWebsite('')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Unable to send feedback.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-card border border-border bg-surface p-5 shadow-card"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-subtle-foreground">
              <MessageSquare className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id={titleId} className="font-display text-lg font-semibold text-foreground">
                Send feedback
              </h2>
              <p className="mt-0.5 text-sm text-muted">No login needed. We read every message.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback form"
            className="focus-ring grid size-9 shrink-0 place-items-center rounded-xl border border-border text-muted transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-status-free bg-status-free-subtle px-4 py-3 text-sm text-status-free">
              Thanks, got it. We&apos;ll take a look.
            </p>
            <button type="button" onClick={onClose} className={`${primaryButtonClass} w-full`}>
              Close
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="feedback-type" className="mb-1.5 block text-sm font-medium text-foreground">
                Type
              </label>
              <select
                id="feedback-type"
                value={type}
                onChange={(event) => setType(event.target.value as FeedbackType)}
                className={fieldClass}
                disabled={status === 'loading'}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="feedback-message" className="mb-1.5 block text-sm font-medium text-foreground">
                Message
              </label>
              <textarea
                ref={messageRef}
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                required
                maxLength={4000}
                placeholder="What happened, or what would you like to see?"
                className={`${fieldClass} min-h-[112px] resize-y`}
                disabled={status === 'loading'}
              />
            </div>

            <div>
              <label htmlFor="feedback-email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email <span className="font-normal text-muted">(optional, if you want a reply)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                className={fieldClass}
                disabled={status === 'loading'}
              />
            </div>

            <div className="sr-only" aria-hidden="true">
              <label htmlFor="feedback-website">Website</label>
              <input
                id="feedback-website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            {errorMessage ? (
              <p role="alert" className="text-sm text-status-over">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="focus-ring rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
                disabled={status === 'loading'}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass} disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
