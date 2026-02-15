/* ============================================================
   INTRO AVATAR + TYPEWRITER + MP3 VOICE-OVER
   ============================================================ */

const introLines = [
  "🎉 Welcome to THOUSANAIRE: LEFT HUB RIGHT Wild! 🎉",
  "",
  "Ready to play? Here’s how it goes! Every player starts with three chips.",
  "",
  "On your turn, roll up to three dice — one for each chip you have.",
  "In later rounds, you can still roll up to three dice, but only as many as the chips you’ve got!",
  "(Two chips? Two dice. One chip? One die. Four chips? Still just three — that’s the max!)",
  "",
  "Roll LEFT? Pass a chip to the player on your left.",
  "Roll RIGHT? Give one to your right.",
  "Roll HUB? Drop a chip into the center pot — the hub!",
  "",
  "Roll a DOT, and you’re safe — you keep your chip.",
  "",
  "Roll a WILD, and things get exciting!",
  "You can cancel a result or steal chips — and if you roll three WILDs, you take the entire hub pot!",
  "",
  "Players with zero chips must sit tight —",
  "but if a full round passes and you still haven’t gained any chips… you’re eliminated! 💥",
  "",
  "Keep rolling, keep laughing, and when only one player still has chips...",
  "",
  "That player is the Thousanaire Champion! 🎉",
  "",
  "Good luck, players — let’s roll!"
];

function startIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  const textEl = document.getElementById("introText");
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");
  const voice = document.getElementById("introVoice");
  const avatar = document.querySelector(".intro-avatar");
  const mouth = document.getElementById("avatarMouth");

  if (!overlay || !textEl || !skipBtn || !enterBtn || !voice || !avatar || !mouth) return;

  let lineIndex = 0;
  let charIndex = 0;
  let typing = true;
  let typingTimeout = null;
  let mouthInterval = null;

  // Mobile: first tap unlocks audio
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

  voice.addEventListener("play", () => {
    avatar.classList.add("talking");
    mouthInterval = setInterval(() => {
      mouth.style.opacity = mouth.style.opacity === "1" ? "0" : "1";
    }, 120);
  });

  voice.addEventListener("pause", stopTalking);
  voice.addEventListener("ended", stopTalking);

  function stopTalking() {
    avatar.classList.remove("talking");
    if (mouthInterval) {
      clearInterval(mouthInterval);
      mouthInterval = null;
    }
    mouth.style.opacity = "0";
  }

  function typeNextChar() {
    if (!typing) return;

    const line = introLines[lineIndex] || "";
    textEl.textContent = line.slice(0, charIndex);

    if (charIndex < line.length) {
      charIndex++;
      typingTimeout = setTimeout(typeNextChar, 38);
    } else {
      if (lineIndex < introLines.length - 1) {
        typingTimeout = setTimeout(() => {
          lineIndex++;
          charIndex = 0;
          typeNextChar();
        }, 950);
      } else {
        enterBtn.style.display = "inline-block";
      }
    }
  }

  function endIntro() {
    typing = false;
    if (typingTimeout) clearTimeout(typingTimeout);

    voice.pause();
    voice.currentTime = 0;
    stopTalking();

    overlay.style.display = "none";
  }

  skipBtn.addEventListener("click", endIntro);
  enterBtn.addEventListener("click", endIntro);

  typeNextChar();
}

