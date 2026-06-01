import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/PageState";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedLayout() {
  const { user, loading, isConfigured } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginRoute = pathname === "/login";
  const isPublicBookRoute = pathname.startsWith("/book/");

  if (loading) {
    return <PageLoader label="Checking session…" />;
  }

  if (isConfigured && !user && !isLoginRoute && !isPublicBookRoute) {
    return <Navigate to="/login" />;
  }

  if (user && isLoginRoute) {
    return <Navigate to="/" />;
  }

  if (isLoginRoute || isPublicBookRoute) {
    return <Outlet />;
  }

  return <AppShell />;
}
