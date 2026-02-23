import { createRouter } from '@tanstack/react-router';
import { detailsRoute } from './routes/details';
import { homeRoute } from './routes/home';
import { rootRoute } from './routes/root';

const routeTree = rootRoute.addChildren([homeRoute, detailsRoute]);

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
