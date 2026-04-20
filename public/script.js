const socket = io();
let logado = false;
let userDados = null;

// FUNÇÃO PARA ATUALIZAR A NOTA NO RODAPÉ
function atualizarNota(texto) {
    const elemento = document.getElementById('nota-rodape');
    if (elemento) elemento.innerText = `NOTA: ${texto}`;
}

// TROCA DE ABAS (INICIO, TORNEIOS, ETC)
function mudarAba(id) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.style.display = 'none');
    
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
        atualizarNota(`VOCÊ ESTÁ EM: ${id.toUpperCase()}`);
    }
}

// ALTERNAR ENTRE TELA DE LOGIN E CADASTRO (IMAGEM 4 E 5)
function alternarLogin(queroLogar) {
    const infoBox = document.getElementById('info-login-box');
    const formCadastro = document.getElementById('form-cadastro');
    const formLogin = document.getElementById('form-login');

    if (queroLogar) {
        infoBox.style.display = 'none';
        formCadastro.style.display = 'none';
        formLogin.style.display = 'block';
    } else {
        infoBox.style.display = 'block';
        formCadastro.style.display = 'block';
        formLogin.style.display = 'none';
    }
}

// VERIFICA SE O USUARIO JÁ ESTÁ LOGADO AO ENTRAR NO SITE
async function checarSessao() {
    try {
        const res = await fetch('/api/user');
        const data = await res.json();
        
        if (data.logado) {
            logado = true;
            userDados = data.user;
            
            // Se for Staff, mostra o botão de Manager
            if (data.isStaff) {
                document.getElementById('btn-manager-staff').style.display = 'block';
            }

            // Esconde formulários e mostra que está logado
            document.getElementById('form-cadastro').innerHTML = `<h2 class="destaque">BEM-VINDO DE VOLTA, ${data.user.username.toUpperCase()}!</h2>`;
            document.getElementById('info-login-box').innerHTML = `<h1>VOCÊ JÁ ESTÁ CONECTADO À SZ</h1>`;
            
            atualizarNota(`LOGADO COMO ${data.user.username.toUpperCase()}`);
        }
    } catch (err) {
        console.error("Erro ao checar sessão");
    }
}

// LÓGICA DE INSCRIÇÃO (TRAVA DE LOGIN)
function inscreverNoTorneio() {
    if (!logado) {
        alert("VOCÊ PRECISA ESTAR LOGADO PARA CONCORRER!");
        mudarAba('inicio');
        return;
    }
    
    // Se logado, pula para a tela de espera/grupos
    document.getElementById('box-inscricao-inicial').style.display = 'none';
    document.getElementById('painel-aguardando-grupo').style.display = 'block';
    
    atualizarNota("INSCRIÇÃO REALIZADA! AGUARDE A RODADA.");
}

// EXECUTAR AO CARREGAR
window.onload = () => {
    mudarAba('inicio');
    checarSessao();
};
// CONTROLE DE MODAIS
function abrirModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function fecharModais() {
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
}

// FECHAR AO CLICAR FORA DA CAIXA ROXA
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        fecharModais();
    }
};

// CRIAR GRUPO (IMAGEM 7 E 11)
function confirmarCriarGrupo() {
    const nomeInput = document.getElementById('input-nome-grupo');
    const nome = nomeInput.value.trim().toUpperCase();

    if (nome.length > 0 && nome.length <= 5) {
        // Gera o código aleatório de 6 caracteres
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        fecharModais();

        // Esconde os botões de Criar/Entrar e mostra o código (Igual na Imagem 7)
        document.getElementById('botoes-grupo').style.display = 'none';
        document.getElementById('info-grupo-criado').style.display = 'block';
        
        document.getElementById('display-nome-grupo').innerText = `GRUPO: ${nome}`;
        document.getElementById('display-codigo-grupo').innerText = codigo;

        atualizarNota(`GRUPO ${nome} CRIADO! ENVIE O CODIGO ${codigo} PARA SEU PARCEIRO`);
        
        // Envia para o servidor/bot
        socket.emit('novo_grupo', { nome, codigo, dono: userDados ? userDados.username : 'Anonimo' });
    } else {
        alert("O NOME DO GRUPO PRECISA TER ATÉ 5 LETRAS!");
    }
}

// ENTRAR EM GRUPO (QUADRADINHOS DA IMAGEM 13)
function confirmarEntrarGrupo() {
    let codigoCompleto = "";
    document.querySelectorAll('.digit-input').forEach(input => {
        codigoCompleto += input.value.toUpperCase();
    });

    if (codigoCompleto.length === 6) {
        fecharModais();
        document.getElementById('botoes-grupo').style.display = 'none';
        document.getElementById('info-grupo-criado').style.display = 'block';
        document.getElementById('display-nome-grupo').innerText = `STATUS: EM GRUPO`;
        document.getElementById('display-codigo-grupo').innerText = codigoCompleto;
        
        atualizarNota(`VOCÊ ENTROU NO GRUPO ${codigoCompleto}`);
    } else {
        alert("DIGITE O CÓDIGO DE 6 DÍGITOS COMPLETO!");
    }
}

// PULAR PARA O PRÓXIMO QUADRADINHO AUTOMATICAMENTE
document.querySelectorAll('.digit-input').forEach((input, index, lista) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < lista.length - 1) {
            lista[index + 1].focus();
        }
    });
    
    // Voltar com Backspace
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '' && index > 0) {
            lista[index - 1].focus();
        }
    });
});

// ESCUTAR O STATUS DO TORNEIO (VEM DO SERVER/BOT)
socket.on('att_torneios', () => {
    // Aqui você pode recarregar a lista de torneios se quiser
    console.log("O Bot atualizou os torneios!");
});

socket.on('torneio_iniciado', (data) => {
    // Muda o texto da Rodada ao Vivo (Imagem 8)
    const statusTxt = document.getElementById('status-rodada-texto');
    if (statusTxt) {
        statusTxt.innerText = "RODADA AO VIVO: CONFRONTO INICIADO";
        statusTxt.classList.add('destaque');
    }
    atualizarNota("O TORNEIO COMEÇOU! SIGA AS INSTRUÇÕES DO STAFF");
});
