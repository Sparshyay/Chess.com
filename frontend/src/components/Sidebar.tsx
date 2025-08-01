import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Play, 
  Users, 
  Clock, 
  Trophy, 
  Settings,
  Plus,
  Search
} from 'lucide-react'

const Sidebar: React.FC = () => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="hidden lg:block w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
        
        <div className="space-y-4">
          {/* Play Game */}
          <Link
            to="/play"
            className="flex items-center space-x-3 p-3 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
          >
            <Play className="w-5 h-5" />
            <span className="font-medium">Play Game</span>
          </Link>

          {/* Find Opponent */}
          <Link
            to="/find-opponent"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Search className="w-5 h-5" />
            <span className="font-medium">Find Opponent</span>
          </Link>

          {/* Create Tournament */}
          <Link
            to="/tournaments/create"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Create Tournament</span>
          </Link>

          {/* Join Tournament */}
          <Link
            to="/tournaments"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Trophy className="w-5 h-5" />
            <span className="font-medium">Join Tournament</span>
          </Link>

          {/* Play with Friends */}
          <Link
            to="/friends"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Play with Friends</span>
          </Link>

          {/* Practice Mode */}
          <Link
            to="/practice"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Clock className="w-5 h-5" />
            <span className="font-medium">Practice Mode</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Game Settings</h3>
          
          <div className="space-y-2">
            <Link
              to="/settings"
              className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Preferences</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar 