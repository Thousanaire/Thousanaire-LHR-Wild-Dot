/* ============================================================
   INTRO AVATAR + TYPEWRITER + MOBILE-SAFE VOICE-OVER
   ============================================================ */

// Lines the avatar will type + speak
const introLines = [
  "Welcome to THOUSANAIRE: LEFT HUB RIGHT Wild.",
  "Each player starts with 3 chips.",
  "On your turn, you roll up to 3 dice — one for each chip you have.",
  "LEFT gives a chip to the player on your left.",
  "RIGHT gives a chip to the player on your right.",
  "HUB sends a chip to the center pot.",
  "WILD lets you cancel a result or steal chips, depending on how many you roll.",
  "Last player with chips wins the hub pot. Good luck, Thousanaire."
];

// Mobile browsers block speech until user interacts
let speechUnlocked = false;

function unlockSpeech() {
  if (!speechUnlocked) {
    speechUnlocked = true;
    window.speechSynthesis.resume();
  }
}

// Speak a line out loud (slower + clearer)
function speakLine(text) {
  if (!window.speechSynthesis || !speechUnlocked) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);

  // Slow, clear, natural pacing
  utter.rate = 0.82;     // slower
  utter.pitch = 1;
  utter.volume = 1;

  // Add a natural pause after each line
  utter.onend = () => {
    setTimeout(() => {}, 350);
  };

  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    const preferred = voices.find(v =>
      v.name.includes("Female") ||
      v.name.includes("Google") ||
      v.name.includes("Microsoft")
    );
    utter.voice = preferred || voices[0];
  }

  speechSynthesis.speak(utter);
}

function startIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  if (!overlay) return;

  const textEl = document.getElementById("introText");
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");

  let lineIndex = 0;
  let charIndex = 0;
  let typing = true;
  let typingTimeout = null;

  // Unlock speech on first tap anywhere on overlay
  overlay.addEventListener("click", unlockSpeech, { once: true });

  function typeNextChar() {
    if (!typing) return;

    const line = introLines[lineIndex] || "";

    // Speak line when starting it (only after user taps)
    if (charIndex === 0 && speechUnlocked) {
      speakLine(line);
    }

    textEl.textContent = line.slice(0, charIndex);

    if (charIndex < line.length) {
      charIndex++;
      typingTimeout = setTimeout(typeNextChar, 38); // slightly slower typing
    } else {
      if (lineIndex < introLines.length - 1) {
        typingTimeout = setTimeout(() => {
          lineIndex++;
          charIndex = 0;
          typeNextChar();
        }, 950); // longer pause between lines
      } else {
        enterBtn.style.display = "inline-block";
      }
    }
  }

  function endIntro() {
    typing = false;
    window.speechSynthesis.cancel();
    if (typingTimeout) clearTimeout(typingTimeout);
    overlay.style.display = "none";
  }

  skipBtn.addEventListener("click", () => {
    unlockSpeech();
    endIntro();
  });

  enterBtn.addEventListener("click", () => {
    unlockSpeech();
    endIntro();
  });

  typeNextChar();
}

/* ============================================================
   YOUR FULL EXISTING GAME CODE (UNCHANGED)
   ============================================================ */

let players = [];          // logical seats: 0=TOP,1=RIGHT,2=BOTTOM,3=LEFT
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

document.getElementById("resetBtn").addEventListener("click", () => {
  resetGame();
});

