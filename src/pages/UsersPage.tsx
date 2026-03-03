import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeading } from '@/components/PageHeading';
import { InlineAlert } from '@/components/InlineAlert';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { extractApiError } from '@/lib/errors';
import { listRoles } from '@/services/roles';
import { listBranches } from '@/services/branches';
import { createUser, deleteUser, listUsers, updateUser } from '@/services/users';
import type { User } from '@/types/api';

const userSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().trim().min(1, 'Name is required.'),
    username: z.string().trim().min(1, 'Username is required.'),
    email: z.string().trim().email('Valid email is required.'),
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
    role_id: z.string().min(1, 'Role is required.'),
    phone: z.string().optional(),
    address: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    branch_ids: z.array(z.string()).optional()
  })
  .superRefine((values, ctx) => {
    if (!values.id) {
      if (!values.password || values.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password must be at least 8 characters.'
        });
      }
      if (!values.password_confirmation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password_confirmation'],
          message: 'Password confirmation is required.'
        });
      }
    }

    if (values.password && values.password !== values.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password_confirmation'],
        message: 'Password confirmation does not match.'
      });
    }
  });

type UserFormValues = z.infer<typeof userSchema>;

export function UsersPage() {
  const [apiError, setApiError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({ per_page: 200 }),
    queryFn: () => listUsers({ per_page: 200 })
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: listRoles
  });

  const branchesQuery = useQuery({
    queryKey: queryKeys.branches.list({ per_page: 200 }),
    queryFn: () => listBranches({ per_page: 200 })
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      password_confirmation: '',
      role_id: '',
      phone: '',
      address: '',
      status: 'active',
      branch_ids: []
    }
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      setApiError(null);
      form.reset({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: '',
        phone: '',
        address: '',
        status: 'active',
        branch_ids: []
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateUser(id, payload),
    onSuccess: async () => {
      setApiError(null);
      form.reset({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: '',
        phone: '',
        address: '',
        status: 'active',
        branch_ids: [],
        id: undefined
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      setApiError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const roles = rolesQuery.data?.data ?? [];
  const branches = branchesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  const submit = (values: UserFormValues) => {
    const branchIds = (values.branch_ids ?? []).map((value) => Number(value));
    const payload = {
      name: values.name,
      username: values.username,
      email: values.email,
      role_id: Number(values.role_id),
      phone: values.phone || undefined,
      address: values.address || undefined,
      status: values.status,
      branch_ids: branchIds,
      branch_id: branchIds[0] ?? undefined,
      password: values.password || undefined,
      password_confirmation: values.password_confirmation || undefined
    };

    if (values.id) {
      updateMutation.mutate({ id: values.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <div>
      <PageHeading title="Users" subtitle="Manage staff accounts, roles, and branch assignments." />

      <form
        className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
        onSubmit={form.handleSubmit(submit)}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Name" {...form.register('name')} />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Username"
            {...form.register('username')}
          />
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Email" {...form.register('email')} />
          <select className="rounded-lg border border-slate-300 px-3 py-2" {...form.register('role_id')}>
            <option value="">Role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <input
            type="password"
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder={form.getValues('id') ? 'New password (optional)' : 'Password'}
            {...form.register('password')}
          />
          <input
            type="password"
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Confirm password"
            {...form.register('password_confirmation')}
          />
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Phone" {...form.register('phone')} />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Address"
            {...form.register('address')}
          />

          <select className="rounded-lg border border-slate-300 px-3 py-2" {...form.register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            multiple
            className="md:col-span-2 min-h-24 rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('branch_ids')}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>

          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
              {form.getValues('id') ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              onClick={() =>
                form.reset({
                  name: '',
                  username: '',
                  email: '',
                  password: '',
                  password_confirmation: '',
                  role_id: '',
                  phone: '',
                  address: '',
                  status: 'active',
                  branch_ids: [],
                  id: undefined
                })
              }
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {apiError ? <InlineAlert message={apiError} /> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Username</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Role</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Branches</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: User) => (
              <tr key={user.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{user.name}</td>
                <td className="px-3 py-2">{user.username}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">{user.role?.name || '-'}</td>
                <td className="px-3 py-2">{user.status}</td>
                <td className="px-3 py-2">{user.branches?.map((b) => b.name).join(', ') || '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1"
                      onClick={() =>
                        form.reset({
                          id: user.id,
                          name: user.name,
                          username: user.username,
                          email: user.email,
                          password: '',
                          password_confirmation: '',
                          role_id: String(user.role?.id ?? ''),
                          phone: user.phone ?? '',
                          address: user.address ?? '',
                          status: user.status === 'inactive' ? 'inactive' : 'active',
                          branch_ids: (user.branches ?? []).map((branch) => String(branch.id))
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-rose-300 px-2 py-1 text-rose-600"
                      onClick={() => deleteMutation.mutate(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-5 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
