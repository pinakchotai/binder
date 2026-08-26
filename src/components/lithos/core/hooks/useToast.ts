import { createContext, useContext } from 'react'
import type { ToastProps } from '../types'

interface ToastContextType {
  addToast: (props: ToastProps) => string
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
