// --- AUDIO SYSTEM ---
const clickSound = new Audio('assets/sounds/click.wav'); 

function playClickSound() {
    clickSound.currentTime = 0;
    clickSound.play().catch(e => console.log("รอการคลิกเพื่อปลดล็อกเสียง"));
}

// --- RESPONSIVE SCALE SYSTEM ---
function resizeGame() {
    const table = document.querySelector('.table-container');
    if (!table) return;

    const baseWidth = 1280;
    const baseHeight = 720;
    const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight) * 0.95;

    table.style.transform = `scale(${scale})`;
    table.style.transformOrigin = 'center center';
}

window.addEventListener('resize', resizeGame);
document.addEventListener('DOMContentLoaded', resizeGame);

// --- INITIALIZATION & EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const joinModal = document.getElementById('joinModal');
    const gameBoard = document.getElementById('gameBoard');
    const btnJoin = document.getElementById('btnJoin');
    const playerNickname = document.getElementById('playerNickname');
    const displayPlayerName = document.getElementById('displayPlayerName');
    
    const btnDiscard = document.getElementById('btnDiscard');
    const btnFold = document.getElementById('btnFold');
    const btnFight = document.getElementById('btnFight');
    const btnNextRound = document.getElementById('btnNextRound');

    btnJoin?.addEventListener('click', () => {
        playClickSound();
        window.scrollTo(0, 0);

        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        }

        const name = playerNickname ? playerNickname.value.trim() : '';
        if (name !== '' && displayPlayerName) {
            displayPlayerName.textContent = name.toUpperCase() + ' (YOU)';
            if (gameState.players[0]) gameState.players[0].name = name.toUpperCase();
        }
        
        joinModal?.classList.add('hidden');
        gameBoard?.classList.remove('hidden');

        initLobbyState();
        checkLobbyReady();
    });

    if (btnDiscard) btnDiscard.addEventListener('click', () => { playClickSound(); handleDiscard(); });
    if (btnFold) btnFold.addEventListener('click', () => { playClickSound(); handleDecision('fold'); });
    if (btnFight) btnFight.addEventListener('click', () => { playClickSound(); handleDecision('fight'); });
    if (btnNextRound) btnNextRound.addEventListener('click', startNewRound);
});

// --- GAME DATA & STATE ---
const ALL_CARDS = [
    ...Array.from({ length: 20 }, (_, i) => ({
        id: `card_${i + 1}`,
        value: i + 1,
        isSpecial: false,
        image: `assets/cards/card_${i + 1}.png`
    })),
    { id: 'card_special_1', value: 1, isSpecial: true, image: 'assets/cards/card_special_1.png' },
    { id: 'card_special_20', value: 20, isSpecial: true, image: 'assets/cards/card_special_20.png' }
];

const AVATAR_LIST = [
    'assets/profile/avatar_bear.png', 'assets/profile/avatar_cat.png', 'assets/profile/avatar_dino.png',
    'assets/profile/avatar_dog.png', 'assets/profile/avatar_duck.png', 'assets/profile/avatar_fox.png',
    'assets/profile/avatar_loma.png', 'assets/profile/avatar_pig.png', 'assets/profile/avatar_rabbit.png'
];

const myPlayerId = 'player';
let currentDeck = [];
let myHand = [];
let selectedCardIndex = null;
let turnTimer = null;
let timeLeft = 15;
let selectedAvatarPath = null;
let readyTimer = null;
let countdownTimer = null;
let countdownSeconds = 10;

let gameState = {
    players: [],
    dealerIndex: 0,
    currentTurnIndex: 0,
    phase: 'DISCARD'
};

function getMyPlayer() {
    return gameState.players.find(p => p.id === myPlayerId);
}

