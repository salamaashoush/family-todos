import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'info' | 'error'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

let toastListeners: ((toast: ToastMessage) => void)[] = []

export function showToast(message: string, type: ToastType = 'info') {
  const toast: ToastMessage = {
    id: crypto.randomUUID(),
    message,
    type,
  }
  toastListeners.forEach(listener => listener(toast))
}

export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const listener = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 3000)
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg border-2 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-800'
              : toast.type === 'error'
              ? 'bg-red-50 border-red-500 text-red-800'
              : 'bg-blue-50 border-blue-500 text-blue-800'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
