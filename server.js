const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const motsHindi = require('./motsHindi'); // ✅ Import des mots

const app = express();
app.use(cors());

// Servir les fichiers statiques du dossier frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Route principale pour servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// Stocker les salles et leurs joueurs
const rooms = {};

io.on('connection', (socket) => {
  console.log("Un joueur connecté :", socket.id);

  socket.on('ping', () => {
    socket.emit('pong', 'Serveur Khufiya actif !');
  });

  // Création de salle
  socket.on('creerSalle', ({ joueurs, roomId }) => {
    console.log(`Salle ${roomId} créée avec :`, joueurs);

    rooms[roomId] = joueurs;

    // Choisir un mot aléatoire
    const mot = motsHindi[Math.floor(Math.random() * motsHindi.length)];

    // Choisir un joueur mystère
    const indexMystere = Math.floor(Math.random() * joueurs.length);
    const joueurMystere = joueurs[indexMystere];

    // Distribuer le mot à tous sauf au mystère
    joueurs.forEach((nom, i) => {
      const idSocket = Object.values(io.sockets.sockets)[i]?.id;
      if (!idSocket) return;

      if (nom === joueurMystere) {
        io.to(idSocket).emit('tuEsLeMystere', {
          message: "Tu es le Khufiya ! Ne révèle rien.",
        });
      } else {
        io.to(idSocket).emit('motDistribue', mot); // mot.hindi et mot.english
      }
    });

    console.log(`Mot : ${mot.hindi} (${mot.english}) — Mystère : ${joueurMystere}`);
  });
});

// Utiliser le port Railway ou 3000 en local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur Khufiya lancé sur le port ${PORT}`);
});