// --- LOBBY & ROOM MANAGEMENT ---
function initLobbyState() {
    const nicknameEl = document.getElementById('playerNickname');
    const inputName = nicknameEl ? nicknameEl.value.trim().toUpperCase() : '';

    gameState.players = [
        { 
            id: 'player', name: inputName || 'YOU', slotId: 'playerSlotBottom', handId: 'myHandContainer', 
            discardSpotId: 'myDiscardSpot', dealerBadgeId: 'dealerBottom', hand: [], action: null, hp: 20, 
            isBot: false, isReady: false, avatar: 'assets/profile/avatar_dino.png', originalAvatar: 'assets/profile/avatar_dino.png'
        },
        { 
            id: 'left', name: 'PLAYER 3', slotId: 'playerSlotLeft', handId: 'handLeft', discardSpotId: 'discardLeft', 
            dealerBadgeId: 'dealerLeft', hand: [], action: null, hp: 20, isBot: true, isReady: true,
            avatar: 'assets/profile/avatar_cat.png', originalAvatar: 'assets/profile/avatar_cat.png'
        },
        { 
            id: 'top', name: 'PLAYER 2', slotId: 'playerSlotTop', handId: 'handTop', discardSpotId: 'discardTop', 
            dealerBadgeId: 'dealerTop', hand: [], action: null, hp: 20, isBot: true, isReady: true,
            avatar: 'assets/profile/avatar_cat.png', originalAvatar: 'assets/profile/avatar_cat.png'
        },
        { 
            id: 'right', name: 'PLAYER 4', slotId: 'playerSlotRight', handId: 'handRight', discardSpotId: 'discardRight', 
            dealerBadgeId: 'dealerRight', hand: [], action: null, hp: 20, isBot: true, isReady: true,
            avatar: 'assets/profile/avatar_cat.png', originalAvatar: 'assets/profile/avatar_cat.png'
        }
    ];

    gameState.dealerIndex = Math.floor(Math.random() * gameState.players.length);
}

function checkLobbyReady() {
    const activePlayers = gameState.players.filter(p => p && p.name && p.name !== "EMPTY SPOT");
    const lobbyStatus = document.getElementById('lobbyStatus');
    const readyStatusText = document.getElementById('readyStatusText');
    const btnReadyGame = document.getElementById('btnReadyGame');

    if (lobbyStatus) lobbyStatus.classList.remove('hidden');

    const readyCount = activePlayers.filter(p => p.isReady).length;
    if (readyStatusText && !window.countdownTimer) {
        readyStatusText.innerHTML = `ROOM STATUS: พร้อมแล้ว ${readyCount}/${activePlayers.length} คน`;
    }

    if (btnReadyGame) {
        const me = gameState.players.find(p => p.id === 'player');
        if (me && me.isReady) {
            btnReadyGame.textContent = '❌ ยกเลิกความพร้อม (CANCEL READY)';
            btnReadyGame.style.backgroundColor = '#e88f88';
        } else {
            btnReadyGame.textContent = '✅ พร้อม! (READY)';
            btnReadyGame.style.backgroundColor = '#88c999';
        }

        btnReadyGame.onclick = () => {
            playClickSound();
            if (me) {
                me.isReady = !me.isReady;
                me.isSpectator = !me.isReady;
            }
            gameState.players.forEach(p => {
                if (p.isBot) { p.isReady = true; p.isSpectator = false; }
            });
            checkLobbyReady();
            evaluateRoomReadyState();
        };
    }
}

function evaluateRoomReadyState() {
    const activePlayers = gameState.players.filter(p => p && p.name && p.name !== "EMPTY SPOT");
    const readyCount = activePlayers.filter(p => p.isReady).length;
    const readyStatusText = document.getElementById('readyStatusText');

    if (readyCount >= 2) {
        if (!countdownTimer) {
            countdownSeconds = 10;
            if (readyStatusText) readyStatusText.innerHTML = `🔥 ผู้เล่นพร้อม ${readyCount}/${activePlayers.length} คน เริ่มนับถอยหลังใน ${countdownSeconds} วิ...`;

            countdownTimer = setInterval(() => {
                countdownSeconds--;
                if (readyStatusText) readyStatusText.innerHTML = `⏳ เกมกำลังจะเริ่มใน ${countdownSeconds} วินาที...`;

                if (countdownSeconds <= 0) {
                    clearInterval(countdownTimer);
                    countdownTimer = null;
                    gameState.players.forEach(p => { if (!p.isReady) p.isSpectator = true; });
                    
                    document.getElementById('lobbyStatus')?.classList.add('hidden');
                    startNewRound();
                }
            }, 1000);
        }
    } else {
        if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
        checkLobbyReady();
    }
}

