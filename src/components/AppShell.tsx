import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { logout } from '@/services/auth';
import { clearAuthState } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';
import { BranchSelector } from '@/components/BranchSelector';
import { OfflineStatusPill } from '@/components/OfflineStatusPill';
import { useAuthStore } from '@/hooks/useAuthStore';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/pos', label: 'POS' },
  { to: '/products', label: 'Products' },
  { to: '/sales', label: 'Sales' },
  { to: '/categories', label: 'Categories' },
  { to: '/customers', label: 'Customers' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/stock-movements', label: 'Stock' },
  { to: '/users', label: 'Users' },
  { to: '/reports', label: 'Reports' }
];

export function AppShell() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      clearAuthState();
      await queryClient.clear();
      await navigate({ to: '/login' });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-paper via-slate-50 to-teal-50 text-ink">
      <div className="mx-auto flex max-w-[1440px] gap-4 px-4 py-4 md:px-6">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft md:block">
          <h1 className="mb-6 text-xl font-bold text-teal-700">POS Control</h1>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: 'bg-teal-600 text-white' }}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-soft">
            <div>
              <p className="text-sm text-slate-500">Signed in as</p>
              <p className="text-sm font-semibold">{user?.name ?? 'User'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <OfflineStatusPill />
              <BranchSelector />
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
