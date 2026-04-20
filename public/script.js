const socket = io();
let logado = false;
let userDados = null;

function atualizarNota(texto) {
    const nota = document.getElementById('footer-nota');
    if (nota) nota.innerText = `NOTA: ${texto}`;
}

function mudarAba(abaId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(abaId).style.display = 'block';
}

function acaoLogin(e) {
    e.preventDefault();
    const nome = document.getElementById('user-input').value;
    if (nome) {
        logado = true;
        userDados = { nome };
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('user-profile').style.display = 'block';
        document.getElementById('display-username').innerText = nome;
        atualizarNota("VOCE ESTA CONECTADO");
    }
}

function participarTorneio() {
    if (!logado) {
        alert("Faca login no Inicio primeiro!");
        mudarAba('inicio');
        return;
    }
    document.getElementById('aba-inscricao').style.display = 'none';
    document.getElementById('aba-grupo-espera').style.display = 'block';
    atualizarNota("VOCE SE INSCREVEU. AGUARDE O INICIO.");
}

function acaoCriarGrupo() {
    const nomeG = document.getElementById('group-name').value;
    if (nomeG.length > 0 && nomeG.length <= 5) {
        const code = Math.random().toString(36).substring(7).toUpperCase();
        document.getElementById('modal-criacao').style.display = 'none';
        document.getElementById('group-controls').style.display = 'none';
        document.getElementById('room-info').style.display = 'block';
        document.getElementById('room-code').innerText = code;
        atualizarNota(`GRUPO CRIADO: ${nomeG}. CODIGO: ${code}`);
    }
}

function abrirModal(id) {
    document.getElementById(id).style.display = 'flex';
}

socket.on('torneioLotado', (id) => {
    document.getElementById('status-live').innerText = "RODADA AO VIVO INICIADA";
    atualizarNota("O TORNEIO COMECOU!");
});

window.onload = () => {
    mudarAba('inicio');
    atualizarNota("BEM VINDO A COMMUNIDADE SZ");
};
