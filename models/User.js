const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [30, 'First name cannot exceed 30 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [30, 'Last name cannot exceed 30 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [50, 'Country name cannot exceed 50 characters']
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    title: {
      type: String,
      enum: ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM', null],
      default: null
    }
  },
  rating: {
    blitz: { type: Number, default: 1200 },
    rapid: { type: Number, default: 1200 },
    classical: { type: Number, default: 1200 },
    bullet: { type: Number, default: 1200 }
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesDrawn: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    bestRating: {
      blitz: { type: Number, default: 1200 },
      rapid: { type: Number, default: 1200 },
      classical: { type: Number, default: 1200 },
      bullet: { type: Number, default: 1200 }
    },
    totalPlayTime: { type: Number, default: 0 }, // in minutes
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  },
  preferences: {
    theme: { type: String, default: 'default' },
    soundEnabled: { type: Boolean, default: true },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    timeControl: {
      blitz: { type: Number, default: 300 }, // 5 minutes
      rapid: { type: Number, default: 900 }, // 15 minutes
      classical: { type: Number, default: 1800 } // 30 minutes
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

// Virtual for total rating
userSchema.virtual('rating.average').get(function() {
  const ratings = [this.rating.blitz, this.rating.rapid, this.rating.classical, this.rating.bullet];
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'rating.blitz': -1 });
userSchema.index({ 'rating.rapid': -1 });
userSchema.index({ 'rating.classical': -1 });
userSchema.index({ 'rating.bullet': -1 });
userSchema.index({ 'stats.gamesPlayed': -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update win rate
userSchema.pre('save', function(next) {
  if (this.stats.gamesPlayed > 0) {
    this.stats.winRate = Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update rating
userSchema.methods.updateRating = function(timeControl, newRating) {
  this.rating[timeControl] = newRating;
  
  // Update best rating if current rating is higher
  if (newRating > this.stats.bestRating[timeControl]) {
    this.stats.bestRating[timeControl] = newRating;
  }
  
  return this.save();
};

// Method to update stats after game
userSchema.methods.updateGameStats = function(result, timeControl, gameDuration) {
  this.stats.gamesPlayed += 1;
  this.stats.totalPlayTime += gameDuration || 0;
  
  switch (result) {
    case 'win':
      this.stats.gamesWon += 1;
      this.stats.currentStreak = Math.max(0, this.stats.currentStreak) + 1;
      break;
    case 'draw':
      this.stats.gamesDrawn += 1;
      this.stats.currentStreak = 0;
      break;
    case 'loss':
      this.stats.gamesLost += 1;
      this.stats.currentStreak = Math.min(0, this.stats.currentStreak) - 1;
      break;
  }
  
  // Update longest streak
  if (Math.abs(this.stats.currentStreak) > Math.abs(this.stats.longestStreak)) {
    this.stats.longestStreak = this.stats.currentStreak;
  }
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 