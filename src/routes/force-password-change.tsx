import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getAccountStatus } from '../server/auth'
import { changePassword } from '../server/admin-users'

export const Route = createFileRoute('/force-password-change')({
  beforeLoad: async () => {
    const auth = await getAccountStatus()
    if (!auth.authenticated) {
      throw redirect({ to: '/login' })
    }

    // If user doesn't need password change, redirect to admin
    if (!auth.requiresPasswordChange) {
      throw redirect({ to: '/admin' })
    }

    return auth
  },
  component: ForcePasswordChange,
})

function ForcePasswordChange() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 12) {
      errors.push('At least 12 characters')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('At least one number')
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('At least one special character')
    }
    return errors
  }

  const passwordErrors = validatePassword(newPassword)
  const passwordsMatch = newPassword === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (passwordErrors.length > 0) {
      setError('Please meet all password requirements')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      await changePassword({
        data: {
          currentPassword,
          newPassword,
        },
      })
      // Success - redirect to admin
      navigate({ to: '/admin' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-orange-100 to-yellow-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Security Alert
        </h1>
        <p className="text-center text-gray-600 mb-6">
          You are using default credentials. For security reasons, you must change
          your password before continuing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
              autoComplete="current-password"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
              autoComplete="new-password"
            />
            {newPassword && (
              <div className="mt-2 text-sm">
                <p className="font-medium text-gray-700 mb-1">Requirements:</p>
                <ul className="space-y-1">
                  {[
                    { check: newPassword.length >= 12, text: 'At least 12 characters' },
                    { check: /[A-Z]/.test(newPassword), text: 'One uppercase letter' },
                    { check: /[a-z]/.test(newPassword), text: 'One lowercase letter' },
                    { check: /[0-9]/.test(newPassword), text: 'One number' },
                    {
                      check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
                      text: 'One special character',
                    },
                  ].map(({ check, text }) => (
                    <li
                      key={text}
                      className={`flex items-center gap-2 ${
                        check ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {check ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                confirmPassword && !passwordsMatch
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              required
              autoComplete="new-password"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || passwordErrors.length > 0 || !passwordsMatch}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Changing Password...' : 'Change Password & Continue'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-gray-500">
          This is a one-time requirement to ensure your account security.
        </p>
      </div>
    </div>
  )
}
