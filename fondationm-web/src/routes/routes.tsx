import { Navigate, type RouteObject } from 'react-router'
import type { Role } from '../auth/currentUser'
import { PATHS, ROLE_HOME } from '../auth/roles'
import { AppLayout } from '../components/layout/AppLayout'
import { RootLayout } from '../components/layout/RootLayout'
import { AccountsPage } from '../pages/foundation/AccountsPage'
import { AgendaPage } from '../pages/speaker/AgendaPage'
import { RequestsPage } from '../pages/speaker/RequestsPage'
import { HomePage } from '../pages/HomePage'
import { MeetingRequestPage } from '../pages/school/MeetingRequestPage'
import { MeetingsPage } from '../pages/school/MeetingsPage'
import { SpeakersPage } from '../pages/school/SpeakersPage'
import { LoginPage } from '../pages/LoginPage'
import { MustChangePasswordPage } from '../pages/MustChangePasswordPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PendingAccountPage } from '../pages/PendingAccountPage'
import { RegisterChoicePage } from '../pages/register/RegisterChoicePage'
import { RegisterSchoolPage } from '../pages/register/RegisterSchoolPage'
import { RegisterSpeakerPage } from '../pages/register/RegisterSpeakerPage'
import { RejectedAccountPage } from '../pages/RejectedAccountPage'
import { GuestOnly, HomeRedirect, RequireAuth, RequireDestination, RequireRole } from './guards'

const ROLES: readonly Role[] = ['SCHOOL', 'SPEAKER', 'FOUNDATION', 'DONOR', 'STUDENT']

function rolePages(role: Role): RouteObject[] {
  if (role === 'FOUNDATION') {
    return [
      // Le tableau de bord viendra plus tard : l'accueil de la Fondation ouvre les comptes à valider.
      { path: ROLE_HOME.FOUNDATION, element: <Navigate to={PATHS.foundationAccounts} replace /> },
      { path: PATHS.foundationAccounts, element: <AccountsPage /> },
    ]
  }
  if (role === 'SPEAKER') {
    return [
      { path: ROLE_HOME.SPEAKER, element: <Navigate to={PATHS.speakerAgenda} replace /> },
      { path: PATHS.speakerAgenda, element: <AgendaPage /> },
      { path: PATHS.speakerRequests, element: <RequestsPage /> },
    ]
  }
  if (role === 'SCHOOL') {
    return [
      { path: ROLE_HOME.SCHOOL, element: <Navigate to={PATHS.schoolSpeakers} replace /> },
      { path: PATHS.schoolSpeakers, element: <SpeakersPage /> },
      { path: `${PATHS.schoolSpeakers}/:id/demande`, element: <MeetingRequestPage /> },
      { path: PATHS.schoolMeetings, element: <MeetingsPage /> },
    ]
  }
  return [{ path: ROLE_HOME[role], element: <HomePage /> }]
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      ...(
        [
          [PATHS.login, <LoginPage key="login" />],
          [PATHS.register, <RegisterChoicePage key="register" />],
          [PATHS.registerSchool, <RegisterSchoolPage key="register-school" />],
          [PATHS.registerSpeaker, <RegisterSpeakerPage key="register-speaker" />],
        ] as const
      ).map(([path, page]): RouteObject => ({ path, element: <GuestOnly>{page}</GuestOnly> })),
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
                  children: rolePages(role),
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
