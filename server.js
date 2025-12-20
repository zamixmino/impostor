const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// --- GAME DATA ---
const WORDS = {
    comida: [
        "Pizza", "Hamburguesa", "Sushi", "Paella", "Tacos", "Helado", "Chocolate",
        "Ensalada", "Espaguetis", "Sopa", "Queso", "Jamón", "Tortilla", "Pan",
        "Manzana", "Plátano", "Naranja", "Uvas", "Pollo", "Pescado", "Arroz",
        "Lentejas", "Garbanzos", "Yogur", "Leche", "Cerveza", "Vino", "Agua",
        "Café", "Té", "Galletas", "Pastel", "Donut", "Croissant", "Bocadillo"
    ],
    famosos: [
        "Shakira", "Messi", "Cristiano Ronaldo", "Donald Trump", "Elon Musk",
        "Rosalía", "Bad Bunny", "Taylor Swift", "Will Smith", "Tom Cruise",
        "Brad Pitt", "Angelina Jolie", "Leonardo DiCaprio", "Beyoncé", "Rihanna",
        "Ibai Llanos", "AuronPlay", "Rubius", "TheGrefg", "Pedrerol",
        "Fernando Alonso", "Rafa Nadal", "Pau Gasol", "Jennifer Lopez", "Kim Kardashian"
    ],
    futbolistas: [
        "Messi", "Cristiano Ronaldo", "Mbappé", "Haaland", "Neymar", "Benzema",
        "Lewandowski", "Modric", "Pedri", "Gavi", "Vinicius Jr", "Bellingham",
        "Salah", "De Bruyne", "Courtois", "Ter Stegen", "Lamine Yamal", "Piqué",
        "Sergio Ramos", "Casillas", "Iniesta", "Xavi", "Puyol", "Busquets",
        "Maradona", "Pelé", "Zidane", "Ronaldinho", "Ronaldo Nazario", "Beckham"
    ],
    animales: [
        "Perro", "Gato", "León", "Tigre", "Elefante", "Jirafa", "Pollo",
        "Serpiente", "Águila", "Tiburón", "Ballena", "Delfín", "Caballo",
        "Vaca", "Cerdo", "Oveja", "Gallina", "Pato", "Lobo", "Zorro",
        "Oso", "Panda", "Koala", "Canguro", "Cocodrilo", "Tortuga",
        "Rana", "Mariposa", "Abeja", "Hormiga", "Araña", "Escorpión"
    ],
    cosas_de_casa: [
        "Mesa", "Silla", "Sofá", "Cama", "Armario", "Lámpara", "Televisión",
        "Ordenador", "Teléfono", "Nevera", "Lavadora", "Microondas", "Horno",
        "Plato", "Vaso", "Tenedor", "Cuchillo", "Cuchara", "Sartén", "Olla",
        "Espejo", "Toalla", "Jabón", "Champú", "Peine", "Cepillo de dientes",
        "Llaves", "Reloj", "Cuadro", "Alfombra", "Cortina", "Puerta", "Ventana"
    ],
    lugares: [
        "Playa", "Montaña", "Bosque", "Desierto", "Ciudad", "Pueblo", "Escuela",
        "Hospital", "Aeropuerto", "Estación de tren", "Parque", "Cine",
        "Teatro", "Museo", "Biblioteca", "Restaurante", "Hotel", "Supermercado",
        "Tienda", "Farmacia", "Banco", "Iglesia", "Estadio", "Gimnasio",
        "Piscina", "Zoológico", "Parque de atracciones", "Circo", "Espacio", "Luna"
    ],
    chorradas: [
        "Edgar Serramià", "Hernia", "Ratas", "Hentaila", "Pantano", "JimmyBDN", "Sebas",
        "David447447", "zamix", "Mear de pie", "Mear sentado", "Pollocop",
        "RushBDontStop", "Fran Molina", "Mago Bon", "Restaurante", "Miki Valera", "Easy piece lemon squeezy",
        "Counter Strike", "Pubg", "Entrevista Errejon", "Id perdido", "Estadio", "Mañana a trabajar",
        "Joan Marc", "Ferve", "Rocket League", "Phasmophobia", "Vecino del Jimmy", "Rendell Pablo"
    ],
    transportes: [
        "Coche", "Moto", "Bicicleta", "Autobús", "Tren", "Avión", "Barco",
        "Metro", "Taxi", "Camión", "Furgoneta", "Patinete", "Helicóptero",
        "Submarino", "Globo aerostático", "Cohete", "Caballo", "Andando"
    ]
};

