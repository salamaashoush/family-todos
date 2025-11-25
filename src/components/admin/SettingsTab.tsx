import { useState, useCallback } from 'react'
import { useLayout } from '../../contexts/LayoutContext'
import { layouts, LAYOUT_IDS, type LayoutId, type DeviceType } from '../../config/layouts'

const deviceLabels: Record<DeviceType, { label: string; description: string }> = {
  phone: { label: 'Phone', description: 'Screens under 640px (iPhone)' },
  tablet: { label: 'Tablet', description: 'Screens 640px - 1024px (iPad)' },
  desktop: { label: 'Desktop', description: 'Screens over 1024px' },
}

export function SettingsTab() {
  const { settings, updateSettings } = useLayout()
  const [isSaving, setIsSaving] = useState(false)

  const handleToggleAutoSwitch = useCallback(() => {
    setIsSaving(true)
    updateSettings({ autoSwitchEnabled: !settings.autoSwitchEnabled })
    setTimeout(() => setIsSaving(false), 300)
  }, [settings.autoSwitchEnabled, updateSettings])

  const handleToggleTimeslotAutoExpand = useCallback(() => {
    setIsSaving(true)
    updateSettings({ timeslotAutoExpand: !settings.timeslotAutoExpand })
    setTimeout(() => setIsSaving(false), 300)
  }, [settings.timeslotAutoExpand, updateSettings])

  const handleDefaultLayoutChange = useCallback(
    (layoutId: LayoutId) => {
      setIsSaving(true)
      updateSettings({ defaultLayout: layoutId })
      setTimeout(() => setIsSaving(false), 300)
    },
    [updateSettings]
  )

  const handleDeviceLayoutChange = useCallback(
    (device: DeviceType, layoutId: LayoutId) => {
      setIsSaving(true)
      updateSettings({
        deviceLayouts: {
          ...settings.deviceLayouts,
          [device]: layoutId,
        },
      })
      setTimeout(() => setIsSaving(false), 300)
    },
    [settings.deviceLayouts, updateSettings]
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Layout Settings</h2>
        <p className="text-gray-600">Configure how the app displays on different devices.</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-bold text-gray-800">Auto-Switch Options</h3>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Auto-switch layout by device</h4>
            <p className="text-sm text-gray-600">Automatically select the best layout based on screen size</p>
          </div>
          <button
            onClick={handleToggleAutoSwitch}
            disabled={isSaving}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              settings.autoSwitchEnabled ? 'bg-theme-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                settings.autoSwitchEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Auto-expand current timeslot</h4>
            <p className="text-sm text-gray-600">Automatically expand the timeslot based on current time</p>
          </div>
          <button
            onClick={handleToggleTimeslotAutoExpand}
            disabled={isSaving}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              settings.timeslotAutoExpand ? 'bg-theme-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                settings.timeslotAutoExpand ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-bold text-gray-800">Default Layout</h3>
        <p className="text-sm text-gray-600">Used when auto-switch is disabled</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAYOUT_IDS.map((layoutId) => {
            const layout = layouts[layoutId]
            const isSelected = settings.defaultLayout === layoutId
            return (
              <button
                key={layoutId}
                onClick={() => handleDefaultLayoutChange(layoutId)}
                disabled={isSaving}
                className={`p-4 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-theme-primary text-white ring-2 ring-theme-primary ring-offset-2'
                    : 'bg-white border-2 border-gray-200 hover:border-theme-primary'
                }`}
              >
                <div className="font-bold">{layout.name}</div>
                <div className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{layout.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {settings.autoSwitchEnabled && (
        <div className="bg-gray-50 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-800">Device-Specific Layouts</h3>
          <p className="text-sm text-gray-600">Choose which layout to use for each device type</p>

          <div className="space-y-6">
            {(Object.keys(deviceLabels) as DeviceType[]).map((device) => {
              const { label, description } = deviceLabels[device]
              const selectedLayout = settings.deviceLayouts[device]
              return (
                <div key={device}>
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-800">{label}</h4>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LAYOUT_IDS.map((layoutId) => {
                      const layout = layouts[layoutId]
                      const isSelected = selectedLayout === layoutId
                      return (
                        <button
                          key={layoutId}
                          onClick={() => handleDeviceLayoutChange(device, layoutId)}
                          disabled={isSaving}
                          className={`p-3 rounded-lg text-center transition-all text-sm ${
                            isSelected
                              ? 'bg-theme-primary text-white'
                              : 'bg-white border border-gray-200 hover:border-theme-primary text-gray-700'
                          }`}
                        >
                          {layout.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-3">Layout Descriptions</h3>
        <div className="space-y-4">
          {LAYOUT_IDS.map((layoutId) => {
            const layout = layouts[layoutId]
            return (
              <div key={layoutId} className="flex gap-4">
                <div className="flex-shrink-0 w-24 font-semibold text-blue-800">{layout.name}</div>
                <div>
                  <p className="text-blue-700">{layout.description}</p>
                  <p className="text-sm text-blue-600 mt-1">Best for: {layout.bestFor.join(', ')}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
