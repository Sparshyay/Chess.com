import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { leaderboardAPI, handleAPIError } from '../lib/api'
import { toast } from 'react-hot-toast'
import { 
  Trophy, 
  Medal, 
  Crown, 
  TrendingUp, 
  Users, 
  Target,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react'

interface LeaderboardPlayer {
  _id: string
  username: string
  rating: number
  profile: {
    firstName?: string
    lastName?: string
    country?: string
    title?: string
  }
  stats: {
    gamesPlayed: number
    gamesWon: number
    gamesLost: number
    gamesDrawn: number
  }
  rank: number
}

interface LeaderboardData {
  players: LeaderboardPlayer[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    timeControl: 'all',
    variant: 'all',
    page: 1,
    limit: 50
  })
  const [searchTerm, setSearchTerm] = useState('')

  const timeControls = [
    { value: 'all', label: 'All Time Controls' },
    { value: 'bullet', label: 'Bullet (1+0)' },
    { value: 'blitz', label: 'Blitz (3+0, 5+0)' },
    { value: 'rapid', label: 'Rapid (10+0, 15+10)' },
    { value: 'classical', label: 'Classical (30+0)' }
  ]

  const variants = [
    { value: 'all', label: 'All Variants' },
    { value: 'standard', label: 'Standard' },
    { value: 'chess960', label: 'Chess960' },
    { value: 'crazyhouse', label: 'Crazyhouse' },
    { value: 'kingofthehill', label: 'King of the Hill' }
  ]

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    try {
      const params = {
        timeControl: filters.timeControl !== 'all' ? filters.timeControl : undefined,
        variant: filters.variant !== 'all' ? filters.variant : undefined,
        page: filters.page,
        limit: filters.limit,
        search: searchTerm || undefined
      }
      
      const response = await leaderboardAPI.getLeaderboard(params)
      setLeaderboard(response.data)
    } catch (error) {
      const message = handleAPIError(error, 'Failed to load leaderboard')
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [filters, searchTerm])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />
      default:
        return <span className="text-gray-500 font-medium">{rank}</span>
    }
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

  const getWinRate = (player: LeaderboardPlayer) => {
    if (!player.stats.gamesPlayed) return 0
    return Math.round((player.stats.gamesWon / player.stats.gamesPlayed) * 100)
  }

  if (isLoading && !leaderboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
                Leaderboard
              </h1>
              <p className="text-gray-600 mt-2">
                Top players ranked by rating and performance
              </p>
            </div>
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Control
              </label>
              <select
                value={filters.timeControl}
                onChange={(e) => handleFilterChange('timeControl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {timeControls.map((control) => (
                  <option key={control.value} value={control.value}>
                    {control.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variant
              </label>
              <select
                value={filters.variant}
                onChange={(e) => handleFilterChange('variant', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {variants.map((variant) => (
                  <option key={variant.value} value={variant.value}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Results per page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Player
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard?.players.map((player, index) => (
                  <tr key={player._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRankIcon(player.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                            {player.username.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <Link
                              to={`/profile/${player._id}`}
                              className="text-sm font-medium text-gray-900 hover:text-primary-600"
                            >
                              {player.username}
                            </Link>
                            {player.profile?.title && (
                              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded ${getTitleColor(player.profile.title)} bg-gray-100`}>
                                {player.profile.title}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {player.profile?.firstName && player.profile?.lastName 
                              ? `${player.profile.firstName} ${player.profile.lastName}`
                              : 'Anonymous Player'
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Target className="w-4 h-4 text-primary-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {player.rating}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.stats.gamesPlayed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {getWinRate(player)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.profile?.country || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {leaderboard && leaderboard.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= leaderboard.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">{(filters.page - 1) * filters.limit + 1}</span>
                    {' '}to{' '}
                    <span className="font-medium">
                      {Math.min(filters.page * filters.limit, leaderboard.total)}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium">{leaderboard.total}</span>
                    {' '}results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(filters.page - 1)}
                      disabled={filters.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, leaderboard.totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(leaderboard.totalPages - 4, filters.page - 2)) + i
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === filters.page
                              ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handlePageChange(filters.page + 1)}
                      disabled={filters.page >= leaderboard.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard 