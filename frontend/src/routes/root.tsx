import { Outlet, createRootRoute } from '@tanstack/react-router';

function RootLayout() {
  return <Outlet />;
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});
