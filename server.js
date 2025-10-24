const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const motsHindi = require('./motsHindi');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {}; // { roomId: { max, joueurs: [{ id, nom }], mot, mystere } }

io.on('connection', (socket) => {
  console.log("🟢 Connecté :", socket.id);

  socket.on('creerSalle', ({ roomId, max, nomCreateur }) => {
    if (rooms[roomId]) {
      socket.emit('erreur', "Cette salle existe déjà.");
      return;
    }

    rooms[roomId] = {
      max,
      joueurs: [{ id: socket.id, nom: nomCreateur }],
      mot: null,
      mystere: null
    };

    socket.join(roomId);
    console.log(`🛠️ Salle ${roomId} créée pour ${max} joueurs`);
  });

  socket.on('rejoindreSalle', ({ roomId, nom }) => {
    const salle = rooms[roomId];
    if (!salle) {
      socket.emit('erreur', "Salle introuvable.");
      return;
    }

    if (salle.joueurs.length >= salle.max) {
      socket.emit('erreur', "La salle est complète.");
      return;
    }

    salle.joueurs.push({ id: socket.id, nom });
    socket.join(roomId);
    console.log(`👤 ${nom} a rejoint la salle ${roomId}`);

    if (salle.joueurs.length === salle.max) {
      const mot = motsHindi[Math.floor(Math.random() * motsHindi.length)];
      const indexMystere = Math.floor(Math.random() * salle.joueurs.length);
      const mystereId = salle.joueurs[indexMystere].id;

      salle.mot = mot;
      salle.mystere = mystereId;

      salle.joueurs.forEach(joueur => {
        if (joueur.id === mystereId) {
          io.to(joueur.id).emit('tuEsLeMystere', {
            message: "Tu es le Khufiya ! Ne révèle rien."
          });
        } else {
          io.to(joueur.id).emit('motDistribue', mot);
        }
      });

      console.log(`🎯 Mot : ${mot.hindi} (${mot.english}) — Khufiya : ${salle.joueurs[indexMystere].nom}`);
    }
  });

  socket.on('disconnect', () => {
    console.log("🔴 Déconnecté :", socket.id);
    for (const roomId in rooms) {
      const salle = rooms[roomId];
      salle.joueurs = salle.joueurs.filter(j => j.id !== socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Khufiya lancé sur le port ${PORT}`);
});
