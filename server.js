require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

mongoose.connect(process.env.MONGO_URI);

const TorneioSchema = new mongoose.Schema({
    id_torneio: String,
    nome: String,
    vagas: Number,
    inscritos: Array,
    status: { type: String, default: 'ABERTO' }
});
const Torneio = mongoose.model('Torneio', TorneioSchema);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_TOKEN);

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'criar') {
        const id = Math.floor(1000000 + Math.random() * 9000000).toString();
        const novo = new Torneio({
            id_torneio: id,
            nome: interaction.options.getString('nome'),
            vagas: interaction.options.getInteger('vagas')
        });
        await novo.save();
        interaction.reply(`Torneio criado! ID: ${id}`);
        io.emit('novoTorneio', novo);
    }
});

app.use(express.static('public'));
app.use(express.json());

io.on('connection', (socket) => {
    socket.on('inscrever', async (data) => {
        const t = await Torneio.findOne({ id_torneio: data.id });
        if (t && t.inscritos.length < t.vagas) {
            t.inscritos.push(data.user);
            await t.save();
            if (t.inscritos.length >= t.vagas) {
                io.emit('torneioLotado', t.id_torneio);
            }
        }
    });
});

server.listen(10000, () => console.log('Servidor e Bot ativos!'));
