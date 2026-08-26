/**
 * Lithos UI Dialog — customized for The Binder design doc.
 * Overrides: border 1px, shadow 0 2px 8px, padding p-4, overlay black/60
 */
import {
  useEffect,
  useId,
  useRef,
  createContext,
  useContext,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from './core/hooks/useFocusTrap'
import { Button } from './Button'
import { IconClose } from './icons'
import { cn } from '@/lib/utils'

export type DialogSize = 'sm' | 'md' | 'lg'

const sizeClass: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

interface DialogContextType {
  onClose: () => void
  titleId: string
}

const DialogContext = createContext<DialogContextType | null>(null)

const useDialogContext = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('DialogHeader/DialogTitle/DialogBody/DialogFooter must be used within a Dialog')
  }
  return context
}

export interface DialogProps extends Omit<ComponentPropsWithRef<'div'>, 'className'> {
  open: boolean
  onClose: () => void
  size?: DialogSize | undefined
  className?: string
  children: ReactNode
}

export const Dialog = ({
  open,
  onClose,
  size = 'md',
  className,
  children,
  ref,
  ...rest
}: DialogProps) => {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()

  useFocusTrap(panelRef, open)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const classes = cn(
    'relative w-full flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden animate-[fade-in_0.15s_ease-out] rounded-(--lithos-radius)',
    'bg-(--lithos-surface) text-(--lithos-text) border border-(--lithos-border) shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
    sizeClass[size],
    className,
  )

  return createPortal(
    <DialogContext.Provider value={{ onClose, titleId }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          className="absolute inset-0 bg-black/60 animate-[fade-in_0.15s_ease-out]"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={(node: HTMLDivElement | null) => {
            panelRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={classes}
          {...rest}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>,
    document.body,
  )
}

export interface DialogHeaderProps extends ComponentPropsWithRef<'div'> {
  hideClose?: boolean
  children: ReactNode
}

export const DialogHeader = ({ hideClose = false, className, children, ref, ...rest }: DialogHeaderProps) => {
  const { onClose } = useDialogContext()
  return (
    <div
      ref={ref}
      className={cn('flex items-start justify-between shrink-0 p-4 sm:p-6', className)}
      {...rest}
    >
      <div className="flex-1 mr-4">{children}</div>
      {!hideClose && (
        <Button onClick={onClose} variant="text" className="shrink-0 -mr-2 -mt-2" aria-label="Close dialog">
          <IconClose size={14} aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

export interface DialogTitleProps extends ComponentPropsWithRef<'h2'> {
  children: ReactNode
}

export const DialogTitle = ({ className, children, ref, ...rest }: DialogTitleProps) => {
  const { titleId } = useDialogContext()
  return (
    <h2
      id={titleId}
      ref={ref}
      className={cn('font-mono text-sm font-bold uppercase tracking-[0.05em] leading-none m-0', className)}
      {...rest}
    >
      {children}
    </h2>
  )
}

export interface DialogBodyProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode
}

export const DialogBody = ({ className, children, ref, ...rest }: DialogBodyProps) => (
  <div ref={ref} className={cn('flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 font-mono', className)} {...rest}>
    {children}
  </div>
)

export interface DialogFooterProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode
}

export const DialogFooter = ({ className, children, ref, ...rest }: DialogFooterProps) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-end shrink-0 p-4 sm:p-6 border-t border-(--lithos-border)', className)}
    {...rest}
  >
    {children}
  </div>
)
