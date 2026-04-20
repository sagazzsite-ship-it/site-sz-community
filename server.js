require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const CARGO_DONO_ID = '1477827180594462741';

mongoose.connect(process.env.MONGO_URI);

const TorneioSchema = new mongoose.Schema({
    id_torneio: String,
    nome: String,
    capa: String,
    premiacao: String,
    vagas_max: { type: Number, default: 32 },
    inscritos: Array,
    status: { type: String, default: 'INSCRICOES' }, // INSCRICOES, ANDAMENTO, FINALIZADO
    vencedor: String
});

const ChatSchema = new mongoose.Schema({
    torneioId: String,
    confrontoId: String,
    mensagens: [{ user: String, msg: String, timestamp: { type: Date, default: Date.now } }]
});

const Torneio = mongoose.model('Torneio', TorneioSchema);
const Chat = mongoose.model('Chat', ChatSchema);

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

app.use(session({ secret: 'sz_community_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.static('public'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.login(process.env.DISCORD_TOKEN);

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'criar') {
        const count = await Torneio.countDocuments({ status: { $ne: 'FINALIZADO' } });
        if (count >= 4) return interaction.reply("Limite de 4 torneios simultâneos atingido!");

        const id = Math.floor(1000000 + Math.random() * 9000000).toString();
        const novo = new Torneio({
            id_torneio: id,
            nome: interaction.options.getString('nome'),
            capa: interaction.options.getString('capa'),
            premiacao: interaction.options.getString('premiacao'),
            vagas_max: 32
        });
        await novo.save();
        interaction.reply(`Torneio **${novo.nome}** criado! ID: \`${id}\``);
        io.emit('atualizar_torneios');
    }

    if (interaction.commandName === 'tirar') {
        const id = interaction.options.getString('id');
        await Torneio.deleteOne({ id_torneio: id });
        await Chat.deleteMany({ torneioId: id });
        interaction.reply(`Torneio \`${id}\` removido e dados limpos.`);
        io.emit('atualizar_torneios');
    }
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) return res.json({ logado: false });
    const isStaff = req.user.guilds && req.user.guilds.some(g => g.owner || (req.user.member && req.user.member.roles.includes(CARGO_DONO_ID)));
    res.json({ 
        logado: true, 
        user: req.user,
        isStaff: isStaff 
    });
});

app.post('/api/finalizar-confronto', async (req, res) => {
    const { torneioId, confrontoId } = req.body;
    // Lógica de limpeza: remove o chat do banco para não encher
    await Chat.deleteMany({ torneioId, confrontoId });
    res.json({ success: true });
});

io.on('connection', (socket) => {
    socket.on('join_confronto', (roomId) => socket.join(roomId));

    socket.on('send_msg', async (data) => {
        await Chat.updateOne(
            { confrontoId: data.roomId },
            { $push: { mensagens: { user: data.user, msg: data.msg } } },
            { upsert: true }
        );
        io.to(data.roomId).emit('receive_msg', data);
    });
});

server.listen(process.env.PORT || 10000, () => {
    console.log('Servidor SZ Community Online');
});
