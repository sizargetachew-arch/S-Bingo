// Telegram Web App Setup
const tg = window.Telegram.WebApp;
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
let currentGame = null;

// Expand the app to fullscreen
tg.expand();

// Initialize on page load
window.addEventListener('load', async () => {
  try {
    // Check if user is already authenticated
    if (authToken) {
      await loadUserProfile();
      await loadRooms();
    } else {
      // Authenticate with Telegram
      await authenticateWithTelegram();
    }
  } catch (error) {
    showError('فشل التهيئة: ' + error.message);
  }
});

// ==================== AUTHENTICATION ====================

async function authenticateWithTelegram() {
  try {
    document.getElementById('loading').style.display = 'flex';
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData })
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);
    
    authToken = data.token;
    currentUser = data.user;
    
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    updateUserDisplay();
    await loadRooms();
  } catch (error) {
    showError('Authentication failed: ' + error.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// ==================== USER PROFILE ====================

async function loadUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);
    
    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUserDisplay();
  } catch (error) {
    console.error('Failed to load profile:', error);
  }
}

function updateUserDisplay() {
  document.getElementById('user-name').innerText = 'ሰላም ' + (currentUser.firstName || 'User') + '!';
  document.getElementById('wallet-balance').innerText = 
    (currentUser.balance || 2350).toLocaleString() + ' ETB';
  document.getElementById('games-played').innerText = 
    (currentUser.totalGamesPlayed || 0) + ' ጋሞች';
}

// ==================== ROOMS ====================

async function loadRooms() {
  try {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('rooms-container').style.display = 'none';
    
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);
    
    displayRooms(data.rooms);
  } catch (error) {
    showError('Failed to load rooms: ' + error.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('rooms-container').style.display = 'block';
  }
}

function displayRooms(rooms) {
  const container = document.getElementById('rooms-list');
  container.innerHTML = '';
  
  rooms.forEach(room => {
    const roomEl = document.createElement('div');
    roomEl.className = 'room-card';
    roomEl.innerHTML = `
      <div class="room-info-text">
        <p class="room-title">${room.name}</p>
        <p class="room-info">መግቢያ: ${room.entryFee} ETB | ሽልማት: ${room.prizePool} ETB</p>
        <div class="room-occupancy">
          ተጠቃሚዎች: ${room.currentPlayers}/${room.maxPlayers} (${room.occupancyPercentage}%)
        </div>
      </div>
      <button class="btn-join" onclick="joinRoom('${room.id}', '${room.name}', ${room.entryFee})">
        ተቀላቀል
      </button>
    `;
    container.appendChild(roomEl);
  });
}

// ==================== JOINING ROOMS ====================

async function joinRoom(roomId, roomName, entryFee) {
  try {
    // Check balance first
    if (currentUser.balance < entryFee) {
      tg.showPopup({
        title: 'ባለ ሂሳብ ነጋ',
        message: `ሂሳቡ በቂ ነው:: ${entryFee} ETB ያስፈልግዎታል፤ ግን ${currentUser.balance} ETB ብቻ ነበር።`,
        buttons: [{ type: 'ok', text: 'እሺ' }]
      });
      return;
    }
    
    // Show confirmation popup
    tg.showPopup({
      title: 'የክፍል ተሳትፎ',
      message: `${roomName} ለመግባት ${entryFee} ETB ይቆረጣል፤ እርግጠኛ ነዎት?`,
      buttons: [
        { type: 'ok', text: 'እሺ', id: 'join-confirm' },
        { type: 'cancel', text: 'አይ', id: 'join-cancel' }
      ]
    }, (id) => {
      if (id === 'join-confirm') {
        proceedJoining(roomId, roomName, entryFee);
      }
    });
  } catch (error) {
    showError('Error: ' + error.message);
  }
}

async function proceedJoining(roomId, roomName, entryFee) {
  try {
    document.getElementById('loading').style.display = 'flex';
    
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to join room');
    }
    
    // Update balance
    currentUser.balance = data.updatedBalance;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUserDisplay();
    
    // Store game info
    currentGame = data.gameRoom;
    
    // Show success popup
    tg.showPopup({
      title: 'ስኬት!',
      message: `በ${roomName} ውስጥ በተሳፍረዋል! ጋሙ #${data.gameRoom.gameNumber}`,
      buttons: [{ type: 'ok', text: 'ጊዬ ጀምር' }]
    }, () => {
      showGameView(data.gameRoom);
    });
  } catch (error) {
    showError('Join failed: ' + error.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// ==================== GAME VIEW ====================

function showGameView(gameRoom) {
  document.getElementById('rooms-container').style.display = 'none';
  document.getElementById('game-view').style.display = 'block';
  
  document.getElementById('game-room-name').innerText = gameRoom.roomName;
  document.getElementById('game-number').innerText = gameRoom.gameNumber;
  document.getElementById('game-status').innerText = `ሂሳብ: ${gameRoom.prizePool} ETB`;
  
  // Display bingo card
  const bingoCard = document.getElementById('bingo-card');
  bingoCard.innerHTML = '';
  
  // Create 5x5 grid
  for (let i = 0; i < 25; i++) {
    const numberEl = document.createElement('div');
    numberEl.className = 'bingo-number';
    
    // Free space in center
    if (i === 12) {
      numberEl.classList.add('free');
      numberEl.innerText = 'ነጻ';
    } else if (gameRoom.numbers && gameRoom.numbers[i]) {
      numberEl.innerText = gameRoom.numbers[i];
      numberEl.onclick = () => toggleNumber(numberEl);
    }
    
    bingoCard.appendChild(numberEl);
  }
}

function toggleNumber(element) {
  element.classList.toggle('selected');
}

function backToRooms() {
  document.getElementById('game-view').style.display = 'none';
  document.getElementById('rooms-container').style.display = 'block';
}

async function leaveGame() {
  if (!currentGame) return;
  
  try {
    document.getElementById('loading').style.display = 'flex';
    
    const response = await fetch(
      `${API_BASE_URL}/rooms/${currentGame.roomId}/leave`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ gameRoomId: currentGame.gameRoomId })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);
    
    currentGame = null;
    await loadUserProfile();
    backToRooms();
    await loadRooms();
  } catch (error) {
    showError('Leave failed: ' + error.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// ==================== UTILITIES ====================

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.innerText = message;
  errorEl.classList.add('show');
  
  setTimeout(() => {
    errorEl.classList.remove('show');
  }, 5000);
}