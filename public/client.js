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

// VIEW NAVIGATION
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.remove('active', 'hidden'));
    views[viewName].classList.add('active');
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
});

socket.on('gameStarted', ({ category, turnOrder }) => {
    showView('game');
    display.btnNext.classList.add('hidden');
});

socket.on('gameUpdate', ({ state, currentTurn, players }) => {
    if (state === 'PLAYING') {
        showView('game');
        if (currentTurn === myId) {
            display.turnName.innerText = "¡ES TU TURNO!";
            display.turnName.style.color = "var(--accent)";
            display.btnNext.classList.remove('hidden');
        } else {
            const p = cachedPlayers.find(x => x.id === currentTurn);
            display.turnName.innerText = p ? p.nickname : '...';
            display.turnName.style.color = "white";
            display.btnNext.classList.add('hidden');
        }
    } else if (state === 'VOTING') {
        showView('voting');
        renderVotingOptions(players);
    }
});

socket.on('roleInfo', ({ word, isImpostor }) => {
    display.myWord.innerText = word;
    if (isImpostor) {
        display.roleDesc.innerText = "ERES EL IMPOSTOR. Finge.";
        display.roleDesc.style.color = "var(--danger)";
    } else {
        display.roleDesc.innerText = "Eres una persona normal.";
        display.roleDesc.style.color = "var(--text-muted)";
    }
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

socket.on('voteResult', ({ results, eliminatedId, gameEnded, winner, impostorName, skipCount }) => {
    if (gameEnded) {
        showView('results');
        if (winner === 'CREW') {
            display.resultTitle.innerHTML = "<span class='winner-crew'>¡LOS CIUDADANOS GANAN!</span>";
            display.resultDetails.innerText = `El impostor era ${impostorName}. Fue descubierto.`;
        } else {
            display.resultTitle.innerHTML = "<span class='winner-impostor'>¡EL IMPOSTOR GANA!</span>";
            display.resultDetails.innerText = `El impostor (${impostorName}) se ha salido con la suya.`;
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
