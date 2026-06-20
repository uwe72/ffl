import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FeedbackProvider } from './context/FeedbackContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Season from './pages/Season'
import System from './pages/System'
import Teams from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Managers from './pages/Managers'
import ManagerDetail from './pages/ManagerDetail'
import ManagerGroups from './pages/ManagerGroups'
import ManagerGroupDetail from './pages/ManagerGroupDetail'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Emails from './pages/Emails'
import Mailing from './pages/Mailing'
import MailingInvitation from './pages/MailingInvitation'
import MailingMatchday from './pages/MailingMatchday'
import MailingPrizeDistribution from './pages/MailingPrizeDistribution'
import MailingAdminReport from './pages/MailingAdminReport'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import MyTeam from './pages/MyTeam'
import ProtectedRoute from './components/ProtectedRoute'
import SeasonRestrictedRoute from './components/SeasonRestrictedRoute'
import { useMatomoPageView } from './hooks/useMatomo'

function MatomoTracker() {
  useMatomoPageView()
  return null
}

function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <BrowserRouter>
        <MatomoTracker />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<SeasonRestrictedRoute><Home /></SeasonRestrictedRoute>} />
            <Route path="profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="my-team" element={
              <ProtectedRoute>
                <MyTeam />
              </ProtectedRoute>
            } />
            <Route path="season" element={
              <ProtectedRoute requiredRole="ADMIN">
                <Season />
              </ProtectedRoute>
            } />
            <Route path="teams" element={<SeasonRestrictedRoute><Teams /></SeasonRestrictedRoute>} />
            <Route path="teams/:id" element={<SeasonRestrictedRoute><TeamDetail /></SeasonRestrictedRoute>} />
            <Route path="players" element={<Players />} />
            <Route path="players/:id" element={<PlayerDetail />} />
            <Route path="managers" element={<SeasonRestrictedRoute><Managers /></SeasonRestrictedRoute>} />
            <Route path="managers/:id" element={<SeasonRestrictedRoute><ManagerDetail /></SeasonRestrictedRoute>} />
            <Route path="manager-groups" element={<ManagerGroups />} />
            <Route path="manager-groups/:id" element={<ManagerGroupDetail />} />
            <Route path="users" element={
              <ProtectedRoute requiredRole="ADMIN">
                <Users />
              </ProtectedRoute>
            } />
            <Route path="users/:id" element={
              <ProtectedRoute requiredRole="ADMIN">
                <UserDetail />
              </ProtectedRoute>
            } />
            <Route path="games" element={
              <ProtectedRoute>
                <SeasonRestrictedRoute><Games /></SeasonRestrictedRoute>
              </ProtectedRoute>
            } />
            <Route path="games/:id" element={
              <ProtectedRoute>
                <SeasonRestrictedRoute><GameDetail /></SeasonRestrictedRoute>
              </ProtectedRoute>
            } />
            <Route path="system" element={
              <ProtectedRoute requiredRole="ADMIN">
                <System />
              </ProtectedRoute>
            } />
            <Route path="emails" element={
              <ProtectedRoute requiredRole="ADMIN">
                <Emails />
              </ProtectedRoute>
            } />
            <Route path="mailing" element={
              <ProtectedRoute requiredRole="ADMIN">
                <Mailing />
              </ProtectedRoute>
            } />
            <Route path="mailing/einladung" element={
              <ProtectedRoute requiredRole="ADMIN">
                <MailingInvitation />
              </ProtectedRoute>
            } />
            <Route path="mailing/spieltagsmail" element={
              <ProtectedRoute requiredRole="ADMIN">
                <MailingMatchday />
              </ProtectedRoute>
            } />
            <Route path="mailing/abschlussmail" element={
              <ProtectedRoute requiredRole="ADMIN">
                <MailingPrizeDistribution />
              </ProtectedRoute>
            } />
            <Route path="mailing/saisonabschluss" element={
              <ProtectedRoute requiredRole="ADMIN">
                <MailingAdminReport />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
      </FeedbackProvider>
    </AuthProvider>
  )
}

export default App
