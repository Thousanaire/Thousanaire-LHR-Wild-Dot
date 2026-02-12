let players = [];
let chips = [];
let centerPot = 0;
let currentPlayer = 0;
let idleDiceInterval;

// FIXED SEAT ORDER (clockwise)
// 0 = TOP, 1 = RIGHT, 2 = BOTTOM, 3 = LEFT
const seatMap = [null, null, null, null];

// Join game (players sit clockwise)
document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  const seatIndex = seatMap.indexOf(null);
  if (seatIndex === -1) return; // table full

  seatMap[seatIndex] = name;
  players.push(name);
  chips.push(3);

  updateTable();
  document.getElementById("nameInput").value = "";
  highlightCurrentPlayer();

  if (idleDiceInterval) {
    clearInterval(idleDiceInterval);
    idleDiceInterval = null;
  }
});

// Helpers to get seat index and neighbors
function getSeatIndex(playerName) {
  return seatMap.indexOf(playerName);
}

// LEFT = clockwise
function getLeftPlayer(playerName) {
  const seat = getSeatIndex(playerName);
  const leftSeat = (seat - 1 + 4) % 4;
  return seatMap[leftSeat];
}

// RIGHT = counter‑clockwise
function getRightPlayer(playerName) {
  const seat = getSeatIndex(playerName);
  const rightSeat = (seat + 1) % 4;
  return seatMap[rightSeat];
}

// Roll dice
document.getElementById("rollBtn").addEventListener("click", () => {
  if (players.length === 0) return;

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
    addHistory(players[currentPlayer], ["Skipped turn (no chips)"]);
    nextTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) {
    outcomes.push(rollDie());
  }

  animateDice(outcomes);

  let wildRolled = false;

  // Resolve Left/Right/Center using SEAT LOGIC
  outcomes.forEach(outcome => {
    const rollerName = players[currentPlayer];

    if (outcome === "Left" && chips[currentPlayer] > 0) {
      const leftName = getLeftPlayer(rollerName);
      const leftIndex = players.indexOf(leftName);

      chips[currentPlayer]--;
      chips[leftIndex]++;
    }

    else if (outcome === "Right" && chips[currentPlayer] > 0) {
      const rightName = getRightPlayer(rollerName);
      const rightIndex = players.indexOf(rightName);

      chips[currentPlayer]--;
      chips[rightIndex]++;
    }

    else if (outcome === "Center" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      centerPot++;
    }

    else if (outcome === "Wild") {
      wildRolled = true;
    }
  });

  updateTable();
  addHistory(players[currentPlayer], outcomes);

  if (wildRolled) {
    document.getElementById("results").innerHTML =
      `${players[currentPlayer]} rolled a Wild! Choose a player to steal from.`;
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

// Animate dice
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
  players.forEach((p, i) => {
    const playerDiv = document.getElementById("player" + i);
    if (playerDiv) {
      playerDiv.querySelector(".name").textContent = p;
      playerDiv.querySelector(".chips").textContent = `Chips: ${chips[i]}`;
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
    addHistory(players[winnerIndex], ["Winner!"]);
    document.getElementById("rollBtn").disabled = true;
    highlightCurrentPlayer();
  }
}

function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach((el, i) => {
    el.classList.toggle('active', i === currentPlayer);
  });
}

// Wild steal options
function showStealOptions(rollerIndex) {
  const resultsDiv = document.getElementById("results");
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
      updateTable();
      document.getElementById("results").innerHTML +=
        `<br>${players[rollerIndex]} stole a chip from ${opponent.name}!`;
      optionsDiv.remove();
      checkWinner();
      nextTurn();
    };
    optionsDiv.appendChild(btn);
  });

  resultsDiv.appendChild(optionsDiv);
}

// Roll history
function addHistory(player, outcomes) {
  const historyDiv = document.getElementById("rollHistory");
  const entry = document.createElement("div");
  const time = new Date().toLocaleTimeString();
  entry.textContent = `${player} rolled: (${outcomes.join(", ")}) at ${time}`;
  historyDiv.prepend(entry);
}

// Idle dice shuffle
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

document.addEventListener("DOMContentLoaded", () => {
  showRandomDice();
  idleDiceInterval = setInterval(showRandomDice, 2000);
});
