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
    roomCode: document.getElementById('room-code-input'),
    category: document.getElementById('category-select'),
    impostorCount: document.getElementById('impostor-count'),
    knowImpostors: document.getElementById('know-impostors')
};

const display = {
    lobbyCode: document.getElementById('lobby-code'),
    playerCount: document.getElementById('player-count'),
    playerList: document.getElementById('lobby-player-list'),
    adminControls: document.getElementById('admin-controls'),
    waitingMsg: document.getElementById('waiting-msg'),
    myWord: document.getElementById('my-word'),
    roleDesc: document.getElementById('role-desc'),
    roleDesc: document.getElementById('role-desc'),
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
let isAdmin = false;

// VIEW NAVIGATION
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.remove('active', 'hidden'));
    views[viewName].classList.add('active');

    // Toggle Leaderboard Visibility based on view
    const lb = document.getElementById('live-leaderboard');
    const toggleBtn = document.getElementById('btn-toggle-ranking');

    if (viewName === 'game' || viewName === 'voting') {
        lb.classList.add('hidden');
        toggleBtn.classList.add('hidden');
    } else {
        lb.classList.remove('hidden');
        toggleBtn.classList.remove('hidden');
    }
}

// TABS
window.switchTab = function (tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (tab === 'create') {
        document.querySelector('button[onclick="switchTab(\'create\')"]').classList.add('active');
        document.getElementById('tab-create').classList.add('active');
        // Clear Code View
        document.getElementById('tab-join').style.display = 'none';
        document.getElementById('tab-create').style.display = 'block';
    } else {
        document.querySelector('button[onclick="switchTab(\'join\')"]').classList.add('active');
        document.getElementById('tab-join').classList.add('active');
        document.getElementById('tab-join').style.display = 'block';
        document.getElementById('tab-create').style.display = 'none';
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

socket.on('roomCreated', ({ roomCode, isAdmin: isAdminArg }) => {
    currentRoomCode = roomCode;
    display.lobbyCode.innerText = roomCode;
    showView('lobby');
    isAdmin = isAdminArg;
    if (isAdmin) {
        display.adminControls.classList.remove('hidden');
        display.waitingMsg.classList.add('hidden');
        document.getElementById('admin-header-controls').classList.remove('hidden');
    } else {
        display.adminControls.classList.add('hidden');
        display.waitingMsg.classList.remove('hidden');
        document.getElementById('admin-header-controls').classList.add('hidden');
    }
});

socket.on('roomJoined', ({ roomCode, isAdmin: isAdminArg }) => {
    currentRoomCode = roomCode;
    display.lobbyCode.innerText = roomCode;
    showView('lobby');
    isAdmin = isAdminArg;
    // Joiner is never admin initially
    // Joiner is never admin initially
    display.adminControls.classList.add('hidden');
    display.waitingMsg.classList.remove('hidden');
    document.getElementById('admin-header-controls').classList.add('hidden');
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

        // ADMIN KICK BUTTON (Only in lobby list, not live leaderboard?)
        // Let's add it if I am admin.
        // But we don't know if I am admin easily in this function unless we store it.
        // We know from 'roomJoined/Created' but updateLobby is generic.
        // Let's assume the server validated action. 
        // We add a small 'x' button that emits kick. 
        // BUT better to only show if I am admin.

        // Let's add it and hide via CSS if not admin? No, secure it.
        // We'll trust the User Interface for now.
        if (isAdmin) {
            const kickBtn = document.createElement('button');
            kickBtn.innerText = '❌';
            kickBtn.className = 'btn-kick';
            kickBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`¿Echar a ${p.nickname}?`)) {
                    socket.emit('kickPlayer', { roomCode: currentRoomCode, playerId: p.id });
                }
            };
            // li.appendChild(kickBtn); // CSS flex will handle it
            // Actually, the previous innerHTML overwrote content. 
            // Regroup.
            li.innerHTML = `<div class="p-info"><span>${p.nickname}</span> <span>${p.score} pts</span></div>`;
            if (p.id !== myId) li.appendChild(kickBtn);
        }

        display.playerList.appendChild(li);
    });
    updateLiveLeaderboard(players);
});

