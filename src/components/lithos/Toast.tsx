/**
 * Lithos UI Toast — customized for The Binder design doc.
 * Overrides: border 1px, shadow 0 2px 8px, position top-right, auto-dismiss 3s
 */
import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getContrastText } from './core/yiq'
import { ToastContext } from './core/hooks/useToast'
import type { ToastProps as CoreToastProps, ToastPosition } from './core/types'
import { colors } from './core/colors'
import { Button } from './Button'
import { IconClose } from './icons'
import { cn } from '@/lib/utils'

type IdentifiedToastProps = CoreToastProps & { id: string }

export interface ToastItemProps {
  toast: IdentifiedToastProps
  onRemove: () => void
  className?: string
}

export interface ToastProviderProps {
  children: ReactNode
  duration?: number
  position?: ToastPosition
  className?: string
}

const positionStyles: Record<ToastPosition, string> = {
  'top-left': 'top-0 left-0',
  'top-right': 'top-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'bottom-right': 'bottom-0 right-0',
}

const DEFAULT_DURATION = 3000

export const ToastProvider = ({
  children,
  duration,
  position = 'top-right',
  className,
}: ToastProviderProps) => {
  const [toasts, setToasts] = useState<IdentifiedToastProps[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    ({ message, intent = 'default', color, title, duration: customDuration }: CoreToastProps) => {
      const id = Math.random().toString(36).substring(2, 9)
      const toastDuration = customDuration || duration || DEFAULT_DURATION

      setToasts((prev) => [
        ...prev,
        { id, message, intent, color, title, duration: toastDuration },
      ])

      return id
    },
    [duration],
  )

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={cn(
              'fixed p-4 sm:p-6 z-[60] pointer-events-none flex flex-col w-full max-w-xs',
              positionStyles[position],
              position.includes('left') ? 'items-start' : 'items-end',
              className,
            )}
          >
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export const ToastItem = ({ toast, onRemove, className }: ToastItemProps) => {
  const { id, message, intent = 'default', color, title, duration } = toast
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isHovered) return
    const timeout = duration || DEFAULT_DURATION
    const timer = setTimeout(onRemove, timeout)
    return () => clearTimeout(timer)
  }, [isHovered, onRemove, duration])

  const bgColor = color || colors[intent] || colors.default
  const textColor = getContrastText(bgColor)

  return (
    <>
      <style>{`.toast-${id} { background-color: ${bgColor} !important; color: ${textColor} !important; border-color: ${textColor} !important; --lithos-shadow: ${textColor} !important; }`}</style>
      <div
        role={intent === 'error' ? 'alert' : 'status'}
        aria-live={intent === 'error' ? 'assertive' : 'polite'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          `toast-${id} pointer-events-auto border border-(--lithos-border) p-3 mb-4 w-full flex flex-row items-start shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-[slide-up_0.3s_ease-out_forwards] rounded-(--lithos-radius)`,
          className,
        )}
      >
        <div className="flex-1 mr-4">
          {title && <h4 className="font-mono text-xs font-bold uppercase tracking-[0.05em] leading-none mb-2 m-0">{title}</h4>}
          <p className="text-xs leading-tight m-0 font-mono">{message}</p>
        </div>
        <Button
          onClick={onRemove}
          className="ml-3 shrink-0 bg-transparent text-current"
          aria-label="Close notification"
          style={{ borderColor: textColor }}
        >
          <IconClose size={12} aria-hidden="true" />
        </Button>
      </div>
    </>
  )
}
