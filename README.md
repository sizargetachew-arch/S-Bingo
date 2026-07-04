# S Bingo Professional - Backend Integration

A complete Telegram Mini App for an online bingo game platform with real room joining, payment processing, and game state management.

## Features

✅ **Telegram Web App Integration**
- Seamless authentication using Telegram Web App data
- JWT token-based session management

✅ **Room Management**
- View live gaming rooms
- Join/leave rooms with automatic balance deduction
- Real-time player occupancy tracking

✅ **Payment Processing**
- Entry fee deduction from user balance
- Transaction history tracking
- Insufficient balance validation

✅ **Game State Management**
- Unique game numbers for each session
- Bingo card generation with random numbers
- Player number selection tracking
- Multi-game support

✅ **User Management**
- User profile with wallet balance
- Game history tracking
- Transaction records

## Architecture

```
S-Bingo/
├── server.js              # Express backend server
├── package.json           # Node dependencies
├── .env.example           # Environment variables template
├── frontend/
│   ├── index.html         # Main UI
│   ├── styles.css         # Styling
│   └── app.js             # Client-side logic
└── README.md              # Documentation
```

## Setup Instructions

### Backend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
   Update with your values:
   ```
   PORT=5000
   JWT_SECRET=your-very-secret-key
   TELEGRAM_BOT_TOKEN=your_bot_token
   ```

3. **Start the server:**
   ```bash
   npm start        # Production
   npm run dev      # Development with auto-reload
   ```

### Frontend Setup

1. **Serve the frontend files:**
   ```bash
   # Using Python
   python -m http.server 3000 --directory frontend
   
   # Or using Node
   npx http-server frontend -p 3000
   ```

2. **Update API URL in `frontend/app.js` if needed:**
   ```javascript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```

## API Endpoints

### Authentication

**POST** `/api/auth/login`
- Authenticate user with Telegram Web App data
- Returns: JWT token and user info

### User

**GET** `/api/user/profile` (requires auth)
- Get user profile and wallet information

### Rooms

**GET** `/api/rooms`
- List all available game rooms

**GET** `/api/rooms/:roomId`
- Get specific room details and current players

**POST** `/api/rooms/:roomId/join` (requires auth)
- Join a room (deducts entry fee)
- Returns: Game session details

**POST** `/api/rooms/:roomId/leave` (requires auth)
- Leave an active game room

### Game

**GET** `/api/game/:gameRoomId` (requires auth)
- Get current game state and numbers

### Transactions

**GET** `/api/transactions` (requires auth)
- Get user transaction history

## Game Flow

1. **User authenticates** via Telegram Web App
2. **Loads available rooms** with entry fees and prize pools
3. **Joins a room**
   - Balance is checked
   - Entry fee is deducted
   - Bingo card is generated
   - Game room is created
4. **Plays the game**
   - Selects numbers on bingo card
   - Can view game details
5. **Leaves the game**
   - Game room status updated
   - Returns to room list

## Key Components

### Backend (server.js)

- **Telegram Verification Middleware**: Validates Web App data
- **JWT Authentication**: Protects sensitive endpoints
- **User Management**: Creates and updates user profiles
- **Room Management**: Handles room creation and player tracking
- **Transaction System**: Records all financial transactions

### Frontend (app.js)

- **Telegram Integration**: Initializes Web App and requests user data
- **API Communication**: Fetches rooms and handles game logic
- **Local Storage**: Caches auth token and user info
- **UI State Management**: Switches between room list and game views

## Database Schema (Future)

When migrating to a real database, use these tables:

```sql
-- Users
users: id, telegramId, firstName, lastName, username, balance, joinedAt, gameHistory

-- Game Rooms
rooms: id, name, entryFee, prizePool, maxPlayers, currentPlayers, status

-- Game Sessions
game_rooms: id, userId, roomId, status, joinedAt, numbers

-- Transactions
transactions: id, userId, type, amount, roomId, gameRoomId, status, timestamp
```

## Security Considerations

⚠️ **For Production:**

1. **Verify Telegram signature** in `verifyTelegramData` middleware
2. **Use database** instead of in-memory storage
3. **Implement rate limiting** to prevent abuse
4. **Use HTTPS** for all API calls
5. **Store sensitive data** in environment variables
6. **Validate all inputs** on the backend
7. **Implement payment gateway** integration (Stripe, PayPal, etc.)
8. **Add audit logging** for all transactions
9. **Use database transactions** for payment processing
10. **Implement fraud detection** system

## Testing

```bash
# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"initData":"..."}'

# Test room listing
curl http://localhost:5000/api/rooms \
  -H "Authorization: Bearer <token>"

# Test joining room
curl -X POST http://localhost:5000/api/rooms/room-a/join \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_BOT_USERNAME=YourBotUsername

# Database (future)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sbingo_db
DB_USER=postgres
DB_PASSWORD=password
```

## Troubleshooting

### CORS Errors
- Ensure frontend and backend are on different ports
- Check `FRONTEND_URL` environment variable

### Authentication Failed
- Verify Telegram Web App is properly initialized
- Check `initData` is being sent correctly

### Balance Issues
- Ensure user has sufficient balance before joining
- Check transaction records for deductions

## License

LGPL-2.1

## Support

For issues and feature requests, please create a GitHub issue.
