const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// CONFIGURAÇÃO DO BANCO DE DATAS (MongoDB)
// Substitua pela sua URL do MongoDB Atlas
const MONGO_URI = "sua_mongodb_uri_aqui"; 
mongoose.connect(MONGO_URI)
    .then(() => console.log("DB COMMUNIDADE SZ: CONECTADO"))
    .catch(err => console.error("ERRO DB:", err));

// MODELO DE USUÁRIO
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    discordId: { type: String, default: null },
    role: { type: String, default: 'player' }, // player ou admin
    stats: {
        vitorias: { type: Number, default: 0 },
        torneios: { type: Number, default: 0 }
    }
});
const User = mongoose.model('User', UserSchema);

// MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'sz_secret_key_777',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// CONFIGURAÇÃO PASSPORT (DISCORD)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

passport.use(new DiscordStrategy({
    clientID: 'SEU_CLIENT_ID',
    clientSecret: 'SEU_CLIENT_SECRET',
    callbackURL: 'http://localhost:3000/auth/discord/callback',
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
            // Se não existe, você pode vincular ou criar um novo
            // Aqui vamos apenas retornar o perfil para tratar na rota
        }
        return done(null, user || profile);
    } catch (err) {
        return done(err, null);
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ROTAS DE AUTENTICAÇÃO (API)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await User.findOne({ username: username.toLowerCase() });
        
        if (existing) return res.json({ success: false, message: "USUÁRIO JÁ EXISTE" });

        const hashed = await bcrypt.hash(password, 10);
        const newUser = new User({
            username: username.toLowerCase(),
            password: hashed
        });

        await newUser.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "ERRO NO SERVIDOR" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) return res.json({ success: false, message: "USUÁRIO NÃO ENCONTRADO" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: "SENHA INCORRETA" });

        req.session.userId = user._id;
        req.session.username = user.username;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "ERRO NO LOGIN" });
    }
});

app.get('/api/user', async (req, res) => {
    if (!req.session.userId) return res.json({ logged: false });
    
    const user = await User.findById(req.session.userId);
    res.json({
        logged: true,
        username: user.username,
        id: user._id,
        isStaff: user.role === 'admin'
    });
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/'); // Sucesso na sincronização
});

// MONITOR DE CONEXÃO
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`--- SISTEMA SZ ONLINE ---`);
    console.log(`LOCAL: http://localhost:${PORT}`);
});
// ARMAZENAMENTO TEMPORÁRIO (EM MEMÓRIA)
let inscritos = [];
let grupos = {}; // { 'CODIGO': { nome: 'NOME', membros: [], lider: 'ID' } }
let torneioAtivo = { ativo: true, nome: 'TORNEIO SZ 3V3', premio: '5000 GEMAS' };

io.on('connection', (socket) => {
    console.log(`NOVA CONEXÃO: ${socket.id}`);

    // REGISTRO DE SESSÃO
    socket.on('register_session', (data) => {
        socket.userData = data;
        console.log(`USUÁRIO ${data.username} SINCRONIZADO NO SOCKET`);
    });

    // LÓGICA DE INSCRIÇÃO (API + SOCKET)
    app.post('/api/torneio/inscrever', (req, res) => {
        if (!req.session.userId) return res.json({ success: false, message: "FAÇA LOGIN PRIMEIRO" });
        
        const username = req.session.username;
        if (!inscritos.includes(username)) {
            inscritos.push(username);
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "VOCÊ JÁ ESTÁ INSCRITO" });
        }
    });

    app.get('/api/torneio/status', (req, res) => {
        res.json({
            ativo: torneioAtivo.ativo,
            nome: torneioAtivo.nome,
            premio: torneioAtivo.premio,
            inscrito: inscritos.includes(req.session.username)
        });
    });

    // LÓGICA DE GRUPOS (IMAGENS 2 E 3)
    app.post('/api/grupo/criar', (req, res) => {
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
        const grupo = grupos[codigo];

        if (grupo && grupo.membros.length < 3) {
            grupo.membros.push(req.session.username);
            socket.join(codigo);
            res.json({ success: true });
            io.to(codigo).emit('group_update', grupo);
        } else {
            res.json({ success: false, message: "GRUPO INVÁLIDO OU LOTADO" });
        }
    });

    // CHAT DO TORNEIO (IMAGENS 4 E 5)
    socket.on('send_msg', (data) => {
        // Envia para todos na sala (ou global se preferir)
        io.emit('receive_msg', {
            usuario: data.usuario,
            texto: data.texto,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // GESTÃO DE CONFRONTOS (IMAGEM 7 E 8)
    socket.on('admin_start_round', (confrontos) => {
        // Recebe os confrontos do Bot/Staff e manda pro site
        // Exemplo: [{ timeA: ['User1'], timeB: ['User2'] }]
        io.emit('update_matches', confrontos);
    });

    // CHAVEAMENTO (IMAGEM 9)
    socket.on('get_bracket_data', () => {
        const fakeBracket = {
            rounds: [
                {
                    matches: [
                        { p1: 'TIME SZ', p2: 'TIME B', winner: 'TIME SZ' },
                        { p1: 'TIME C', p2: 'TIME D', winner: 'TIME D' }
                    ]
                },
                {
                    matches: [
                        { p1: 'TIME SZ', p2: 'TIME D', winner: null }
                    ]
                }
            ]
        };
        socket.emit('update_bracket', fakeBracket);
    });

    // VITÓRIA FINAL (IMAGEM 10)
    socket.on('set_winner', (winnerName) => {
        io.emit('tournament_winner', { username: winnerName });
    });

    socket.on('disconnect', () => {
        console.log(`CONEXÃO ENCERRADA: ${socket.id}`);
    });
});

// ERROR HANDLER PARA EVITAR QUEDAS
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('ERRO INTERNO NO SERVIDOR SZ');
});
