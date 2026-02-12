let players = [];          // logical seats: 0=TOP,1=RIGHT,2=BOTTOM,3=LEFT
let chips = [0, 0, 0, 0];
let centerPot = 0;
let currentPlayer = 0;
let idleDiceInterval;

// logical seat order (clockwise)
const logicalPositions = ["top", "right", "bottom", "left"];

// domSeatForLogical[i] = DOM index of the player div for logical seat i
let domSeatForLogical = [0, 1, 2, 3];

// Build mapping from logical seats -> DOM seats based on .top/.right/.bottom/.left
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

// Join game: players sit CLOCKWISE by join order
// 1st -> TOP, 2nd -> RIGHT, 3rd -> BOTTOM, 4th -> LEFT
document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;
  if (players.length >= 4) return;

  const logicalSeat = players.length; // 0,1,2,3 clockwise
  players[logicalSeat] = name;
  chips[logicalSeat] = 3;

  updateTable();
  document.getElementById("nameInput").value = "";
  highlightCurrentPlayer();

  if (idleDiceInterval) {
    clearInterval(idleDiceInterval);
    idleDiceInterval = null;
  }
});

// LEFT = clockwise
function getLeftSeatIndex(seat) {
  return (seat - 1 + 4) % 4;
}

// RIGHT = counter‑clockwise
function getRightSeatIndex(seat) {
  return (seat + 1) % 4;
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
  for (let i = 0; i < numDice; i++) outcomes.push(rollDie());

  animateDice(outcomes);

  let wildRolled = false;

  outcomes.forEach(outcome => {
    if (outcome === "Left" && chips[currentPlayer] > 0) {
      const leftSeat = getLeftSeatIndex(currentPlayer);
      chips[currentPlayer]--;
      chips[leftSeat]++;
    }
    else if (outcome === "Right" && chips[currentPlayer] > 0) {
      const rightSeat = getRightSeatIndex(currentPlayer);
      chips[currentPlayer]--;
      chips[rightSeat]++;
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

// Animate dice with CSS spin effect
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

// Render dice images
function renderDice(outcomes) {
  return outcomes.map(o =>
    `<img src="assets/dice/${o}.png" alt="${o}" class="die">`
  ).join(" ");
}

// Update board using logical->DOM mapping
function updateTable() {
  for (let logicalSeat = 0; logicalSeat < 4; logicalSeat++) {
    const domIndex = domSeatForLogical[logicalSeat];
    const playerDiv = document.getElementById("player" + domIndex);
    if (!playerDiv) continue;

    const name = players[logicalSeat];
    const chipCount = chips[logicalSeat] ?? 0;

    const nameDiv = playerDiv.querySelector(".name");
    const chipsDiv = playerDiv.querySelector(".chips");

    if (nameDiv) nameDiv.textContent = name || "";
    if (chipsDiv) chipsDiv.textContent = name ? `Chips: ${chipCount}` : "";
  }

  document.getElementById("centerPot").innerText = `Center Pot: ${centerPot}`;
}

function nextTurn() {
  if (players.length === 0) return;
  currentPlayer = (currentPlayer + 1) % players.length;
  highlightCurrentPlayer();
}

function checkWinner() {
  let activePlayers = chips.filter((c, i) => players[i] && c > 0).length;
  if (activePlayers === 1) {
    let winnerIndex = chips.findIndex((c, i) => players[i] && c > 0);
    document.getElementById("results").innerText =
      players[winnerIndex] + " wins the pot of " + centerPot + "!";
    addHistory(players[winnerIndex], ["Winner!"]);
    document.getElementById("rollBtn").disabled = true;
    highlightCurrentPlayer();
  }
}

function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach(el => el.classList.remove('active'));

  if (players.length === 0) return;

  const domIndex = domSeatForLogical[currentPlayer];
  const activeDiv = document.getElementById("player" + domIndex);
  if (activeDiv) activeDiv.classList.add('active');
}

// Show steal options when Wild is rolled
function showStealOptions(rollerIndex) {
  const resultsDiv = document.getElementById("results");
  const opponents = players.map((p, i) => ({ name: p, index: i }))
                           .filter(o => o.index !== rollerIndex && chips[o.index] > 0 && o.name);

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

// Add roll history
function addHistory(player, outcomes) {
  const historyDiv = document.getElementById("rollHistory");
  const entry = document.createElement("div");
  entry.classList.add("history-entry");
  entry.textContent = `${player} rolled: (${outcomes.join(", ")})`;
  historyDiv.prepend(entry);
}

// Show random dice faces at startup and refresh every 2s until game starts
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
  initSeatMapping();      // build mapping from .top/.right/.bottom/.left
  showRandomDice();
  idleDiceInterval = setInterval(showRandomDice, 2000);
});
