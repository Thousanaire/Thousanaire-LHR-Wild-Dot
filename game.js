/* ============================================================
   CLEAN INTRO — IMAGE + VOICE ONLY + SUBTLE FLOAT
   ============================================================ */

function startIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");
  const voice = document.getElementById("introVoice");
  const avatar = document.querySelector(".intro-avatar");

  if (!overlay || !skipBtn || !enterBtn || !voice || !avatar) return;

  // Subtle idle float animation (CSS-driven)
  avatar.classList.add("idle-float");

  // Mobile audio unlock
  overlay.addEventListener(
    "click",
    () => {
      if (voice.paused) {
        voice.currentTime = 0;
        voice.play().catch(() => {});
      }
    },
    { once: true }
  );

  function endIntro() {
    voice.pause();
    voice.currentTime = 0;
    overlay.style.display = "none";
  }

  skipBtn.addEventListener("click", endIntro);
  enterBtn.addEventListener("click", endIntro);

  // Start audio
  voice.play().catch(() => {});
}

/* ============================================================
   DEALER MODE STATE + GAME MODE TOGGLE
   ============================================================ */

// Game mode: 'classic' or 'dealer'
let gameMode = 'classic';

// Classic state (existing)
let players = [];          
let chips = [0, 0, 0, 0];
let centerPot = 0;        // Classic hub pot
let currentPlayer = 0;
let eliminated = [false, false, false, false];
let danger = [false, false, false, false];

// Dealer Mode state (NEW)
let dealerPot = 0;
let rageMeter = 0;

const logicalPositions = ["top", "right", "bottom", "left"];
let domSeatForLogical = [0, 1, 2, 3];
let playerAvatars = [null, null, null, null];
let playerColors = [null, null, null, null];
let gameStarted = false;
let idleDiceInterval;

/* ============================================================
   MODE TOGGLE FUNCTIONALITY
   ============================================================ */

function initModeToggle() {
  const modeBtn = document.getElementById('modeSwitchBtn');
  if (!modeBtn) return;

  modeBtn.addEventListener('click', () => {
    if (gameMode === 'classic') {
      // Switch TO Dealer Mode
      gameMode = 'dealer';
      modeBtn.textContent = 'Classic Mode';
      modeBtn.classList.add('dealer-active');
      
      // Swap pot displays
      document.getElementById('classicPot').classList.remove('active');
      document.getElementById('classicPot').classList.add('hidden');
      document.getElementById('dealerPot').classList.remove('hidden');
      document.getElementById('dealerPot').classList.add('active');
      
      // Update title
      document.getElementById('gameModeTitle').textContent = 'GAME BOARD (Dealer Mode)';
      
      // Reset dealer state
      resetDealerState();
      
    } else {
      // Switch BACK to Classic
      gameMode = 'classic';
      modeBtn.textContent = 'Dealer Mode';
      modeBtn.classList.remove('dealer-active');
      
      // Swap pot displays
      document.getElementById('dealerPot').classList.remove('active');
      document.getElementById('dealerPot').classList.add('hidden');
      document.getElementById('classicPot').classList.remove('hidden');
      document.getElementById('classicPot').classList.add('active');
      
      // Update title
      document.getElementById('gameModeTitle').textContent = 'GAME BOARD (Classic Mode)';
    }
  });
}

function resetDealerState() {
  dealerPot = 0;
  rageMeter = 0;
  updateDisplays();
}

/* ============================================================
   EXISTING UTILITY FUNCTIONS (unchanged)
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

document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  let logicalSeat = players.findIndex(p => !p);
  if (logicalSeat === -1) logicalSeat = players.length;
  if (logicalSeat >= 4) return;

  const avatar = document.getElementById("avatarSelect").value;
  const color = document.getElementById("colorSelect").value;

  players[logicalSeat] = name;
  chips[logicalSeat] = gameMode === 'dealer' ? 5 : 3; // Dealer starts with 5 chips
  eliminated[logicalSeat] = false;
  danger[logicalSeat] = false;
  playerAvatars[logicalSeat] = avatar;
  playerColors[logicalSeat] = color;

  updateTable();
  document.getElementById("nameInput").value = "";
  highlightCurrentPlayer();

  if (idleDiceInterval) {
    clearInterval(idleDiceInterval);
    idleDiceInterval = null;
  }
});

/* ============================================================
   MAIN ROLL BUTTON - MODE AWARE
   ============================================================ */

