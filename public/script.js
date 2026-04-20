const socket = io();

// ==========================================
// 1. NAVEGAÇÃO ENTRE ABAS DO SITE
// ==========================================
function mudarAba(abaId) {
    // Seleciona todas as seções de conteúdo
    const secoes = document.querySelectorAll('.content-section');
    
    secoes.forEach(secao => {
        secao.style.display = 'none'; // Esconde todas
    });

    // Mostra apenas a aba clicada
    const abaAtiva = document.getElementById(abaId);
    if (abaAtiva) {
        abaAtiva.style.display = 'block';
    }

    // Atualiza a nota de rodapé conforme a aba (estilo imagem 598bd5.png)
    const notaRodape = document.getElementById('nota-rodape');
    notaRodape.innerText = `NOTA: VOCÊ ESTÁ EM: ${abaId.toUpperCase()}`;
}

// ==========================================
// 2. SISTEMA DE LOGIN / CADASTRO (ID SELECT)
// ==========================================
let modoLogin = true; // Controla se o formulário é Login ou Cadastro

function alternarLogin(confirmar) {
    const tituloPrincipal = document.querySelector('.login-info-box h1');
    const btnAcao = document.querySelector('.btn-logar-grande');
    const linkAlternar = document.querySelector('.login-form-box p');
    const inputSenha = document.getElementById('pass-login');
    const labelSenha = document.querySelector('label[for="pass-login"]');

    if (!confirmar) {
        // MUDAR PARA MODO CADASTRO
        modoLogin = false;
        tituloPrincipal.innerText = "CRIE SUA CONTA NA COMMUNIDADE SZ";
        btnAcao.innerText = "CRIAR";
        linkAlternar.innerHTML = 'JÁ TEM CONTA? <span class="destaque" style="cursor:pointer" onclick="alternarLogin(true)">LOGAR AQUI</span>';
    } else {
        // MUDAR PARA MODO LOGIN
        modoLogin = true;
        tituloPrincipal.innerText = "BEM VINDO(A) A COMMUNIDADE SZ";
        btnAcao.innerText = "LOGAR";
        linkAlternar.innerHTML = 'AINDA NÃO TEM CONTA? <span class="destaque" style="cursor:pointer" onclick="alternarLogin(false)">CADASTRE-SE AQUI</span>';
    }
}

