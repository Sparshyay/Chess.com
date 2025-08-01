import React from 'react'
import { Link } from 'react-router-dom'

const NotFound: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
    <p className="text-xl text-gray-700 mb-6">Page Not Found</p>
    <Link to="/" className="btn btn-primary">Go Home</Link>
  </div>
)

export default NotFound 