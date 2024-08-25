const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocket.Server({ server });

  const games = new Map();

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      const data = JSON.parse(message);
     
      if (data.type === 'join') {
        let game = games.get(data.gameId);
        if (!game) {
          game = {
            players: [],
            currentPlayer: 'A',
            pieces: [
              { id: 'A-P1', player: 'A', type: 'Pawn', position: 0 },
              { id: 'A-P2', player: 'A', type: 'Pawn', position: 1 },
              { id: 'A-H1', player: 'A', type: 'Hero1', position: 2 },
              { id: 'A-H2', player: 'A', type: 'Hero2', position: 3 },
              { id: 'A-P3', player: 'A', type: 'Pawn', position: 4 },
              { id: 'B-P1', player: 'B', type: 'Pawn', position: 20 },
              { id: 'B-P2', player: 'B', type: 'Pawn', position: 21 },
              { id: 'B-H1', player: 'B', type: 'Hero1', position: 22 },
              { id: 'B-H2', player: 'B', type: 'Hero2', position: 23 },
              { id: 'B-P3', player: 'B', type: 'Pawn', position: 24 },
            ]
          };
          games.set(data.gameId, game);
        }
       
        if (game.players.length < 2) {
          game.players.push(ws);
          ws.send(JSON.stringify({ type: 'joined', player: game.players.length === 1 ? 'A' : 'B' }));
         
          if (game.players.length === 2) {
            game.players.forEach((player, index) => {
              player.send(JSON.stringify({ type: 'start', currentPlayer: game.currentPlayer, pieces: game.pieces }));
            });
          }
        } else {
          ws.send(JSON.stringify({ type: 'full' }));
        }
      } else if (data.type === 'move') {
        const game = games.get(data.gameId);
        if (game) {
          game.pieces = data.pieces;
          game.currentPlayer = data.currentPlayer;
          game.players.forEach(player => {
            if (player !== ws) {
              player.send(JSON.stringify({ type: 'update', currentPlayer: game.currentPlayer, pieces: game.pieces }));
            }
          });
        }
      }
    });

    ws.on('close', () => {
      for (let [gameId, game] of games) {
        const index = game.players.indexOf(ws);
        if (index !== -1) {
          game.players.splice(index, 1);
          if (game.players.length === 0) {
            games.delete(gameId);
          } else {
            game.players[0].send(JSON.stringify({ type: 'opponent_left' }));
          }
          break;
        }
      }
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
