import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Play, 
  Trophy, 
  Users, 
  Clock, 
  Target, 
  TrendingUp,
  Crown,
  Shield,
  Zap,
  Star
} from 'lucide-react'

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth()

  const features = [
    {
      icon: <Play className="w-6 h-6" />,
      title: 'Play Chess',
      description: 'Challenge players from around the world in real-time chess matches.',
      color: 'bg-blue-500'
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Tournaments',
      description: 'Compete in tournaments and climb the leaderboards.',
      color: 'bg-yellow-500'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Community',
      description: 'Join a vibrant community of chess enthusiasts.',
      color: 'bg-green-500'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Practice Mode',
      description: 'Improve your skills with puzzles and training exercises.',
      color: 'bg-purple-500'
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Rating System',
      description: 'Track your progress with our ELO rating system.',
      color: 'bg-red-500'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Analytics',
      description: 'Analyze your games and improve your strategy.',
      color: 'bg-indigo-500'
    }
  ]

  const stats = [
    { label: 'Active Players', value: '10,000+', icon: <Users className="w-5 h-5" /> },
    { label: 'Games Played', value: '1M+', icon: <Play className="w-5 h-5" /> },
    { label: 'Tournaments', value: '500+', icon: <Trophy className="w-5 h-5" /> },
    { label: 'Countries', value: '150+', icon: <Crown className="w-5 h-5" /> }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Crown className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to{' '}
              <span className="text-primary-600">Chess.com Clone</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The ultimate chess platform where strategy meets community. 
              Play, learn, and compete with players from around the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/game/new"
                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Play Now
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    View Leaderboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Get Started
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Chess.com Clone?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the best chess platform with cutting-edge features designed for players of all levels.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Chess Journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of players and experience the thrill of competitive chess.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors"
            >
              <Crown className="w-5 h-5 mr-2" />
              Create Free Account
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Crown className="w-8 h-8 text-primary-400 mr-2" />
                <span className="text-xl font-bold">Chess.com Clone</span>
              </div>
              <p className="text-gray-400">
                The ultimate chess platform for players of all levels.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Play</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/game/new" className="hover:text-white transition-colors">Quick Play</Link></li>
                <li><Link to="/tournaments" className="hover:text-white transition-colors">Tournaments</Link></li>
                <li><Link to="/practice" className="hover:text-white transition-colors">Practice</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
                <li><Link to="/forums" className="hover:text-white transition-colors">Forums</Link></li>
                <li><Link to="/clubs" className="hover:text-white transition-colors">Clubs</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Chess.com Clone. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home 