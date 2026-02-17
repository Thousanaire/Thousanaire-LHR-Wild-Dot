/* ============================================================
   THOUSANAIRE GAME - SEPARATE MODES (Feb 17, 2026)
   ============================================================
   ✅ CLASSIC & DEALER MODES = COMPLETELY SEPARATE GAMES
   ✅ Select mode → New game board → Clean slate
   ✅ No shared state between modes
   ============================================================ */

let currentGameMode = 'classic';  // Active game mode
let classicGame = {};            // Classic mode state ONLY
let dealerGame = {};             // Dealer mode state ONLY

/* ============================================================
   GAME MODE SELECTOR (Casino Floor Style)
   ============================================================ */
function setupGameModeSelector() {
  const classicBtn = document.getElementById('classicModeBtn');
  const dealerBtn = document.getElementById('dealerModeBtn');
  
  if (classicBtn) {
    classicBtn.addEventListener('click', () => {
      currentGameMode = 'classic';
      switchToClassicMode();
      console.log('🎮 CLASSIC MODE selected');
    });
  }
  
  if (dealerBtn) {
    dealerBtn.addEventListener('click', () => {
      currentGameMode = 'dealer';
      switchToDealerMode();
      console.log('🎮 DEALER MODE selected');
    });
  }
}

function switchToClassicMode() {
  // Hide dealer UI
  const dealerUI = document.getElementById('dealerPot');
  const rageUI = document.getElementById('rageCount');
  if (dealerUI) dealerUI.style.display = 'none';
  if (rageUI) rageUI.style.display = 'none';
  
  // Show classic UI
  const classicUI = document.getElementById('classicPot');
  if (classicUI) classicUI.style.display = 'block';
  
  // Reset to fresh classic game
  resetClassicGame();
  document.getElementById('gameModeTitle').textContent = 'CLASSIC MODE';
}

function switchToDealerMode() {
  // Hide classic UI
  const classicUI = document.getElementById('classicPot');
  if (classicUI) classicUI.style.display = 'none';
  
  // Show dealer UI  
  const dealerUI = document.getElementById('dealerPot');
  const rageUI = document.getElementById('rageCount');
  if (dealerUI) dealerUI.style.display = 'block';
  if (rageUI) rageUI.style.display = 'block';
  
  // Reset to fresh dealer game
  resetDealerGame();
  document.getElementById('gameModeTitle').textContent = 'DEALER MODE';
}

/* ============================================================
   CLASSIC MODE GAME STATE & LOGIC (Completely Isolated)
   ============================================================ */
function resetClassicGame() {
  classicGame = {
    players: [],
    chips: [0, 0, 0, 0],
    centerPot: 0,
    currentPlayer: 0,
    eliminated: [false, false, false, false],
    gameStarted: false
  };
}

function setupClassicJoinButton() {
  const joinBtn = document.getElementById("joinBtn");
  if (!joinBtn) return;
  
  joinBtn.addEventListener("click", () => {
    if (currentGameMode !== 'classic') return;
    
    const nameInput = document.getElementById("nameInput");
    if (!nameInput || !nameInput.value.trim()) {
      alert('Enter name for CLASSIC mode');
      return;
    }

    const name = nameInput.value.trim();
    let seat = classicGame.players.findIndex(p => !p);
    if (seat >= 4) return;

    classicGame.players[seat] = name;
    classicGame.chips[seat] = 3;  // Classic = 3 chips
    classicGame.eliminated[seat] = false;
    
    nameInput.value = "";
    updateClassicDisplay();
  });
}

function setupClassicRollButton() {
  const rollBtn = document.getElementById("rollBtn");
  if (!rollBtn) return;
  
  rollBtn.addEventListener("click", () => {
    if (currentGameMode !== 'classic') return;
    
    const activePlayers = classicGame.players.filter((p, i) => p && !classicGame.eliminated[i]).length;
    if (activePlayers < 4) {
      document.getElementById("results").innerText = "Need 4 players!";
      return;
    }

    const outcomes = [rollDie(), rollDie()];
    animateDice(outcomes);
    
    // Classic mode logic (simplified)
    document.getElementById("results").innerText = 
      `${classicGame.players[classicGame.currentPlayer]} rolls: ${outcomes.join(', ')}`;
    
    setTimeout(() => {
      classicGame.currentPlayer = (classicGame.currentPlayer + 1) % 4;
      updateClassicDisplay();
    }, 1500);
  });
}

function updateClassicDisplay() {
  // Update player table for classic mode only
  for (let i = 0; i < 4; i++) {
    const playerDiv = document.getElementById(`player${i}`);
    if (!playerDiv) continue;
    
    const name = classicGame.players[i];
    const chips = classicGame.chips[i];
    
    if (name) {
      playerDiv.querySelector('.name').textContent = name;
      playerDiv.querySelector('.chips').textContent = `Chips: ${chips}`;
    }
  }
  
  document.getElementById('classicPotCount').textContent = classicGame.centerPot;
}

/* ============================================================
   DEALER MODE GAME STATE & LOGIC (Completely Isolated)
   ============================================================ */
