const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const motsHindi = require('./motsHindi');
const mot = motsHindi[Math.floor(Math.random() * motsHindi.length)];
socket.emit('motDistribue', mot); // mot.hindi et mot.english

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

// Liste de mots Hindi avec traduction
const motsHindi = [
  { hindi: "सेब", english: "Apple" },
  { hindi: "केला", english: "Banana" },
  { hindi: "भारत", english: "India" },
  { hindi: "कुर्सी", english: "Chair" },
  { hindi: "पंखा", english: "Fan" },
  { hindi: "नारियल", english: "Coconut" },
  { hindi: "अमरूद", english: "Guava" },
  { hindi: "जापान", english: "Japan" },
  { hindi: "दरवाज़ा", english: "Door" },
  { hindi: "घड़ी", english: "Watch" },
  // Ajoute-en autant que tu veux ici...
];

// Logique de jeu
io.on('connection', (socket) => {
  console.log("Un joueur connecté :", socket.id);

  socket.on('ping', () => {
    socket.emit('pong', 'Serveur Khufiya actif !');
  });

  socket.on('creerSalle', ({ joueurs }) => {
    console.log("Salle créée avec :", joueurs);

    // Choisir un mot aléatoire
    const mot = motsHindi[Math.floor(Math.random() * motsHindi.length)];

    // Choisir un joueur mystère au hasard
    const indexMystere = Math.floor(Math.random() * joueurs.length);
    const joueurMystere = joueurs[indexMystere];

    // Envoyer le mot à tous sauf le joueur mystère
    joueurs.forEach((nom, i) => {
      const idSocket = Object.values(io.sockets.sockets)[i]?.id;
      if (!idSocket) return;

      if (nom === joueurMystere) {
        io.to(idSocket).emit('tuEsLeMystere', { message: "Tu es le joueur mystère !" });
      } else {
        io.to(idSocket).emit('motDistribue', mot);
      }
    });

    console.log(`Mot choisi : ${mot.hindi} (${mot.english}) — Mystère : ${joueurMystere}`);
  });
});

// Utiliser le port Railway ou 3000 en local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur Khufiya lancé sur le port ${PORT}`);
});
