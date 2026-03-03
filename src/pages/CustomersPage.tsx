import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeading } from '@/components/PageHeading';
import { InlineAlert } from '@/components/InlineAlert';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { extractApiError } from '@/lib/errors';
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type CustomerPayload
} from '@/services/customers';
import type { Customer } from '@/types/api';

const customerSchema = z.object({
  id: z.number().optional(),
  name: z.string().trim().min(1, 'Name is required.'),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  address: z.string().trim().optional()
});

type CustomerFormValues = z.infer<typeof customerSchema>;

function toPayload(values: CustomerFormValues): CustomerPayload {
  return {
    name: values.name,
    phone: values.phone || undefined,
    email: values.email || undefined,
    address: values.address || undefined
  };
}

export function CustomersPage() {
  const [apiError, setApiError] = useState<string | null>(null);

  const customersQuery = useQuery({
    queryKey: queryKeys.customers.list({ per_page: 200 }),
    queryFn: () => listCustomers({ per_page: 200 })
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: ''
    }
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: async () => {
      setApiError(null);
      form.reset({ name: '', phone: '', email: '', address: '' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CustomerPayload> }) =>
      updateCustomer(id, payload),
    onSuccess: async () => {
      setApiError(null);
      form.reset({ name: '', phone: '', email: '', address: '', id: undefined });
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: async () => {
      setApiError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const onSubmit = (values: CustomerFormValues) => {
    if (values.id) {
      updateMutation.mutate({ id: values.id, payload: toPayload(values) });
      return;
    }

    createMutation.mutate(toPayload(values));
  };

  const customers = customersQuery.data?.data ?? [];

  return (
    <div>
      <PageHeading title="Customers" subtitle="Maintain customer records for POS checkout." />

      <form
        className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Name</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('name')}
          />
          {form.formState.errors.name ? (
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('phone')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('address')}
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {form.getValues('id') ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => form.reset({ name: '', phone: '', email: '', address: '' })}
          >
            Clear
          </button>
        </div>
      </form>

      {apiError ? <InlineAlert message={apiError} /> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 font-semibold">ID</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer: Customer) => (
              <tr key={customer.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{customer.id}</td>
                <td className="px-3 py-2">{customer.name}</td>
                <td className="px-3 py-2">{customer.phone || '-'}</td>
                <td className="px-3 py-2">{customer.email || '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1"
                      onClick={() =>
                        form.reset({
                          id: customer.id,
                          name: customer.name,
                          phone: customer.phone ?? '',
                          email: customer.email ?? '',
                          address: customer.address ?? ''
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-rose-300 px-2 py-1 text-rose-600"
                      onClick={() => deleteMutation.mutate(customer.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!customers.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-slate-500">
                  No customers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
