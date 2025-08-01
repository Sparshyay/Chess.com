import axios from 'axios'

// API Configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API Service Functions
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  register: (userData: {
    username: string
    email: string
    password: string
    firstName?: string
    lastName?: string
    country?: string
  }) => api.post('/auth/register', userData),
  
  getMe: () => api.get('/auth/me'),
  
  updateProfile: (profileData: {
    firstName?: string
    lastName?: string
    country?: string
    bio?: string
    title?: string
  }) => api.put('/auth/profile', profileData),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (resetToken: string, newPassword: string) =>
    api.post('/auth/reset-password', { resetToken, newPassword }),
  
  refreshToken: () => api.post('/auth/refresh'),
  
  logout: () => api.post('/auth/logout'),
}

export const userAPI = {
  getProfile: (userId?: string) => 
    api.get(userId ? `/users/${userId}` : '/users/profile'),
  
  updateProfile: (profileData: any) => 
    api.put('/users/profile', profileData),
  
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  getStats: (userId?: string) =>
    api.get(userId ? `/users/${userId}/stats` : '/users/stats'),
  
  getRatingHistory: (userId?: string) =>
    api.get(userId ? `/users/${userId}/rating-history` : '/users/rating-history'),
}

export const gameAPI = {
  createGame: (gameData: {
    timeControl: string
    variant: string
    isRated: boolean
    opponentId?: string
  }) => api.post('/games', gameData),
  
  getGame: (gameId: string) => api.get(`/games/${gameId}`),
  
  getGames: (params?: {
    page?: number
    limit?: number
    status?: string
    playerId?: string
  }) => api.get('/games', { params }),
  
  makeMove: (gameId: string, move: {
    from: string
    to: string
    promotion?: string
  }) => api.post(`/games/${gameId}/move`, move),
  
  resignGame: (gameId: string) => api.post(`/games/${gameId}/resign`),
  
  offerDraw: (gameId: string) => api.post(`/games/${gameId}/draw-offer`),
  
  respondToDraw: (gameId: string, accept: boolean) =>
    api.post(`/games/${gameId}/draw-response`, { accept }),
  
  getGameHistory: (params?: {
    page?: number
    limit?: number
    status?: string
    playerId?: string
  }) => api.get('/games/history', { params }),
  
  getGameAnalysis: (gameId: string) => api.get(`/games/${gameId}/analysis`),
  
  getDailyPuzzle: () => api.get('/games/puzzles/daily'),
  
  getPuzzles: (params?: {
    page?: number
    limit?: number
    difficulty?: string
  }) => api.get('/games/puzzles', { params }),
  
  submitPuzzleSolution: (puzzleId: string, moves: string[]) =>
    api.post(`/games/puzzles/${puzzleId}/solve`, { moves }),
}

export const leaderboardAPI = {
  getLeaderboard: (params?: {
    timeControl?: string
    variant?: string
    page?: number
    limit?: number
  }) => api.get('/leaderboard', { params }),
  
  getTopPlayers: (limit?: number) => 
    api.get('/leaderboard/top', { params: { limit } }),
  
  getPlayerRank: (userId: string) => 
    api.get(`/leaderboard/rank/${userId}`),
  
  getTournaments: (params?: {
    page?: number
    limit?: number
    status?: string
  }) => api.get('/leaderboard/tournaments', { params }),
  
  getTournament: (tournamentId: string) => 
    api.get(`/leaderboard/tournaments/${tournamentId}`),
  
  joinTournament: (tournamentId: string) => 
    api.post(`/leaderboard/tournaments/${tournamentId}/join`),
  
  leaveTournament: (tournamentId: string) => 
    api.post(`/leaderboard/tournaments/${tournamentId}/leave`),
}

export const matchmakingAPI = {
  findOpponent: (preferences: {
    timeControl: string
    variant: string
    isRated: boolean
    minRating?: number
    maxRating?: number
  }) => api.post('/matchmaking/find', preferences),
  
  cancelSearch: () => api.post('/matchmaking/cancel'),
  
  getQueueStatus: () => api.get('/matchmaking/status'),
}

// Utility functions
export const formatError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.response?.data?.error) {
    return error.response.data.error
  }
  if (error.message) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export const handleAPIError = (error: any, defaultMessage = 'Operation failed') => {
  const message = formatError(error) || defaultMessage
  console.error('API Error:', error)
  return message
}

export default api 