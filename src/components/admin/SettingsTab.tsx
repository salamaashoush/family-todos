import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLayout } from '../../contexts/LayoutContext'
import { layouts, LAYOUT_IDS, type LayoutId, type DeviceType } from '../../config/layouts'
import { getShareToken, regenerateShareToken } from '../../server/publicBoard'
import { Copy, RefreshCw, ExternalLink, Link as LinkIcon, Check } from 'lucide-react'

const deviceLabels: Record<DeviceType, { label: string; description: string }> = {
  phone: { label: 'Phone', description: 'Screens under 640px (iPhone)' },
  tablet: { label: 'Tablet', description: 'Screens 640px - 1024px (iPad)' },
  desktop: { label: 'Desktop', description: 'Screens over 1024px' },
}

export function SettingsTab() {
  const { settings, updateSettings } = useLayout()
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()

  // Share link management
  const { data: shareData, isLoading: shareLoading } = useQuery({
    queryKey: ['share-token'],
    queryFn: () => getShareToken(),
  })

  const regenerateMutation = useMutation({
    mutationFn: regenerateShareToken,
    onSuccess: (data) => {
      queryClient.setQueryData(['share-token'], data)
    },
  })

  const shareUrl = shareData?.shareToken
    ? `${window.location.origin}/family/${shareData.shareToken}`
    : null

  const handleCopyLink = useCallback(() => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  const handleRegenerateToken = useCallback(() => {
    if (confirm('Are you sure? This will invalidate the current share link. Kids will need the new link to access the board.')) {
      regenerateMutation.mutate({})
    }
  }, [regenerateMutation])

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

  const handleToggleShowParents = useCallback(() => {
    setIsSaving(true)
    updateSettings({ showParentsInLayout: !settings.showParentsInLayout })
    setTimeout(() => setIsSaving(false), 300)
  }, [settings.showParentsInLayout, updateSettings])

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Settings</h2>
        </div>
      </div>

      {/* Share Link Section */}
      <div className="bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 border-2 border-theme-primary/30 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-theme-primary" />
          <h3 className="text-lg font-bold text-gray-800">Family Board Link</h3>
        </div>
        <p className="text-sm text-gray-600">
          Share this link with your kids so they can view and check off their tasks without needing an account.
        </p>

        {shareLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : shareUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-mono"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-theme-primary text-white hover:opacity-90'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Board
              </a>
              <button
                onClick={handleRegenerateToken}
                disabled={regenerateMutation.isPending}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-300 rounded-lg text-sm text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                Regenerate Link
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Regenerating the link will invalidate the old one. Anyone with the old link will no longer have access.
            </p>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No share link generated yet. Complete onboarding to get your share link.
          </div>
        )}
      </div>

      {/* Layout Settings Section */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
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

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Show parents in layout</h4>
            <p className="text-sm text-gray-600">Display parent/adult members in the task view</p>
          </div>
          <button
            onClick={handleToggleShowParents}
            disabled={isSaving}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              settings.showParentsInLayout ? 'bg-theme-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                settings.showParentsInLayout ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
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
                    : 'bg-gray-50 border-2 border-gray-200 hover:border-theme-primary'
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
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
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
                              : 'bg-gray-50 border border-gray-200 hover:border-theme-primary text-gray-700'
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

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
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