// Função disparada pelo botão "LOGAR / CRIAR"
async function realizarLogin() {
    const username = document.getElementById('user-login').value;
    const password = document.getElementById('pass-login').value;

    if (!username || !password) {
        alert("ERRO: PREENCHA O USUÁRIO E A SENHA!");
        return;
    }

    // Define a rota com base no modo atual
    const rota = modoLogin ? '/api/login' : '/api/register';

    try {
        const response = await fetch(rota, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const resultado = await response.json();

        if (resultado.success) {
            alert(modoLogin ? "LOGIN REALIZADO COM SUCESSO!" : "CONTA CRIADA COM SUCESSO!");
            // Após logar, recarrega para aplicar a sessão
            window.location.reload();
        } else {
            alert("FALHA: " + resultado.message);
        }
    } catch (erro) {
        console.error("Erro na requisição:", erro);
        alert("ERRO AO CONECTAR COM O SERVIDOR!");
    }
}

// Função para o botão de Sincronizar Discord (Opcional)
function sincronizarComDiscord() {
    // Redireciona para a rota de autenticação do servidor
    window.location.href = '/auth/discord';
}
// ==========================================
// 3. LÓGICA DE TORNEIOS (ESTADOS E CONFRONTOS)
// ==========================================

// Função para simular a inscrição e trocar para o painel (Imagem 1 -> Imagem 2)
function inscreverNoTorneio() {
    // Aqui enviaríamos o comando para o servidor
    socket.emit('subscribe_tournament', { torneoId: 'global_sz' });
    
    // Troca visual imediata para o usuário sentir o feedback
    document.getElementById('tela-inscricao').style.display = 'none';
    document.getElementById('painel-jogador').style.display = 'block';
    
    console.log("Inscrição solicitada...");
}

// Escutando os confrontos gerados pelo servidor (Sincronizado com seu código de Threads)
socket.on('update_matches', (matches) => {
    const listaConfrontos = document.getElementById('lista-confrontos');
    const statusGeral = document.getElementById('status-geral-torneio');
    
    // Limpa a lista atual para atualizar
    listaConfrontos.innerHTML = "";
    
    if (matches.length > 0) {
        statusGeral.style.display = 'none'; // Esconde o "Aguarde o inicio"
        
        matches.forEach(match => {
            // Cria o elemento de Versus (Estilo Imagem 7)
            const divVersus = document.createElement('div');
            divVersus.className = 'versus-container';
            divVersus.style.marginBottom = "15px";
            
            // Verifica se o usuário logado está neste time (Para colocar o "(VOCÊ)")
            const playerNick = localStorage.getItem('sz_username'); 
            const isUserInA = match.timeA.includes(playerNick);
            const isUserInB = match.timeB.includes(playerNick);

            divVersus.innerHTML = `
                <h3 style="font-size: 1.2rem; margin: 5px 0;">
                    ${match.timeA[0]} VS ${match.timeB[0]} 
                    <span class="vs-badge" style="background: var(--primary); padding: 2px 8px; border-radius: 50%; font-size: 0.8rem;">V</span>
                </h3>
                ${(isUserInA || isUserInB) ? '<small class="destaque">(VOCÊ)</small>' : ''}
            `;
            
            listaConfrontos.appendChild(divVersus);
        });

        // Se o torneio começou, mostra o botão de CHAT (Imagem 7)
        document.getElementById('btn-abrir-chat').style.display = 'block';
    }
});

// ==========================================
// 4. LÓGICA DE GRUPOS (IMAGENS 2, 3, 4, 5)
// ==========================================

function confirmarCriarGrupo() {
    const nome = document.getElementById('input-nome-grupo').value;
    if (nome.length > 5) return alert("MÁXIMO 5 LETRAS!");

    // Esconde botões iniciais, mostra botões de grupo ativo (Imagem 3)
    document.getElementById('acoes-grupo-inicial').style.display = 'none';
    document.getElementById('acoes-grupo-ativo').style.display = 'flex';
    
    // Define o código aleatório (Simulando o que o bot faria)
    document.getElementById('cod-grupo-display').innerText = Math.random().toString(36).substring(2,8).toUpperCase();
    
    fecharModais();
    alert("NOTA: SEU GRUPO FOI CRIADO, ENVIE O CODIGO PARA UM AMIGO");
}

function mostrarChaveamento() {
    document.getElementById('painel-jogador').style.display = 'none';
    document.getElementById('tela-chaveamento').style.display = 'block';
}

function voltarParaPainel() {
    document.getElementById('tela-chaveamento').style.display = 'none';
    document.getElementById('tela-vitoria').style.display = 'none';
    document.getElementById('painel-jogador').style.display = 'block';
}
// ==========================================
// 5. SISTEMA DE CHAT EM TEMPO REAL (IMAGEM 4 E 5)
// ==========================================

function abrirPainelChat() {
    // No seu layout, o chat pode ser um modal ou uma nova div
    abrirModal('modal-chat');
    socket.emit('join_match_chat'); // Entra na sala do confronto
}

function enviarMensagem() {
    const input = document.getElementById('input-chat');
    const msg = input.value.trim();
    
    if (msg !== "") {
        socket.emit('send_msg', { 
            texto: msg, 
            usuario: localStorage.getItem('sz_username') 
        });
        input.value = "";
    }
}

// Escutando novas mensagens
socket.on('receive_msg', (dados) => {
    const boxMensagens = document.getElementById('box-mensagens');
    const msgElemento = document.createElement('div');
    
    // Estilização baseada na Imagem 4 (NOME: MENSAGEM)
    msgElemento.style.marginBottom = "8px";
    msgElemento.innerHTML = `<b class="destaque">${dados.usuario.toUpperCase()}:</b> ${dados.texto}`;
    
    boxMensagens.appendChild(msgElemento);
    boxMensagens.scrollTop = boxMensagens.scrollHeight; // Auto-scroll para o fim
});

// ==========================================
// 6. CHAVEAMENTO E VITÓRIA (IMAGEM 9 E 10)
// ==========================================

socket.on('update_bracket', (bracketData) => {
    const container = document.getElementById('chaveamento-grafico');
    container.innerHTML = ""; // Limpa para desenhar

    // Lógica para desenhar as chaves (Simplificada)
    bracketData.rounds.forEach((round, index) => {
        const divRound = document.createElement('div');
        divRound.className = 'round-col';
        divRound.innerHTML = `<h4>RODADA ${index + 1}</h4>`;
        
        round.matches.forEach(m => {
            divRound.innerHTML += `
                <div class="match-bracket-box">
                    <div class="player-slot">${m.p1}</div>
                    <div class="player-slot">${m.p2}</div>
                </div>
            `;
        });
        container.appendChild(divRound);
    });
});

// Quando o Staff marca a vitória no Discord (seu código da Thread)
socket.on('tournament_winner', (ganhador) => {
    const meuUser = localStorage.getItem('sz_username');
    
    if (ganhador === meuUser) {
        // MOSTRA TELA DE VITORIA (IMAGEM 10)
        document.getElementById('painel-jogador').style.display = 'none';
        document.getElementById('tela-vitoria').style.display = 'block';
    } else {
        alert(`O TORNEIO ACABOU! VENCEDOR: ${ganhador}`);
    }
});

// ==========================================
// 7. INICIALIZAÇÃO E CHECAGEM DE STAFF
// ==========================================

window.onload = async () => {
    try {
        const response = await fetch('/api/user');
        const user = await response.json();

        if (user.logged) {
            // Salva no navegador para usar no chat/versus
            localStorage.setItem('sz_username', user.username);
            
            // Se for staff, mostra o botão Manager (ID 1477827180594462741)
            if (user.isStaff) {
                const btnStaff = document.getElementById('btn-manager-staff');
                if (btnStaff) btnStaff.style.display = 'block';
            }
            
            // Atualiza o rodapé
            document.getElementById('nota-rodape').innerText = `LOGADO COMO: ${user.username.toUpperCase()}`;
        }
    } catch (err) {
        console.log("Usuário não logado.");
    }
};

// PULAR CAMPOS DO CÓDIGO DE GRUPO (6 DÍGITOS)
document.querySelectorAll('.digit-input').forEach((input, index, lista) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < lista.length - 1) {
            lista[index + 1].focus();
        }
    });
});
