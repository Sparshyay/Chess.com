import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { userAPI, handleAPIError } from '../lib/api'
import { toast } from 'react-hot-toast'
import { 
  Edit, 
  Save, 
  X, 
  Trophy, 
  Target, 
  Clock, 
  TrendingUp,
  Calendar,
  MapPin,
  Crown,
  User,
  Mail,
  Gamepad2
} from 'lucide-react'

interface UserProfile {
  _id: string
  username: string
  email: string
  rating: number
  profile: {
    firstName?: string
    lastName?: string
    bio?: string
    avatar?: string
    country?: string
    title?: string
  }
  stats: {
    gamesPlayed: number
    gamesWon: number
    gamesLost: number
    gamesDrawn: number
  }
  role: 'user' | 'admin' | 'moderator'
  createdAt: string
}

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    country: '',
    title: ''
  })

  const isOwnProfile = !userId || userId === currentUser?._id

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userAPI.getProfile(userId)
        const userData = response.data.user
        setProfile(userData)
        setEditForm({
          firstName: userData.profile?.firstName || '',
          lastName: userData.profile?.lastName || '',
          bio: userData.profile?.bio || '',
          country: userData.profile?.country || '',
          title: userData.profile?.title || ''
        })
      } catch (error) {
        const message = handleAPIError(error, 'Failed to load profile')
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await userAPI.updateProfile(editForm)
      setProfile(response.data.user)
      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      const message = handleAPIError(error, 'Failed to update profile')
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditForm({
      firstName: profile?.profile?.firstName || '',
      lastName: profile?.profile?.lastName || '',
      bio: profile?.profile?.bio || '',
      country: profile?.profile?.country || '',
      title: profile?.profile?.title || ''
    })
    setIsEditing(false)
  }

  const getWinRate = () => {
    if (!profile?.stats.gamesPlayed) return 0
    return Math.round((profile.stats.gamesWon / profile.stats.gamesPlayed) * 100)
  }

  const getTitleColor = (title?: string) => {
    switch (title) {
      case 'GM': return 'text-yellow-600'
      case 'IM': return 'text-gray-600'
      case 'FM': return 'text-orange-600'
      case 'CM': return 'text-blue-600'
      case 'WGM': return 'text-pink-600'
      case 'WIM': return 'text-purple-600'
      case 'WFM': return 'text-indigo-600'
      case 'WCM': return 'text-teal-600'
      default: return 'text-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">The user profile you're looking for doesn't exist.</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{profile.username}</h1>
                  {profile.profile?.title && (
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getTitleColor(profile.profile.title)} bg-gray-100`}>
                      {profile.profile.title}
                    </span>
                  )}
                  {profile.role !== 'user' && (
                    <span className="px-2 py-1 text-xs font-semibold rounded text-white bg-red-600">
                      {profile.role.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    <span className="font-semibold">{profile.rating}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{profile.profile?.country || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            )}
          </div>

          {/* Bio Section */}
          {isEditing ? (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Tell us about yourself..."
              />
            </div>
          ) : (
            profile.profile?.bio && (
              <div className="mt-6">
                <p className="text-gray-700">{profile.profile.bio}</p>
              </div>
            )
          )}

          {/* Edit Form */}
          {isEditing && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <select
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No title</option>
                  <option value="GM">Grandmaster (GM)</option>
                  <option value="IM">International Master (IM)</option>
                  <option value="FM">FIDE Master (FM)</option>
                  <option value="CM">Candidate Master (CM)</option>
                  <option value="WGM">Woman Grandmaster (WGM)</option>
                  <option value="WIM">Woman International Master (WIM)</option>
                  <option value="WFM">Woman FIDE Master (WFM)</option>
                  <option value="WCM">Woman Candidate Master (WCM)</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Games Played</p>
                <p className="text-2xl font-bold text-gray-900">{profile.stats.gamesPlayed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Games Won</p>
                <p className="text-2xl font-bold text-gray-900">{profile.stats.gamesWon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{getWinRate()}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rating</p>
                <p className="text-2xl font-bold text-gray-900">{profile.rating}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isOwnProfile && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/game/new"
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Play Game
              </Link>
              <Link
                to="/history"
                className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Clock className="w-4 h-4 mr-2" />
                Game History
              </Link>
              <Link
                to="/leaderboard"
                className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile 