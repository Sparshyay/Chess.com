import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { SocketProvider } from '@/contexts/SocketContext'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Game from '@/pages/Game'
import Profile from '@/pages/Profile'
import Leaderboard from '@/pages/Leaderboard'
import GameHistory from '@/pages/GameHistory'
import NotFound from '@/pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="game/:gameId" element={<ProtectedRoute><Game /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="profile/:userId" element={<Profile />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="history" element={<ProtectedRoute><GameHistory /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App 