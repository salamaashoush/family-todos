import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMember, updateMember, deleteMember } from '../server/members'
import { createTimeslot, updateTimeslot, deleteTimeslot } from '../server/timeslots'
import { createTodo, updateTodo, deleteTodo } from '../server/todos'
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