function startNewRound() {
    const activePlayers = gameState.players.filter(p => !p.isSpectator);
    if (activePlayers.length < 2) {
        const lobbyStatus = document.getElementById('lobbyStatus');
        const timerDisplay = document.getElementById('timerDisplay');
        if (lobbyStatus) {
            lobbyStatus.innerHTML = `WAITING FOR PLAYERS <br><span class="status-count">(ต้องการอย่างน้อย 2 คน)</span>`;
            lobbyStatus.classList.remove('hidden');
        }
        if (timerDisplay) timerDisplay.classList.add('hidden');
        return;
    }

    gameState.players.forEach(p => { p.action = null; p.hand = []; p.isReady = false; });

    currentDeck = shuffleDeck(ALL_CARDS);
    gameState.players.forEach(p => {
        if (p.hp <= 0 || p.isSpectator) return;
        p.hand = [currentDeck.pop(), currentDeck.pop()];
    });

    const me = getMyPlayer();
    myHand = (me && me.hp > 0 && !me.isSpectator) ? (me.hand || []) : [];

    gameState.phase = 'DISCARD';
    gameState.currentTurnIndex = gameState.dealerIndex;

    renderBoardState();

    if (gameState.players[gameState.currentTurnIndex].hp <= 0 || gameState.players[gameState.currentTurnIndex].isSpectator) {
        nextTurn();
    } else {
        processTurn();
    }
}

// --- TURN & TIMER MANAGEMENT ---
function processTurn() {
    clearInterval(turnTimer);
    const activePlayer = gameState.players[gameState.currentTurnIndex];

    renderActionButtons(activePlayer);
    renderTimerLabel(activePlayer);

    timeLeft = 15;
    updateTimerUI();

    turnTimer = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) {
            clearInterval(turnTimer);
            handleTimeout(activePlayer);
        }
    }, 1000);

    if (activePlayer.isBot) {
        const botDelay = Math.floor(Math.random() * 2000) + 1000;
        setTimeout(() => {
            if (gameState.players[gameState.currentTurnIndex] === activePlayer) {
                clearInterval(turnTimer);
                if (gameState.phase === 'DISCARD') executeBotDiscard(activePlayer);
                else if (gameState.phase === 'DECISION') executeBotDecision(activePlayer);
            }
        }, botDelay);
    }
    updateTurnHighlight();
}

function nextTurn() {
    const activeFighters = gameState.players.filter(p => p.hp > 0 && !p.isSpectator && p.action !== 'FOLD');

    if (gameState.phase === 'DECISION' && activeFighters.length === 1) {
        if (!activeFighters[0].action) activeFighters[0].action = 'FIGHT';
        document.getElementById('decisionActionGroup')?.classList.add('hidden');
        revealAndEvaluate();
        return;
    }

    let loopCount = 0;
    do {
        gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
        loopCount++;
        if (loopCount > gameState.players.length) break;
    } while (gameState.players[gameState.currentTurnIndex].hp <= 0 || gameState.players[gameState.currentTurnIndex].isSpectator);

    if (gameState.currentTurnIndex === gameState.dealerIndex) {
        if (gameState.phase === 'DISCARD') {
            gameState.phase = 'DECISION';
            processTurn();
        } else if (gameState.phase === 'DECISION') {
            revealAndEvaluate();
        }
    } else {
        processTurn();
    }
    updateTurnHighlight();
}

function handleTimeout(player) {
    if (gameState.phase === 'DISCARD' && !player.isBot) {
        selectedCardIndex = myHand[0]?.value <= myHand[1]?.value ? 0 : 1;
        handleDiscard();
    } else if (gameState.phase === 'DECISION' && !player.isBot) {
        handleDecision('fold');
    }
}

// --- PLAYER ACTIONS & GAMEPLAY ---
function handleDiscard() {
    if (selectedCardIndex === null) return;
    clearInterval(turnTimer);

    const player = getMyPlayer();
    const discardCard = myHand[selectedCardIndex];
    myHand.splice(selectedCardIndex, 1);

    renderPlayerDiscardCard(player, discardCard);
    renderMyHand();
    selectedCardIndex = null;
    document.getElementById('discardActionGroup')?.classList.add('hidden');

    nextTurn();
}

function executeBotDiscard(bot) {
    renderBotDiscardUI(bot);
    nextTurn();
}

function handleDecision(type) {
    clearInterval(turnTimer);
    const player = getMyPlayer();
    player.action = type.toUpperCase();

    renderPlayerDecisionUI(player, type);
    document.getElementById('myHandContainer').innerHTML = '';
    document.getElementById('decisionActionGroup')?.classList.add('hidden');

    nextTurn();
}

