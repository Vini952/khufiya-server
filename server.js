const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

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

// Logique de jeu
io.on('connection', (socket) => {
  console.log("Un joueur connecté :", socket.id);

  socket.on('ping', () => {
    socket.emit('pong', 'Serveur Khufiya actif !');
  });
});

// Utiliser le port Railway ou 3000 en local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur Khufiya lancé sur le port ${PORT}`);
});
