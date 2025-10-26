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
  console.log("🟢 Connecté :", socket.id);

  socket.on('creerSalle', ({ roomId, max, nomCreateur }) => {
    rooms[roomId] = {
      max,
      joueurs: [{ id: socket.id, nom: nomCreateur, elimine: false }],
      mot: null,
      mystere: null,
      votes: {},
      createurId: socket.id
    };
    socket.join(roomId);
    console.log(`🛠️ Salle ${roomId} créée par ${nomCreateur} pour ${max} joueurs`);
    io.to(roomId).emit('miseAJourJoueurs', getJoueursActifs(roomId));

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

    salle.joueurs.push({ id: socket.id, nom, elimine: false });
    socket.join(roomId);
    console.log(`👤 ${nom} a rejoint la salle ${roomId}`);
    io.to(roomId).emit('miseAJourJoueurs', getJoueursActifs(roomId));
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
    salle.votes = {};

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

  socket.on('demarrerVote', (roomId) => {
    const salle = rooms[roomId];
    if (!salle || socket.id !== salle.createurId) return;
    salle.votes = {};
    io.to(roomId).emit('voteCommence', getJoueursActifs(roomId));
    console.log(`🗳️ Vote lancé dans la salle ${roomId}`);
  });

  socket.on('voteContre', ({ roomId, cibleId }) => {
    const salle = rooms[roomId];
    if (!salle || salle.votes[socket.id]) return;

    salle.votes[socket.id] = cibleId;
    console.log(`📥 ${socket.id} vote contre ${cibleId}`);

    const votants = Object.keys(salle.votes).length;
    const total = getJoueursActifs(roomId).length;

    if (votants === total) {
      const resultats = {};
      Object.values(salle.votes).forEach(id => {
        resultats[id] = (resultats[id] || 0) + 1;
      });

      const [elimineId, voix] = Object.entries(resultats).sort((a, b) => b[1] - a[1])[0];
      const joueur = salle.joueurs.find(j => j.id === elimineId);

      if (joueur) {
        joueur.elimine = true;
        io.to(roomId).emit('joueurElimine', { id: elimineId, nom: joueur.nom });
        console.log(`❌ ${joueur.nom} éliminé avec ${voix} voix`);

        if (elimineId === salle.mystere) {
          io.to(roomId).emit('finPartie', {
            message: `🎯 Le Khufiya (${joueur.nom}) a été éliminé !`
          });
          console.log(`🏁 Fin de partie : le Khufiya ${joueur.nom} a été trouvé`);
        } else {
          io.to(roomId).emit('miseAJourJoueurs', getJoueursActifs(roomId));
        }
      }
    }
  });

  socket.on('rejouer', (roomId) => {
    const salle = rooms[roomId];
    if (!salle || socket.id !== salle.createurId) return;

    salle.votes = {};
    salle.joueurs = salle.joueurs.filter(j => !j.elimine);
    salle.joueurs.forEach(j => j.elimine = false);
    demarrerPartie(roomId);
    console.log(`🔁 Nouvelle partie relancée dans la salle ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log("🔴 Déconnecté :", socket.id);
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
  console.log(`🚀 Serveur Khufiya lancé sur le port ${PORT}`);
});
