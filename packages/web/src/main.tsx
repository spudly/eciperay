import {AuthProvider} from '@recipoo/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';

import {router} from './routes/router.js';
import {supabase} from './lib/supabase.js';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 30_000, retry: 1}},
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider supabase={supabase}>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