// --- STATE MANAGEMENT ---
const rooms = {};

// Helper to get random word
// Helper to get random word
function getRandomWord(category) {
    let list = WORDS[category] || [];
    if (list.length === 0) return "Error";
    return list[Math.floor(Math.random() * list.length)];
}

function getRandomCategoryCode() {
    const keys = Object.keys(WORDS).filter(k => k !== 'chorradas');
    return keys[Math.floor(Math.random() * keys.length)];
}

// Helper to shuffle array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', ({ nickname }) => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        rooms[roomCode] = {
            code: roomCode,
            admin: socket.id,
            players: [{ id: socket.id, nickname, score: 0, isImpostor: false, disconnected: false, eliminated: false }],
            state: 'LOBBY',
            currentWord: '',
            category: 'aleatorio',
            turnOrder: [],
            currentTurnIndex: 0,
            category: 'aleatorio',
            turnOrder: [],
            currentTurnIndex: 0,
            impostorIds: [], // Changed from single ID
            knowImpostors: false,
            votes: {},
            roundCount: 1,
            gameCount: 0
        };
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, isAdmin: true });
        io.to(roomCode).emit('updateLobby', rooms[roomCode].players);
    });

    socket.on('joinRoom', ({ nickname, roomCode }) => {
        roomCode = roomCode.toUpperCase();
        const room = rooms[roomCode];
        if (!room) {
            socket.emit('error', 'La sala no existe.');
            return;
        }
        if (room.state !== 'LOBBY') {
            socket.emit('error', 'La partida ya ha empezado.');
            return;
        }
        if (room.players.length >= 10) {
            socket.emit('error', 'La sala está llena.');
            return;
        }
        if (room.players.some(p => p.nickname === nickname)) {
            socket.emit('error', 'Ese nombre ya está en uso.');
            return;
        }

        room.players.push({ id: socket.id, nickname, score: 0, isImpostor: false, disconnected: false, eliminated: false });
        socket.join(roomCode);
        socket.emit('roomJoined', { roomCode, isAdmin: false });
        io.to(roomCode).emit('updateLobby', room.players);
    });

    socket.on('startGame', ({ roomCode, category, impostorCount, knowImpostors }) => {
        const room = rooms[roomCode];
        if (!room || room.admin !== socket.id) return;
        if (room.players.length < 3) {
            socket.emit('error', 'Se necesitan mínimo 3 jugadores.');
            return;
        }
        startNewRound(roomCode, category, parseInt(impostorCount) || 1, !!knowImpostors);
    });

    socket.on('choosePosition', ({ roomCode, choice }) => {
        const room = rooms[roomCode];
        if (!room || room.state !== 'STARTING') return;

        // Security check: only impostors can choose
        if (!room.impostorIds.includes(socket.id)) return;

        if (choice === 'LAST') {
            const player = room.players.find(p => p.id === socket.id);
            if (player) player.score -= 5;

            // Move to end
            const idx = room.turnOrder.indexOf(socket.id);
            if (idx !== -1) {
                room.turnOrder.splice(idx, 1);
                room.turnOrder.push(socket.id);
            }
        }

        // Force start immediately
        if (startTimeouts[roomCode]) clearTimeout(startTimeouts[roomCode]);
        finalizeGameStart(roomCode);
    });

    socket.on('attemptGuess', ({ roomCode, guess }) => {
        const room = rooms[roomCode];
        if (!room || room.state !== 'VOTING') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.isImpostor) return;

        const secret = room.currentWord.trim().toLowerCase();
        const attempt = guess.trim().toLowerCase();

        if (attempt === secret) {
            // IMPOSTOR WINS
            const payload = {
                results: {},
                skipCount: 0,
                eliminatedId: null,
                gameEnded: true,
                winner: 'IMPOSTOR',
                impostorNames: room.impostorIds.map(id => room.players.find(p => p.id === id)?.nickname),
                secretWord: room.currentWord
            };
            distributePoints(room, 'IMPOSTOR');
            io.to(roomCode).emit('voteResult', payload);
            io.to(roomCode).emit('gameEnded', { leaderboard: room.players });
            room.state = 'GAME_OVER';
        } else {
            // Wrong guess
            socket.emit('guessResult', { success: false });
        }
    });

    socket.on('requestHint', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.state !== 'PLAYING') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.isImpostor) {
            socket.emit('error', 'Solo el impostor puede pedir pistas.');
            return;
        }

        player.score -= 15; // Penalty

        // Don't emit updateLobby here to prevent score leak
        // io.to(roomCode).emit('updateLobby', room.players); 

        // Send dictionary words to impostor
        const words = WORDS[room.category] || [];
        socket.emit('hintReveal', { category: room.category, words: words });
    });

    socket.on('passTurn', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.state !== 'PLAYING') return;

        const currentPlayerId = room.turnOrder[room.currentTurnIndex];
        if (socket.id !== currentPlayerId) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player.isImpostor) {
            socket.emit('error', 'Solo el impostor puede saltar turno.');
            return;
        }

        // Check if already last
        if (room.currentTurnIndex >= room.turnOrder.length - 1) {
            socket.emit('error', 'Ya eres el último, no puedes pasar más.');
            return;
        }

        // Move current turn to the end of the list
        const [skippedId] = room.turnOrder.splice(room.currentTurnIndex, 1);
        room.turnOrder.push(skippedId);

        // DO NOT increment index, effectively "passing" the slot to the next person
        // But we must notify update
        // Also check if the NEW person at this index is valid (connected)
        ensureValidTurn(roomCode);
    });

    socket.on('nextTurn', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.state !== 'PLAYING') return;

        const currentPlayerId = room.turnOrder[room.currentTurnIndex];
        if (socket.id !== currentPlayerId && socket.id !== room.admin) return;

        // room.currentTurnIndex++; // REMOVED DOUBLE INCREMENT
        advanceTurn(roomCode);
    });

    socket.on('vote', ({ roomCode, votedId }) => {
        const room = rooms[roomCode];
        if (!room || room.state !== 'VOTING') return;

        // votedId can be 'SKIP' or a playerId
        room.votes[socket.id] = votedId;

        const activePlayers = room.players.filter(p => !p.disconnected && !p.eliminated);
        const voters = Object.keys(room.votes);
        const validVoters = activePlayers.map(p => p.id);

        const currentVoters = voters.filter(id => validVoters.includes(id));

        if (currentVoters.length >= validVoters.length) {
            processVotes(roomCode);
        } else {
            io.to(roomCode).emit('updateVotes', { voteCount: currentVoters.length, total: validVoters.length });
        }
    });

    socket.on('playAgain', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.admin !== socket.id) return;
        startNewRound(roomCode, room.category, room.impostorIds.length, room.knowImpostors);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const code in rooms) {
            const room = rooms[code];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players[playerIndex].disconnected = true;
                io.to(code).emit('updateLobby', room.players);

                if (room.admin === socket.id && room.players.length > 1) {
                    const nextAdmin = room.players.find(p => !p.disconnected);
                    if (nextAdmin) {
                        room.admin = nextAdmin.id;
                        io.to(nextAdmin.id).emit('youAreAdmin');
                    }
                }
                if (room.players.every(p => p.disconnected)) {
                    delete rooms[code];
                } else if (room.state === 'VOTING') {
                    // Check if we can finish voting now that someone left
                    const activePlayers = room.players.filter(p => !p.disconnected && !p.eliminated);
                    const voters = Object.keys(room.votes);
                    const validVoters = activePlayers.map(p => p.id);
                    const currentVoters = voters.filter(id => validVoters.includes(id));

                    if (currentVoters.length >= validVoters.length) {
                        processVotes(code);
                    } else {
                        io.to(code).emit('updateVotes', { voteCount: currentVoters.length, total: validVoters.length });
                    }
                } else if (room.state === 'PLAYING') {
                    // If the disconnected player was the current turn, advance!
                    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
                    if (currentPlayerId === socket.id) {
                        advanceTurn(code);
                    }
                }
                break;
            }
        }
    });
});

