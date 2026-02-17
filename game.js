/* ============================================================
   THOUSANAIRE GAME - COMPLETE FIXED VERSION (Feb 16, 2026)
   ============================================================
   ✅ BULLETPROOF INTRO OVERLAY (Voice + Skip/Enter work everywhere)
   ✅ DICE ANIMATION FIXED (Working dice visuals)
   ✅ MODE BUTTON MOVED next to Join Game
   ✅ Mobile/Desktop compatible
   ============================================================ */

let gameMode = 'classic';
let players = [];          
let chips = [0, 0, 0, 0];
let centerPot = 0;
let dealerPot = 0;
let rageMeter = 0;
let currentPlayer = 0;
let eliminated = [false, false, false, false];
let danger = [false, false, false, false];
let gameStarted = false;
let idleDiceInterval;

const logicalPositions = ["top", "right", "bottom", "left"];
let domSeatForLogical = [0, 1, 2, 3];
let playerAvatars = [null, null, null, null];
let playerColors = [null, null, null, null];

/* ============================================================
   BULLETPROOF INTRO OVERLAY (Voice starts on FIRST tap)
   ============================================================ */
function startIntroOverlay() {
  console.log('🔥 Starting intro overlay');
  
  const overlay = document.getElementById("introOverlay");
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");
  const voice = document.getElementById("introVoice");
  
  if (!overlay || !skipBtn || !enterBtn || !voice) {
    console.error('❌ MISSING INTRO ELEMENTS');
    if (overlay) overlay.style.display = "none";
    return;
  }

  overlay.style.display = "flex";
  
  function endIntro() {
    console.log('✅ Ending intro');
    overlay.style.display = "none";
    voice.pause();
    voice.currentTime = 0;
  }

  [skipBtn, enterBtn].forEach(btn => btn.onclick = endIntro);
  overlay.addEventListener('click', endIntro, { once: true });
  
  let voiceStarted = false;
  function playVoiceOnTap() {
    if (voiceStarted) return;
    voiceStarted = true;
    voice.play().catch(e => console.log('Voice blocked:', e));
  }
  overlay.addEventListener('click', playVoiceOnTap, { once: true });
}

/* ============================================================
   FIXED DICE FUNCTIONS (Now WORKING)
   ============================================================ */
function rollDie() {
  const sides = ["Left", "Right", "Hub", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

function animateDice(outcomes) {
  const diceContainer = document.getElementById('diceContainer');
  if (!diceContainer) return;
  
  // Rolling animation
  diceContainer.classList.add('rolling');
  
  // Simulate dice rolling for 1 second
  setTimeout(() => {
    diceContainer.classList.remove('rolling');
    renderDice(outcomes);
  }, 1000);
}

function renderDice(outcomes) {
  const diceContainer = document.getElementById('diceContainer');
  if (!diceContainer) return;
  
  diceContainer.innerHTML = '';
  
  outcomes.forEach((outcome, index) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.dataset.outcome = outcome;
    
    // Visual representation of each outcome
    const visuals = {
      'Left': '←', 'Right': '→', 'Hub': '●', 'Dottt': '⚀', 'Wild': '⭐'
    };
    die.textContent = visuals[outcome] || '?';
    
    diceContainer.appendChild(die);
  });
}

function showRandomDice() {
  const diceContainer = document.getElementById('diceContainer');
  if (!diceContainer) return;
  
  const randomOutcomes = [rollDie(), rollDie()];
  renderDice(randomOutcomes);
}

/* ============================================================
   JOIN & MODE BUTTONS (SIDE BY SIDE)
   ============================================================ */
function setupJoinAndModeButtons() {
  // JOIN BUTTON
  const joinBtn = document.getElementById("joinBtn");
  if (joinBtn) {
    joinBtn.addEventListener("click", () => {
      const nameInput = document.getElementById("nameInput");
      if (!nameInput || !nameInput.value.trim()) {
        alert('Please enter your name');
        return;
      }

      const name = nameInput.value.trim();
      let logicalSeat = players.findIndex(p => !p);
      if (logicalSeat >= 4) return;

      players[logicalSeat] = name;
      chips[logicalSeat] = gameMode === 'dealer' ? 5 : 3;
      eliminated[logicalSeat] = false;
      danger[logicalSeat] = false;

      nameInput.value = "";
      updateTable();
      highlightCurrentPlayer();

      if (idleDiceInterval) {
        clearInterval(idleDiceInterval);
        idleDiceInterval = null;
      }
    });
  }

  // MODE BUTTON (Next to Join)
  const modeBtn = document.getElementById('modeSwitchBtn');
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      gameMode = gameMode === 'classic' ? 'dealer' : 'classic';
      modeBtn.textContent = gameMode === 'classic' ? 'Dealer Mode' : 'Classic Mode';
      
      const titleEl = document.getElementById('gameModeTitle');
      if (titleEl) {
        titleEl.textContent = `GAME BOARD (${gameMode.toUpperCase()} Mode)`;
      }
      
      resetGame();
      console.log('Switched to', gameMode, 'mode');
    });
  }
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function initSeatMapping() {
  const playerDivs = document.querySelectorAll(".player");
  logicalPositions.forEach((pos, logicalIndex) => {
    playerDivs.forEach((div, domIndex) => {
      if (div.classList.contains(pos)) {
        domSeatForLogical[logicalIndex] = domIndex;
      }
    });
  });
}

function playSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

function getLeftSeatIndex(seat) {
  let idx = seat;
  for (let i = 0; i < 4; i++) {
    idx = (idx + 1) % 4;
    if (players[idx] && !eliminated[idx]) return idx;
  }
  return seat;
}

function getRightSeatIndex(seat) {
  let idx = seat;
  for (let i = 0; i < 4; i++) {
    idx = (idx - 1 + 4) % 4;
    if (players[idx] && !eliminated[idx]) return idx;
  }
  return seat;
}

function activePlayerCount() {
  return players.filter((p, i) => p && !eliminated[i]).length;
}

function nextTurn() {
  let attempts = 0;
  let next = currentPlayer;
  while (attempts < 10) {
    next = (next + 1) % 4;
    attempts++;
    if (players[next] && !eliminated[next] && chips[next] > 0) break;
  }
  currentPlayer = next;
  highlightCurrentPlayer();
}

function handleEndOfTurn() {
  const activeCount = activePlayerCount();
  if (activeCount <= 1) {
    setTimeout(() => showGameOver(0), 2000);
  } else {
    nextTurn();
  }
}

/* ============================================================
   DISPLAY FUNCTIONS
   ============================================================ */
function updateTable() {
  for (let logicalSeat = 0; logicalSeat < 4; logicalSeat++) {
    const domIndex = domSeatForLogical[logicalSeat];
    const playerDiv = document.getElementById("player" + domIndex);
    if (!playerDiv) continue;

    const name = players[logicalSeat];
    const chipCount = chips[logicalSeat] ?? 0;

    const nameDiv = playerDiv.querySelector(".name");
    const chipsDiv = playerDiv.querySelector(".chips");

    playerDiv.classList.remove("eliminated", "active");

    if (!name) {
      if (nameDiv) nameDiv.textContent = "";
      if (chipsDiv) chipsDiv.textContent = "";
      continue;
    }

    if (nameDiv) nameDiv.textContent = name;
    if (chipsDiv) chipsDiv.textContent = `Chips: ${chipCount}`;
    
    if (eliminated[logicalSeat]) {
      playerDiv.classList.add("eliminated");
      chipsDiv.textContent = "Eliminated";
    }
  }
  highlightCurrentPlayer();
}

function highlightCurrentPlayer() {
  for (let i = 0; i < 4; i++) {
    const domIndex = domSeatForLogical[i];
    const playerDiv = document.getElementById("player" + domIndex);
    if (playerDiv) {
      playerDiv.classList.toggle("active", i === currentPlayer && players[i]);
    }
  }
}

function updateDisplays() {
  updateTable();
}

function showGameOver(winnerIndex) {
  const overlay = document.getElementById("gameOverOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  playSound("sndWin");
}

function resetGame() {
  players = [];
  chips = [0, 0, 0, 0];
  centerPot = 0;
  dealerPot = 0;
  rageMeter = 0;
  eliminated = [false, false, false, false];
  currentPlayer = 0;
  gameStarted = false;
  updateDisplays();
}

/* ============================================================
   ROLL BUTTON (SIMPLIFIED)
   ============================================================ */
function setupRollButton() {
  const rollBtn = document.getElementById("rollBtn");
  if (!rollBtn) return;

  rollBtn.addEventListener("click", () => {
    const resultsEl = document.getElementById("results");
    if (!resultsEl) return;

    if (activePlayerCount() < 4) {
      resultsEl.innerText = "Need 4 players to start!";
      return;
    }

    playSound("sndRoll");
    
    let numDice = Math.min(chips[currentPlayer], 3);
    let outcomes = [];
    for (let i = 0; i < numDice; i++) {
      outcomes.push(rollDie());
    }

    animateDice(outcomes);
    resultsEl.innerText = `${players[currentPlayer]} rolls: ${outcomes.join(', ')}`;
    
    setTimeout(() => {
      handleEndOfTurn();
    }, 1500);
  });
}

/* ============================================================
   MASTER INITIALIZATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log('🎮 THOUSANAIRE LOADED');
  
  initSeatMapping();
  setupJoinAndModeButtons();
  setupRollButton();
  
  showRandomDice();
  idleDiceInterval = setInterval(showRandomDice, 2000);
  startIntroOverlay();
});
