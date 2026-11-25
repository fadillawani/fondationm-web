import { Navigate, type RouteObject } from 'react-router'
import type { Role } from '../auth/currentUser'
import { PATHS, ROLE_HOME } from '../auth/roles'
import { AppLayout } from '../components/layout/AppLayout'
import { RootLayout } from '../components/layout/RootLayout'
import { AccountsPage } from '../pages/foundation/AccountsPage'
import { DashboardPage as FoundationDashboardPage } from '../pages/foundation/dashboard/DashboardPage'
import { DonorRequestsPage } from '../pages/foundation/donors/DonorRequestsPage'
import { FeedbacksPage as FoundationFeedbacksPage } from '../pages/foundation/feedbacks/FeedbacksPage'
import { SchoolFeedbackPage, SpeakerFeedbackPage } from '../pages/feedback/FeedbackFormPage'
import { SchoolFeedbacksPage } from '../pages/school/feedbacks/SchoolFeedbacksPage'
import { ImpactPage } from '../pages/speaker/ImpactPage'
import { MeetingsPage as FoundationMeetingsPage } from '../pages/foundation/meetings/MeetingsPage'
import { RequestsPage as FoundationRequestsPage } from '../pages/foundation/meetings/RequestsPage'
import { AgendaPage } from '../pages/speaker/AgendaPage'
import { ImpactPage as DonorImpactPage } from '../pages/donor/ImpactPage'
import { RequestsPage as DonorRequestsOwnPage } from '../pages/donor/RequestsPage'
import { RequestsPage } from '../pages/speaker/RequestsPage'
import { StudentHomePage } from '../pages/student/StudentHomePage'
import { MeetingRequestPage } from '../pages/school/MeetingRequestPage'
import { EstablishmentPage } from '../pages/school/establishment/EstablishmentPage'
import { MeetingsPage } from '../pages/school/MeetingsPage'
import { SpeakersPage } from '../pages/school/SpeakersPage'
import { MustChangePasswordPage } from '../pages/MustChangePasswordPage'
import { DonorLoginPage } from '../pages/login/DonorLoginPage'
import { FoundationLoginPage } from '../pages/login/FoundationLoginPage'
import { SchoolLoginPage } from '../pages/login/SchoolLoginPage'
import { SpeakerLoginPage } from '../pages/login/SpeakerLoginPage'
import { StudentLoginPage } from '../pages/login/StudentLoginPage'
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
      { path: ROLE_HOME.FOUNDATION, element: <Navigate to={PATHS.foundationDashboard} replace /> },
      { path: PATHS.foundationDashboard, element: <FoundationDashboardPage /> },
      { path: PATHS.foundationDonorRequests, element: <DonorRequestsPage /> },
      { path: PATHS.foundationAccounts, element: <AccountsPage /> },
      { path: PATHS.foundationRequests, element: <FoundationRequestsPage /> },
      { path: PATHS.foundationMeetings, element: <FoundationMeetingsPage /> },
      { path: PATHS.foundationFeedbacks, element: <FoundationFeedbacksPage /> },
    ]
  }
  if (role === 'SPEAKER') {
    return [
      { path: ROLE_HOME.SPEAKER, element: <Navigate to={PATHS.speakerAgenda} replace /> },
      { path: PATHS.speakerAgenda, element: <AgendaPage /> },
      { path: PATHS.speakerRequests, element: <RequestsPage /> },
      { path: PATHS.speakerImpact, element: <ImpactPage /> },
      { path: `${PATHS.speakerFeedbacks}/:meetingId`, element: <SpeakerFeedbackPage /> },
    ]
  }
  if (role === 'SCHOOL') {
    return [
      { path: ROLE_HOME.SCHOOL, element: <Navigate to={PATHS.schoolSpeakers} replace /> },
      { path: PATHS.schoolSpeakers, element: <SpeakersPage /> },
      { path: `${PATHS.schoolSpeakers}/:id/demande`, element: <MeetingRequestPage /> },
      { path: PATHS.schoolMeetings, element: <MeetingsPage /> },
      { path: PATHS.schoolEstablishment, element: <EstablishmentPage /> },
      { path: PATHS.schoolFeedbacks, element: <SchoolFeedbacksPage /> },
      { path: `${PATHS.schoolFeedbacks}/:meetingId`, element: <SchoolFeedbackPage /> },
    ]
  }
  if (role === 'DONOR') {
    return [
      { path: ROLE_HOME.DONOR, element: <Navigate to={PATHS.donorImpact} replace /> },
      { path: PATHS.donorImpact, element: <DonorImpactPage /> },
      { path: PATHS.donorRequests, element: <DonorRequestsOwnPage /> },
    ]
  }
  // Élève (F11) : l'accueil provisoire est remplacé par « Mon espace ».
  return [{ path: ROLE_HOME.STUDENT, element: <StudentHomePage /> }]
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      ...(
        [
          [PATHS.login, <SchoolLoginPage key="login" />],
          [PATHS.loginSpeaker, <SpeakerLoginPage key="login-speaker" />],
          [PATHS.loginFoundation, <FoundationLoginPage key="login-foundation" />],
          [PATHS.loginDonor, <DonorLoginPage key="login-donor" />],
          [PATHS.loginStudent, <StudentLoginPage key="login-student" />],
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
