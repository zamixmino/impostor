const socket = io();

// DOM Elements
const views = {
    login: document.getElementById('view-login'),
    lobby: document.getElementById('view-lobby'),
    game: document.getElementById('view-game'),
    voting: document.getElementById('view-voting'),
    results: document.getElementById('view-results')
};

const inputs = {
    nickname: document.getElementById('nickname'),
    roomCode: document.getElementById('room-code-input'),
    category: document.getElementById('category-select')
};

const display = {
    lobbyCode: document.getElementById('lobby-code'),
    playerCount: document.getElementById('player-count'),
    playerList: document.getElementById('lobby-player-list'),
    adminControls: document.getElementById('admin-controls'),
    waitingMsg: document.getElementById('waiting-msg'),
    myWord: document.getElementById('my-word'),
    roleDesc: document.getElementById('role-desc'),
    turnName: document.getElementById('current-turn-name'),
    btnNext: document.getElementById('btn-next-turn'),
    votingOptions: document.getElementById('voting-options'),
    leaderboard: document.getElementById('leaderboard'),
    resultTitle: document.getElementById('result-title'),
    resultDetails: document.getElementById('result-details'),
    btnPlayAgain: document.getElementById('btn-play-again'),
    waitingAdminResult: document.getElementById('waiting-admin-result')
};

let myId = null;
let currentRoomCode = null;
let amImpostor = false;

// VIEW NAVIGATION
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.remove('active', 'hidden'));
    views[viewName].classList.add('active');

    // Toggle Leaderboard Visibility based on view
    const lb = document.getElementById('live-leaderboard');
    const toggleBtn = document.getElementById('btn-toggle-ranking');

    if (viewName === 'game' || viewName === 'voting') {
        lb.classList.remove('hidden');
        toggleBtn.classList.remove('hidden');
    } else {
        lb.classList.add('hidden');
        toggleBtn.classList.add('hidden');
    }
}

// TABS
window.switchTab = function (tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (tab === 'create') {
        document.querySelector('button[onclick="switchTab(\'create\')"]').classList.add('active');
        document.getElementById('tab-create').classList.add('active');
    } else {
        document.querySelector('button[onclick="switchTab(\'join\')"]').classList.add('active');
        document.getElementById('tab-join').classList.add('active');
    }
}

// NOTIFICATIONS
function notify(msg) {
    const area = document.getElementById('notification-area');
    const el = document.createElement('div');
    el.className = 'notification';
    el.innerText = msg;
    area.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// SOCKET LISTENERS
socket.on('connect', () => {
    myId = socket.id;
});

socket.on('error', (msg) => {
    notify(msg);
});

socket.on('roomCreated', ({ roomCode, isAdmin }) => {
    currentRoomCode = roomCode;
    display.lobbyCode.innerText = roomCode;
    showView('lobby');
    if (isAdmin) {
        display.adminControls.classList.remove('hidden');
        display.waitingMsg.classList.add('hidden');
    } else {
        display.adminControls.classList.add('hidden');
        display.waitingMsg.classList.remove('hidden');
    }
});

socket.on('roomJoined', ({ roomCode, isAdmin }) => {
    currentRoomCode = roomCode;
    display.lobbyCode.innerText = roomCode;
    showView('lobby');
    // Joiner is never admin initially
    display.adminControls.classList.add('hidden');
    display.waitingMsg.classList.remove('hidden');
});

let cachedPlayers = [];
let currentCategory = 'aleatorio';

socket.on('updateLobby', (players) => {
    cachedPlayers = players;
    display.playerCount.innerText = players.length;
    display.playerList.innerHTML = '';

    players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.nickname}</span> <span>${p.score} pts</span>`;
        if (p.id === myId) li.classList.add('me');
        display.playerList.appendChild(li);
    });
    updateLiveLeaderboard(players);
});

function updateLiveLeaderboard(players) {
    const list = document.getElementById('live-ranking-list');
    list.innerHTML = '';
    const sorted = [...players].sort((a, b) => b.score - a.score);

    sorted.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.nickname}</span> <span>${p.score}</span>`;
        if (p.id === myId) li.classList.add('me');
        list.appendChild(li);
    });
}

let currentTurnOrder = [];
socket.on('gameStarted', ({ category, turnOrder }) => {
    showView('game');
    display.btnNext.classList.add('hidden');
    currentTurnOrder = turnOrder;
    renderTurnOrder(turnOrder[0]);
});

