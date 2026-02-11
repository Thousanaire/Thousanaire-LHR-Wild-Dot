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
  const diceArea = document.getElementById("diceArea");
  diceArea.innerHTML = renderDice(outcomes);

  document.getElementById("result").innerHTML =
    players[currentPlayer] + " rolled: " + outcomes.join(", ");

  let wildCount = outcomes.filter(o => o === "Wild").length;

  // Resolve Left/Right/Center immediately
  outcomes.forEach(outcome => {
    if (outcome === "Left" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      chips[(currentPlayer - 1 + players.length) % players.length]++;
      addHistory(players[currentPlayer], [`Left → passed chip left`]);
    } else if (outcome === "Right" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      chips[(currentPlayer + 1) % players.length]++;
      addHistory(players[currentPlayer], [`Right → passed chip right`]);
    } else if (outcome === "Center" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      centerPot++;
      addHistory(players[currentPlayer], [`Center → chip to pot`]);
    }
    // Dottt = keep chip
  });

  updatePlayerList();

  if (wildCount > 0) {
    document.getElementById("result").innerHTML +=
      `<br>${players[currentPlayer]} rolled ${wildCount} Wild(s)! Choose opponents to steal from.`;
    showWildStealOptions(currentPlayer, wildCount);
  } else {
    checkWinner();
    nextTurn();
  }

  // Add to roll history summary
  addHistory(players[currentPlayer], outcomes);
});

function rollDie() {
  // Must match your actual dice file names
  const sides = ["Left", "Right", "Center", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

// Render dice images
function renderDice(outcomes) {
  return outcomes.map(o =>
    `<img src="assets/dice/${o}.png" alt="${o}" class="die">`
  ).join(" ");
}

// Update player slots with names and chips
function updatePlayerList() {
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

// Highlight current player’s avatar slot
function highlightCurrentPlayer() {
  const slots = document.querySelectorAll(".player");
  slots.forEach((el, i) => {
    el.classList.toggle("active", i === currentPlayer);
  });
  document.getElementById("currentTurn").innerText = `Current turn: ${players[currentPlayer]}`;
}

// Show steal options for multiple Wilds
function showWildStealOptions(rollerIndex, wildCount) {
  const resultsDiv = document.getElementById("result");
  const optionsDiv = document.createElement("div");
  optionsDiv.id = "stealOptions";

  function spendWild() {
    if (wildCount <= 0) {
      optionsDiv.remove();
      checkWinner();
      nextTurn();
      return;
    }

    optionsDiv.innerHTML = `<p>Choose a player to steal a chip (${wildCount} Wild(s) left):</p>`;
    players.forEach((p, i) => {
      if (i !== rollerIndex) {
        const btn = document.createElement("button");
        btn.textContent = `Steal from ${p}`;
        btn.onclick = () => {
          chips[rollerIndex]++;
          if (chips[i] > 0) chips[i]--; // can steal from 0, but no negative
          updatePlayerList();
          addHistory(players[rollerIndex], [`Wild → stole from ${p}`]);
          document.getElementById("result").innerHTML +=
            `<br>${players[rollerIndex]} stole a chip from ${p}!`;
          wildCount--;
          spendWild();
        };
        optionsDiv.appendChild(btn);
      }
    });
  }

  spendWild();
  resultsDiv.appendChild(optionsDiv);
}

// Add roll history
function addHistory(player, outcomes) {
  const historyDiv = document.getElementById("rollHistory");
  const entry = document.createElement("div");
  const time = new Date().toLocaleTimeString();
  entry.textContent = `${player}: ${outcomes.join(", ")} at ${time}`;
  historyDiv.prepend(entry);
}
