const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const motsHindi = require('./motsHindi'); // ✅ Liste des mots translittérés

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

// ✅ Structure des salles
const rooms = {}; // { roomId: { max: 10, joueurs: [{ id, nom }], mot, mystere } }

io.on('connection', (socket) => {
  console.log("🟢 Nouveau joueur connecté :", socket.id);

  // ✅ Création de salle par le créateur
  socket.on('creerSalle', ({ roomId, max }) => {
    if (rooms[roomId]) {
      socket.emit('erreur', "Cette salle existe déjà.");
      return;
    }

    rooms[roomId] = {
      max,
      joueurs: [],
      mot: null,
      mystere: null
    };

    socket.join(roomId);
    console.log(`🛠️ Salle ${roomId} créée pour ${max} joueurs`);
  });

  // ✅ Rejoindre une salle en tant qu'invité
  socket.on('rejoindreSalle', ({ roomId, nom }) => {
    const salle = rooms[roomId];
    if (!salle) {
      socket.emit('erreur', "Salle introuvable.");
      return;
    }

    // Vérifier si déjà plein
    if (salle.joueurs.length >= salle.max) {
      socket.emit('erreur', "La salle est complète.");
      return;
    }

    salle.joueurs.push({ id: socket.id, nom });
    socket.join(roomId);
    console.log(`👤 ${nom} a rejoint la salle ${roomId}`);

    // ✅ Démarrer automatiquement si tous les joueurs sont là
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
          io.to(joueur.id).emit('motDistribue', mot); // { hindi, english }
        }
      });

      console.log(`🎯 Mot distribué : ${mot.hindi} (${mot.english}) — Khufiya : ${salle.joueurs[indexMystere].nom}`);
    }
  });

  // ✅ Déconnexion
  socket.on('disconnect', () => {
    console.log("🔴 Joueur déconnecté :", socket.id);
    // Optionnel : retirer le joueur des salles
    for (const roomId in rooms) {
      const salle = rooms[roomId];
      salle.joueurs = salle.joueurs.filter(j => j.id !== socket.id);
    }
  });
});

// ✅ Port Railway ou local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur Khufiya lancé sur le port ${PORT}`);
});
