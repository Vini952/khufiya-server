const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

io.on('connection', (socket) => {
  console.log("🟢 Connecté :", socket.id);

  socket.on('creerSalle', ({ roomId, max, nomCreateur }) => {
    rooms[roomId] = {
      max,
      joueurs: [{ id: socket.id, nom: nomCreateur, elimine: false }],
      votes: {},
      createurId: socket.id
    };
    socket.join(roomId);
    io.to(roomId).emit('miseAJourJoueurs', getJoueursActifs(roomId));
  });

  socket.on('rejoindreSalle', ({ roomId, nom }) => {
    const salle = rooms[roomId];
    if (!salle || salle.joueurs.length >= salle.max) return;
    salle.joueurs.push({ id: socket.id, nom, elimine: false });
    socket.join(roomId);
    io.to(roomId).emit('miseAJourJoueurs', getJoueursActifs(roomId));
  });

  socket.on('demarrerVote', ({ roomId }) => {
    const salle = rooms[roomId];
    if (!salle || socket.id !== salle.createurId) return;
    salle.votes = {};
    const joueursActifs = getJoueursActifs(roomId);
    io.to(roomId).emit('voteCommence', joueursActifs);
  });

  socket.on('voteContre', ({ roomId, cibleId }) => {
    const salle = rooms[roomId];
    if (!salle || salle.votes[socket.id]) return;
    salle.votes[socket.id] = cibleId;

    const votants = Object.keys(salle.votes).length;
    const total = getJoueursActifs(roomId).length;

    if (votants === total) {
      const resultats = {};
      Object.values(salle.votes).forEach(id => {
        resultats[id] = (resultats[id] || 0) + 1;
      });

      const [elimineId] = Object.entries(resultats).sort((a, b) => b[1] - a[1])[0];
      const joueur = salle.joueurs.find(j => j.id === elimineId);
      if (joueur) {
        joueur.elimine = true;
        salle.votes = {};
        io.to(roomId).emit('joueurElimine', { id: elimineId, nom: joueur.nom });
        io.to(salle.createurId).emit('autoriserVote');
      }
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const salle = rooms[roomId];
      salle.joueurs = salle.joueurs.filter(j => j.id !== socket.id);
      io.to(roomId).emit('miseAJourJoueurs', getJoueursActifs(roomId));
    }
  });

  function getJoueursActifs(roomId) {
    return rooms[roomId].joueurs.filter(j => !j.elimine).map(j => ({ id: j.id, nom: j.nom }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur de test lancé sur le port ${PORT}`);
});
