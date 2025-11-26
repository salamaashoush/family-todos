import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMember, updateMember, deleteMember } from '../server/members'
import { createTimeslot, updateTimeslot, deleteTimeslot } from '../server/timeslots'
import { createTodo, updateTodo, deleteTodo } from '../server/todos'
import { createReward, updateReward, deleteReward, processRedemption } from '../server/rewards'
import { showToast } from '../components/Toast'

export function useMemberMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      showToast('Member created successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to create member:', error)
      showToast('Failed to create member', 'error')
    },
  })

  const update = useMutation({
    mutationFn: updateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      showToast('Member updated successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to update member:', error)
      showToast('Failed to update member', 'error')
    },
  })

  const remove = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      showToast('Member deleted successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to delete member:', error)
      showToast('Failed to delete member', 'error')
    },
  })

  return { create, update, remove }
}

export function useTimeslotMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: createTimeslot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots'] })
      showToast('Time slot created successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to create time slot:', error)
      showToast('Failed to create time slot', 'error')
    },
  })

  const update = useMutation({
    mutationFn: updateTimeslot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots'] })
      showToast('Time slot updated successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to update time slot:', error)
      showToast('Failed to update time slot', 'error')
    },
  })

  const remove = useMutation({
    mutationFn: deleteTimeslot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots'] })
      showToast('Time slot deleted successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to delete time slot:', error)
      showToast('Failed to delete time slot', 'error')
    },
  })

  return { create, update, remove }
}

export function useTodoMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      showToast('Task created successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to create task:', error)
      showToast('Failed to create task', 'error')
    },
  })

  const update = useMutation({
    mutationFn: updateTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      showToast('Task updated successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to update task:', error)
      showToast('Failed to update task', 'error')
    },
  })

  const remove = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      showToast('Task deleted successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to delete task:', error)
      showToast('Failed to delete task', 'error')
    },
  })

  return { create, update, remove }
}

export function useRewardMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: createReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      showToast('Reward created successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to create reward:', error)
      showToast('Failed to create reward', 'error')
    },
  })

  const update = useMutation({
    mutationFn: updateReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      showToast('Reward updated successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to update reward:', error)
      showToast('Failed to update reward', 'error')
    },
  })

  const remove = useMutation({
    mutationFn: deleteReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      showToast('Reward deleted successfully', 'success')
    },
    onError: (error) => {
      console.error('Failed to delete reward:', error)
      showToast('Failed to delete reward', 'error')
    },
  })

  return { create, update, remove }
}

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
