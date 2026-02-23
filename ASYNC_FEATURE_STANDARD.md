# Async Feature Standard

This is the default implementation standard for all new frontend features in this repository.

## Goal

Build features with modern async React patterns that keep UI responsive and predictable:

1. Suspense-first data rendering.
2. Transition-based non-urgent updates.
3. TanStack Query `useSuspenseQuery` for async reads.
4. Error boundaries for failure states.

## Reference Style Sources

Use these as style references when implementing:

- `/Users/pawelkomorkiewicz/PERSONAL/next16-commerce/components/Search.tsx` (`useTransition` around navigation updates).
- `/Users/pawelkomorkiewicz/PERSONAL/next16-commerce/features/user/components/SaveProductButton.tsx` (`useOptimistic` + `startTransition`).
- `/Users/pawelkomorkiewicz/PERSONAL/next16-commerce/app/page.tsx` (granular Suspense boundaries per async section).
- `/Users/pawelkomorkiewicz/PERSONAL/next16-commerce/app/product/[id]/page.tsx` (localized Suspense fallbacks).
- `/Users/pawelkomorkiewicz/PERSONAL/next16-conferences/components/TalksExplorer.tsx` (`Suspense` + `useDeferredValue` + transition-driven filter interactions).
- `/Users/pawelkomorkiewicz/PERSONAL/next16-conferences/hooks/useInfiniteScroll.ts` (`startTransition` for low-priority append operations).

## Required Defaults For New Features

1. Reads use `useSuspenseQuery` (or `useSuspenseInfiniteQuery` for paginated lists).
2. Each async subtree is wrapped with `<Suspense fallback={...}>`.
3. Each feature route/screen has an `ErrorBoundary` near the Suspense boundary.
4. URL changes, filters, sorting, and other non-urgent UI updates run in `startTransition`.
5. Mutations with immediate visual feedback use `useOptimistic` or TanStack optimistic updates.
6. Loading skeletons should preserve layout and prevent CLS.
7. Query keys are centralized (query key factory) and stable.

## Baseline App Setup

Use this as the default query setup in app bootstrap:

```tsx
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      throwOnError: true,
      retry: 1,
    },
    mutations: {
      throwOnError: true,
    },
  },
});
```

## Feature Implementation Blueprint

1. Create query key factory in `frontend/src/features/<feature>/queries.ts`.
2. Create fetcher in `frontend/src/features/<feature>/api.ts`.
3. Create suspense hook with `useSuspenseQuery`.
4. Wrap feature body with `Suspense` fallback and `ErrorBoundary`.
5. Wrap non-urgent user interactions with `startTransition`.
6. Keep urgent interactions (typing, button press feedback) outside transition.

## Standard Hook Pattern

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';

export const snapshotKeys = {
  all: ['snapshot'] as const,
  byPostcode: (postcode: string) => ['snapshot', postcode] as const,
};

export function useSnapshotSuspenseQuery(postcode: string) {
  return useSuspenseQuery({
    queryKey: snapshotKeys.byPostcode(postcode),
    queryFn: () => fetchSnapshot(postcode),
    staleTime: 5 * 60 * 1000,
  });
}
```

## Standard UI Composition Pattern

```tsx
import { Suspense, useTransition } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function FeatureScreen() {
  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Suspense fallback={<FeatureSkeleton />}>
        <FeatureContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function FeatureFilters() {
  const [isPending, startTransition] = useTransition();

  function onFilterChange(nextValue: string) {
    startTransition(() => {
      updateFilter(nextValue);
    });
  }

  return <FilterControl pending={isPending} onChange={onFilterChange} />;
}
```

## Decision Rules

1. Use transition for updates that may suspend or trigger heavy rerender.
2. Do not use transition for controlled input `value` updates.
3. Keep Suspense boundaries small and feature-local.
4. Prefer several focused boundaries over one large route-level boundary.
5. If data must block the entire screen, document why in PR notes.

## Migration Rule For Existing Non-Suspense Hooks

When touching an existing feature that still uses `useQuery` + manual `isLoading` rendering:

1. Move loading UI to Suspense fallback.
2. Replace `useQuery` with `useSuspenseQuery` where feasible.
3. Keep error handling in `ErrorBoundary` (not ad hoc inline branching).
4. Migrate incrementally by feature to avoid broad regressions.

## Done Criteria For Any New Feature

1. Async reads use suspense hook(s).
2. Suspense fallback and ErrorBoundary are present.
3. Transition usage is applied to non-urgent updates.
4. Tests cover success, loading fallback, and error fallback behavior.
5. Accessibility remains intact (focus order, keyboard support, labels).