document.getElementById("rollBtn").addEventListener("click", () => {
  const resultsEl = document.getElementById("results");

  // REQUIRE 4 PLAYERS ONLY BEFORE GAME START
  if (!gameStarted && activePlayerCount() < 4) {
    if (resultsEl) {
      resultsEl.innerText = "4 players are required to start the game.";
    }
    return;
  }

  if (players.length === 0) return;
  if (!players[currentPlayer] || eliminated[currentPlayer]) return;

  gameStarted = true;
  playSound("sndRoll");

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
    addHistory(players[currentPlayer], ["Skipped turn (no chips)"]);
    
    handleEndOfTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) outcomes.push(rollDie());

  animateDice(outcomes);
  addHistory(players[currentPlayer], outcomes);

  // MODE-SPECIFIC RESOLUTION
  if (gameMode === 'classic') {
    openWildChoicePanel(currentPlayer, outcomes);
  } else {
    resolveDealerRoll(currentPlayer, outcomes);
  }
});

/* ============================================================
   DEALER MODE RESOLUTION (NEW)
   ============================================================ */

function resolveDealerRoll(playerIndex, outcomes) {
  const resultsEl = document.getElementById("results");
  const rollBtn = document.getElementById("rollBtn");
  
  // TRIPLE CHECKS FIRST (instant win/loss)
  let wildCount = outcomes.filter(o => o === "Wild").length;
  let hubCount = outcomes.filter(o => o === "Hub").length;
  
  if (wildCount === 3) {
    resultsEl.innerText = `${players[playerIndex]} rolls TRIPLE WILDS! Dealer loses instantly!`;
    playSound("sndWin");
    showGameOver(-1, 'Triple Wild Victory! Surviving players win!');
    return;
  }
  
  if (hubCount === 3) {
    resultsEl.innerText = `${players[playerIndex]} rolls TRIPLE HUBS! All players lose!`;
    playSound("sndWild");
    showGameOver(-1, 'Triple H Catastrophe! All players lose!');
    return;
  }
  
  // 2 HUB + 1 WILD GAMBLE
  if (hubCount === 2 && wildCount === 1) {
    resultsEl.innerText = `${players[playerIndex]} rolls 2H + Wild! COIN FLIP...`;
    setTimeout(() => {
      const isHeads = Math.random() > 0.5;
      if (isHeads) {
        // Dealer steals
        chips[playerIndex] = Math.max(0, chips[playerIndex] - 1);
        resultsEl.innerText += ' Heads! Dealer steals 1 chip.';
      } else {
        // Player steals from dealer
        dealerPot--;
        resultsEl.innerText += ' Tails! Steal 1 from Dealer pot.';
      }
      playSound("sndChip");
      updateDisplays();
      rollBtn.disabled = false;
      handleEndOfTurn();
    }, 1500);
    rollBtn.disabled = true;
    return;
  }
  
  // NORMAL RESOLUTION (with rage tracking)
  resultsEl.innerText = `${players[playerIndex]} rolled: ${outcomes.join(", ")}`;
  
  let wildsUsed = 0;
  outcomes.forEach((outcome) => {
    if (outcome === "Wild") {
      // Auto-use wilds to cancel Hubs or steal from dealer
      wildsUsed++;
      if (wildsUsed === 1) dealerPot--; // 1 Wild steals 1
      if (wildsUsed === 2) dealerPot -= 2; // 2 Wilds steal 2
      if (wildsUsed === 3) { dealerPot = 0; showGameOver(-1, 'Triple Wilds empty Dealer!'); return; }
    } else if (outcome === "Hub" && chips[playerIndex] > 0) {
      chips[playerIndex]--;
      dealerPot++;
      rageMeter++; // Every Hub adds rage
      checkRageTriggers();
      animateChipTransfer(playerIndex, null, "hub");
      playSound("sndChip");
    } else if (outcome === "Left" && chips[playerIndex] > 0) {
      const leftSeat = getLeftSeatIndex(playerIndex);
      chips[playerIndex]--;
      chips[leftSeat]++;
      animateChipTransfer(playerIndex, leftSeat, "left");
      playSound("sndChip");
    } else if (outcome === "Right" && chips[playerIndex] > 0) {
      const rightSeat = getRightSeatIndex(playerIndex);
      chips[playerIndex]--;
      chips[rightSeat]++;
      animateChipTransfer(playerIndex, rightSeat, "right");
      playSound("sndChip");
    }
    // Dots are kept automatically
  });
  
  updateDisplays();
  rollBtn.disabled = false;
  handleEndOfTurn();
}

function checkRageTriggers() {
  if (rageMeter >= 15) {
    showGameOver(-1, 'Rage Maxed! Dealer wins!');
  } else if (rageMeter >= 10) {
    // Steal 2 chips from richest player
    const richest = findRichestPlayer();
    if (richest !== -1) {
      chips[richest] -= 2;
      chips[richest] = Math.max(0, chips[richest]);
    }
  } else if (rageMeter >= 5) {
    // Steal 1 chip from richest player
    const richest = findRichestPlayer();
    if (richest !== -1) {
      chips[richest]--;
      chips[richest] = Math.max(0, chips[richest]);
    }
  }
}