const startTimeouts = {};

function startNewRound(roomCode, category, impostorCount = 1, knowImpostors = false) {
    const room = rooms[roomCode];

    // Logic for 'aleatorio': Pick a concrete category but tell clients it's 'aleatorio' (or reveal it?)
    // Requirement: "la pista que debe recibir el impostor debería saber la categoria correcta" 
    // So we pick a concrete one internally.

    let selectedCategory = category;
    if (!selectedCategory || selectedCategory === 'aleatorio') {
        selectedCategory = getRandomCategoryCode(); // e.g. 'animales'
    }

    room.category = selectedCategory; // The REAL category
    room.displayCategory = (category === 'aleatorio') ? 'aleatorio' : selectedCategory; // What was chosen

    room.currentWord = getRandomWord(room.category);
    room.roundCount = 1;
    room.gameCount++;
    room.knowImpostors = knowImpostors;

    room.players.forEach(p => {
        p.eliminated = false;
        p.isImpostor = false;
    });

    const activePlayers = room.players.filter(p => !p.disconnected);
    const count = Math.min(Math.max(1, impostorCount), Math.max(1, activePlayers.length - 1));

    // Assign Impostors
    const indexes = [];
    while (indexes.length < count) {
        const r = Math.floor(Math.random() * activePlayers.length);
        if (!indexes.includes(r)) indexes.push(r);
    }

    room.impostorIds = [];
    indexes.forEach(idx => {
        activePlayers[idx].isImpostor = true;
        room.impostorIds.push(activePlayers[idx].id);
    });

    room.turnOrder = shuffle(activePlayers.map(p => p.id));
    room.currentTurnIndex = 0;
    // Don't set state to PLAYING yet, wait for choice
    room.state = 'STARTING';

    // Emit choice to Impostors
    room.impostorIds.forEach(id => {
        io.to(id).emit('impostorChoice', { duration: 3000 });
    });

    // Notify others
    activePlayers.forEach(p => {
        if (!p.isImpostor) {
            io.to(p.id).emit('gameStarting', { duration: 3000 });
        }
    });

    // Timeout to force start if no choice
    if (startTimeouts[roomCode]) clearTimeout(startTimeouts[roomCode]);
    startTimeouts[roomCode] = setTimeout(() => {
        if (room.state === 'STARTING') {
            finalizeGameStart(roomCode);
        }
    }, 3500);
}

