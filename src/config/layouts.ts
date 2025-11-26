export const LAYOUT_IDS = ['member-focus', 'timeslot-focus', 'quick-check', 'family-dashboard'] as const

export type LayoutId = (typeof LAYOUT_IDS)[number]

export interface LayoutConfig {
  id: LayoutId
  name: string
  description: string
  icon: string
  minWidth: number
  bestFor: string[]
}

export const layouts: Record<LayoutId, LayoutConfig> = {
  'member-focus': {
    id: 'member-focus',
    name: 'Member Focus',
    description: 'One column per family member',
    icon: 'grid',
    minWidth: 0,
    bestFor: ['iPad landscape', 'Desktop', 'Seeing all members at once'],
  },
  'timeslot-focus': {
    id: 'timeslot-focus',
    name: 'Timeslot Focus',
    description: 'Organized by timeslot, members side-by-side',
    icon: 'rows',
    minWidth: 0,
    bestFor: ['Kitchen iPad', 'Checking who needs to do what', 'Family status board'],
  },
  'quick-check': {
    id: 'quick-check',
    name: 'Quick Check',
    description: 'Single member view with swipeable tabs',
    icon: 'phone',
    minWidth: 0,
    bestFor: ['iPhone', 'Individual kid view', 'Quick checks'],
  },
  'family-dashboard': {
    id: 'family-dashboard',
    name: 'Family Dashboard',
    description: 'Current timeslot with day summary',
    icon: 'dashboard',
    minWidth: 640,
    bestFor: ['Kitchen iPad', 'Family hub', 'What is happening now'],
  },
}

export const DEVICE_BREAKPOINTS = {
  phone: 640,
  tablet: 1024,
} as const

export type DeviceType = 'phone' | 'tablet' | 'desktop'

export function getDeviceType(width: number): DeviceType {
  if (width < DEVICE_BREAKPOINTS.phone) return 'phone'
  if (width < DEVICE_BREAKPOINTS.tablet) return 'tablet'
  return 'desktop'
}

export interface LayoutSettings {
  autoSwitchEnabled: boolean
  timeslotAutoExpand: boolean
  showParentsInLayout: boolean
  defaultLayout: LayoutId
  deviceLayouts: Record<DeviceType, LayoutId>
}

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  autoSwitchEnabled: true,
  timeslotAutoExpand: true,
  showParentsInLayout: false,
  defaultLayout: 'member-focus',
  deviceLayouts: {
    phone: 'quick-check',
    tablet: 'family-dashboard',
    desktop: 'member-focus',
  },
}