function findRichestPlayer() {
  let maxChips = -1;
  let richest = -1;
  for (let i = 0; i < 4; i++) {
    if (players[i] && !eliminated[i] && chips[i] > maxChips) {
      maxChips = chips[i];
      richest = i;
    }
  }
  return richest;
}

/* ============================================================
   SHARED DISPLAY UPDATES (MODE AWARE)
   ============================================================ */

function updateDisplays() {
  updateTable();
  
  if (gameMode === 'classic') {
    document.getElementById('classicPotCount').textContent = centerPot;
  } else {
    document.getElementById('dealerPotCount').textContent = Math.max(0, dealerPot);
    document.getElementById('rageCount').textContent = rageMeter;
    
    // Check dealer pot win
    if (dealerPot >= 15) {
      showGameOver(-1, 'Dealer Pot Full! All players lose!');
    }
  }
}

function updateTable() {
  for (let logicalSeat = 0; logicalSeat < 4; logicalSeat++) {
    const domIndex = domSeatForLogical[logicalSeat];
    const playerDiv = document.getElementById("player" + domIndex);
    if (!playerDiv) continue;

    const name = players[logicalSeat];
    const chipCount = chips[logicalSeat] ?? 0;

    const nameDiv = playerDiv.querySelector(".name");
    const chipsDiv = playerDiv.querySelector(".chips");
    const avatarImg = playerDiv.querySelector(".avatar");

    playerDiv.classList.remove("eliminated");
    playerDiv.classList.remove("active");
    playerDiv.style.boxShadow = "none";

    if (!name) {
      if (nameDiv) nameDiv.textContent = "";
      if (chipsDiv) chipsDiv.textContent = "";
      if (avatarImg) avatarImg.style.borderColor = "transparent";
      continue;
    }

    if (nameDiv) nameDiv.textContent = name;

    if (playerAvatars[logicalSeat] && avatarImg) {
      avatarImg.src = playerAvatars[logicalSeat];
    }

    if (playerColors[logicalSeat] && avatarImg) {
      avatarImg.style.borderColor = playerColors[logicalSeat];
    }

    if (eliminated[logicalSeat]) {
      playerDiv.classList.add("eliminated");
      if (chipsDiv) chipsDiv.textContent = "Eliminated";
    } else {
      if (chipsDiv) chipsDiv.textContent = `Chips: ${chipCount}`;
    }
  }
  
  // Mode-specific pot updates handled in updateDisplays()
}

/* ============================================================
   EXISTING FUNCTIONS (mostly unchanged, minor mode checks)
   ============================================================ */

function rollDie() {
  const sides = ["Left", "Right", "Hub", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

function animateDice(outcomes) {
  const diceArea = document.getElementById("diceArea");
  diceArea.innerHTML = renderDice(outcomes);

  const diceImgs = diceArea.querySelectorAll(".die");
  diceImgs.forEach((die, i) => {
    die.classList.add("roll");
    setTimeout(() => {
      die.classList.remove("roll");
      die.src = `assets/dice/${outcomes[i]}.png`;
    }, 600);
  });
}

function renderDice(outcomes) {
  return outcomes.map(o =>
    `<img src="assets/dice/${o}.png" alt="${o}" class="die">`
  ).join(" ");
}

// ... [rest of your existing functions remain exactly the same until resetGame]

function resetGame() {
  centerPot = 0;
  dealerPot = 0;
  rageMeter = 0;
  eliminated = [false, false, false, false];
  danger = [false, false, false, false];
  gameStarted = false;

  for (let i = 0; i < 4; i++) {
    if (players[i]) {
      chips[i] = gameMode === 'dealer' ? 5 : 3;
    } else {
      chips[i] = 0;
    }
  }

  currentPlayer = 0;
  document.getElementById("rollBtn").disabled = false;
  document.getElementById("results").textContent = "";
  document.getElementById("rollHistory").innerHTML = "";
  document.getElementById("wildContent").innerHTML = "";
  hideGameOver();
  updateDisplays();
}

document.getElementById("resetBtn").addEventListener("click", () => {
  resetGame();
});

document.getElementById("playAgainBtn").addEventListener("click", () => {
  resetGame();
  hideGameOver();
});

// ... [keep ALL your existing functions: nextTurn, getLeftSeatIndex, etc. unchanged]

/* Single DOMContentLoaded: game init + intro + mode toggle */
document.addEventListener("DOMContentLoaded", () => {
  initSeatMapping();
  initModeToggle();  // NEW: Initialize mode toggle
  showRandomDice();
  idleDiceInterval = setInterval(showRandomDice, 2000);
  startIntroOverlay();
});