function finalizeGameStart(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    room.state = 'PLAYING';

    const impostorNames = room.knowImpostors ?
        room.impostorIds.map(id => room.players.find(p => p.id === id)?.nickname).filter(n => n) : [];

    // Send Role Info FIRST
    room.players.forEach(p => {
        if (p.disconnected) return;
        io.to(p.id).emit('roleInfo', {
            word: p.isImpostor ? '???' : room.currentWord,
            isImpostor: p.isImpostor,
            category: p.isImpostor ? room.category : room.displayCategory, // Impostor sees REAL category (for hints), others see 'Aleatorio' if that was chosen
            partners: (p.isImpostor && room.knowImpostors) ? impostorNames.filter(n => n !== p.nickname) : []
        });
    });

    io.to(roomCode).emit('gameStarted', {
        category: room.displayCategory, // Publicly show what was selected (e.g. Aleatorio)
        turnOrder: room.turnOrder
    });

    // Ensure first turn is valid
    ensureValidTurn(roomCode);
}

// HELPER: Recursively find next valid player
function advanceTurn(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const currentTurnOrder = room.turnOrder;
    // Move to next
    room.currentTurnIndex++;

    // Check flow
    ensureValidTurn(roomCode);
}

function ensureValidTurn(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    // Check if we reached end of list
    if (room.currentTurnIndex >= room.turnOrder.length) {
        room.state = 'VOTING';
        room.votes = {};
        io.to(roomCode).emit('gameUpdate', { state: 'VOTING', players: room.players });
        return;
    }

    const nextId = room.turnOrder[room.currentTurnIndex];
    const player = room.players.find(p => p.id === nextId);

    // If player invalid, disconnected, or eliminated (shouldn't be in list, but safety) -> next
    if (!player || player.disconnected || player.eliminated) {
        // Recurse / Skip
        advanceTurn(roomCode);
    } else {
        // Valid player found
        io.to(roomCode).emit('gameUpdate', {
            state: 'PLAYING',
            currentTurn: nextId,
            turnOrder: room.turnOrder
        });
    }
}


