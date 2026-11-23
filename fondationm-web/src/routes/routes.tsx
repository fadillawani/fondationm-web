import type { RouteObject } from 'react-router'
import type { Role } from '../auth/currentUser'
import { PATHS, ROLE_HOME } from '../auth/roles'
import { AppLayout } from '../components/layout/AppLayout'
import { RootLayout } from '../components/layout/RootLayout'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { MustChangePasswordPage } from '../pages/MustChangePasswordPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PendingAccountPage } from '../pages/PendingAccountPage'
import { RejectedAccountPage } from '../pages/RejectedAccountPage'
import { GuestOnly, HomeRedirect, RequireAuth, RequireDestination, RequireRole } from './guards'

const ROLES: readonly Role[] = ['SCHOOL', 'SPEAKER', 'FOUNDATION', 'DONOR', 'STUDENT']

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        path: PATHS.login,
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            path: PATHS.pending,
            element: (
              <RequireDestination path={PATHS.pending}>
                <PendingAccountPage />
              </RequireDestination>
            ),
          },
          {
            path: PATHS.rejected,
            element: (
              <RequireDestination path={PATHS.rejected}>
                <RejectedAccountPage />
              </RequireDestination>
            ),
          },
          {
            path: PATHS.mustChangePassword,
            element: (
              <RequireDestination path={PATHS.mustChangePassword}>
                <MustChangePasswordPage />
              </RequireDestination>
            ),
          },
          ...ROLES.map(
            (role): RouteObject => ({
              element: <RequireRole roles={[role]} />,
              children: [
                {
                  element: <AppLayout />,
                  children: [{ path: ROLE_HOME[role], element: <HomePage /> }],
                },
              ],
            }),
          ),
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
