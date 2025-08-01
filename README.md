# Chess.com Clone Backend

A comprehensive, production-ready backend API for a Chess.com clone built with Node.js, Express, MongoDB, and Socket.io. This backend provides all the essential features needed for a modern chess platform including real-time gameplay, user management, rating systems, and more.

## 🚀 Features

### Core Features
- **User Authentication & Management**
  - JWT-based authentication
  - User registration and login
  - Password hashing with bcrypt
  - Role-based access control (user, admin, moderator)
  - Profile management with avatars and titles

- **Real-Time Chess Gameplay**
  - WebSocket-based real-time gameplay
  - Live board synchronization
  - Move validation using chess.js
  - Game state management (waiting, playing, draw, win/loss)
  - In-game chat system
  - Spectator mode
  - Draw offers and resignations

- **Rating System**
  - ELO rating system implementation
  - Support for multiple time controls (blitz, rapid, classical, bullet)
  - Rating history tracking
  - Provisional ratings for new players
  - K-factor adjustments based on rating and games played

- **Game Management**
  - Create and join games
  - Multiple time controls
  - Rated and unrated games
  - Game history and statistics
  - PGN and FEN support
  - Move replay functionality

- **Leaderboards & Statistics**
  - Global and country-specific leaderboards
  - Player statistics and achievements
  - Rating distribution analysis
  - Recent activity feed
  - Performance tracking

- **Admin Features**
  - User management
  - Game moderation
  - System statistics
  - Content moderation

## 🛠️ Tech Stack

- **Backend Framework**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Real-time Communication**: Socket.io
- **Authentication**: JWT + bcrypt
- **Chess Logic**: chess.js
- **Validation**: express-validator
- **Security**: helmet, cors, rate-limiting
- **File Upload**: multer

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chess-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/chess-clone
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRE=7d
   ```

4. **Start MongoDB**
   ```bash
   # If using MongoDB locally
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "chessplayer",
  "email": "player@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "country": "United States"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Game Endpoints

#### Create Game
```http
POST /api/games
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameType": "rapid",
  "timeControl": 900,
  "increment": 0,
  "rated": true,
  "allowSpectators": true,
  "allowChat": true
}
```

#### Join Game
```http
POST /api/games/:gameId/join
Authorization: Bearer <token>
```

#### Make Move
```http
POST /api/games/:gameId/move
Authorization: Bearer <token>
Content-Type: application/json

{
  "from": "e2",
  "to": "e4",
  "promotion": null
}
```

#### Get Game
```http
GET /api/games/:gameId
```

### User Endpoints

#### Get Users
```http
GET /api/users?page=1&limit=10&search=player&country=US
```

#### Get User Profile
```http
GET /api/users/:userId/profile
```

#### Get User Statistics
```http
GET /api/users/:userId/stats?gameType=rapid
```

### Leaderboard Endpoints

#### Global Leaderboard
```http
GET /api/leaderboard?gameType=rapid&limit=100&page=1
```

#### Country Leaderboard
```http
GET /api/leaderboard/country/US?gameType=rapid
```

#### Top Players
```http
GET /api/leaderboard/top?criteria=rating&gameType=rapid&limit=10
```

## 🔌 WebSocket Events

### Client to Server Events

#### Join Game
```javascript
socket.emit('join_game', { gameId: 'game-uuid' });
```

#### Make Move
```javascript
socket.emit('make_move', {
  gameId: 'game-uuid',
  from: 'e2',
  to: 'e4',
  promotion: null
});
```

#### Send Chat Message
```javascript
socket.emit('chat_message', {
  gameId: 'game-uuid',
  message: 'Good move!'
});
```

#### Resign Game
```javascript
socket.emit('resign_game', { gameId: 'game-uuid' });
```

#### Offer Draw
```javascript
socket.emit('offer_draw', { gameId: 'game-uuid' });
```

### Server to Client Events

#### Game Joined
```javascript
socket.on('game_joined', (data) => {
  console.log('Joined game:', data.game);
  console.log('Is player:', data.isPlayer);
  console.log('Is spectator:', data.isSpectator);
});
```

#### Move Made
```javascript
socket.on('move_made', (data) => {
  console.log('Move:', data.move);
  console.log('Game state:', data.game);
  console.log('Game over:', data.isGameOver);
});
```

#### Chat Message
```javascript
socket.on('chat_message', (data) => {
  console.log(`${data.user.username}: ${data.message}`);
});
```

#### Game Resigned
```javascript
socket.on('game_resigned', (data) => {
  console.log('Game resigned by:', data.resignedBy);
  console.log('Final game state:', data.game);
});
```

## 🏗️ Project Structure

```
chess-backend/
├── config/
│   └── db.js                 # Database configuration
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── userController.js     # User management
│   ├── gameController.js     # Game logic
│   └── leaderboardController.js # Leaderboards
├── models/
│   ├── User.js              # User schema
│   ├── Game.js              # Game schema
│   └── RatingHistory.js     # Rating history schema
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── userRoutes.js        # User endpoints
│   ├── gameRoutes.js        # Game endpoints
│   └── leaderboardRoutes.js # Leaderboard endpoints
├── sockets/
│   └── gameSocket.js        # WebSocket handlers
├── utils/
│   ├── eloSystem.js         # ELO rating calculations
│   └── moveValidator.js     # Chess move validation
├── middleware/
│   ├── authMiddleware.js    # Authentication middleware
│   └── errorHandler.js      # Error handling
├── server.js                # Main server file
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/chess-clone |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration | 7d |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### Game Types

- **Blitz**: 3-5 minutes per player
- **Rapid**: 10-15 minutes per player  
- **Classical**: 30+ minutes per player
- **Bullet**: 1-2 minutes per player

### Rating System

The ELO rating system uses different K-factors based on:
- **Provisional players** (< 30 games): Higher K-factor for faster rating stabilization
- **Regular players** (30+ games): Standard K-factor
- **High-rated players** (2400+): Lower K-factor for stability

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-production-secret
   ```

2. **Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name chess-backend
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers
- **SQL Injection Protection**: MongoDB with parameterized queries
- **XSS Protection**: Input sanitization and output encoding

## 📊 Performance Features

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis integration ready
- **Compression**: Response compression
- **Rate Limiting**: Prevents server overload
- **Error Handling**: Graceful error management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the WebSocket event documentation

## 🔮 Future Enhancements

- [ ] Tournament system
- [ ] AI bot integration
- [ ] Puzzle mode
- [ ] Analysis tools
- [ ] Mobile app support
- [ ] Video streaming
- [ ] Advanced matchmaking
- [ ] Team features
- [ ] Coaching system
- [ ] Premium features

---

**Built with ❤️ for the chess community** 