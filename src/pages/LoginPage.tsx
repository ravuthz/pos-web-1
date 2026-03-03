import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/services/auth';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { extractApiError } from '@/lib/errors';
import { setAuthState } from '@/store/authStore';
import { setBranchState } from '@/store/branchStore';
import { InlineAlert } from '@/components/InlineAlert';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required.'),
  password: z.string().min(1, 'Password is required.')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: ''
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const identifier = values.identifier.trim();
      const payload = identifier.includes('@')
        ? { email: identifier, password: values.password }
        : { username: identifier, password: values.password };

      return login(payload);
    },
    onSuccess: async (response) => {
      setErrorMessage(null);

      const data = response.data;
      setAuthState({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        user: data.user
      });

      const defaultBranch = data.user.primary_branch?.id ?? data.user.branches?.[0]?.id ?? null;
      if (defaultBranch) {
        setBranchState({ selectedBranchId: defaultBranch });
      }

      queryClient.setQueryData(queryKeys.auth.me(), response);

      const redirectPath =
        new URLSearchParams(window.location.search).get('redirect')?.trim() || '/';

      window.location.assign(redirectPath);
    },
    onError: (error) => {
      setErrorMessage(extractApiError(error));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft md:p-8">
        <h1 className="text-2xl font-bold text-ink">Sign in to POS</h1>
        <p className="mt-1 text-sm text-slate-500">Use your username/email and password.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email or Username</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-teal-600"
              {...form.register('identifier')}
            />
            {form.formState.errors.identifier ? (
              <p className="mt-1 text-xs text-rose-600">{form.formState.errors.identifier.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-teal-600"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="mt-1 text-xs text-rose-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {errorMessage ? <InlineAlert message={errorMessage} /> : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