function executeBotDecision(bot) {
    const isFight = Math.random() > 0.3;
    bot.action = isFight ? 'FIGHT' : 'FOLD';
    renderBotDecisionUI(bot, isFight);
    nextTurn();
}

// --- EVALUATION & SCORING ---
function revealAndEvaluate() {
    clearInterval(turnTimer);
    document.getElementById('timerDisplay')?.classList.add('hidden');

    let winningFighters = [];
    renderRevealedCards();

    const activeFighters = gameState.players.filter(p => p.action === 'FIGHT');
    
    if (activeFighters.length > 0) {
        const fighters = activeFighters.map(p => {
            let card = p.isBot ? p.hand[1] : (myHand.length > 0 ? myHand[0] : p.hand[1]);
            const val = card ? Number(card.value) : 0;
            const imgPath = card ? String(card.image) : '';
            
            const is1Star = imgPath.includes('card_special_1');
            const is20Star = imgPath.includes('card_special_20');
            const isStar = is1Star || is20Star;

            return { 
                player: p, value: val, is1Star, is20Star, isStar,
                effectiveScore: val + (isStar ? 0.5 : 0)
            };
        });

        const has1Star = fighters.some(f => f.is1Star);
        const has1Normal = fighters.some(f => f.value === 1 && !f.isStar);
        const has20Star = fighters.some(f => f.is20Star);
        const has20Normal = fighters.some(f => f.value === 20 && !f.isStar);

        const is20KnockedOut = (has1Star || has1Normal) && (has20Star || has20Normal);

        if (is20KnockedOut) {
            const remainingFighters = fighters.filter(f => !(f.value === 20 && !f.isStar));
            if (remainingFighters.length > 0) {
                const maxEffective = Math.max(...remainingFighters.map(f => f.effectiveScore));
                winningFighters = remainingFighters.filter(f => f.effectiveScore === maxEffective);
            }
        } else {
            const maxEffective = Math.max(...fighters.map(f => f.effectiveScore));
            winningFighters = fighters.filter(f => f.effectiveScore === maxEffective);
        }

        renderFightHighlights(fighters, winningFighters);
    }

    evaluateRound(winningFighters);

    const survivors = gameState.players.filter(p => p.hp > 0);
    if (survivors.length <= 1) {
        showVictoryModal(survivors[0] || gameState.players[0]);
    } else {
        gameState.dealerIndex = getNextDealerIndex();
        start7SecAutoNextRound();
    }
}

function evaluateRound(winningFighters = []) {
    const winners = winningFighters.map(w => w.player);
    gameState.players.forEach(player => {
        if (player.hp <= 0) return;
        if (!winners.includes(player)) {
            if (player.action === 'FIGHT') player.hp = Math.max(0, player.hp - 2);
            else if (player.action === 'FOLD') player.hp = Math.max(0, player.hp - 1);
        }
    });
    gameState.players.forEach(p => updatePlayerHP(p.slotId, p.hp));
}

function shuffleDeck(deckArray) {
    const deck = [...deckArray];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function getNextDealerIndex() {
    let nextIndex = gameState.dealerIndex;
    do {
        nextIndex = (nextIndex + 1) % gameState.players.length;
    } while (gameState.players[nextIndex].hp <= 0);
    return nextIndex;
}

// --- UI RENDERING SYSTEM ---
function renderBoardState() {
    document.getElementById('lobbyStatus')?.classList.add('hidden');
    document.getElementById('btnStart')?.classList.add('hidden');
    document.getElementById('btnNextRound')?.classList.add('hidden');

    gameState.players.forEach(p => {
        document.getElementById(p.discardSpotId)?.replaceChildren();
        document.getElementById(p.handId)?.replaceChildren();
    });

    document.querySelectorAll('.dealer-badge').forEach(el => el.classList.add('hidden'));
    const currentDealer = gameState.players[gameState.dealerIndex];
    if (currentDealer) {
        document.getElementById(currentDealer.dealerBadgeId)?.classList.remove('hidden');
    }

    renderMyHand();
    renderOpponentCards();
    gameState.players.forEach(p => updatePlayerHP(p.slotId, p.hp));
    updateEliminatedAvatars();
}

function renderMyHand() {
    const handContainer = document.getElementById('myHandContainer');
    if (!handContainer) return;
    handContainer.innerHTML = '';

    myHand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item dealing';
        cardElement.style.backgroundImage = `url('${card.image}')`;
        cardElement.dataset.index = index;

        cardElement.addEventListener('click', () => {
            if (gameState.phase !== 'DISCARD' || gameState.players[gameState.currentTurnIndex].id !== 'player') return;
            playClickSound();

            document.querySelectorAll('#myHandContainer .card-item').forEach(el => el.classList.remove('selected'));
            cardElement.classList.add('selected');
            selectedCardIndex = index;
            document.getElementById('btnDiscard').disabled = false;
        });

        handContainer.appendChild(cardElement);
        setTimeout(() => {
            requestAnimationFrame(() => {
                cardElement.classList.remove('dealing');
                cardElement.classList.add('in-hand');
            });
        }, index * 300);
    });
}

