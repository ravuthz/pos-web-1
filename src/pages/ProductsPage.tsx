import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeading } from '@/components/PageHeading';
import { InlineAlert } from '@/components/InlineAlert';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { extractApiError } from '@/lib/errors';
import { listCategories } from '@/services/categories';
import { listVendors } from '@/services/vendors';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type ProductPayload
} from '@/services/products';
import type { Product } from '@/types/api';

const productSchema = z.object({
  id: z.number().optional(),
  category_id: z.string().min(1, 'Category is required.'),
  vendor_id: z.string().optional(),
  code: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Name is required.'),
  description: z.string().trim().optional(),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  status: z.enum(['active', 'inactive']),
  track_expiry: z.boolean().default(false),
  expiry_date: z.string().optional()
});

type ProductFormValues = z.infer<typeof productSchema>;

function toPayload(values: ProductFormValues): ProductPayload {
  return {
    category_id: Number(values.category_id),
    vendor_id: values.vendor_id ? Number(values.vendor_id) : undefined,
    code: values.code || undefined,
    barcode: values.barcode || undefined,
    name: values.name,
    description: values.description || undefined,
    cost_price: values.cost_price,
    selling_price: values.selling_price,
    status: values.status,
    track_expiry: values.track_expiry,
    expiry_date: values.expiry_date || undefined
  };
}

export function ProductsPage() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ per_page: 200, search }),
    queryFn: () => listProducts({ per_page: 200, search })
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.list({ per_page: 200 }),
    queryFn: () => listCategories({ per_page: 200 })
  });

  const vendorsQuery = useQuery({
    queryKey: queryKeys.vendors.list(),
    queryFn: () => listVendors()
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category_id: '',
      vendor_id: '',
      code: '',
      barcode: '',
      name: '',
      description: '',
      cost_price: 0,
      selling_price: 0,
      status: 'active',
      track_expiry: false,
      expiry_date: ''
    }
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setApiError(null);
      form.reset({
        category_id: '',
        vendor_id: '',
        code: '',
        barcode: '',
        name: '',
        description: '',
        cost_price: 0,
        selling_price: 0,
        status: 'active',
        track_expiry: false,
        expiry_date: '',
        id: undefined
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProductPayload> }) =>
      updateProduct(id, payload),
    onSuccess: async () => {
      setApiError(null);
      form.reset({
        category_id: '',
        vendor_id: '',
        code: '',
        barcode: '',
        name: '',
        description: '',
        cost_price: 0,
        selling_price: 0,
        status: 'active',
        track_expiry: false,
        expiry_date: '',
        id: undefined
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setApiError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.root });
    },
    onError: (error) => setApiError(extractApiError(error))
  });

  const categories = categoriesQuery.data?.data ?? [];
  const vendors = vendorsQuery.data?.data ?? [];
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);

  const onSubmit = (values: ProductFormValues) => {
    if (values.id) {
      updateMutation.mutate({ id: values.id, payload: toPayload(values) });
      return;
    }
    createMutation.mutate(toPayload(values));
  };

  return (
    <div>
      <PageHeading title="Products" subtitle="Manage catalog, pricing, and stock visibility." />

      <div className="mb-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, code, or barcode"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <form
        className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register('category_id')}>
            <option value="">Select</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {form.formState.errors.category_id ? (
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.category_id.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Vendor</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register('vendor_id')}>
            <option value="">Optional</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Name</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register('name')} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Code</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register('code')} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Barcode</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('barcode')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Cost Price</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('cost_price')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Selling Price</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('selling_price')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('description')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" className="size-4" {...form.register('track_expiry')} />
          <label className="text-sm text-slate-700">Track expiry</label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Expiry Date</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            {...form.register('expiry_date')}
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
            onClick={() =>
              form.reset({
                category_id: '',
                vendor_id: '',
                code: '',
                barcode: '',
                name: '',
                description: '',
                cost_price: 0,
                selling_price: 0,
                status: 'active',
                track_expiry: false,
                expiry_date: ''
              })
            }
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
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Barcode</th>
              <th className="px-3 py-2 font-semibold">Price</th>
              <th className="px-3 py-2 font-semibold">Stock</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product: Product) => (
              <tr key={product.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{product.id}</td>
                <td className="px-3 py-2">{product.name}</td>
                <td className="px-3 py-2">{product.code || '-'}</td>
                <td className="px-3 py-2">{product.barcode || '-'}</td>
                <td className="px-3 py-2">{product.selling_price}</td>
                <td className="px-3 py-2">{product.stock?.quantity_on_hand ?? '-'}</td>
                <td className="px-3 py-2">{product.status}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1"
                      onClick={() =>
                        form.reset({
                          id: product.id,
                          category_id: String(product.category_id),
                          vendor_id: '',
                          code: product.code ?? '',
                          barcode: product.barcode ?? '',
                          name: product.name,
                          description: product.description ?? '',
                          cost_price: product.cost_price,
                          selling_price: product.selling_price,
                          status: product.status === 'inactive' ? 'inactive' : 'active',
                          track_expiry: Boolean(product.track_expiry),
                          expiry_date: product.expiry_date?.slice(0, 10) ?? ''
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-rose-300 px-2 py-1 text-rose-600"
                      onClick={() => deleteMutation.mutate(product.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!products.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-5 text-center text-slate-500">
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
