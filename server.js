const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const motsHindi = require('./motsHindi'); // Assure-toi que ce fichier existe

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
  console.log("🟢 Connecté :", socket.id);

  socket.on('creerSalle', ({ roomId, max, nomCreateur }) => {
    rooms[roomId] = {
      max,
      joueurs: [{ id: socket.id, nom: nomCreateur }],
      mot: null,
      mystere: null
    };
    socket.join(roomId);
    console.log(`🛠️ Salle ${roomId} créée par ${nomCreateur} pour ${max} joueurs`);
    io.to(roomId).emit('miseAJourJoueurs', rooms[roomId].joueurs.map(j => j.nom));

    // Vérifier si la salle est déjà complète (cas max = 1)
    if (rooms[roomId].joueurs.length === max) {
      demarrerPartie(roomId);
    }
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
    io.to(roomId).emit('miseAJourJoueurs', salle.joueurs.map(j => j.nom));
    console.log(`👥 Salle ${roomId} contient ${salle.joueurs.length}/${salle.max} joueurs`);

    if (salle.joueurs.length === salle.max) {
      demarrerPartie(roomId);
    }
  });

  function demarrerPartie(roomId) {
    const salle = rooms[roomId];
    console.log(`✅ Tous les joueurs sont là. Démarrage de la partie...`);
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
        console.log(`🕵️‍♂️ ${joueur.nom} est le Khufiya`);
      } else {
        io.to(joueur.id).emit('motDistribue', mot);
        console.log(`📨 ${joueur.nom} reçoit le mot : ${mot.hindi} (${mot.english})`);
      }
    });
  }

  socket.on('disconnect', () => {
    console.log("🔴 Déconnecté :", socket.id);
    for (const roomId in rooms) {
      const salle = rooms[roomId];
      const avant = salle.joueurs.length;
      salle.joueurs = salle.joueurs.filter(j => j.id !== socket.id);
      const apres = salle.joueurs.length;
      if (avant !== apres) {
        io.to(roomId).emit('miseAJourJoueurs', salle.joueurs.map(j => j.nom));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Khufiya lancé sur le port ${PORT}`);
});