function renderOpponentCards() {
    gameState.players.filter(p => p.isBot).forEach(bot => {
        const handEl = document.getElementById(bot.handId);
        if (handEl) {
            if (bot.hp <= 0) { handEl.innerHTML = ''; return; }
            handEl.innerHTML = `<div class="card-back"></div><div class="card-back"></div>`;
        }
    });
}

function renderActionButtons(activePlayer) {
    const discardGroup = document.getElementById('discardActionGroup');
    const decisionGroup = document.getElementById('decisionActionGroup');

    if (!activePlayer.isBot) {
        if (gameState.phase === 'DISCARD') {
            discardGroup?.classList.remove('hidden');
            decisionGroup?.classList.add('hidden');
            document.getElementById('btnDiscard').disabled = true;
        } else if (gameState.phase === 'DECISION') {
            discardGroup?.classList.add('hidden');
            decisionGroup?.classList.remove('hidden');
        }
    } else {
        discardGroup?.classList.add('hidden');
        decisionGroup?.classList.add('hidden');
    }
}

function renderTimerLabel(activePlayer) {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerLabel = document.getElementById('timerLabel');

    timerDisplay?.classList.remove('hidden');
    if (timerLabel) {
        timerLabel.textContent = gameState.phase === 'DISCARD' 
            ? `PHASE 1: ${activePlayer.name} DISCARDING`
            : `PHASE 2: ${activePlayer.name} DECIDING`;
    }
}

function renderPlayerDiscardCard(player, discardCard) {
    const spot = document.getElementById(player.discardSpotId);
    if (spot) {
        spot.innerHTML = `<div class="discarded-card" style="background-image: url('${discardCard.image}');"></div>`;
    }
}

function renderBotDiscardUI(bot) {
    const handEl = document.getElementById(bot.handId);
    if (!handEl) return;
    handEl.innerHTML = `
        <div class="card-revealed" style="background-image: url('${bot.hand[0].image}');"></div>
        <div class="card-back" data-hidden-image="${bot.hand[1].image}"></div>
    `;
}

function renderPlayerDecisionUI(player, type) {
    const spot = document.getElementById(player.discardSpotId);
    if (!spot) return;

    const cardDiv = document.createElement('div');
    const firstCard = spot.children[0];
    cardDiv.className = firstCard ? firstCard.className : 'discarded-card';

    if (type === 'fight') {
        cardDiv.classList.add('card-back', 'card-active-fight');
    } else if (type === 'fold') {
        const remainingCard = myHand[0];
        cardDiv.classList.add('card-folded');
        if (remainingCard) cardDiv.style.backgroundImage = `url('${remainingCard.image}')`;
    }

    cardDiv.style.width = '90px';
    cardDiv.style.height = '130px';
    cardDiv.style.minWidth = '90px';
    cardDiv.style.minHeight = '130px';
    cardDiv.style.flexShrink = '0';
    spot.appendChild(cardDiv);
}

function renderBotDecisionUI(bot, isFight) {
    const handEl = document.getElementById(bot.handId);
    if (!handEl) return;

    if (isFight) {
        handEl.innerHTML = `
            <div class="card-revealed" style="background-image: url('${bot.hand[0].image}');"></div>
            <div class="card-back card-active-fight" data-hidden-image="${bot.hand[1].image}"></div>
        `;
    } else {
        handEl.innerHTML = `
            <div class="card-revealed" style="background-image: url('${bot.hand[0].image}');"></div>
            <div class="card-revealed card-folded" style="background-image: url('${bot.hand[1].image}');"></div>
        `;
    }
}

