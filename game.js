/* ============================================================
   CLEAN INTRO — IMAGE + VOICE ONLY + SUBTLE FLOAT (BULLETPROOF)
   ============================================================ */

function startIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");
  const voice = document.getElementById("introVoice");
  const avatar = document.querySelector(".intro-avatar");

  console.log("Intro elements:", { overlay, skipBtn, enterBtn, voice, avatar });

  if (!overlay || !skipBtn || !enterBtn || !voice || !avatar) {
    console.error("Missing intro elements - hiding overlay");
    if (overlay) overlay.style.display = "none";
    return;
  }

  avatar.classList.add("idle-float");
  let audioUnlocked = false;
  let introEnded = false;

  function endIntro() {
    if (introEnded) return;
    introEnded = true;
    voice.pause();
    voice.currentTime = 0;
    overlay.style.display = "none";
    console.log("Intro ended");
  }

  function playIntroAudio() {
    if (audioUnlocked || introEnded) return;
    audioUnlocked = true;
    voice.currentTime = 0;
    voice.play().catch(e => console.error("Audio error:", e));
  }

  // BUTTONS - Work IMMEDIATELY
  skipBtn.onclick = endIntro;
  enterBtn.onclick = endIntro;

  // CLICK OVERLAY TO START AUDIO
  overlay.onclick = (e) => {
    if (e.target.id === "introSkipBtn" || e.target.id === "introEnterBtn") return;
    playIntroAudio();
  };

  // TRY AUTOPLAY (will fail - normal)
  setTimeout(() => voice.play().catch(() => {}), 100);

  // AUTO-SKIP AFTER 12s
  setTimeout(() => {
    if (!introEnded) endIntro();
  }, 12000);
}

/* ============================================================
   GAME CODE WITH 5-SECOND GAME OVER DELAYS
   ============================================================ */

let players = [];
let chips = [0, 0, 0, 0];
let centerPot = 0;
let currentPlayer = 0;
let idleDiceInterval;
let eliminated = [false, false, false, false];
let danger = [false, false, false, false];
const logicalPositions = ["top", "right", "bottom", "left"];
let domSeatForLogical = [0, 1, 2, 3];
let playerAvatars = [null, null, null, null];
let playerColors = [null, null, null, null];
let gameStarted = false;

function initSeatMapping() {
  const playerDivs = document.querySelectorAll(".player");
  logicalPositions.forEach((pos, logicalIndex) => {
    playerDivs.forEach((div, domIndex) => {
      if (div.classList.contains(pos)) domSeatForLogical[logicalIndex] = domIndex;
    });
  });
}

function playSound(id) {
  try {
    const el = document.getElementById(id);
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  } catch (e) {}
}

document.getElementById("joinBtn")?.addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  let logicalSeat = players.findIndex(p => !p);
  if (logicalSeat === -1) logicalSeat = players.length;
  if (logicalSeat >= 4) return;

  const avatar = document.getElementById("avatarSelect").value;
  const color = document.getElementById("colorSelect").value;

  players[logicalSeat] = name;
  chips[logicalSeat] = 3;
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

document.getElementById("resetBtn")?.addEventListener("click", resetGame);
document.getElementById("playAgainBtn")?.addEventListener("click", () => {
  resetGame();
  hideGameOver();
});

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

document.getElementById("rollBtn")?.addEventListener("click", () => {
  const resultsEl = document.getElementById("results");

  if (!gameStarted && activePlayerCount() < 4) {
    if (resultsEl) resultsEl.innerText = "4 players are required to start the game.";
    return;
  }

  if (players.length === 0 || !players[currentPlayer] || eliminated[currentPlayer]) return;

  gameStarted = true;
  playSound("sndRoll");

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText = players[currentPlayer] + " has no chips, skips turn.";
    addHistory(players[currentPlayer], ["Skipped turn (no chips)"]);
    
    if (activePlayerCount() === 2 && chips[currentPlayer] === 0) {
      const winnerIndex = getLastActivePlayerIndex(currentPlayer);
      if (winnerIndex !== -1) {
        document.getElementById("results").innerText += " - Last man standing wins!";
        showGameOver(winnerIndex);
        return;
      }
    }
    
    danger[currentPlayer] = true;
    handleEndOfTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) outcomes.push(rollDie());
  animateDice(outcomes);
  addHistory(players[currentPlayer], outcomes);
  openWildChoicePanel(currentPlayer, outcomes);
});

