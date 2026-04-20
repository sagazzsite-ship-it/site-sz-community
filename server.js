require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONFIGURAÇÕES FIXAS ---
const ID_CARGO_DONO = '1477827180594462741';
const PORT = process.env.PORT || 10000;

// --- CONEXÃO MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Conectado'))
    .catch(err => console.error('❌ Erro Mongo:', err));

const TorneioSchema = new mongoose.Schema({
    id_aleatorio: String,
    nome: String,
    vagas: Number,
    premiacao: String,
    status: { type: String, default: 'ABERTO' }, // ABERTO, EM_ANDAMENTO, FINALIZADO
    inscritos: Array
});

const ChatSchema = new mongoose.Schema({
    torneioId: String,
    confrontoId: String,
    mensagens: [{ user: String, msg: String, time: { type: Date, default: Date.now } }]
});

const Torneio = mongoose.model('Torneio', TorneioSchema);
const Chat = mongoose.model('Chat', ChatSchema);

// --- ESTRATÉGIA DISCORD ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds', 'guilds.members.read']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

app.use(session({
    secret: 'sz_secret_key',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.static('public'));

// --- BOT DO DISCORD ---
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] 
});

client.on('ready', () => console.log(`🤖 Bot ${client.user.tag} Online`));

// Comandos de Gerenciamento (Simplificado para o Server)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'criar') {
        const ativos = await Torneio.countDocuments({ status: { $ne: 'FINALIZADO' } });
        if (ativos >= 4) return interaction.reply("❌ Limite de 4 torneios atingido!");

        const idGerado = Math.floor(1000000 + Math.random() * 9000000).toString();
        const novoTorneio = new Torneio({
            id_aleatorio: idGerado,
            nome: interaction.options.getString('nome'),
            vagas: interaction.options.getInteger('vagas'),
            premiacao: interaction.options.getString('premiacao')
        });

        await novoTorneio.save();
        interaction.reply(`🏆 Torneio criado! ID: \`${idGerado}\``);
        io.emit('att_torneios');
    }
});

client.login(process.env.DISCORD_TOKEN);

// --- ROTAS API ---

// Autenticação
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

// Info do Usuário (O Script.js usa isso para liberar os botões)
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        const roles = req.user.member ? req.user.member.roles : [];
        const isStaff = roles.includes(ID_CARGO_DONO) || req.user.id === 'SEU_ID_PESSOAL';
        
        res.json({ 
            logado: true, 
            user: req.user,
            isStaff: isStaff
        });
    } else {
        res.json({ logado: false });
    }
});

// Finalizar e Limpar Chat (Auto-exclusão para não encher o Mongo)
app.post('/api/finalizar-confronto', async (req, res) => {
    const { torneioId, confrontoId } = req.body;
    try {
        await Chat.deleteMany({ torneioId, confrontoId });
        res.json({ success: true, message: "Banco limpo." });
    } catch (err) {
        res.status(500).json({ error: "Erro ao limpar." });
    }
});

// --- SOCKET.IO (Chat e Realtime) ---
io.on('connection', (socket) => {
    socket.on('join_confronto', (roomId) => socket.join(roomId));

    socket.on('send_msg', async (data) => {
        // Salva temporário
        await Chat.updateOne(
            { confrontoId: data.roomId },
            { $push: { mensagens: { user: data.user, msg: data.msg } } },
            { upsert: true }
        );
        io.to(data.roomId).emit('receive_msg', data);
    });
});

server.listen(PORT, () => console.log(`🚀 SZ Community rodando na porta ${PORT}`));
