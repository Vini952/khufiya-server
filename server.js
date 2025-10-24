// Importation des modules nécessaires
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Initialisation de l'application
const app = express();
app.use(cors());

// Création du serveur HTTP
const server = http.createServer(app);

// Initialisation de Socket.IO
const io = new Server(server, {
  cors: { origin: "*" }
});

// Logique de jeu (exemple simplifié)
io.on('connection', (socket) => {
  console.log("Un joueur connecté :", socket.id);

  socket.on('ping', () => {
    socket.emit('pong', 'Serveur Khufiya actif !');
  });
});

// Lancement du serveur
server.listen(3000, () => {
  console.log("Serveur Khufiya lancé sur le port 3000");
});