function rollDie() {
  const sides = ["Left", "Right", "Hub", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

function animateDice(outcomes) {
  const diceArea = document.getElementById("diceArea");
  if (!diceArea) return;
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
  return outcomes.map(o => `<img src="assets/dice/${o}.png" alt="${o}" class="die">`).join(" ");
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

    playerDiv.classList.remove("eliminated", "active");
    playerDiv.style.boxShadow = "none";

    if (!name) {
      if (nameDiv) nameDiv.textContent = "";
      if (chipsDiv) chipsDiv.textContent = "";
      if (avatarImg) avatarImg.style.borderColor = "transparent";
      continue;
    }

    if (nameDiv) nameDiv.textContent = name;
    if (playerAvatars[logicalSeat] && avatarImg) avatarImg.src = playerAvatars[logicalSeat];
    if (playerColors[logicalSeat] && avatarImg) avatarImg.style.borderColor = playerColors[logicalSeat];

    if (eliminated[logicalSeat]) {
      playerDiv.classList.add("eliminated");
      if (chipsDiv) chipsDiv.textContent = "Eliminated";
    } else {
      if (chipsDiv) chipsDiv.textContent = `Chips: ${chipCount}`;
    }
  }

  const potEl = document.getElementById("centerPot");
  if (potEl) potEl.innerText = `Hub Pot: ${centerPot}`;
  highlightCurrentPlayer();
}

function nextTurn() {
  if (players.length === 0) return;

  let attempts = 0;
  let next = currentPlayer;

  while (attempts < 10) {
    next = (next + 1) % 4;
    attempts++;

    if (!players[next] || eliminated[next]) continue;

    if (chips[next] === 0) {
      if (danger[next]) {
        eliminated[next] = true;
        document.getElementById("results").innerText = `${players[next]} had no chips after grace turn - ELIMINATED!`;
        updateTable();
        playSound("sndWild");
        continue;
      } else {
        danger[next] = true;
        document.getElementById("results").innerText = `${players[next]} has 0 chips - one grace turn given!`;
        continue;
      }
    }
    break;
  }

  currentPlayer = next;
  highlightCurrentPlayer();
}

function activePlayerCount() {
  return players.filter((p, i) => p && !eliminated[i]).length;
}

function getLastActivePlayerIndex(excludeIndex = null) {
  let idx = -1;
  players.forEach((p, i) => {
    if (p && !eliminated[i] && i !== excludeIndex) idx = i;
  });
  return idx;
}

function handleEndOfTurn() {
  const activeCount = activePlayerCount();

  // **5-SECOND DELAY ADDED HERE**
  if (activeCount === 2 && chips[currentPlayer] === 0) {
    const winnerIndex = getLastActivePlayerIndex(currentPlayer);
    if (winnerIndex !== -1) {
      document.getElementById("results").innerText = 
        `${players[currentPlayer]} has 0 chips with 2 players left - ${players[winnerIndex]} WINS!`;
      // Delay game over popup by 5 seconds
      setTimeout(() => {
        showGameOver(winnerIndex);
      }, 5000);
      return;
    }
  }

  checkWinner();
  if (!isGameOver()) nextTurn();
}

function isGameOver() {
  const rollBtn = document.getElementById("rollBtn");
  const overlay = document.getElementById("gameOverOverlay");
  return rollBtn?.disabled && !overlay?.classList.contains("hidden");
}

function checkWinner() {
  let activePlayers = activePlayerCount();
  if (activePlayers === 1) {
    let winnerIndex = getLastActivePlayerIndex(null);
    if (winnerIndex !== -1) {
      document.getElementById("results").innerText = 
        `${players[winnerIndex]} is the LAST MAN STANDING!`;
      // **5-SECOND DELAY ADDED HERE**
      setTimeout(() => {
        showGameOver(winnerIndex);
      }, 5000);
    }
  }
}

function showGameOver(winnerIndex) {
  const overlay = document.getElementById("gameOverOverlay");
  const text = document.getElementById("gameOverText");
  const title = document.getElementById("gameOverTitle");

  if (!overlay || !text || !title) return;

  const winnerName = players[winnerIndex] || "Player";
  title.textContent = "🏆 GAME OVER 🏆";
  text.textContent = `${winnerName} is the LAST MAN STANDING!\nWins ${centerPot} chips from hub pot!`;

  overlay.classList.remove("hidden");
  document.getElementById("rollBtn").disabled = true;
  playSound("sndWin");
}

function hideGameOver() {
  document.getElementById("gameOverOverlay")?.classList.add("hidden");
}

function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach(el => {
    el.classList.remove('active');
    el.style.boxShadow = "none";
  });

  if (players.length === 0 || eliminated[currentPlayer] || !players[currentPlayer]) {
    document.getElementById("currentTurn").textContent = "Current turn: -";
    return;
  }

  const domIndex = domSeatForLogical[currentPlayer];
  const activeDiv = document.getElementById("player" + domIndex);
  if (activeDiv) {
    activeDiv.classList.add('active');
    const color = playerColors[currentPlayer] || "#ff4081";
    activeDiv.style.boxShadow = `0 0 15px ${color}`;
  }

  document.getElementById("currentTurn").textContent = "Current turn: " + players[currentPlayer];
}

// WILD LOGIC (unchanged - too long for this response, copy from your original)
function openWildChoicePanel(playerIndex, outcomes) {
  const wildContent = document.getElementById("wildContent");
  const rollBtn = document.getElementById("rollBtn");
  rollBtn.disabled = true;

  const wildIndices = [];
  const leftIndices = [];
  const rightIndices = [];
  const hubIndices = [];

  outcomes.forEach((o, i) => {
    if (o