socket.on('gameUpdate', ({ state, currentTurn, players, turnOrder }) => {
    if (state === 'PLAYING') {
        showView('game');
        if (turnOrder) currentTurnOrder = turnOrder;
    } else if (state === 'VOTING') {
        if (currentTurn === myId) {
            display.turnName.innerText = "¡ES TU TURNO!";
            display.turnName.style.color = "var(--accent)";
            display.btnNext.classList.remove('hidden');
            if (amImpostor) {
                document.getElementById('btn-pass-turn').classList.remove('hidden');
            }
        } else {
            const p = cachedPlayers.find(x => x.id === currentTurn);
            display.turnName.innerText = p ? p.nickname : '...';
            display.turnName.style.color = "white";
            display.btnNext.classList.add('hidden');
            document.getElementById('btn-pass-turn').classList.add('hidden');
        }
        renderTurnOrder(currentTurn);
    } else if (state === 'VOTING') {
        showView('voting');
        renderVotingOptions(players);

        if (amImpostor) {
            document.getElementById('impostor-guess-area').classList.remove('hidden');
            document.getElementById('impostor-guess-input').value = '';
            document.getElementById('btn-guess-word').disabled = false;
        } else {
            document.getElementById('impostor-guess-area').classList.add('hidden');
        }
    }
});

socket.on('guessResult', ({ success }) => {
    if (!success) {
        alert("¡Palabra incorrecta! Has perdido tu oportunidad.");
        document.getElementById('btn-guess-word').disabled = true;
    }
});

socket.on('roleInfo', ({ word, isImpostor, category }) => {
    display.myWord.innerText = word;
    amImpostor = isImpostor;
    currentCategory = category || 'aleatorio';

    // Reset Hint Display
    document.getElementById('hint-display').classList.add('hidden');
    document.getElementById('hint-display').innerText = '';

    if (isImpostor) {
        display.roleDesc.innerText = "ERES EL IMPOSTOR. Finge.";
        display.roleDesc.style.color = "var(--danger)";

        // Only show hint button if category is ALEATORIO
        if (currentCategory === 'aleatorio') {
            document.getElementById('btn-hint').classList.remove('hidden');
        } else {
            document.getElementById('btn-hint').classList.add('hidden');
        }
    } else {
        display.roleDesc.innerText = "Eres una persona normal.";
        display.roleDesc.style.color = "var(--text-muted)";
        document.getElementById('btn-hint').classList.add('hidden');
    }
});

socket.on('hintReveal', ({ category }) => {
    const el = document.getElementById('hint-display');
    el.classList.remove('hidden');
    el.innerHTML = `<strong>PISTA:</strong> Categoría: ${category.toUpperCase()}`;
});

// STARTING EVENTS
socket.on('impostorChoice', ({ duration }) => {
    const modal = document.getElementById('impostor-choice-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    let timeLeft = 3;
    const counter = document.getElementById('choice-countdown');
    counter.innerText = timeLeft;

    const timer = setInterval(() => {
        timeLeft--;
        counter.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            modal.style.display = 'none';
        }
    }, 1000);
});

socket.on('gameStarting', ({ duration }) => {
    showView('game');
    display.myWord.innerText = "PREPARANDO...";
    display.roleDesc.innerText = "El impostor está eligiendo...";
});

function renderVotingOptions(players) {
    display.votingOptions.innerHTML = '';

    // SKIP BUTTON
    const btnSkip = document.createElement('button');
    btnSkip.className = 'vote-btn skip-btn';
    btnSkip.innerText = "SALTAR VOTO (Nadie)";
    btnSkip.onclick = () => {
        document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
        btnSkip.classList.add('selected');
        socket.emit('vote', { roomCode: currentRoomCode, votedId: 'SKIP' });
    };
    display.votingOptions.appendChild(btnSkip);

    players.forEach(p => {
        if (p.eliminated || p.disconnected) return;

        const btn = document.createElement('button');
        btn.className = 'vote-btn';
        btn.innerText = p.nickname;
        btn.onclick = () => {
            document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            socket.emit('vote', { roomCode: currentRoomCode, votedId: p.id });
        };
        display.votingOptions.appendChild(btn);
    });
}

socket.on('updateVotes', ({ voteCount, total }) => {
    document.getElementById('vote-status').innerText = `Votos: ${voteCount}/${total}`;
});