function updateLiveLeaderboard(players) {
    const list = document.getElementById('live-ranking-list');
    list.innerHTML = '';
    const sorted = [...players].sort((a, b) => b.score - a.score);

    sorted.forEach((p, index) => {
        const li = document.createElement('li');
        // Add Trophy if first
        let rankHtml = '';
        if (index === 0) {
            rankHtml = '<span class="trophy">🏆</span> ';
        }

        li.innerHTML = `<span>${rankHtml}${p.nickname}</span> <span>${p.score} pts</span>`;
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

        // Update Current Turn Name for EVERYONE
        const p = cachedPlayers.find(x => x.id === currentTurn);
        // display.turnName.innerText = p ? p.nickname : '...'; // Removed old separate display

        // Button Visibility
        // Button Visibility
        if (currentTurn === myId) {
            // display.turnName.style.color = "var(--accent)";
            // display.turnName.innerText += " (TU TURNO)";
            display.btnNext.classList.remove('hidden');

            if (amImpostor) {
                // Check if already last
                let isLast = false;
                if (currentTurnOrder && currentTurnOrder.length > 0) {
                    if (currentTurnOrder[currentTurnOrder.length - 1] === myId) {
                        isLast = true;
                    }
                }

                if (!isLast) {
                    document.getElementById('btn-pass-turn').classList.remove('hidden');
                } else {
                    document.getElementById('btn-pass-turn').classList.add('hidden');
                }
            } else {
                document.getElementById('btn-pass-turn').classList.add('hidden');
            }
        } else {
            // Not my turn
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

socket.on('roleInfo', ({ word, isImpostor, category, partners }) => {
    display.myWord.innerText = word;
    amImpostor = isImpostor;
    currentCategory = category || 'aleatorio';

    // Reset Hint Display
    document.getElementById('hint-display').classList.add('hidden');
    document.getElementById('hint-display').innerText = '';

    const roleCard = document.getElementById('my-role-card');
    roleCard.className = 'role-card glass'; // Reset classes

    if (isImpostor) {
        roleCard.classList.add('impostor-card'); // Add red style
        display.myWord.innerText = "IMPOSTOR"; // Simplify display
        display.roleDesc.innerText = "Engaña a todos. Fingir es tu trabajo.";
        display.roleDesc.style.color = "var(--danger)";

        if (partners && partners.length > 0) {
            display.roleDesc.innerHTML += `<br><span style="font-size:0.8em; color:white;">Tu compañero: ${partners.join(', ')}</span>`;
        }

        // Always show hint button for Impostor (allows viewing dictionary)
        document.getElementById('btn-hint').classList.remove('hidden');
    } else {
        display.roleDesc.innerText = "Eres una persona normal.";
        display.roleDesc.style.color = "var(--text-muted)";
        document.getElementById('btn-hint').classList.add('hidden');
    }
});

socket.on('hintReveal', ({ category, words }) => {
    const el = document.getElementById('hint-display');
    el.classList.remove('hidden');

    // Hide hint button after use
    document.getElementById('btn-hint').classList.add('hidden');

    let wordListHtml = '';
    if (words && words.length > 0) {
        wordListHtml = `<div class="hint-words-container">
            ${words.map(w => `<span class="hint-word">${w}</span>`).join('')}
        </div>`;
    }

    el.innerHTML = `
        <strong>PISTA:</strong> Categoría: ${category.toUpperCase()}
        ${wordListHtml}
    `;
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

socket.on('voteResult', ({ results, eliminatedId, gameEnded, winner, impostorNames, skipCount, secretWord, winTitle, winMsg }) => {
    if (gameEnded) {
        showView('results');
        if (winner === 'CREW') {
            display.resultTitle.innerHTML = `<span class='winner-crew'>${winTitle || '¡GANAN LOS CIUDADANOS!'}</span>`;
            display.resultDetails.innerText = winMsg || '';
        } else {
            display.resultTitle.innerHTML = `<span class='winner-impostor'>${winTitle || '¡GANA EL IMPOSTOR!'}</span>`;
            display.resultDetails.innerText = winMsg || '';
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
        category: inputs.category.value,
        impostorCount: inputs.impostorCount.value,
        knowImpostors: inputs.knowImpostors.checked
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

// Admin Header Restart
document.getElementById('btn-header-restart').onclick = () => {
    if (confirm("¿URGENCIA: Reiniciar ronda actual?")) {
        socket.emit('forceRestart', { roomCode: currentRoomCode });
    }
};

function renderTurnOrder(currentId) {
    const list = document.getElementById('turn-order-list');
    list.innerHTML = '';

    // Unified view: Show everyone the order, but highlight current
    // User requested "se pueden unir y remarcar más el que toca en el mismo orden de turno: y que se vea mejor."

    // If user wanted ONLY impostor to see it before, now they want it improved. 
    // Assuming we keep the logic that ONLY impostor sees it? Or everyone?
    // "Cuando eres el impostor..." context implies specific impostor needs.
    // However, usually turn order is public in games. 
    // The previous code had: if (!amImpostor) return;
    // Let's keep it visible only to IMPOSTOR if that was the constraint, OR maybe open it? 
    // The user said "lo de turno de: y orden de turno: se ve apelotonado".
    // I will assume this display is for everyone NOW because "Turno de" was for everyone.

    // Actually, looking at previous code line 414: if (!amImpostor) ...
    // If I merge "Truno de" (which was public) with "Orden de Turnos" (private), I might need to make "Orden" public OR keep distinct.
    // The user said "lo de turno de: y orden de turno: se ve apelotonado... quiero que se entienda mejor".
    // I will make the turn list visible to EVERYONE as it's better UX for this game type.

    list.parentElement.classList.remove('hidden'); // Ensure container is visible

    currentTurnOrder.forEach((id, index) => {
        const p = cachedPlayers.find(x => x.id === id);
        if (!p) return;

        const el = document.createElement('div');
        el.className = 'turn-item';

        // Add number
        const num = document.createElement('span');
        num.className = 'turn-num';
        num.innerText = index + 1;

        const name = document.createElement('span');
        name.className = 'turn-name';
        name.innerText = p.nickname;

        if (id === currentId) {
            el.classList.add('current');
            name.innerText += " (TURNO)";
        }

        if (id === myId) {
            el.classList.add('me');
        }

        if (p.eliminated || p.disconnected) {
            el.classList.add('inactive');
        }

        el.appendChild(num);
        el.appendChild(name);
        list.appendChild(el);
    });
}
