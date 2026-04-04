import { useMutation, useQueryClient } from '@tanstack/react-query'
import { processRedemption } from '../server/rewards'
import { showToast } from '../components/Toast'

export function useRedemptionMutations() {
  const queryClient = useQueryClient()

  const process = useMutation({
    mutationFn: processRedemption,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingRedemptions'] })
      queryClient.invalidateQueries({ queryKey: ['memberPoints'] })
      const status = variables.data.status
      const messages: Record<string, string> = {
        approved: 'Redemption approved',
        rejected: 'Redemption rejected',
        fulfilled: 'Redemption fulfilled',
      }
      showToast(messages[status] || 'Redemption processed', 'success')
    },
    onError: (error) => {
      console.error('Failed to process redemption:', error)
      showToast('Failed to process redemption', 'error')
    },
  })

  return { process }
}