function renderRevealedCards() {
    gameState.players.filter(p => p.isBot && p.action === 'FIGHT').forEach(bot => {
        const handEl = document.getElementById(bot.handId);
        const cardBack = handEl?.querySelector('.card-back');
        if (cardBack && bot.hand[1]) {
            cardBack.classList.remove('card-back');
            cardBack.classList.add('card-revealed');
            cardBack.style.backgroundImage = `url('${bot.hand[1].image}')`;
        }
    });

    const player = getMyPlayer();
    if (player && player.action === 'FIGHT') {
        const cardBack = document.getElementById(player.discardSpotId)?.querySelector('.card-back');
        if (cardBack && myHand[0]) {
            cardBack.classList.remove('card-back');
            cardBack.classList.add('card-revealed');
            cardBack.style.backgroundImage = `url('${myHand[0].image}')`;
        }
    }
}

function renderFightHighlights(fighters, winningFighters) {
    fighters.forEach(item => {
        const p = item.player;
        const spot = p.isBot ? document.getElementById(p.handId) : document.getElementById(p.discardSpotId);
        const fightingCardEl = spot?.lastElementChild;
        if (fightingCardEl) {
            const isWinner = winningFighters.some(w => w.player === p);
            fightingCardEl.classList.remove('card-active-fight', 'card-active-lose');
            fightingCardEl.classList.add(isWinner ? 'card-active-fight' : 'card-active-lose');
        }
    });
}

function updateTimerUI() {
    const timerCount = document.getElementById('timerCount');
    if (timerCount) timerCount.textContent = timeLeft;
}

function updatePlayerHP(slotId, newHp) {
    const slot = document.getElementById(slotId);
    const hpBadge = slot?.querySelector('.hp-badge');
    if (hpBadge) hpBadge.textContent = `❤️ ${newHp}`;
}

function updateEliminatedAvatars() {
    gameState.players.forEach(p => {
        const slot = document.getElementById(p.slotId);
        if (!slot) return;
        const avatarImg = slot.querySelector('.avatar-img') || slot.querySelector('img:not(.dealer-badge)');

        if (p.hp <= 0) {
            if (avatarImg) avatarImg.src = 'assets/profile/avatar_lose.png';
            document.getElementById(p.handId)?.replaceChildren();
            document.getElementById(p.discardSpotId)?.replaceChildren();
        } else {
            if (avatarImg) avatarImg.src = p.avatar;
        }
    });
}

function updateTurnHighlight() {
    document.querySelectorAll('.player-avatar').forEach(el => el.classList.remove('turn-active'));
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer || currentPlayer.hp <= 0) return;

    const avatarEl = document.getElementById(currentPlayer.slotId)?.querySelector('.player-avatar');
    if (avatarEl) avatarEl.classList.add('turn-active');
}

function start7SecAutoNextRound() {
    let countdown = 7;
    const timerDisplay = document.getElementById('timerDisplay');
    const timerLabel = document.getElementById('timerLabel');
    const timerCount = document.getElementById('timerCount');
    
    document.getElementById('btnNextRound')?.classList.add('hidden');

    if (timerDisplay) {
        timerDisplay.classList.remove('hidden');
        if (timerLabel) timerLabel.innerText = "NEXT ROUND IN";
        if (timerCount) timerCount.innerText = countdown;
    }

    const autoTimer = setInterval(() => {
        countdown--;
        if (timerCount) timerCount.innerText = countdown;
        if (countdown <= 0) {
            clearInterval(autoTimer);
            timerDisplay?.classList.add('hidden');
            startNewRound();
        }
    }, 1000);
}

function showVictoryModal(winner) {
    let victoryModal = document.getElementById('victoryModal');
    if (!victoryModal) {
        victoryModal = document.createElement('div');
        victoryModal.id = 'victoryModal';
        victoryModal.className = 'victory-modal';
        document.body.appendChild(victoryModal);
    }

    victoryModal.innerHTML = `
        <div class="modal-content" style="background: rgba(0,0,0,0.88); color: #fff; padding: 25px 30px; text-align: center; border-radius: 16px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h2 style="margin-bottom: 10px; color: #f3a953;">🏆 GAME OVER 🏆</h2>
            <p style="margin: 15px 0; font-size: 1.1rem;">ผู้ชนะเลิศคนสุดท้ายคือ <strong>${winner ? winner.name : 'Unknown'}</strong>!</p>
            <p id="readyStatusText" style="font-size: 0.9rem; color: #aaa; margin-bottom: 15px;">กด READY เพื่อเล่นตาถัดไป</p>
            <button id="btnReadyNext" style="padding: 12px 28px; font-weight: bold; background: #8ab07d; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 1rem;">เล่นต่อ (READY)</button>
        </div>
    `;
    victoryModal.classList.remove('hidden');

    const btnReady = document.getElementById('btnReadyNext');
    if (btnReady) {
        btnReady.onclick = () => {
            btnReady.disabled = true;
            btnReady.innerText = "WAITING...";
            btnReady.style.background = "#888";

            const me = getMyPlayer();
            if (me) me.isReady = true;
            gameState.players.filter(p => p.isBot).forEach(b => b.isReady = true);
            checkReadyAndResetGame(victoryModal);
        };
    }
}

