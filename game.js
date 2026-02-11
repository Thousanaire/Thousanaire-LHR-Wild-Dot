let players = [];
let chips = [];
let centerPot = 0;
let currentPlayer = 0;

// Join game
document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (name && players.length < 4) {
    players.push(name);
    chips.push(3);
    updatePlayerList();
    document.getElementById("nameInput").value = "";
    highlightCurrentPlayer();
  }
});

// Roll dice
document.getElementById("rollBtn").addEventListener("click", () => {
  if (players.length === 0) return;

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("result").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
    nextTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) {
    outcomes.push(rollDie());
  }

  // Show dice images AND text outcomes
  document.getElementById("dieDisplay").src = `assets/dice/${outcomes[0]}.png`;
  document.getElementById("result").innerHTML =
    players[currentPlayer] + " rolled: " + renderDice(outcomes) +
    "<br>(" + outcomes.join(", ") + ")";

  let wildRolled = false;

  // Resolve Left/Right/Center immediately
  outcomes.forEach(outcome => {
    if (outcome === "Left" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      chips[(currentPlayer - 1 + players.length) % players.length]++;
    } else if (outcome === "Right" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      chips[(currentPlayer + 1) % players.length]++;
    } else if (outcome === "Center" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      centerPot++;
    } else if (outcome === "Wild") {
      wildRolled = true;
    }
    // Dottt = keep chip
  });

  updatePlayerList();

  if (wildRolled) {
    document.getElementById("result").innerHTML +=
      `<br>${players[currentPlayer]} rolled a Wild! Choose a player to steal from.`;
    showStealOptions(currentPlayer);
  } else {
    checkWinner();
    nextTurn();
  }

  // Add to roll history
  addHistory(players[currentPlayer], outcomes);
});

function rollDie() {
  const sides = ["Left", "Right", "Center", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

// Render dice images
function renderDice(outcomes) {
  return outcomes.map(o =>
    `<img src="assets/dice/${o}.png" alt="${o}" class="die">`
  ).join(" ");
}

// Update player list panel
function updatePlayerList() {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player" + (i === currentPlayer ? " active" : "");
    div.innerHTML = `
      <div class="name">${p}</div>
      <div class="chips">Chips: ${chips[i]}</div>
    `;
    list.appendChild(div);
  });
  document.getElementById("currentTurn").innerText = `Current turn: ${players[currentPlayer]}`;
}

// Next turn
function nextTurn() {
  currentPlayer = (currentPlayer + 1) % players.length;
  highlightCurrentPlayer();
}

// Winner check
function checkWinner() {
  let activePlayers = chips.filter(c => c > 0).length;
  if (activePlayers === 1) {
    let winnerIndex = chips.findIndex(c => c > 0);
    document.getElementById("result").innerText =
      players[winnerIndex] + " wins the pot of " + centerPot + "!";
    document.getElementById("rollBtn").disabled = true;
    highlightCurrentPlayer();
  }
}

// Highlight current player in list
function highlightCurrentPlayer() {
  const list = document.querySelectorAll("#playerList .player");
  list.forEach((el, i) => {
    el.classList.toggle("active", i === currentPlayer);
  });
  document.getElementById("currentTurn").innerText = `Current turn: ${players[currentPlayer]}`;
}

// Show steal options when Wild is rolled
function showStealOptions(rollerIndex) {
  const resultsDiv = document.getElementById("result");
  const opponents = players.map((p, i) => ({ name: p, index: i }))
                           .filter(o => o.index !== rollerIndex && chips[o.index] > 0);

  const optionsDiv = document.createElement("div");
  optionsDiv.id = "stealOptions";

  if (opponents.length === 0) {
    resultsDiv.innerHTML += `<br>No opponents have chips to steal.`;
    checkWinner();
    nextTurn();
    return;
  }

  opponents.forEach(opponent => {
    const btn = document.createElement("button");
    btn.textContent = `Steal from ${opponent.name}`;
    btn.onclick = () => {
      chips[opponent.index]--;
      chips[rollerIndex]++;
      updatePlayerList();
      document.getElementById("result").innerHTML +=
        `<br>${players[rollerIndex]} stole a chip from ${opponent.name}!`;
      optionsDiv.remove();
      checkWinner();
      nextTurn();
    };
    optionsDiv.appendChild(btn);
  });

  resultsDiv.appendChild(optionsDiv);
}

// Add roll history
function addHistory(player, outcomes) {
  const historyDiv = document.getElementById("messages");
  const entry = document.createElement("div");
  const time = new Date().toLocaleTimeString();
  entry.textContent = `${player}: ${outcomes.join(", ")} at ${time}`;
  historyDiv.prepend(entry);
}
