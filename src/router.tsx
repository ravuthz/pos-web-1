import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect
} from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { isAuthenticated } from '@/store/authStore';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { PosPage } from '@/pages/PosPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { SalesPage } from '@/pages/SalesPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { StockMovementsPage } from '@/pages/StockMovementsPage';
import { UsersPage } from '@/pages/UsersPage';
import { ReportsPage } from '@/pages/ReportsPage';

function RootLayout() {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
      <div className="rounded-xl bg-white p-8 shadow-soft">Page not found.</div>
    </div>
  )
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage
});

const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed',
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppShell
});

const dashboardRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/',
  component: DashboardPage
});

const posRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/pos',
  component: PosPage
});

const productsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/products',
  component: ProductsPage
});

const salesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/sales',
  component: SalesPage
});

const categoriesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/categories',
  component: CategoriesPage
});

const customersRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/customers',
  component: CustomersPage
});

const purchasesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/purchases',
  component: PurchasesPage
});

const stockMovementsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/stock-movements',
  component: StockMovementsPage
});

const usersRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/users',
  component: UsersPage
});

const reportsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/reports',
  component: ReportsPage
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authedRoute.addChildren([
    dashboardRoute,
    posRoute,
    productsRoute,
    salesRoute,
    categoriesRoute,
    customersRoute,
    purchasesRoute,
    stockMovementsRoute,
    usersRoute,
    reportsRoute
  ])
]);

export const router = createRouter({
  routeTree,
  defaultPendingMinMs: 200
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
