import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    const s = io()

    s.on('connect', () => {
      setStatus('Connected')
    })

    s.on('disconnect', () => {
      setStatus('Disconnected')
    })

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">chikicha</h1>
        <div className="flex items-center gap-2 justify-center">
          <div className={`w-3 h-3 rounded-full ${status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-600">{status}</span>
        </div>
        {socket && (
          <p className="text-sm text-gray-400 mt-2">ID: {socket.id}</p>
        )}
      </div>
    </div>
  )
}

export default App
