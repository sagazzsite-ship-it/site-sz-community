require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- BANCO DE DADOS ---
mongoose.connect(process.env.MONGO_URI);

const TorneioSchema = new mongoose.Schema({
    id_aleatorio: String,
    nome: String,
    vagas: Number,
    premiacao: String,
    status: { type: String, default: 'INSCRIÇÕES' },
    brackets: { type: Object, default: {} }
});
const Torneio = mongoose.model('Torneio', TorneioSchema);

const ChatSchema = new mongoose.Schema({
    torneioId: String,
    confrontoId: String, // Ex: "T1vsT2"
    mensagens: [{ user: String, msg: String, time: { type: Date, default: Date.now } }]
});
const Chat = mongoose.model('Chat', ChatSchema);

// --- LOGIN DISCORD (Passport) ---
passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds.members.read']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(session({ secret: 'sz-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.static('public'));

// --- MIDDLEWARE STAFF ---
const ID_CARGO_DONO = '1477827180594462741';
function checkStaff(req, res, next) {
    if (req.isAuthenticated()) {
        // Lógica simplificada: você deve validar se o user tem o cargo no seu servidor
        return next(); 
    }
    res.redirect('/auth/discord');
}

// --- ROTAS ---
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));

// Rota para o Dono finalizar e limpar o banco
app.post('/api/finalizar-confronto', checkStaff, async (req, res) => {
    const { torneioId, confrontoId } = req.body;
    await Chat.deleteMany({ torneioId, confrontoId }); // LIMPEZA AUTOMÁTICA
    res.json({ success: true, message: "Chat limpo e banco otimizado." });
});

// --- SOCKET.IO (Chat em Tempo Real) ---
io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => socket.join(roomId));
    
    socket.on('send-msg', async (data) => {
        // Salva no banco temporariamente
        await Chat.updateOne(
            { confrontoId: data.roomId },
            { $push: { mensagens: { user: data.user, msg: data.msg } } },
            { upsert: true }
        );
        io.to(data.roomId).emit('new-msg', data);
    });
});

server.listen(process.env.PORT || 3000, () => console.log('🚀 SZ Online'));