function processVotes(roomCode) {
    const room = rooms[roomCode];
    const votes = room.votes;
    const voteCounts = {};

    let skipVotes = 0;

    Object.values(votes).forEach(targetId => {
        if (targetId === 'SKIP') {
            skipVotes++;
        } else {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        }
    });

    let maxVotes = 0;
    let mostVotedId = null;
    let tie = false;

    for (const [id, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            mostVotedId = id;
            tie = false;
        } else if (count === maxVotes) {
            tie = true;
        }
    }

    let outcome = 'NONE';

    if (skipVotes >= maxVotes && skipVotes > 0) {
        outcome = 'SKIP';
    } else if (tie) {
        outcome = 'TIE';
    } else if (maxVotes > skipVotes) {
        outcome = 'ELIMINATED';
    } else {
        // If maxVotes == skipVotes (tie between skip and player), prefer Skip?
        // Usually tie = no elim.
        outcome = 'TIE';
    }

    const payload = {
        results: voteCounts,
        skipCount: skipVotes,
        eliminatedId: null,
        gameEnded: false,
        winner: null,
        impostorNames: room.impostorIds.map(id => room.players.find(p => p.id === id)?.nickname),
        secretWord: room.currentWord
    };

    if (outcome === 'ELIMINATED' && mostVotedId) {
        const eliminatedPlayer = room.players.find(p => p.id === mostVotedId);
        payload.eliminatedId = mostVotedId;
        eliminatedPlayer.eliminated = true;

        // Remove from TURN ORDER if eliminated
        room.turnOrder = room.turnOrder.filter(id => id !== mostVotedId);

        // CHECK WIN CONDITIONS
        const activePlayers = room.players.filter(p => !p.disconnected && !p.eliminated);
        const activeImpostors = activePlayers.filter(p => p.isImpostor);
        const activeCrew = activePlayers.filter(p => !p.isImpostor);

        if (activeImpostors.length === 0) {
            // CREW WINS - All impostors out
            payload.gameEnded = true;
            payload.winner = 'CREW';
            distributePoints(room, 'CREW');
        } else if (activeImpostors.length >= activeCrew.length) {
            // IMPOSTORS WIN - Parity or majority
            payload.gameEnded = true;
            payload.winner = 'IMPOSTOR';
            distributePoints(room, 'IMPOSTOR');
        } else {
            // Game Continues
            room.state = 'PLAYING';
            room.currentTurnIndex = 0;
            payload.gameEnded = false;
        }
    } else {
        // SKIP or TIE
        applyRoundScoring(room);

        // CHECK WIN CONDITIONS for Parity (e.g. if skip causes round to end but impostors parity reached? Unlikely unless someone disconnected)
        const activePlayers = room.players.filter(p => !p.disconnected && !p.eliminated);
        const activeImpostors = activePlayers.filter(p => p.isImpostor);
        const activeCrew = activePlayers.filter(p => !p.isImpostor);

        if (activeImpostors.length >= activeCrew.length) {
            payload.gameEnded = true;
            payload.winner = 'IMPOSTOR';
            distributePoints(room, 'IMPOSTOR');
        } else {
            room.state = 'PLAYING';
            room.currentTurnIndex = 0;
            payload.gameEnded = false;
            room.roundCount++;
        }
    }

    io.to(roomCode).emit('voteResult', payload);

    if (!payload.gameEnded) {
        setTimeout(() => {
            io.to(roomCode).emit('gameUpdate', {
                state: 'PLAYING',
                currentTurn: room.turnOrder[room.currentTurnIndex]
            });
        }, 3000);
    } else {
        io.to(roomCode).emit('gameEnded', { leaderboard: room.players });
        room.state = 'GAME_OVER';
    }
}

function applyRoundScoring(room) {
    const impostorPoints = 10;
    const crewPenalty = 5;

    room.players.forEach(p => {
        if (p.disconnected) return;
        if (p.isImpostor) {
            p.score += impostorPoints;
        } else {
            p.score = Math.max(0, p.score - crewPenalty);
        }
    });
}

function distributePoints(room, winnerSide) {
    if (winnerSide === 'IMPOSTOR') {
        const imp = room.players.find(p => p.isImpostor);
        if (imp) imp.score += 50;
    } else {
        const penaltyPerRound = 5;
        const currentBonus = Math.max(5, 25 - ((room.roundCount - 1) * penaltyPerRound));

        room.players.forEach(p => {
            if (!p.isImpostor && !p.disconnected) {
                p.score += currentBonus;
            }
        });
    }
}

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