function checkReadyAndResetGame(modalElement) {
    const total = gameState.players.length;
    const readyCount = gameState.players.filter(p => p.isReady).length;
    const readyText = document.getElementById('readyStatusText');

    if (readyCount === total) {
        if (readyTimer) { clearInterval(readyTimer); readyTimer = null; }
        executeResetAndStart(modalElement);
        return;
    }

    if (readyCount >= 2) {
        if (!readyTimer) {
            let countdown = 10;
            if (readyText) readyText.innerText = `พร้อมแล้ว ${readyCount}/${total} คน (เกมจะเริ่มใน ${countdown} วิ...)`;

            readyTimer = setInterval(() => {
                countdown--;
                const currentReady = gameState.players.filter(p => p.isReady).length;
                if (readyText) readyText.innerText = `พร้อมแล้ว ${currentReady}/${total} คน (เกมจะเริ่มใน ${countdown} วิ...)`;

                if (countdown <= 0) {
                    clearInterval(readyTimer);
                    readyTimer = null;
                    executeResetAndStart(modalElement);
                }
            }, 1000);
        }
    } else {
        if (readyText) readyText.innerText = `รอผู้เล่นกดเล่นต่อ... (${readyCount}/2 คนพร้อมแล้ว)`;
    }
}

function executeResetAndStart(modalElement) {
    modalElement?.classList.add('hidden');
    gameState.players.forEach(p => {
        if (p.isReady) {
            p.hp = 20; p.isEliminated = false; p.isSpectator = false;
        } else {
            p.hp = 0; p.isEliminated = true; p.isSpectator = true; p.hand = [];
        }
        p.isReady = false;
    });
    gameState.dealerIndex = 0;
    startNewRound();
}

// --- AVATAR SELECTION SYSTEM ---
document.addEventListener('DOMContentLoaded', () => {
    const mySlot = document.getElementById('playerSlotBottom');
    mySlot?.querySelector('.player-avatar')?.addEventListener('click', openAvatarModal);

    document.getElementById('btnCloseAvatarModal')?.addEventListener('click', closeAvatarModal);
    document.getElementById('btnConfirmAvatar')?.addEventListener('click', confirmAvatarSelection);
});

function openAvatarModal() {
    const me = getMyPlayer();
    if (me && me.hp <= 0) return;

    const modal = document.getElementById('avatarModal');
    const grid = document.getElementById('avatarGrid');
    const btnConfirm = document.getElementById('btnConfirmAvatar');

    if (!modal || !grid) return;
    grid.innerHTML = '';
    selectedAvatarPath = me ? me.avatar : null;

    AVATAR_LIST.forEach(imgPath => {
        const item = document.createElement('div');
        item.className = 'avatar-option';
        item.style.backgroundImage = `url('${imgPath}')`;

        if (imgPath === selectedAvatarPath) item.classList.add('selected');

        item.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            selectedAvatarPath = imgPath;
            if (btnConfirm) btnConfirm.disabled = false;
        });
        grid.appendChild(item);
    });

    if (btnConfirm) btnConfirm.disabled = (selectedAvatarPath === me?.avatar);
    modal.classList.remove('hidden');
}

function closeAvatarModal() {
    document.getElementById('avatarModal')?.classList.add('hidden');
}

function confirmAvatarSelection() {
    playClickSound();
    if (!selectedAvatarPath) return;
    const me = getMyPlayer();
    if (me) {
        me.avatar = selectedAvatarPath;
        me.originalAvatar = selectedAvatarPath;
        const avatarImg = document.getElementById(me.slotId)?.querySelector('.avatar-img') || document.getElementById(me.slotId)?.querySelector('img:not(.dealer-badge)');
        if (avatarImg) avatarImg.src = me.avatar;
    }
    closeAvatarModal();
}