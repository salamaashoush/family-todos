import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { login } from '../server/auth'
import { Input, Button } from '../components/shared'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await router.invalidate()
      router.navigate({ to: '/admin' })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    loginMutation.mutate({
      data: {
        username: formData.get('username') as string,
        password: formData.get('password') as string,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Login</h1>
          <p className="text-gray-600">Enter your credentials to access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="username"
            name="username"
            type="text"
            label="Username"
            required
            autoComplete="username"
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            required
            autoComplete="current-password"
          />

          {loginMutation.error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {loginMutation.error instanceof Error ? loginMutation.error.message : 'Invalid username or password'}
            </div>
          )}

          <Button
            type="submit"
            isLoading={loginMutation.isPending}
            fullWidth
          >
            Login
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-theme-primary hover:text-theme-secondary font-semibold transition-colors"
            >
              Sign up
            </Link>
          </p>
          <button
            onClick={() => router.navigate({ to: '/' })}
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors focus:outline-none"
            type="button"
          >
            Back to Family Board
          </button>
        </div>
      </div>
    </div>
  )
}
