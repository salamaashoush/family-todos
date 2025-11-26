import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import {
  type LayoutId,
  type LayoutSettings,
  type DeviceType,
  DEFAULT_LAYOUT_SETTINGS,
  getDeviceType,
  layouts,
} from '../config/layouts'

const LAYOUT_STORAGE_KEY = 'family-todos-layout'
const SETTINGS_STORAGE_KEY = 'family-todos-layout-settings'

interface LayoutContextValue {
  layout: LayoutId
  setLayout: (layout: LayoutId) => void
  setAutoLayout: () => void
  settings: LayoutSettings
  updateSettings: (settings: Partial<LayoutSettings>) => void
  deviceType: DeviceType
  currentTimeslotId: number | null
  setCurrentTimeslotId: (id: number | null) => void
  isManualOverride: boolean
  isHydrated: boolean
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

function getStoredLayout(): LayoutId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
  if (stored && stored in layouts) {
    return stored as LayoutId
  }
  return null
}

function getStoredSettings(): LayoutSettings {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT_SETTINGS
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_LAYOUT_SETTINGS, ...parsed }
    } catch {
      return DEFAULT_LAYOUT_SETTINGS
    }
  }
  return DEFAULT_LAYOUT_SETTINGS
}

function getInitialDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'
  return getDeviceType(window.innerWidth)
}

interface LayoutProviderProps {
  children: ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_LAYOUT_SETTINGS)
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const [manualLayout, setManualLayout] = useState<LayoutId | null>(null)
  const [currentTimeslotId, setCurrentTimeslotId] = useState<number | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setSettings(getStoredSettings())
    setManualLayout(getStoredLayout())
    setDeviceType(getInitialDeviceType())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const handleResize = () => {
      setDeviceType(getDeviceType(window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isHydrated])

  const layout = useMemo((): LayoutId => {
    // Manual selection always takes priority
    if (manualLayout) {
      return manualLayout
    }

    if (settings.autoSwitchEnabled) {
      return settings.deviceLayouts[deviceType]
    }

    return settings.defaultLayout
  }, [manualLayout, settings, deviceType])

  const setLayout = useCallback((newLayout: LayoutId) => {
    setManualLayout(newLayout)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAYOUT_STORAGE_KEY, newLayout)
    }
  }, [])

  const setAutoLayout = useCallback(() => {
    setManualLayout(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAYOUT_STORAGE_KEY)
    }
  }, [])

  const updateSettings = useCallback((newSettings: Partial<LayoutSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      if (typeof window !== 'undefined') {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const isManualOverride = manualLayout !== null

  const value = useMemo(
    () => ({
      layout,
      setLayout,
      setAutoLayout,
      settings,
      updateSettings,
      deviceType,
      currentTimeslotId,
      setCurrentTimeslotId,
      isManualOverride,
      isHydrated,
    }),
    [layout, setLayout, setAutoLayout, settings, updateSettings, deviceType, currentTimeslotId, isManualOverride, isHydrated]
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

export function useCurrentTimeslot(
  timeslots: { id: number; startTime: string; endTime: string }[],
  selectedDate?: string
) {
  const { settings, setCurrentTimeslotId } = useLayout()

  useEffect(() => {
    if (!settings.timeslotAutoExpand) {
      setCurrentTimeslotId(null)
      return
    }

    // Only show current timeslot when viewing today's date
    const today = new Date().toISOString().split('T')[0]
    const isToday = !selectedDate || selectedDate === today

    if (!isToday) {
      setCurrentTimeslotId(null)
      return
    }

    const findCurrentTimeslot = () => {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      for (const timeslot of timeslots) {
        if (!timeslot.startTime || !timeslot.endTime) continue

        const [startHour, startMin] = timeslot.startTime.split(':').map(Number)
        const [endHour, endMin] = timeslot.endTime.split(':').map(Number)

        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin

        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
          return timeslot.id
        }
      }
      return null
    }

    const currentId = findCurrentTimeslot()
    setCurrentTimeslotId(currentId)

    const interval = setInterval(() => {
      const newCurrentId = findCurrentTimeslot()
      setCurrentTimeslotId(newCurrentId)
    }, 60000)

    return () => clearInterval(interval)
  }, [timeslots, settings.timeslotAutoExpand, setCurrentTimeslotId, selectedDate])
}