document.getElementById("playAgainBtn").addEventListener("click", () => {
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

document.getElementById("rollBtn").addEventListener("click", () => {
  if (players.length === 0) return;
  if (!players[currentPlayer] || eliminated[currentPlayer]) return;

  playSound("sndRoll");

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
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

  document.getElementById("centerPot").innerText = `Hub Pot: ${centerPot}`;
  highlightCurrentPlayer();
}

function nextTurn() {
  if (players.length === 0) return;

  let attempts = 0;
  let next = currentPlayer;

  while (attempts < 10) {
    next = (next + 1) % 4;
    attempts++;

    if (!players[next]) continue;
    if (eliminated[next]) continue;

    if (chips[next] === 0) {
      if (danger[next]) {
        eliminated[next] = true;
        document.getElementById("results").innerText = 
          `${players[next]} had no chips after grace turn - ELIMINATED!`;
        updateTable();
        playSound("sndWild");
        continue;
      } else {
        danger[next] = true;
        document.getElementById("results").innerText = 
          `${players[next]} has 0 chips - one grace turn given!`;
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

  if (activeCount === 2 && chips[currentPlayer] === 0) {
    const winnerIndex = getLastActivePlayerIndex(currentPlayer);
    if (winnerIndex !== -1) {
      document.getElementById("results").innerText = 
        `${players[currentPlayer]} has 0 chips with 2 players left - ${players[winnerIndex]} WINS!`;
      showGameOver(winnerIndex);
      return;
    }
  }

  checkWinner();
  if (!isGameOver()) {
    nextTurn();
  }
}

function isGameOver() {
  return document.getElementById("rollBtn").disabled &&
         !document.getElementById("gameOverOverlay").classList.contains("hidden");
}

function checkWinner() {
  let activePlayers = activePlayerCount();
  if (activePlayers === 1) {
    let winnerIndex = getLastActivePlayerIndex(null);
    if (winnerIndex !== -1) {
      document.getElementById("results").innerText = 
        `${players[winnerIndex]} is the LAST MAN STANDING!`;
      showGameOver(winnerIndex);
    }
  }
}

function showGameOver(winnerIndex) {
  const overlay = document.getElementById("gameOverOverlay");
  const text = document.getElementById("gameOverText");
  const title = document.getElementById("gameOverTitle");

  const winnerName = players[winnerIndex] || "Player";
  title.textContent = "🏆 GAME OVER 🏆";
  text.textContent = `${winnerName} is the LAST MAN STANDING!\nWins ${centerPot} chips from hub pot!`;

  overlay.classList.remove("hidden");
  document.getElementById("rollBtn").disabled = true;
  playSound("sndWin");
}

function hideGameOver() {
  document.getElementById("gameOverOverlay").classList.add("hidden");
}

function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach(el => {
    el.classList.remove('active');
    el.style.boxShadow = "none";
  });

  if (players.length === 0) {
    document.getElementById("currentTurn").textContent = "Current turn: -";
    return;
  }

  if (eliminated[currentPlayer] || !players[currentPlayer]) {
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

  document.getElementById("currentTurn").textContent =
    "Current turn: " + (players[currentPlayer] || "-");
}

/* WILD LOGIC */

function openWildChoicePanel(playerIndex, outcomes) {
  const wildContent = document.getElementById("wildContent");
  const rollBtn = document.getElementById("rollBtn");
  rollBtn.disabled = true;

  const wildIndices = [];
  const leftIndices = [];
  const rightIndices = [];
  const hubIndices = [];

  outcomes.forEach((o, i) => {
    if (o === "Wild") wildIndices.push(i);
    else if (o === "Left") leftIndices.push(i);
    else if (o === "Right") rightIndices.push(i);
    else if (o === "Hub") hubIndices.push(i);
  });

  const wildCount = wildIndices.length;

  if (wildCount === 0) {
    document.getElementById("results").innerText = 
      `${players[playerIndex]} rolled: ${outcomes.join(", ")}`;
    applyOutcomesOnly(playerIndex, outcomes);
    wildContent.innerHTML = "";
    rollBtn.disabled = false;
    handleEndOfTurn();
    return;
  }

  if (wildCount === 3) {
    wildContent.innerHTML = `
      <h3 style="color: gold;">🎲 ${players[playerIndex]} rolled TRIPLE WILDS! 🎲</h3>
      <p style="font-size: 1.1em;">Choose your epic reward:</p>
      <button id="takePotBtn3" style="font-size: 1.3em; padding: 20px; margin: 10px; background: #4CAF50;">
        💰 Take hub pot (${centerPot} chips)
      </button>
      <button id="steal3Btn" style="font-size: 1.3em; padding: 20px; margin: 10px; background: #FF9800;">
        ⚔️ Steal 3 chips from players
      </button>
    `;

    document.getElementById("takePotBtn3").onclick = () => {
      chips[playerIndex] += centerPot;
      centerPot = 0;
      document.getElementById("results").innerText =
        `${players[playerIndex]} takes the entire hub pot! 💰`;
      updateTable();
      wildContent.innerHTML = "";
      rollBtn.disabled = false;
      handleEndOfTurn();
    };

    document.getElementById("steal3Btn").onclick = () => {
      handleThreeWildSteals(playerIndex);
    };
    return;
  }

  handleWildsNormalFlow(playerIndex, outcomes, wildIndices, leftIndices, rightIndices, hubIndices);
}

function handleThreeWildSteals(playerIndex) {
  const wildContent = document.getElementById("wildContent");
  const rollBtn = document.getElementById("rollBtn");
  
  let stealsRemaining = 3;

  function renderStealPanel() {
    wildContent.innerHTML = `
      <h3 style="color: orange;">⚔️ ${players[playerIndex]} - ${stealsRemaining} steals left</h3>
      <p>Steal from any player (multiple OK):</p>
    `;

    const opponents = players
      .map((p, i) => ({ name: p, index: i, chips: chips[i] }))
      .filter(o => 
        o.index !== playerIndex &&
        o.name && 
        !eliminated[o.index] && 
        o.chips > 0
      );

    opponents.forEach(opponent => {
      const btn1 = document