/* ============================================================
   YOUR EXISTING GAME CODE
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
      const btn1 = document.createElement("button");
      btn1.textContent = `1 chip ← ${opponent.name} (${opponent.chips})`;
      btn1.style.padding = "10px";
      btn1.onclick = () => performSteal(opponent.index, 1);
      wildContent.appendChild(btn1);

      if (opponent.chips >= 2) {
        const btn2 = document.createElement("button");
        btn2.textContent = `2 chips ← ${opponent.name}`;
        btn2.style.padding = "10px";
        btn2.onclick = () => performSteal(opponent.index, 2);
        wildContent.appendChild(btn2);
      }

      if (opponent.chips >= 3) {
        const btn3 = document.createElement("button");
        btn3.textContent = `3 chips ← ${opponent.name}`;
        btn3.style.padding = "10px";
        btn3.onclick = () => performSteal(opponent.index, 3);
        wildContent.appendChild(btn3);
      }
      wildContent.appendChild(document.createElement("br"));
    });

    if (stealsRemaining === 0) {
      const finishBtn = document.createElement("button");
      finishBtn.textContent = "✅ Finish turn";
      finishBtn.style.fontSize = "1.3em";
      finishBtn.style.padding = "15px";
      finishBtn.style.background = "#4CAF50";
      finishBtn.onclick = finishThreeWildTurn;
      wildContent.appendChild(finishBtn);
    }
  }

  function performSteal(fromIndex, count) {
    if (stealsRemaining < count) return;
    
    const actualCount = Math.min(count, chips[fromIndex]);
    for (let i = 0; i < actualCount; i++) {
      chips[fromIndex]--;
      chips[playerIndex]++;
      animateChipTransfer(fromIndex, playerIndex, "wild");
      playSound("sndWild");
    }
    
    if (chips[fromIndex] === 0) danger[fromIndex] = true;
    danger[playerIndex] = false;
    stealsRemaining -= actualCount;
    updateTable();
    setTimeout(renderStealPanel, 600);
  }

  function finishThreeWildTurn() {
    document.getElementById("results").innerText = 
      `${players[playerIndex]} stole 3 chips with Triple Wilds! ⚔️`;
    document.getElementById("wildContent").innerHTML = "";
    rollBtn.disabled = false;
    handleEndOfTurn();
  }

  renderStealPanel();
}

function handleWildsNormalFlow(playerIndex, outcomes, wildIndices, leftIndices, rightIndices, hubIndices) {
  const wildContent = document.getElementById("wildContent");
  const rollBtn = document.getElementById("rollBtn");

  const canceledIndices = new Set();
  const wildUsedAsCancel = new Set();
  const steals = [];

  function remainingWildCount() {
    return Math.max(0, wildIndices.length - (wildUsedAsCancel.size + steals.length));
  }

  function renderWildPanel() {
    wildContent.innerHTML = `
      <h3>${players[playerIndex]} rolled: ${outcomes.join(", ")}</h3>
      <p>Wilds left: ${remainingWildCount()}</p>
    `;

    function firstNotCanceled(indicesArray) {
      return indicesArray.find(i => !canceledIndices.has(i));
    }

    function pickFreeWildIndex() {
      return wildIndices.find(w => !wildUsedAsCancel.has(w) && !steals.some(s => s.wildIndex === w));
    }

    const cancelActions = [
      {label: "Left", indices: leftIndices},
      {label: "Right", indices: rightIndices},
      {label: "Hub", indices: hubIndices}
    ];

    cancelActions.forEach(({label, indices}) => {
      const available = firstNotCanceled(indices);
      if (available !== undefined && remainingWildCount() > 0) {
        const btn = document.createElement("button");
        btn.textContent = `❌ Cancel ${label}`;
        btn.style.padding = "8px";
        btn.onclick = () => {
          const freeWild = pickFreeWildIndex();
          if (freeWild !== undefined) {
            canceledIndices.add(available);
            wildUsedAsCancel.add(freeWild);
            renderWildPanel();
          }
        };
        wildContent.appendChild(btn);
      }
    });

    if (remainingWildCount() > 0) {
      const opponents = players
        .map((p, i) => ({ name: p, index: i }))
        .filter(o => o.index !== playerIndex && pExists(o.index) && chips[o.index] > 0 && !eliminated[o.index]);

      opponents.forEach(opponent => {
        const btn = document.createElement("button");
        btn.textContent = `💰 Steal from ${opponent.name}`;
        btn.style.padding = "8px";
        btn.onclick = () => {
          const freeWild = pickFreeWildIndex();
          if (freeWild !== undefined && chips[opponent.index] > 0) {
            chips[opponent.index]--;
            chips[playerIndex]++;
            animateChipTransfer(opponent.index, playerIndex, "wild");
            playSound("sndWild");
            if (chips[opponent.index] === 0) danger[opponent.index] = true;
            danger[playerIndex] = false;
            updateTable();
            steals.push({fromIndex: opponent.index, wildIndex: freeWild});
            setTimeout(renderWildPanel, 600);
          }
        };
        wildContent.appendChild(btn);
      });
    }

    if (remainingWildCount() === 0) {
      setTimeout(() => {
        document.getElementById("results").innerText = 
          `${players[playerIndex]} used all Wilds! Applying results...`;
        applyWildAndOutcomes(playerIndex, outcomes, {
          canceledIndices, wildIndices, wildUsedAsCancel, steals
        });
        wildContent.innerHTML = "";
        rollBtn.disabled = false;
        handleEndOfTurn();
      }, 800);
    }
  }

  renderWildPanel();
}

function applyOutcomesOnly(playerIndex, outcomes) {
  outcomes.forEach((o) => {
    if (o === "Left" && chips[playerIndex] > 0) {
      const leftSeat = getLeftSeatIndex(playerIndex);
      chips[playerIndex]--;
      if (chips[playerIndex] === 0) danger[playerIndex] = true;
      chips[leftSeat]++;
      danger[leftSeat] = false;
      animateChipTransfer(playerIndex, leftSeat, "left");
      playSound("sndChip");
    } else if (o === "Right" && chips[playerIndex] > 0) {
      const rightSeat = getRightSeatIndex(playerIndex);
      chips[playerIndex]--;
      if (chips[playerIndex] === 0) danger[playerIndex] = true;
      chips[rightSeat]++;
      danger[rightSeat] = false;
      animateChipTransfer(playerIndex, rightSeat, "right");
      playSound("sndChip");
    } else if (o === "Hub" && chips[playerIndex] > 0) {
      chips[playerIndex]--;
      if (chips[playerIndex] === 0) danger[playerIndex] = true;
      centerPot++;
      animateChipTransfer(playerIndex, null, "hub");
      playSound("sndChip");
    }
  });
  updateTable();
}

function applyWildAndOutcomes(playerIndex, outcomes, wildData) {
  const { canceledIndices, wildIndices, wildUsedAsCancel, steals } = wildData;

  outcomes.forEach((o, i) => {
    if (canceledIndices.has(i)) return;
    if (wildIndices.includes(i) && !wildUsedAsCancel.has(i) && !steals.some(s => s.wildIndex === i)) return;

    if (o === "Left" && chips[playerIndex] > 0) {
      const leftSeat = getLeftSeatIndex(playerIndex);
      chips[playerIndex]--;
      if (chips[playerIndex] === 0) danger[playerIndex] = true;
      chips[leftSeat]++;
      danger[leftSeat] = false;
      animateChipTransfer(playerIndex, leftSeat, "left");
      playSound("sndChip");
    } else if (o === "Right" && chips[playerIndex] > 0) {
      const rightSeat = getRightSeatIndex(playerIndex);
      chips[playerIndex]--;
      if (chips[playerIndex] === 0) danger[playerIndex] = true;
      chips[rightSeat]++;
      danger[rightSeat] = false;
      animateChipTransfer(playerIndex, rightSeat, "right");
      playSound("sndChip");
    } else if (o === "Hub" && chips[playerIndex] > 0) {
      chips[playerIndex]--;
      if (chips[playerIndex] === 0) danger[playerIndex] = true;
      centerPot++;
      animateChipTransfer(playerIndex, null, "hub");
      playSound("sndChip");
    }
  });
  updateTable();
}

function pExists(i) {
  return typeof players[i] !== "undefined" && players[i] !== null;
}

function addHistory(player, outcomes) {
  const historyDiv = document.getElementById("rollHistory");
  const entry = document.createElement("div");
  entry.classList.add("history-entry");
  entry.textContent = `${player} rolled: (${outcomes.join(", ")})`;
  historyDiv.prepend(entry);
}

function getSeatCenter(logicalSeat) {
  const domIndex = domSeatForLogical[logicalSeat];
  const el = document.getElementById("player" + domIndex);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function animateChipTransfer(fromSeat, toSeat, type) {
  let fromPos = null;
  let toPos = null;

  if (fromSeat !== null && fromSeat !== undefined) {
    fromPos = getSeatCenter(fromSeat);
  }

  if (type === "hub") {
    const pot = document.getElementById("centerPot");
    const rect = pot.getBoundingClientRect();
    toPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  } else if (toSeat !== null && toSeat !== undefined) {
    toPos = getSeatCenter(toSeat);
  }

  if (!fromPos || !toPos) return;

  const chip = document.createElement("div");
  chip.className = "chip-fly";
  chip.style.left = fromPos.x + "px";
  chip.style.top = fromPos.y + "px";
  chip.style.opacity = "1";
  chip.style.transform = "scale(1)";

  document.body.appendChild(chip);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      chip.style.left = toPos.x + "px";
      chip.style.top = toPos.y + "px";
      chip.style.transform = "scale(1.35)";
    });
  });

  setTimeout(() => {
    chip.style.opacity = "0";
    chip.style.transform = "scale(0.7)";
    setTimeout(() => chip.remove(), 300);
  }, 500);
}

function resetGame() {
  centerPot = 0;
  eliminated = [false, false, false, false];
  danger = [false, false, false, false];

  for (let i = 0; i < 4; i++) {
    if (players[i]) {
      chips[i] = 3;
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
  updateTable();
}

function showRandomDice() {
  const diceArea = document.getElementById("diceArea");
  let randomFaces = [];
  for (let i = 0; i < 3; i++) randomFaces.push(rollDie());
  diceArea.innerHTML = renderDice(randomFaces);

  const diceImgs = diceArea.querySelectorAll(".die");
  diceImgs.forEach(die => {
    die.classList.add("roll");
    setTimeout(() => die.classList.remove("roll"), 600);
  });
}

/* Single DOMContentLoaded: game init + intro */
document.addEventListener("DOMContentLoaded", () => {
  initSeatMapping();
  showRandomDice();
  idleDiceInterval = setInterval(showRandomDice, 2000);
  startIntroOverlay();
});
