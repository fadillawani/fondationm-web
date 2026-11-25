import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createQueryClient } from './lib/queryClient'
import { routes } from './routes/routes'
import './styles/theme.css'

const container = document.getElementById('root')
if (container === null) throw new Error('Élément #root introuvable.')

const queryClient = createQueryClient()
const router = createBrowserRouter(routes)

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
