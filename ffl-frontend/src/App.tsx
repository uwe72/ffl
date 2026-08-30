import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
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
import ManagerGallery from './pages/ManagerGallery'
import ManagerGroups from './pages/ManagerGroups'
import ManagerGroupDetail from './pages/ManagerGroupDetail'
import Documents from './pages/Documents'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import Feedback from './pages/Feedback'
import History from './pages/History'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Emails from './pages/Emails'
import Mailing from './pages/Mailing'
import SurveyLanding from './pages/SurveyLanding'
import SurveyPublic from './pages/SurveyPublic'
import SurveyAdmin from './pages/SurveyAdmin'
import MailingInvitation from './pages/MailingInvitation'
import MailingReminder from './pages/MailingReminder'
import MailingMatchday from './pages/MailingMatchday'
import MailingPrizeDistribution from './pages/MailingPrizeDistribution'
import MailingAdminReport from './pages/MailingAdminReport'
import MailingTransparency from './pages/MailingTransparency'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ForgotLogin from './pages/ForgotLogin'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import MyTeam from './pages/MyTeam'
import ProtectedRoute from './components/ProtectedRoute'
import SeasonRestrictedRoute from './components/SeasonRestrictedRoute'
import ManagerGalleryRoute from './components/ManagerGalleryRoute'
import BeforeSeasonDetailRoute from './components/BeforeSeasonDetailRoute'
import { useMatomoPageView } from './hooks/useMatomo'

function MatomoTracker() {
  useMatomoPageView()
  return null
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MatomoTracker />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/forgot-login" element={<ForgotLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Layout />}>
            <Route index element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
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
            <Route path="teams" element={
              <ProtectedRoute>
                <SeasonRestrictedRoute><Teams /></SeasonRestrictedRoute>
              </ProtectedRoute>
            } />
            <Route path="teams/:id" element={
              <ProtectedRoute>
                <SeasonRestrictedRoute><TeamDetail /></SeasonRestrictedRoute>
              </ProtectedRoute>
            } />
            <Route path="players" element={<Players />} />
            <Route path="players/:id" element={
              <ProtectedRoute>
                <BeforeSeasonDetailRoute redirectTo="/players"><PlayerDetail /></BeforeSeasonDetailRoute>
              </ProtectedRoute>
            } />
            <Route path="feedback" element={<Feedback />} />
            <Route path="umfrage" element={<SurveyLanding />} />
            <Route path="umfrage/:id" element={<SurveyPublic />} />
            <Route path="umfragen" element={
              <ProtectedRoute requiredRole="ADMIN">
                <SurveyAdmin />
              </ProtectedRoute>
            } />
            <Route path="managers" element={
              <ProtectedRoute>
                <Managers />
              </ProtectedRoute>
            } />
            <Route path="managers/:id" element={
              <ProtectedRoute>
                <BeforeSeasonDetailRoute redirectTo="/managers"><ManagerDetail /></BeforeSeasonDetailRoute>
              </ProtectedRoute>
            } />
            <Route path="manager-galerie" element={
              <ProtectedRoute>
                <ManagerGalleryRoute><ManagerGallery /></ManagerGalleryRoute>
              </ProtectedRoute>
            } />
            <Route path="manager-groups" element={
              <ProtectedRoute><ManagerGroups /></ProtectedRoute>
            } />
            <Route path="manager-groups/:id" element={
              <ProtectedRoute><ManagerGroupDetail /></ProtectedRoute>
            } />
            <Route path="documents" element={<Documents />} />
            <Route path="history" element={<History />} />
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
            <Route path="mailing/erinnerung" element={
              <ProtectedRoute requiredRole="ADMIN">
                <MailingReminder variant="erinnerung" />
              </ProtectedRoute>
            } />
            <Route path="mailing/danke" element={
              <ProtectedRoute requiredRole="ADMIN">
                <MailingReminder variant="danke" />
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
            <Route path="mailing/transparenz" element={
              <ProtectedRoute requiredRole="ADMIN">
                <MailingTransparency />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
