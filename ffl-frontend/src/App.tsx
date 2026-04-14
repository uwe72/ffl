import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Season from './pages/Season'
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
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="season" element={
              <ProtectedRoute requiredRole="ADMIN">
                <Season />
              </ProtectedRoute>
            } />
            <Route path="teams" element={<Teams />} />
            <Route path="teams/:id" element={<TeamDetail />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:id" element={<PlayerDetail />} />
            <Route path="managers" element={<Managers />} />
            <Route path="managers/:id" element={<ManagerDetail />} />
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
              <ProtectedRoute requiredRole="ADMIN">
                <Games />
              </ProtectedRoute>
            } />
            <Route path="games/:id" element={
              <ProtectedRoute requiredRole="ADMIN">
                <GameDetail />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App