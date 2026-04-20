require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// CONEXÃO COM MONGODB VIA ENV
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB COMMUNIDADE SZ: CONECTADO VIA ENV"))
    .catch(err => console.error("ERRO CRÍTICO NO BANCO DE DADOS:", err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    discordId: { type: String, default: null },
    role: { type: String, default: 'player' },
    stats: {
        vitorias: { type: Number, default: 0 },
        torneios: { type: Number, default: 0 }
    }
});
const User = mongoose.model('User', UserSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'sz_default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Mude para true se usar HTTPS
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        return done(null, user || profile);
    } catch (err) {
        return done(err, null);
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const nomeLimpo = username.toLowerCase().trim();
        const existing = await User.findOne({ username: nomeLimpo });
        
        if (existing) return res.json({ success: false, message: "ESTE USUÁRIO JÁ EXISTE!" });

        const hashed = await bcrypt.hash(password, 10);
        const newUser = new User({
            username: nomeLimpo,
            password: hashed
        });

        await newUser.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "ERRO AO SALVAR NO BANCO" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username.toLowerCase().trim() });

        if (!user) return res.json({ success: false, message: "USUÁRIO NÃO ENCONTRADO" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: "SENHA INCORRETA" });

        req.session.userId = user._id;
        req.session.username = user.username;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "ERRO NO PROCESSAMENTO" });
    }
});

app.get('/api/user', async (req, res) => {
    if (!req.session.userId) return res.json({ logged: false });
    
    try {
        const user = await User.findById(req.session.userId);
        res.json({
            logged: true,
            username: user.username,
            id: user._id,
            role: user.role,
            isStaff: user.role === 'admin'
        });
    } catch (err) {
        res.json({ logged: false });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`SISTEMA SZ RODANDO NA PORTA ${PORT}`);
    console.log(`=================================\n`);
});
let inscritos = [];
let grupos = {}; 
let torneioAtivo = { ativo: true, nome: 'TORNEIO SZ 3V3', premio: '5000 GEMAS' };

io.on('connection', (socket) => {
    console.log(`CONEXÃO SOCKET ATIVA: ${socket.id}`);

    socket.on('register_session', (data) => {
        socket.userData = data;
        socket.join('global_sz');
    });

    app.post('/api/torneio/inscrever', (req, res) => {
        if (!req.session.userId) return res.json({ success: false, message: "FAÇA LOGIN" });
        
        const username = req.session.username;
        if (!inscritos.includes(username)) {
            inscritos.push(username);
            io.emit('log_evento', `${username} se inscreveu no torneio!`);
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "JÁ INSCRITO" });
        }
    });

    app.get('/api/torneio/status', async (req, res) => {
    try {
        // Agora o servidor vai lá no MongoDB buscar o torneio que você criou manualmente
        const torneioNoBanco = await Torneio.findOne({ ativo: true });

        if (!torneioNoBanco) {
            // Se você não tiver colocado o JSON no banco ainda, ele retorna isso:
            return res.json({ ativo: false, message: "NENHUM TORNEIO ENCONTRADO NO BANCO" });
        }

        res.json({
            ativo: true,
            nome: torneioNoBanco.nome,
            premio: torneioNoBanco.premio,
            // Verifica se o usuário logado na sessão está na lista de inscritos (em memória)
            inscrito: req.session.username ? inscritos.includes(req.session.username) : false
        });
    } catch (err) {
        console.error("Erro ao acessar coleção torneios:", err);
        res.status(500).json({ success: false, message: "ERRO INTERNO NO BANCO DE DADOS" });
    }
});

    app.post('/api/grupo/criar', (req, res) => {
        if (!req.session.userId) return res.json({ success: false });
        const { nome } = req.body;
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        grupos[codigo] = {
            nome: nome,
            lider: req.session.username,
            membros: [req.session.username]
        };
        
        socket.join(codigo);
        res.json({ success: true, codigo: codigo });
    });

    app.post('/api/grupo/entrar', (req, res) => {
        const { codigo } = req.body;
        const grupo = grupos[codigo.toUpperCase()];

        if (grupo && grupo.membros.length < 3) {
            if (!grupo.membros.includes(req.session.username)) {
                grupo.membros.push(req.session.username);
            }
            socket.join(codigo.toUpperCase());
            io.to(codigo.toUpperCase()).emit('group_update', grupo);
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "CÓDIGO INVÁLIDO OU GRUPO CHEIO" });
        }
    });

    socket.on('send_msg', (data) => {
        io.emit('receive_msg', {
            usuario: data.usuario || "Anônimo",
            texto: data.texto,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    socket.on('admin_update_matches', (confrontos) => {
        io.emit('update_matches', confrontos);
    });

    socket.on('get_bracket_data', () => {
        const bracketStatic = {
            rounds: [
                {
                    matches: [
                        { p1: 'TIME SZ', p2: 'TIME ALFA', winner: 'TIME SZ' },
                        { p1: 'TIME BETA', p2: 'TIME GAMA', winner: 'TIME GAMA' }
                    ]
                },
                {
                    matches: [
                        { p1: 'TIME SZ', p2: 'TIME GAMA', winner: null }
                    ]
                }
            ]
        };
        socket.emit('update_bracket', bracketStatic);
    });

    socket.on('set_winner_global', (winnerName) => {
        io.emit('tournament_winner', { username: winnerName });
    });

    socket.on('disconnect', () => {
        console.log(`SOCKET DESCONECTADO: ${socket.id}`);
    });
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

process.on('uncaughtException', (err) => {
    console.error('ERRO NÃO TRATADO NO SERVER:', err);
});