socket.on('voteResult', ({ results, eliminatedId, gameEnded, winner, impostorName, skipCount, secretWord }) => {
    if (gameEnded) {
        showView('results');
        if (winner === 'CREW') {
            display.resultTitle.innerHTML = "<span class='winner-crew'>¡LOS CIUDADANOS GANAN!</span>";
            display.resultDetails.innerText = `El impostor era ${impostorName}. Fue descubierto. \n La palabra era: ${secretWord || '???'}`;
        } else {
            display.resultTitle.innerHTML = "<span class='winner-impostor'>¡EL IMPOSTOR GANA!</span>";
            display.resultDetails.innerText = `El impostor (${impostorName}) se ha salido con la suya. \n La palabra era: ${secretWord || '???'}`;
        }
    } else {
        // Round continues
        let msg = "";
        if (eliminatedId) {
            const p = cachedPlayers.find(x => x.id === eliminatedId);
            msg = `${p ? p.nickname : 'Alguien'} ha sido eliminado.`;
            notify(msg);
        } else {
            notify("Nadie fue eliminado (Empate o Salto). Seguimos.");
        }
    }
});

socket.on('gameEnded', ({ leaderboard }) => {
    cachedPlayers = leaderboard; // Update scores
    display.btnPlayAgain.classList.add('hidden');
    display.waitingAdminResult.classList.remove('hidden');
    display.btnPlayAgain.classList.remove('hidden');

    display.leaderboard.innerHTML = '';
    leaderboard
        .sort((a, b) => b.score - a.score)
        .forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.nickname}</span> <span>${p.score} pts</span>`;
            display.leaderboard.appendChild(li);
        });
});

// ACTIONS
document.getElementById('btn-create').onclick = () => {
    const name = inputs.nickname.value.trim();
    if (!name) return notify("Pon tu nombre");
    socket.emit('createRoom', { nickname: name });
};

document.getElementById('btn-join').onclick = () => {
    const name = inputs.nickname.value.trim();
    const code = inputs.roomCode.value.trim();
    if (!name || !code) return notify("Faltan datos");
    socket.emit('joinRoom', { nickname: name, roomCode: code });
};

document.getElementById('btn-start').onclick = () => {
    socket.emit('startGame', {
        roomCode: currentRoomCode,
        category: inputs.category.value
    });
};

document.getElementById('btn-next-turn').onclick = () => {
    socket.emit('nextTurn', { roomCode: currentRoomCode });
};

document.getElementById('btn-play-again').onclick = () => {
    socket.emit('playAgain', { roomCode: currentRoomCode });
};

document.getElementById('btn-hint').onclick = () => {
    if (confirm("¿Pedir pista? Te costará 15 puntos.")) {
        socket.emit('requestHint', { roomCode: currentRoomCode });
    }
};

document.getElementById('btn-pass-turn').onclick = () => {
    socket.emit('passTurn', { roomCode: currentRoomCode });
};

document.getElementById('btn-guess-word').onclick = () => {
    const guess = document.getElementById('impostor-guess-input').value.trim();
    if (!guess) return;
    if (confirm("¿Estás seguro? Si fallas, no podrás intentarlo de nuevo en esta ronda.")) {
        socket.emit('attemptGuess', { roomCode: currentRoomCode, guess });
    }
};

// Choice Buttons
document.getElementById('btn-choice-last').onclick = () => {
    socket.emit('choosePosition', { roomCode: currentRoomCode, choice: 'LAST' });
    document.getElementById('impostor-choice-modal').style.display = 'none';
};
document.getElementById('btn-choice-random').onclick = () => {
    socket.emit('choosePosition', { roomCode: currentRoomCode, choice: 'RANDOM' });
    document.getElementById('impostor-choice-modal').style.display = 'none';
};

// Ranking Toggles
document.getElementById('btn-toggle-ranking').onclick = () => {
    document.getElementById('live-leaderboard').classList.add('open');
};
document.getElementById('btn-close-ranking').onclick = () => {
    document.getElementById('live-leaderboard').classList.remove('open');
};

function renderTurnOrder(currentId) {
    const list = document.getElementById('turn-order-list');
    list.innerHTML = '';

    // USER REQUEST: Only Impostor sees turn order
    if (!amImpostor) {
        list.parentElement.classList.add('hidden');
        return;
    }
    list.parentElement.classList.remove('hidden');

    currentTurnOrder.forEach(id => {
        const p = cachedPlayers.find(x => x.id === id);
        if (!p) return;
        const el = document.createElement('span');
        el.innerText = p.nickname;
        el.style.padding = "2px 6px";
        el.style.borderRadius = "4px";
        el.style.background = (id === currentId) ? "var(--accent)" : "rgba(255,255,255,0.1)";
        if (p.eliminated || p.disconnected) el.style.textDecoration = "line-through";
        list.appendChild(el);
    });
}
