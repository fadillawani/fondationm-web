import { Outlet } from 'react-router'
import { ApiEventsHandler } from '../../auth/ApiEventsHandler'
import { WakeupBanner } from './WakeupBanner'

export function RootLayout() {
  return (
    <>
      <ApiEventsHandler />
      <WakeupBanner />
      <Outlet />
    </>
  )
}
