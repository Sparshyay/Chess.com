import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { isAuthenticated, token } = useAuth()

  const connect = () => {
    if (!isAuthenticated || !token) return

    const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:5001'
    
    const newSocket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from server')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setIsConnected(false)
    })

    setSocket(newSocket)
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && token) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, token])

  const value: SocketContextType = {
    socket,
    isConnected,
    connect,
    disconnect,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
} 