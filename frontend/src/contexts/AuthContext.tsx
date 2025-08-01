import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { authAPI, handleAPIError } from '../lib/api'

interface User {
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

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'CLEAR_ERROR' }

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      }
    case 'CLEAR_ERROR':
      return { ...state }
    default:
      return state
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (profileData: Partial<User['profile']>) => Promise<void>
  clearError: () => void
}

interface RegisterData {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const navigate = useNavigate()

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await authAPI.getMe()
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: response.data.user, token },
          })
        } catch (error) {
          localStorage.removeItem('token')
          dispatch({ type: 'LOGIN_FAILURE', payload: 'Authentication failed' })
        }
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: '' })
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' })
    try {
      const response = await authAPI.login(email, password)
      const { user, token } = response.data
      
      localStorage.setItem('token', token)
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } })
      toast.success('Welcome back!')
      navigate('/')
    } catch (error: any) {
      const message = handleAPIError(error, 'Login failed')
      dispatch({ type: 'LOGIN_FAILURE', payload: message })
      toast.error(message)
    }
  }

  const register = async (userData: RegisterData) => {
    dispatch({ type: 'LOGIN_START' })
    try {
      const response = await authAPI.register(userData)
      const { user, token } = response.data
      
      localStorage.setItem('token', token)
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } })
      toast.success('Account created successfully!')
      navigate('/')
    } catch (error: any) {
      const message = handleAPIError(error, 'Registration failed')
      dispatch({ type: 'LOGIN_FAILURE', payload: message })
      toast.error(message)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    dispatch({ type: 'LOGOUT' })
    toast.success('Logged out successfully')
    navigate('/')
  }

  const updateProfile = async (profileData: Partial<User['profile']>) => {
    try {
      const response = await authAPI.updateProfile(profileData)
      dispatch({ type: 'UPDATE_USER', payload: response.data.user })
      toast.success('Profile updated successfully')
    } catch (error: any) {
      const message = handleAPIError(error, 'Failed to update profile')
      toast.error(message)
    }
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 