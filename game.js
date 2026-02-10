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
    highlightCurrentPlayer(); // show first player once someone joins
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

  // Show dice images instead of text
  document.getElementById("results").innerHTML =
    players[currentPlayer] + " rolled: " + renderDice(outcomes);

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
        // Wild: steal one chip from another player
        let targetIndex;
        do {
          targetIndex = Math.floor(Math.random() * players.length);
        } while (targetIndex === currentPlayer);

        if (chips[targetIndex] > 0) {
          chips[targetIndex]--;
          chips[currentPlayer]++;
          document.getElementById("results").innerText +=
            `\n${players[currentPlayer]} stole a chip from ${players[targetIndex]}!`;
        } else {
          document.getElementById("results").innerText +=
            `\n${players[currentPlayer]} rolled Wild but ${players[targetIndex]} had no chips.`;
        }
      }
      // Dottt means keep chip, no action
    }
  });

  updateTable();
  checkWinner();
  nextTurn();
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
    highlightCurrentPlayer(); // freeze highlight on winner
  }
}

// Highlight current player’s seat
function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach((el, i) => {
    el.classList.toggle('active', i === currentPlayer);
  });
}
