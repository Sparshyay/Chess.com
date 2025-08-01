import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gameAPI, handleAPIError } from '../lib/api'
import { toast } from 'react-hot-toast'
import { 
  Clock, 
  Trophy, 
  Target, 
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Download,
  User,
  Crown
} from 'lucide-react'

interface GameHistory {
  _id: string
  white: {
    _id: string
    username: string
    rating: number
  }
  black: {
    _id: string
    username: string
    rating: number
  }
  result: 'white' | 'black' | 'draw' | 'abandoned'
  timeControl: string
  variant: string
  isRated: boolean
  moves: string[]
  createdAt: string
  endedAt: string
  pgn?: string
}

interface GameHistoryData {
  games: GameHistory[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const GameHistory: React.FC = () => {
  const [gameHistory, setGameHistory] = useState<GameHistoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    result: 'all',
    timeControl: 'all',
    variant: 'all',
    page: 1,
    limit: 20
  })
  const [searchTerm, setSearchTerm] = useState('')

  const results = [
    { value: 'all', label: 'All Results' },
    { value: 'white', label: 'Wins' },
    { value: 'black', label: 'Losses' },
    { value: 'draw', label: 'Draws' },
    { value: 'abandoned', label: 'Abandoned' }
  ]

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

  const fetchGameHistory = async () => {
    setIsLoading(true)
    try {
      const params = {
        result: filters.result !== 'all' ? filters.result : undefined,
        timeControl: filters.timeControl !== 'all' ? filters.timeControl : undefined,
        variant: filters.variant !== 'all' ? filters.variant : undefined,
        page: filters.page,
        limit: filters.limit,
        search: searchTerm || undefined
      }
      
      const response = await gameAPI.getGameHistory(params)
      setGameHistory(response.data)
    } catch (error) {
      const message = handleAPIError(error, 'Failed to load game history')
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGameHistory()
  }, [filters, searchTerm])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'white':
        return <Trophy className="w-4 h-4 text-green-600" />
      case 'black':
        return <Trophy className="w-4 h-4 text-red-600" />
      case 'draw':
        return <Target className="w-4 h-4 text-gray-600" />
      case 'abandoned':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getResultText = (result: string) => {
    switch (result) {
      case 'white':
        return 'Win'
      case 'black':
        return 'Loss'
      case 'draw':
        return 'Draw'
      case 'abandoned':
        return 'Abandoned'
      default:
        return 'Unknown'
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'white':
        return 'text-green-600 bg-green-100'
      case 'black':
        return 'text-red-600 bg-red-100'
      case 'draw':
        return 'text-gray-600 bg-gray-100'
      case 'abandoned':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getGameDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = Math.round((end.getTime() - start.getTime()) / 1000 / 60) // minutes
    return `${duration}m`
  }

  if (isLoading && !gameHistory) {
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
                <Clock className="w-8 h-8 text-primary-600 mr-3" />
                Game History
              </h1>
              <p className="text-gray-600 mt-2">
                Review your past games and analyze your performance
              </p>
            </div>
            <button
              onClick={fetchGameHistory}
              disabled={isLoading}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Result
              </label>
              <select
                value={filters.result}
                onChange={(e) => handleFilterChange('result', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {results.map((result) => (
                  <option key={result.value} value={result.value}>
                    {result.label}
                  </option>
                ))}
              </select>
            </div>

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
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Opponent
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

        {/* Game History List */}
        <div className="space-y-4">
          {gameHistory?.games.map((game) => (
            <div key={game._id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getResultIcon(game.result)}
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getResultColor(game.result)}`}>
                      {getResultText(game.result)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <Link
                          to={`/profile/${game.white._id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {game.white.username}
                        </Link>
                        <div className="text-xs text-gray-500">{game.white.rating}</div>
                      </div>
                    </div>
                    
                    <div className="text-gray-400">vs</div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-black rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <Link
                          to={`/profile/${game.black._id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {game.black.username}
                        </Link>
                        <div className="text-xs text-gray-500">{game.black.rating}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{game.timeControl}</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    <span>{game.variant}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(game.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/game/${game._id}`}
                      className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                    {game.pgn && (
                      <button
                        onClick={() => {
                          const blob = new Blob([game.pgn!], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `game-${game._id}.pgn`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PGN
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Moves: {game.moves.length}</span>
                  <span>Duration: {getGameDuration(game.createdAt, game.endedAt)}</span>
                  {game.isRated && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Rated
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Games Message */}
        {gameHistory && gameHistory.games.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
            <p className="text-gray-600 mb-6">
              You haven't played any games yet, or no games match your current filters.
            </p>
            <Link
              to="/game/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Play Your First Game
            </Link>
          </div>
        )}

        {/* Pagination */}
        {gameHistory && gameHistory.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm mt-6">
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
                disabled={filters.page >= gameHistory.totalPages}
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
                    {Math.min(filters.page * filters.limit, gameHistory.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{gameHistory.total}</span>
                  {' '}games
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
                  {Array.from({ length: Math.min(5, gameHistory.totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(gameHistory.totalPages - 4, filters.page - 2)) + i
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
                    disabled={filters.page >= gameHistory.totalPages}
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
  )
}

export default GameHistory 