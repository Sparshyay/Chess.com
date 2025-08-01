import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { useSocket } from '@/contexts/SocketContext'
import api from '@/lib/api'

interface GameData {
  _id: string
  fen: string
  moves: string[]
  white: { username: string }
  black: { username: string }
  result: string
  chat: { user: string; message: string; time: string }[]
}

const Game: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const { socket } = useSocket()
  const [game, setGame] = useState<Chess>(new Chess())
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [chat, setChat] = useState<GameData['chat']>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch game data from backend
  useEffect(() => {
    const fetchGame = async () => {
      setLoading(true)
      const res = await api.get(`/games/${gameId}`)
      setGameData(res.data.game)
      setGame(new Chess(res.data.game.fen))
      setMoveHistory(res.data.game.moves)
      setChat(res.data.game.chat || [])
      setLoading(false)
    }
    if (gameId) fetchGame()
  }, [gameId])

  // Socket.io: join game room and listen for moves/chat
  useEffect(() => {
    if (!socket || !gameId) return
    socket.emit('joinGame', { gameId })
    socket.on('move', ({ fen, move }: { fen: string; move: string }) => {
      setGame((prev) => {
        const updated = new Chess(fen)
        return updated
      })
      setMoveHistory((prev) => [...prev, move])
    })
    socket.on('chat', (msg: GameData['chat'][0]) => {
      setChat((prev) => [...prev, msg])
    })
    return () => {
      socket.emit('leaveGame', { gameId })
      socket.off('move')
      socket.off('chat')
    }
  }, [socket, gameId])

  // Handle move on board
  const onDrop = useCallback((source: string, target: string) => {
    const move = game.move({ from: source, to: target, promotion: 'q' })
    if (move) {
      setGame(new Chess(game.fen()))
      setMoveHistory((prev) => [...prev, move.san])
      if (socket && gameId) {
        socket.emit('move', { gameId, move: move.san })
      }
      return true
    }
    return false
  }, [game, socket, gameId])

  // Send chat message
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && socket && gameId) {
      socket.emit('chat', { gameId, message })
      setMessage('')
    }
  }

  if (loading || !gameData) {
    return <div className="flex justify-center items-center min-h-screen"><div className="spinner w-8 h-8"></div></div>
  }

  return (
    <div className="max-w-5xl mx-auto py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="card p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">White: {gameData.white.username}</span>
            <span className="font-semibold">Black: {gameData.black.username}</span>
          </div>
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={400}
            arePiecesDraggable={true}
            customBoardStyle={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          />
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Move History</h3>
          <div className="flex flex-wrap gap-2">
            {moveHistory.map((move, i) => (
              <span key={i} className="bg-gray-200 rounded px-2 py-1 text-sm">{move}</span>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="card p-4 mb-4 h-96 flex flex-col">
          <h3 className="font-semibold mb-2">Chat</h3>
          <div className="flex-1 overflow-y-auto mb-2 space-y-2">
            {chat.map((msg, i) => (
              <div key={i} className="text-sm"><b>{msg.user}:</b> {msg.message}</div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              className="input flex-1"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button className="btn btn-primary" type="submit">Send</button>
          </form>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Game Info</h3>
          <div>Status: {gameData.result || 'In Progress'}</div>
        </div>
      </div>
    </div>
  )
}

export default Game 