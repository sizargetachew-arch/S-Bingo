const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sbingo', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  firstName: String,
  lastName: String,
  username: String,
  balance: {
    type: Number,
    default: 2350
  },
  totalWinnings: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  gameHistory: [{
    gameRoomId: String,
    roomId: String,
    entryFee: Number,
    prizeWon: Number,
    status: String,
    joinedAt: Date,
    result: String
  }],
  lastActive: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Room Schema
const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  entryFee: {
    type: Number,
    required: true
  },
  prizePool: {
    type: Number,
    required: true
  },
  maxPlayers: {
    type: Number,
    default: 50
  },
  currentPlayers: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

// Game Room Schema (Active game sessions)
const gameRoomSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  gameNumber: String,
  numbers: [Number],
  selectedNumbers: [Number],
  status: {
    type: String,
    enum: ['active', 'won', 'left', 'cancelled'],
    default: 'active'
  },
  entryFee: Number,
  prizeWon: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: Date,
  wonAt: Date
}, { timestamps: true });

const GameRoom = mongoose.model('GameRoom', gameRoomSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['entry_fee', 'deposit', 'withdrawal', 'prize', 'refund', 'bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  roomId: mongoose.Schema.Types.ObjectId,
  gameRoomId: mongoose.Schema.Types.ObjectId,
  paymentMethod: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentGatewayId: String,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

// Leaderboard Schema
const leaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  wins: {
    type: Number,
    default: 0
  },
  totalGames: {
    type: Number,
    default: 0
  },
  totalWinnings: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  winRate: Number,
  averageWinning: Number,
  rank: Number,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// Payment Gateway Schema
const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  gateway: {
    type: String,
    enum: ['stripe', 'paypal', 'chapa', 'telebirr'],
    required: true
  },
  gatewayTransactionId: String,
  amount: Number,
  currency: {
    type: String,
    default: 'ETB'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentUrl: String,
  webhookData: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = {
  connectDB,
  User,
  Room,
  GameRoom,
  Transaction,
  Leaderboard,
  Payment
};