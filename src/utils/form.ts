// Helper to extract error message from TanStack Form errors
// TanStack Form + Zod returns error objects {message: "..."} not strings
export const getErrorMessage = (errors: unknown[]): string | undefined => {
  if (!errors || errors.length === 0) return undefined
  const firstError = errors[0]
  if (typeof firstError === 'string') return firstError
  if (firstError && typeof firstError === 'object' && 'message' in firstError) {
    return (firstError as { message: string }).message
  }
  return undefined
}
