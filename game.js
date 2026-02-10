let players = [];
let chips = [];
let centerPot = 0;
let currentPlayer = 0;

// Join game
document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (name && players.length < 4) { // limit to 4 seats for now
    players.push(name);
    chips.push(3);
    updateTable();
    document.getElementById("nameInput").value = "";
    highlightCurrentPlayer();
  }
});

// Roll dice
document.getElementById("rollBtn").addEventListener("click", () => {
  if (players.length === 0) return;

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
    nextTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) {
    outcomes.push(rollDie());
  }

  // Show dice images
  document.getElementById("results").innerHTML =
    players[currentPlayer] + " rolled: " + renderDice(outcomes);

  let wildRolled = false;

  // Resolve Left/Right/Center immediately
  outcomes.forEach(outcome => {
    if (chips[currentPlayer] > 0) {
      if (outcome === "Left") {
        chips[currentPlayer]--;
        chips[(currentPlayer - 1 + players.length) % players.length]++;
      } else if (outcome === "Right") {
        chips[currentPlayer]--;
        chips[(currentPlayer + 1) % players.length]++;
      } else if (outcome === "Center") {
        chips[currentPlayer]--;
        centerPot++;
      } else if (outcome === "Wild") {
        wildRolled = true; // mark Wild, no chip reduction
      }
      // Dottt = keep chip
    }
  });

  updateTable();

  if (wildRolled) {
    document.getElementById("results").innerText +=
      `\n${players[currentPlayer]} rolled a Wild! Choose a player to steal from.`;
    showStealOptions(currentPlayer);
  } else {
    checkWinner();
    nextTurn();
  }
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

function updateTable() {
  players.forEach((p, i) => {
    const playerDiv = document.getElementById("player" + i);
    if (playerDiv) {
      const nameDiv = playerDiv.querySelector(".name");
      const chipsDiv = playerDiv.querySelector(".chips");
      if (nameDiv) nameDiv.textContent = p;
      if (chipsDiv) chipsDiv.textContent = `Chips: ${chips[i]}`;
    }
  });
  document.getElementById("centerPot").innerText = `Center Pot: ${centerPot}`;
}

function nextTurn() {
  currentPlayer = (currentPlayer + 1) % players.length;
  highlightCurrentPlayer();
}

function checkWinner() {
  let activePlayers = chips.filter(c => c > 0).length;
  if (activePlayers === 1) {
    let winnerIndex = chips.findIndex(c => c > 0);
    document.getElementById("results").innerText =
      players[winnerIndex] + " wins the pot of " + centerPot + "!";
    document.getElementById("rollBtn").disabled = true;
    highlightCurrentPlayer();
  }
}

// Highlight current player’s seat
function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach((el, i) => {
    el.classList.toggle('active', i === currentPlayer);
  });
}

// Show steal options when Wild is rolled
function showStealOptions(rollerIndex) {
  const resultsDiv = document.getElementById("results");
  const opponents = players.map((p, i) => ({ name: p, index: i }))
                           .filter(o => o.index !== rollerIndex);

  const optionsDiv = document.createElement("div");
  optionsDiv.id = "stealOptions";

  opponents.forEach(opponent => {
    const btn = document.createElement("button");
    btn.textContent = `Steal from ${opponent.name}`;
    btn.onclick = () => {
      if (chips[opponent.index] > 0) {
        chips[opponent.index]--;
        chips[rollerIndex]++;
        updateTable();
        document.getElementById("results").innerText +=
          `\n${players[rollerIndex]} stole a chip from ${opponent.name}!`;
      } else {
        document.getElementById("results").innerText +=
          `\n${opponent.name} has no chips to steal.`;
      }
      optionsDiv.remove();
      checkWinner();
      nextTurn();
    };
    optionsDiv.appendChild(btn);
  });

  resultsDiv.appendChild(optionsDiv);
}

