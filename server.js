const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory database (replace with MongoDB/PostgreSQL in production)
const users = new Map();
const rooms = new Map();
const gameRooms = new Map();
const transactions = [];

// Initialize game rooms
const initializeRooms = () => {
  rooms.set('Room A', {
    id: 'room-a',
    name: 'Room A (ቀጥታ)',
    entryFee: 100,
    prizePool: 2500,
    maxPlayers: 50,
    currentPlayers: 0,
    status: 'active',
    createdAt: new Date()
  });
  
  rooms.set('Room B', {
    id: 'room-b',
    name: 'Room B (ቀጥታ)',
    entryFee: 200,
    prizePool: 5000,
    maxPlayers: 50,
    currentPlayers: 0,
    status: 'active',
    createdAt: new Date()
  });
};

initializeRooms();

// Middleware to verify Telegram Web App data
const verifyTelegramData = (req, res, next) => {
  const initData = req.body.initData;
  if (!initData) {
    return res.status(401).json({ error: 'Missing initData' });
  }
  
  // In production, verify the signature using TELEGRAM_BOT_TOKEN
  try {
    const params = new URLSearchParams(initData);
    const userData = JSON.parse(params.get('user'));
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid initData' });
  }
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    req.telegramId = decoded.telegramId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== AUTHENTICATION ====================

// Register/Login user with Telegram Web App
app.post('/api/auth/login', verifyTelegramData, (req, res) => {
  const telegramUser = req.user;
  const telegramId = telegramUser.id.toString();
  
  let user = users.get(telegramId);
  
  if (!user) {
    // New user
    user = {
      id: uuidv4(),
      telegramId: telegramId,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name || '',
      username: telegramUser.username || '',
      balance: 2350, // Starting balance in ETB
      joinedAt: new Date(),
      gameHistory: []
    };
    users.set(telegramId, user);
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, telegramId: user.telegramId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      balance: user.balance
    }
  });
});

// ==================== WALLET & USER ====================

// Get user profile and wallet
app.get('/api/user/profile', verifyToken, (req, res) => {
  let user = null;
  for (const [, u] of users) {
    if (u.id === req.userId) {
      user = u;
      break;
    }
  }
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      balance: user.balance,
      joinedAt: user.joinedAt,
      totalGamesPlayed: user.gameHistory.length
    }
  });
});

// ==================== ROOMS ====================

// Get all available rooms
app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    entryFee: room.entryFee,
    prizePool: room.prizePool,
    maxPlayers: room.maxPlayers,
    currentPlayers: room.currentPlayers,
    status: room.status,
    occupancyPercentage: Math.round((room.currentPlayers / room.maxPlayers) * 100)
  }));
  
  res.json({
    success: true,
    rooms: roomsList
  });
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    success: true,
    room: {
      id: room.id,
      name: room.name,
      entryFee: room.entryFee,
      prizePool: room.prizePool,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.currentPlayers,
      status: room.status,
      players: Array.from(gameRooms.values())
        .filter(gr => gr.roomId === req.params.roomId)
        .map(gr => ({
          userId: gr.userId,
          userName: gr.userName,
          joinedAt: gr.joinedAt
        }))
    }
  });
});

// ==================== JOINING ROOMS ====================

