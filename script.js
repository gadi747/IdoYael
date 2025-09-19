const FLAG_DATA = [
  { name: "China", code: "cn" },
  { name: "France", code: "fr" },
  { name: "Japan", code: "jp" },
  { name: "Cyprus", code: "cy" },
  { name: "Greece", code: "gr" },
  { name: "Canada", code: "ca" }
];

const FLAG_CDN_BASE = "https://flagcdn.com/w320";

const boardElement = document.getElementById("game-board");
const resetButton = document.getElementById("reset-button");
const currentPlayerElement = document.getElementById("current-player");
const totalTurnsElement = document.getElementById("total-turns");
const totalMatchesElement = document.getElementById("total-matches");
const endMessageElement = document.getElementById("end-message");
const logListElement = document.getElementById("game-log");
const playerCards = Array.from(document.querySelectorAll(".player-card"));

const totalPairs = FLAG_DATA.length;

let deck = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let gameActive = true;
let currentPlayerIndex = 0;
let totalTurns = 0;
let totalMatches = 0;

const players = [
  { name: "Player 1", matches: 0, attempts: 0, streak: 0, bestStreak: 0 },
  { name: "Player 2", matches: 0, attempts: 0, streak: 0, bestStreak: 0 }
];

const scoreboardElements = players.map((_, index) => ({
  matches: document.getElementById(`player-${index}-matches`),
  attempts: document.getElementById(`player-${index}-attempts`),
  accuracy: document.getElementById(`player-${index}-accuracy`),
  streak: document.getElementById(`player-${index}-streak`),
  bestStreak: document.getElementById(`player-${index}-best-streak`)
}));

function buildDeck() {
  const duplicated = FLAG_DATA.flatMap((flag) => {
    const image = `${FLAG_CDN_BASE}/${flag.code}.png`;
    return [
      { ...flag, image, uid: `${flag.code}-a` },
      { ...flag, image, uid: `${flag.code}-b` }
    ];
  });

  return shuffle(duplicated);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderBoard() {
  boardElement.innerHTML = "";

  deck.forEach((cardData, index) => {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.dataset.flag = cardData.name;
    card.dataset.uid = cardData.uid;
    card.setAttribute("role", "gridcell");
    card.setAttribute("aria-label", "Hidden flag card");

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back">?</div>
        <div class="card-face card-front">
          <img src="${cardData.image}" alt="Flag of ${cardData.name}" loading="lazy" />
        </div>
      </div>
    `;

    card.addEventListener("click", () => handleCardFlip(card));

    boardElement.appendChild(card);
  });
}

function handleCardFlip(card) {
  if (!gameActive || lockBoard || card === firstCard || card.classList.contains("matched")) {
    return;
  }

  card.classList.add("flipped");
  card.setAttribute("aria-label", `Flag of ${card.dataset.flag}`);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;

  resolveTurn();
}

function resolveTurn() {
  const currentPlayer = players[currentPlayerIndex];
  currentPlayer.attempts += 1;
  totalTurns += 1;

  const firstFlag = firstCard.dataset.flag;
  const secondFlag = secondCard.dataset.flag;

  if (firstFlag === secondFlag) {
    setTimeout(() => handleMatch(firstFlag), 550);
  } else {
    setTimeout(() => handleMismatch(firstFlag, secondFlag), 900);
  }

  updateStats();
}

function handleMatch(flagName) {
  const currentPlayer = players[currentPlayerIndex];

  [firstCard, secondCard].forEach((card) => {
    card.classList.add("matched");
    card.disabled = true;
    card.setAttribute("aria-label", `Matched flag of ${flagName}`);
  });

  currentPlayer.matches += 1;
  currentPlayer.streak += 1;
  currentPlayer.bestStreak = Math.max(currentPlayer.bestStreak, currentPlayer.streak);
  totalMatches += 1;

  addLogEntry({
    type: "match",
    playerIndex: currentPlayerIndex,
    flagName,
    turnNumber: totalTurns
  });

  resetSelection();
  updateStats();

  if (totalMatches === totalPairs) {
    finishGame();
  }
}

function handleMismatch(firstFlag, secondFlag) {
  const currentPlayer = players[currentPlayerIndex];
  currentPlayer.streak = 0;

  addLogEntry({
    type: "mismatch",
    playerIndex: currentPlayerIndex,
    flags: [firstFlag, secondFlag],
    turnNumber: totalTurns
  });

  setTimeout(() => {
    firstCard.classList.remove("flipped");
    secondCard.classList.remove("flipped");
    firstCard.setAttribute("aria-label", "Hidden flag card");
    secondCard.setAttribute("aria-label", "Hidden flag card");
    resetSelection();
    switchPlayer();
    updateStats();
  }, 400);
}

function resetSelection() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function switchPlayer() {
  currentPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
}

function updateStats() {
  currentPlayerElement.textContent = gameActive
    ? players[currentPlayerIndex].name
    : "Game complete";
  totalTurnsElement.textContent = totalTurns;
  totalMatchesElement.textContent = `${totalMatches} / ${totalPairs}`;

  playerCards.forEach((card, index) => {
    card.classList.toggle("active", index === currentPlayerIndex && gameActive);
  });

  players.forEach((player, index) => {
    const { matches, attempts, streak, bestStreak } = player;
    const accuracy = attempts === 0 ? 0 : Math.round((matches / attempts) * 100);

    scoreboardElements[index].matches.textContent = matches;
    scoreboardElements[index].attempts.textContent = attempts;
    scoreboardElements[index].accuracy.textContent = `${accuracy}%`;
    scoreboardElements[index].streak.textContent = streak;
    scoreboardElements[index].bestStreak.textContent = bestStreak;
  });
}

function addLogEntry({ type, playerIndex, flagName, flags, turnNumber }) {
  const listItem = document.createElement("li");
  const playerName = players[playerIndex].name;

  if (type === "match") {
    listItem.innerHTML = `<strong>Turn ${turnNumber}:</strong> ${playerName} found the pair of ${flagName} flags.`;
  } else {
    listItem.innerHTML = `<strong>Turn ${turnNumber}:</strong> ${playerName} revealed ${flags[0]} and ${flags[1]} – no match.`;
  }

  logListElement.appendChild(listItem);
  logListElement.scrollTop = logListElement.scrollHeight;
}

function finishGame() {
  gameActive = false;
  lockBoard = true;

  const [playerOne, playerTwo] = players;
  let message = "It's a tie! You both matched the same number of flags.";

  if (playerOne.matches > playerTwo.matches) {
    message = `${playerOne.name} wins with ${playerOne.matches} pairs!`;
  } else if (playerTwo.matches > playerOne.matches) {
    message = `${playerTwo.name} wins with ${playerTwo.matches} pairs!`;
  }

  endMessageElement.textContent = `Game over! ${message}`;
  updateStats();
}

function resetGame() {
  deck = buildDeck();
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  gameActive = true;
  currentPlayerIndex = 0;
  totalTurns = 0;
  totalMatches = 0;
  endMessageElement.textContent = "";
  logListElement.innerHTML = "";

  players.forEach((player) => {
    player.matches = 0;
    player.attempts = 0;
    player.streak = 0;
    player.bestStreak = 0;
  });

  renderBoard();
  updateStats();
}

resetButton.addEventListener("click", resetGame);

resetGame();
