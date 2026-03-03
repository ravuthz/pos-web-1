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
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryPayload
} from '@/services/categories';
import type { Category } from '@/types/api';

const categorySchema = z.object({
  id: z.number().optional(),
  code: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Name is required.'),
  description: z.string().trim().optional(),
  parent_id: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function toPayload(values: CategoryFormValues): CategoryPayload {
  return {
    code: values.code || undefined,
    name: values.name,
    description: values.description || undefined,
    parent_id: values.parent_id ?? null
  };
}

export function CategoriesPage() {
  const [apiError, setApiError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.list({ per_page: 200 }),
    queryFn: () => listCategories({ per_page: 200 })
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      parent_id: undefined
    }
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      setApiError(null);
      form.reset({ code: '', name: '', description: '', parent_id: undefined });
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CategoryPayload> }) =>
      updateCategory(id, payload),
    onSuccess: async () => {
      setApiError(null);
      form.reset({ code: '', name: '', description: '', parent_id: undefined, id: undefined });
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      setApiError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const categories = categoriesQuery.data?.data ?? [];

  const onSubmit = (values: CategoryFormValues) => {
    if (values.id) {
      updateMutation.mutate({ id: values.id, payload: toPayload(values) });
      return;
    }
    createMutation.mutate(toPayload(values));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeading title="Categories" subtitle="Create and manage product categories." />

      <form
        className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Code</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('code')}
          />
        </div>

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
          <label className="mb-1 block text-xs font-semibold text-slate-700">Parent ID</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Optional"
            {...form.register('parent_id')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('description')}
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {form.getValues('id') ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => form.reset({ code: '', name: '', description: '', parent_id: undefined })}
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
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Parent</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category: Category) => (
              <tr key={category.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{category.id}</td>
                <td className="px-3 py-2">{category.code || '-'}</td>
                <td className="px-3 py-2">{category.name}</td>
                <td className="px-3 py-2">{category.parent_id ?? '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1"
                      onClick={() =>
                        form.reset({
                          id: category.id,
                          code: category.code ?? '',
                          name: category.name,
                          description: category.description ?? '',
                          parent_id: category.parent_id ?? undefined
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-rose-300 px-2 py-1 text-rose-600"
                      onClick={() => deleteMutation.mutate(category.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-slate-500">
                  No categories found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