// Join a room
app.post('/api/rooms/:roomId/join', verifyToken, (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId) || 
               Array.from(rooms.values()).find(r => r.id === roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  // Find user
  let user = null;
  for (const [, u] of users) {
    if (u.id === req.userId) {
      user = u;
      break;
    }
  }
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Check if room is full
  if (room.currentPlayers >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room is full' });
  }
  
  // Check if user has enough balance
  if (user.balance < room.entryFee) {
    return res.status(400).json({ 
      error: 'Insufficient balance',
      required: room.entryFee,
      available: user.balance
    });
  }
  
  // Check if user already in this room
  const alreadyInRoom = Array.from(gameRooms.values()).some(
    gr => gr.userId === user.id && gr.roomId === room.id && gr.status === 'active'
  );
  
  if (alreadyInRoom) {
    return res.status(400).json({ error: 'Already joined this room' });
  }
  
  // Deduct entry fee
  user.balance -= room.entryFee;
  
  // Create game room entry
  const gameRoomId = uuidv4();
  const gameRoomEntry = {
    id: gameRoomId,
    userId: user.id,
    userName: user.firstName,
    roomId: room.id,
    roomName: room.name,
    entryFee: room.entryFee,
    status: 'active',
    joinedAt: new Date(),
    gameNumber: uuidv4().substring(0, 8).toUpperCase(),
    numbers: generateBingoNumbers() // Generate random bingo numbers for user
  };
  
  gameRooms.set(gameRoomId, gameRoomEntry);
  room.currentPlayers++;
  
  // Record transaction
  transactions.push({
    id: uuidv4(),
    userId: user.id,
    type: 'entry_fee',
    amount: room.entryFee,
    roomId: room.id,
    gameRoomId: gameRoomId,
    status: 'completed',
    timestamp: new Date()
  });
  
  // Add to game history
  user.gameHistory.push({
    roomId: room.id,
    gameRoomId: gameRoomId,
    entryFee: room.entryFee,
    status: 'active',
    joinedAt: new Date()
  });
  
  res.json({
    success: true,
    message: 'Successfully joined room',
    gameRoom: {
      gameRoomId: gameRoomId,
      roomId: room.id,
      roomName: room.name,
      gameNumber: gameRoomEntry.gameNumber,
      entryFee: room.entryFee,
      prizePool: room.prizePool,
      joinedAt: gameRoomEntry.joinedAt,
      numbers: gameRoomEntry.numbers
    },
    updatedBalance: user.balance
  });
});

// Leave a room
app.post('/api/rooms/:roomId/leave', verifyToken, (req, res) => {
  const { gameRoomId } = req.body;
  
  const gameRoom = gameRooms.get(gameRoomId);
  if (!gameRoom) {
    return res.status(404).json({ error: 'Game session not found' });
  }
  
  if (gameRoom.userId !== req.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Find user
  let user = null;
  for (const [, u] of users) {
    if (u.id === req.userId) {
      user = u;
      break;
    }
  }
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Find room
  const room = Array.from(rooms.values()).find(r => r.id === gameRoom.roomId);
  
  gameRoom.status = 'left';
  room.currentPlayers = Math.max(0, room.currentPlayers - 1);
  
  res.json({
    success: true,
    message: 'Successfully left room',
    updatedBalance: user.balance
  });
});

// ==================== GAME STATE ====================

// Get current game room state
app.get('/api/game/:gameRoomId', verifyToken, (req, res) => {
  const gameRoom = gameRooms.get(req.params.gameRoomId);
  
  if (!gameRoom) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (gameRoom.userId !== req.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.json({
    success: true,
    game: {
      gameRoomId: gameRoom.id,
      gameNumber: gameRoom.gameNumber,
      roomName: gameRoom.roomName,
      status: gameRoom.status,
      numbers: gameRoom.numbers,
      entryFee: gameRoom.entryFee,
      joinedAt: gameRoom.joinedAt
    }
  });
});

// ==================== TRANSACTIONS ====================

// Get user transaction history
app.get('/api/transactions', verifyToken, (req, res) => {
  const userTransactions = transactions.filter(t => {
    let found = false;
    for (const [, u] of users) {
      if (u.id === req.userId && t.userId === u.id) {
        found = true;
        break;
      }
    }
    return found;
  });
  
  res.json({
    success: true,
    transactions: userTransactions
  });
});

// ==================== HELPER FUNCTIONS ====================

function generateBingoNumbers() {
  // Generate 25 random numbers (5x5 bingo card)
  const numbers = new Set();
  while (numbers.size < 25) {
    numbers.add(Math.floor(Math.random() * 90) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== SERVER ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;