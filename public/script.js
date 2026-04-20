const socket = io();
let usuarioLogado = false;

function mudarAba(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function atualizarNota(texto) {
    document.getElementById('nota-rodape').innerText = `NOTA: ${texto}`;
}

function fazerLogin() {
    const user = document.getElementById('user-login').value;
    if(user) {
        usuarioLogado = true;
        alert("Logado com sucesso!");
        atualizarNota(`LOGADO COMO ${user.toUpperCase()}`);
        mudarAba('torneios');
    }
}

function tentarInscrever() {
    if (!usuarioLogado) {
        alert("VOCÊ PRECISA ESTAR LOGADO PARA CONCORRER!");
        mudarAba('inicio');
        return;
    }
    // Muda para a tela de espera SEM criar grupo automaticamente
    document.getElementById('tela-inscricao').style.display = 'none';
    document.getElementById('tela-pos-inscricao').style.display = 'block';
    atualizarNota("VOCÊ SE INSCREVEU. CRIE UM GRUPO OU ENTRE EM UM.");
}

function abrirModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function confirmarCriarGrupo() {
    const nome = document.getElementById('group-name-input').value;
    if (nome) {
        document.getElementById('modal-criar').style.display = 'none';
        atualizarNota(`SEU GRUPO ${nome.toUpperCase()} FOI CRIADO! ENVIE O CODIGO PARA UM AMIGO`);
        // Aqui você exibiria o código gerado como na imagem 3
    }
}

// Escuta o Bot do Discord (Somente o Bot inicia o torneio)
socket.on('torneio_iniciado', (dados) => {
    document.getElementById('status-torneio').innerText = "RODADA AO VIVO: USUARIO VS USER";
    atualizarNota("O TORNEIO COMEÇOU! ENVIE O CODIGO DA SALA NO CHAT");
});
