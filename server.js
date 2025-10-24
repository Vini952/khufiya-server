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

const rooms = {};

io.on('connection', (socket) => {
  console.log("🟢 Nouveau joueur connecté :", socket.id);

  socket.on('creerSalle', ({ roomId, max, nomCreateur }) => {
    console.log(`🛠️ Création de la salle ${roomId} pour ${max} joueurs`);
    rooms[roomId] = {
      max,
      joueurs: [{ id: socket.id, nom: nomCreateur }],
      mot: null,
      mystere: null
    };
    socket.join(roomId);
    io.to(roomId).emit('miseAJourJoueurs', rooms[roomId].joueurs.map(j => j.nom));
  });

  socket.on('rejoindreSalle', ({ roomId, nom }) => {
    const salle = rooms[roomId];
    if (!salle) {
      console.log(`❌ Salle ${roomId} introuvable`);
      socket.emit('erreur', "Salle introuvable.");
      return;
    }

    if (salle.joueurs.length >= salle.max) {
      console.log(`❌ Salle ${roomId} est pleine`);
      socket.emit('erreur', "La salle est complète.");
      return;
    }

    salle.joueurs.push({ id: socket.id, nom });
    socket.join(roomId);
    console.log(`👤 ${nom} a rejoint la salle ${roomId}`);
    io.to(roomId).emit('miseAJourJoueurs', salle.joueurs.map(j => j.nom));

    if (salle.joueurs.length === salle.max) {
      console.log(`✅ Tous les joueurs sont là pour ${roomId}. Démarrage...`);
      const mot = motsHindi[Math.floor(Math.random() * motsHindi.length)];
      const indexMystere = Math.floor(Math.random() * salle.joueurs.length);
      const mystereId = salle.joueurs[indexMystere].id;

      salle.mot = mot;
      salle.mystere = mystereId;

      salle.joueurs.forEach(joueur => {
        if (joueur.id === mystereId) {
          console.log(`🕵️‍♂️ ${joueur.nom} est le Khufiya`);
          io.to(joueur.id).emit('tuEsLeMystere', {
            message: "Tu es le Khufiya ! Ne révèle rien."
          });
        } else {
          console.log(`📨 ${joueur.nom} reçoit le mot : ${mot.hindi} (${mot.english})`);
          io.to(joueur.id).emit('motDistribue', mot);
        }
      });
    }
  });

  socket.on('disconnect', () => {
    console.log("🔴 Déconnecté :", socket.id);
    for (const roomId in rooms) {
      const salle = rooms[roomId];
      const avant = salle.joueurs.length;
      salle.joueurs = salle.joueurs.filter(j => j.id !== socket.id);
      const apres = salle.joueurs.length;
      if (avant !== apres) {
        console.log(`🔄 Mise à jour de la salle ${roomId} après déconnexion`);
        io.to(roomId).emit('miseAJourJoueurs', salle.joueurs.map(j => j.nom));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Khufiya lancé sur le port ${PORT}`);
});