function resetDealerGame() {
  dealerGame = {
    players: [],
    chips: [0, 0, 0, 0],
    dealerPot: 0,
    rageMeter: 0,
    currentPlayer: 0,
    eliminated: [false, false, false, false],
    gameStarted: false
  };
}

function setupDealerJoinButton() {
  const joinBtn = document.getElementById("joinBtn");
  if (!joinBtn) return;
  
  // Dealer mode uses same button, different logic
  joinBtn.addEventListener("click", () => {
    if (currentGameMode !== 'dealer') return;
    
    const nameInput = document.getElementById("nameInput");
    if (!nameInput || !nameInput.value.trim()) {
      alert('Enter name for DEALER mode');
      return;
    }

    const name = nameInput.value.trim();
    let seat = dealerGame.players.findIndex(p => !p);
    if (seat >= 4) return;

    dealerGame.players[seat] = name;
    dealerGame.chips[seat] = 5;  // Dealer = 5 chips
    dealerGame.eliminated[seat] = false;
    
    nameInput.value = "";
    updateDealerDisplay();
  });
}

function setupDealerRollButton() {
  const rollBtn = document.getElementById("rollBtn");
  if (!rollBtn) return;
  
  rollBtn.addEventListener("click", () => {
    if (currentGameMode !== 'dealer') return;
    
    const activePlayers = dealerGame.players.filter((p, i) => p && !dealerGame.eliminated[i]).length;
    if (activePlayers < 4) {
      document.getElementById("results").innerText = "Need 4 players!";
      return;
    }

    const outcomes = [rollDie(), rollDie()];
    animateDice(outcomes);
    
    // Dealer mode: Wilds hurt dealer pot, Hubs feed rage meter
    let wilds = outcomes.filter(o => o === 'Wild').length;
    let hubs = outcomes.filter(o => o === 'Hub').length;
    
    dealerGame.dealerPot -= wilds;
    dealerGame.rageMeter += hubs;
    
    document.getElementById("results").innerText = 
      `${dealerGame.players[dealerGame.currentPlayer]} rolls: ${outcomes.join(', ')} | Dealer Pot: ${dealerGame.dealerPot}`;
    
    updateDealerDisplay();
    
    setTimeout(() => {
      dealerGame.currentPlayer = (dealerGame.currentPlayer + 1) % 4;
    }, 1500);
  });
}

function updateDealerDisplay() {
  // Update player table for dealer mode only
  for (let i = 0; i < 4; i++) {
    const playerDiv = document.getElementById(`player${i}`);
    if (!playerDiv) continue;
    
    const name = dealerGame.players[i];
    const chips = dealerGame.chips[i];
    
    if (name) {
      playerDiv.querySelector('.name').textContent = name;
      playerDiv.querySelector('.chips').textContent = `Chips: ${chips}`;
    }
  }
  
  document.getElementById('dealerPotCount').textContent = Math.max(0, dealerGame.dealerPot);
  document.getElementById('rageCount').textContent = dealerGame.rageMeter;
}

/* ============================================================
   SHARED FUNCTIONS (Dice, Intro, etc.)
   ============================================================ */
function rollDie() {
  const sides = ["Left", "Right", "Hub", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

function animateDice(outcomes) {
  const diceContainer = document.getElementById('diceContainer');
  if (!diceContainer) return;
  
  diceContainer.classList.add('rolling');
  setTimeout(() => {
    diceContainer.classList.remove('rolling');
    renderDice(outcomes);
  }, 1000);
}

function renderDice(outcomes) {
  const diceContainer = document.getElementById('diceContainer');
  if (!diceContainer) return;
  
  diceContainer.innerHTML = '';
  outcomes.forEach(outcome => {
    const die = document.createElement('div');
    die.className = 'die';
    die.textContent = {
      'Left': '←', 'Right': '→', 
      'Hub': '●', 'Dottt': '⚀', 'Wild': '⭐'
    }[outcome] || '?';
    diceContainer.appendChild(die);
  });
}

function startIntroOverlay() {
  // Same intro overlay as before
  const overlay = document.getElementById("introOverlay");
  if (!overlay) return;
  
  overlay.style.display = "flex";
  
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");
  const voice = document.getElementById("introVoice");
  
  function endIntro() {
    overlay.style.display = "none";
    if (voice) voice.pause();
  }
  
  if (skipBtn) skipBtn.onclick = endIntro;
  if (enterBtn) enterBtn.onclick = endIntro;
  overlay.addEventListener('click', endIntro, { once: true });
}

/* ============================================================
   MASTER INITIALIZATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log('🎰 CASINO FLOOR - Choose your game!');
  
  setupGameModeSelector();
  setupClassicJoinButton();
  setupDealerJoinButton();
  setupClassicRollButton();
  setupDealerRollButton();
  
  // Default to classic mode
  switchToClassicMode();
  
  // Start idle dice + intro
  const idleInterval = setInterval(() => {
    if (document.getElementById('diceContainer')) {
      animateDice([rollDie(), rollDie()]);
      clearInterval(idleInterval);
    }
  }, 2000);
  
  startIntroOverlay();
});
