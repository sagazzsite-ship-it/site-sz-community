const socket = io();

function atualizarNota(texto) {
    const nota = document.getElementById('nota-rodape');
    if (nota) {
        nota.innerText = `NOTA: ${texto.toUpperCase()}`;
    }
}

function mostrarAlerta(mensagem) {
    alert("COMMUNIDADE SZ diz:\n\n" + mensagem);
}

function mudarAba(abaId) {
    const secoes = document.querySelectorAll('.content-section');
    secoes.forEach(secao => {
        secao.style.display = 'none';
    });

    const abaAlvo = document.getElementById(abaId);
    if (abaAlvo) {
        abaAlvo.style.display = 'block';
    }

    if (abaId === 'inicio') {
        atualizarNota("BEM VINDO(A) A COMMUNIDADE SZ");
    } else if (abaId === 'rankings') {
        atualizarNota("RANKINGS GLOBAIS EM BREVE");
    } else if (abaId === 'torneios') {
        atualizarNota("PAINEL DE TORNEIOS ATIVO");
    } else if (abaId === 'regras') {
        atualizarNota("LEIA AS REGRAS PARA EVITAR PUNIÇÕES");
    } else if (abaId === 'sobre') {
        atualizarNota("SITE EM DESENVOLVIMENTO");
    }
}

function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function fecharModais() {
    const modais = document.querySelectorAll('.modal');
    modais.forEach(m => {
        m.style.display = 'none';
    });
}

window.onclick = function(event) {
    if (event.target.className === 'modal') {
        fecharModais();
    }
};

let modoLogin = true;

function alternarLogin(confirmar) {
    const tituloPrincipal = document.querySelector('.login-info-box h1');
    const btnAcao = document.querySelector('.btn-logar-grande');
    const linkAlternar = document.querySelector('.login-form-box p');

    if (!confirmar) {
        modoLogin = false;
        tituloPrincipal.innerText = "CRIE SUA CONTA NA COMMUNIDADE SZ";
        btnAcao.innerText = "CRIAR";
        linkAlternar.innerHTML = 'JÁ TEM CONTA? <span class="destaque" style="cursor:pointer" onclick="alternarLogin(true)">LOGAR AQUI</span>';
        atualizarNota("TELA DE CADASTRO ATIVA");
    } else {
        modoLogin = true;
        tituloPrincipal.innerText = "BEM VINDO(A) A COMMUNIDADE SZ";
        btnAcao.innerText = "LOGAR";
        linkAlternar.innerHTML = 'AINDA NÃO TEM CONTA? <span class="destaque" style="cursor:pointer" onclick="alternarLogin(false)">CADASTRE-SE AQUI</span>';
        atualizarNota("TELA DE LOGIN ATIVA");
    }
}

async function realizarLogin() {
    const usernameInput = document.getElementById('user-login');
    const passwordInput = document.getElementById('pass-login');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        mostrarAlerta("VOCÊ PRECISA PREENCHER TODOS OS CAMPOS PARA CONTINUAR!");
        return;
    }

    const rota = modoLogin ? '/api/login' : '/api/register';

    try {
        const response = await fetch(rota, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const resultado = await response.json();

        if (resultado.success) {
            mostrarAlerta(modoLogin ? "LOGIN REALIZADO COM SUCESSO! APROVEITE." : "CONTA CRIADA! AGORA VOCÊ PODE LOGAR.");
            if (!modoLogin) {
                alternarLogin(true);
            } else {
                window.location.reload();
            }
        } else {
            mostrarAlerta("ERRO NO SISTEMA: " + resultado.message.toUpperCase());
        }
    } catch (erro) {
        console.error("Erro de conexão:", erro);
        mostrarAlerta("ERRO AO CONECTAR AO SERVIDOR. VERIFIQUE SUA INTERNET OU TENTE MAIS TARDE.");
    }
}

function sincronizarComDiscord() {
    atualizarNota("REDIRECIONANDO PARA O DISCORD...");
    window.location.href = '/auth/discord';
}

document.querySelectorAll('.digit-input').forEach((input, index, lista) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < lista.length - 1) {
            lista[index + 1].focus();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
            lista[index - 1].focus();
        }
    });
});
async function inscreverNoTorneio() {
    atualizarNota("PROCESSANDO SUA INSCRIÇÃO...");
    
    try {
        const res = await fetch('/api/torneio/inscrever', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (data.success) {
            mostrarAlerta("INSCRIÇÃO CONFIRMADA! PREPARE-SE PARA A BATALHA.");
            document.getElementById('tela-inscricao').style.display = 'none';
            document.getElementById('painel-jogador').style.display = 'block';
            atualizarNota("AGUARDANDO FORMAÇÃO DE GRUPO");
            
            socket.emit('player_ready', {
                user: localStorage.getItem('sz_username'),
                status: 'inscrito'
            });
        } else {
            mostrarAlerta("ERRO NA INSCRIÇÃO: " + data.message.toUpperCase());
        }
    } catch (err) {
        console.error(err);
        mostrarAlerta("ERRO AO SE CONECTAR AO SISTEMA DE TORNEIOS.");
    }
}

function abrirModalGrupo(tipo) {
    if (tipo === 'criar') {
        abrirModal('modal-criar-grupo');
        atualizarNota("DEFININDO NOME DO GRUPO");
    } else {
        abrirModal('modal-entrar-grupo');
        atualizarNota("DIGITANDO CÓDIGO DE ACESSO");
    }
}

async function confirmarCriarGrupo() {
    const inputNome = document.getElementById('input-nome-grupo');
    const nomeGrupo = inputNome.value.trim().toUpperCase();

    if (nomeGrupo.length === 0 || nomeGrupo.length > 5) {
        mostrarAlerta("O NOME DO GRUPO DEVE TER ENTRE 1 E 5 CARACTERES!");
        return;
    }

    try {
        const res = await fetch('/api/grupo/criar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nomeGrupo })
        });

        const data = await res.json();

        if (data.success) {
            fecharModais();
            document.getElementById('acoes-grupo-inicial').style.display = 'none';
            document.getElementById('acoes-grupo-ativo').style.display = 'flex';
            document.getElementById('cod-grupo-display').innerText = data.codigo;
            
            mostrarAlerta("SZ COMMUNITY diz:\n\nGRUPO CRIADO! ENVIE O CÓDIGO " + data.codigo + " PARA SEUS AMIGOS.");
            atualizarNota("GRUPO: " + nomeGrupo + " | AGUARDANDO MEMBROS");
        } else {
            mostrarAlerta("FALHA AO CRIAR GRUPO: " + data.message.toUpperCase());
        }
    } catch (err) {
        mostrarAlerta("ERRO DE CONEXÃO AO CRIAR GRUPO.");
    }
}

async function confirmarEntrarGrupo() {
    const inputs = document.querySelectorAll('.digit-input');
    let codigo = "";
    inputs.forEach(i => codigo += i.value);

    if (codigo.length < 6) {
        mostrarAlerta("DIGITE O CÓDIGO COMPLETO DE 6 DÍGITOS!");
        return;
    }

    try {
        const res = await fetch('/api/grupo/entrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo: codigo.toUpperCase() })
        });

        const data = await res.json();

        if (data.success) {
            fecharModais();
            document.getElementById('acoes-grupo-inicial').style.display = 'none';
            document.getElementById('acoes-grupo-ativo').style.display = 'flex';
            document.getElementById('cod-grupo-display').innerText = codigo.toUpperCase();
            
            mostrarAlerta("VOCÊ ENTROU NO GRUPO COM SUCESSO!");
            atualizarNota("DENTRO DE UM GRUPO | PRONTO PARA O TORNEIO");
        } else {
            mostrarAlerta("CÓDIGO INVÁLIDO OU GRUPO LOTADO!");
        }
    } catch (err) {
        mostrarAlerta("ERRO AO TENTAR ENTRAR NO GRUPO.");
    }
}

function sairDoGrupo() {
    const confirmar = confirm("SZ COMMUNITY diz:\n\nTEM CERTEZA QUE DESEJA SAIR DO GRUPO?");
    if (confirmar) {
        socket.emit('leave_group');
        document.getElementById('acoes-grupo-ativo').style.display = 'none';
        document.getElementById('acoes-grupo-inicial').style.display = 'flex';
        atualizarNota("VOCÊ SAIU DO GRUPO");
    }
}
socket.on('update_matches', (matches) => {
    const listaConfrontos = document.getElementById('lista-confrontos');
    const statusTexto = document.getElementById('status-rodada-texto');
    
    if (!listaConfrontos) return;

    listaConfrontos.innerHTML = "";
    
    if (matches && matches.length > 0) {
        if (statusTexto) statusTexto.innerText = "CONFRONTOS DEFINIDOS";
        atualizarNota("RODADA AO VIVO INICIADA");
        
        matches.forEach(match => {
            const divMatch = document.createElement('div');
            divMatch.className = 'match-row';
            divMatch.style.padding = "15px";
            divMatch.style.borderBottom = "1px solid #333";
            divMatch.style.display = "flex";
            divMatch.style.justifyContent = "space-between";
            divMatch.style.alignItems = "center";

            const meuUser = localStorage.getItem('sz_username');
            const souTimeA = match.timeA.includes(meuUser);
            const souTimeB = match.timeB.includes(meuUser);

            const displayA = souTimeA ? `<b>${match.timeA[0]} (VOCÊ)</b>` : match.timeA[0];
            const displayB = souTimeB ? `<b>${match.timeB[0]} (VOCÊ)</b>` : match.timeB[0];

            divMatch.innerHTML = `
                <span style="flex: 1; text-align: left;">${displayA}</span>
                <span class="destaque" style="font-weight: 900; margin: 0 15px;">VS</span>
                <span style="flex: 1; text-align: right;">${displayB}</span>
            `;

            listaConfrontos.appendChild(divMatch);

            if (souTimeA || souTimeB) {
                mostrarAlerta("SEU CONFRONTO COMEÇOU! CLIQUE NO BOTÃO DE CHAT PARA FALAR COM SEU ADVERSÁRIO.");
                document.getElementById('btn-abrir-chat').style.display = 'block';
            }
        });
    } else {
        if (statusTexto) statusTexto.innerText = "AGUARDE O INICIO DO TORNEIO";
    }
});

function abrirPainelChat() {
    abrirModal('modal-chat');
    atualizarNota("CONVERSANDO NO CHAT DO TORNEIO");
    
    const box = document.getElementById('box-mensagens');
    if (box) {
        box.innerHTML = `<p style="color: #555; font-size: 0.8rem; text-align: center;">--- INÍCIO DO CHAT ---</p>`;
    }
}

async function enviarMensagem() {
    const input = document.getElementById('input-chat');
    const texto = input.value.trim();
    const usuario = localStorage.getItem('sz_username');

    if (!texto) return;

    try {
        socket.emit('send_msg', {
            usuario: usuario,
            texto: texto,
            timestamp: new Date().toLocaleTimeString()
        });
        
        input.value = "";
        input.focus();
    } catch (err) {
        mostrarAlerta("ERRO AO ENVIAR MENSAGEM. TENTE NOVAMENTE.");
    }
}

socket.on('receive_msg', (data) => {
    const box = document.getElementById('box-mensagens');
    if (!box) return;

    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = "10px";
    msgDiv.style.fontSize = "0.9rem";

    const isMe = data.usuario === localStorage.getItem('sz_username');
    const corNome = isMe ? "var(--primary)" : "#fff";

    msgDiv.innerHTML = `
        <span style="color: ${corNome}; font-weight: 800;">${data.usuario.toUpperCase()}:</span> 
        <span style="color: #ccc;">${data.texto}</span>
    `;

    box.appendChild(msgDiv);
    box.scrollTop = box.scrollHeight;
});

function renomearGrupo() {
    const novoNome = prompt("SZ COMMUNITY diz:\n\nDIGITE O NOVO NOME PARA O SEU GRUPO (MÁX 5 LETRAS):");
    
    if (novoNome && novoNome.length > 0 && novoNome.length <= 5) {
        socket.emit('rename_group', { nome: novoNome.toUpperCase() });
        atualizarNota("NOME DO GRUPO ALTERADO PARA: " + novoNome.toUpperCase());
    } else if (novoNome) {
        mostrarAlerta("NOME INVÁLIDO! USE NO MÁXIMO 5 CARACTERES.");
    }
}
function mostrarChaveamento() {
    document.getElementById('painel-jogador').style.display = 'none';
    document.getElementById('tela-chaveamento').style.display = 'block';
    atualizarNota("VISUALIZANDO CHAVEAMENTO DO TORNEIO");
    socket.emit('get_bracket_data');
}

socket.on('draw_bracket', (data) => {
    const container = document.getElementById('chaveamento-grafico');
    if (!container) return;

    container.innerHTML = "";
    
    data.rodadas.forEach((rodada, index) => {
        const coluna = document.createElement('div');
        coluna.className = 'bracket-column';
        coluna.style.display = "flex";
        coluna.style.flexDirection = "column";
        coluna.style.justifyContent = "space-around";
        coluna.style.minWidth = "200px";

        const tituloRodada = document.createElement('h4');
        tituloRodada.innerText = `RODADA ${index + 1}`;
        tituloRodada.style.textAlign = "center";
        tituloRodada.style.color = "var(--primary)";
        coluna.appendChild(tituloRodada);

        rodada.jogos.forEach(jogo => {
            const matchBox = document.createElement('div');
            matchBox.style.background = "#15151e";
            matchBox.style.border = "2px solid #333";
            matchBox.style.borderRadius = "10px";
            matchBox.style.margin = "10px 0";
            matchBox.style.padding = "10px";

            const p1 = document.createElement('div');
            p1.innerText = jogo.player1 || "AGUARDANDO...";
            p1.style.color = jogo.vencedor === jogo.player1 ? "var(--primary)" : "#fff";
            
            const p2 = document.createElement('div');
            p2.innerText = jogo.player2 || "AGUARDANDO...";
            p2.style.color = jogo.vencedor === jogo.player2 ? "var(--primary)" : "#fff";

            matchBox.appendChild(p1);
            matchBox.appendChild(document.createElement('hr'));
            matchBox.appendChild(p2);
            coluna.appendChild(matchBox);
        });

        container.appendChild(coluna);
    });
});

socket.on('match_result', (resultado) => {
    const meuUser = localStorage.getItem('sz_username');
    
    if (resultado.perdedor === meuUser) {
        mostrarAlerta("VOCÊ FOI ELIMINADO DO TORNEIO. MAIS SORTE NA PRÓXIMA!");
        atualizarNota("ELIMINADO - FIM DE JOGO");
        setTimeout(() => window.location.reload(), 5000);
    } else if (resultado.vencedor === meuUser) {
        mostrarAlerta("BOA! VOCÊ VENCEU SUA RODADA E AVANÇOU NO CHAVEAMENTO.");
        atualizarNota("VITÓRIA NA RODADA! AGUARDANDO PRÓXIMO JOGO");
    }
});

socket.on('tournament_final_winner', (vencedor) => {
    const meuUser = localStorage.getItem('sz_username');

    if (vencedor === meuUser) {
        document.getElementById('painel-jogador').style.display = 'none';
        document.getElementById('tela-chaveamento').style.display = 'none';
        document.getElementById('tela-vitoria').style.display = 'block';
        
        atualizarNota("CAMPEÃO DO TORNEIO SZ!");
        mostrarAlerta("SZ COMMUNITY diz:\n\nMEUS PARABÉNS! VOCÊ É O GRANDE CAMPEÃO! RECLAME SUA PREMIAÇÃO COM A STAFF.");
    } else {
        mostrarAlerta("O TORNEIO TERMINOU! O VENCEDOR FOI: " + vencedor.toUpperCase());
    }
});

function fecharChaveamento() {
    document.getElementById('tela-chaveamento').style.display = 'none';
    document.getElementById('painel-jogador').style.display = 'block';
    atualizarNota("PAINEL DE TORNEIOS ATIVO");
}

function fecharVitoria() {
    document.getElementById('tela-vitoria').style.display = 'none';
    mudarAba('inicio');
}
window.onload = async () => {
    atualizarNota("CONECTANDO AO SISTEMA SZ E VALIDANDO CREDENCIAIS...");

    try {
        const response = await fetch('/api/user');
        const user = await response.json();

        if (user.logged) {
            localStorage.setItem('sz_username', user.username);
            localStorage.setItem('sz_id', user.id);
            localStorage.setItem('sz_role', user.role);
            
            const notaUser = document.getElementById('nota-rodape');
            if (notaUser) {
                notaUser.innerText = `LOGADO COMO: ${user.username.toUpperCase()}`;
            }

            if (user.isStaff || user.role === 'admin') {
                const btnStaff = document.getElementById('btn-manager-staff');
                if (btnStaff) {
                    btnStaff.style.display = 'block';
                    btnStaff.onclick = () => window.location.href = '/admin/panel';
                }
                atualizarNota("MODO ADMINISTRADOR ATIVO - BEM VINDO STAFF");
            }

            socket.emit('register_session', { 
                userId: user.id, 
                username: user.username,
                timestamp: Date.now()
            });

            verificarTorneioAtivo();
        } else {
            mudarAba('inicio');
            atualizarNota("BEM VINDO! FAÇA LOGIN PARA ACESSAR AS FUNCIONALIDADES");
        }
    } catch (err) {
        console.error("Erro crítico ao validar sessão SZ:", err);
        atualizarNota("MODO OFFLINE: ERRO NA COMUNICAÇÃO COM O SERVIDOR");
        mostrarAlerta("O SERVIDOR PARECE ESTAR FORA DO AR. TENTE NOVAMENTE EM ALGUNS MINUTOS.");
    }
};

async function verificarTorneioAtivo() {
    try {
        const res = await fetch('/api/torneio/status');
        const status = await res.json();

        if (status && status.ativo) {
            const avisoTopo = document.querySelector('.aviso-topo');
            if (avisoTopo) {
                avisoTopo.style.display = 'block';
                avisoTopo.innerHTML = `🏆 TORNEIO ATIVO: <b>${status.nome}</b> - PREMIAÇÃO: ${status.premio}`;
            }
            
            if (status.inscrito) {
                document.getElementById('tela-inscricao').style.display = 'none';
                document.getElementById('painel-jogador').style.display = 'block';
                atualizarNota("VOCÊ JÁ ESTÁ INSCRITO NESTE TORNEIO");
            }
        }
    } catch (err) {
        console.log("SZ COMMUNITY: Nenhum torneio ativo detectado no momento.");
    }
}

function abrirChaveamento() {
    if (document.getElementById('tela-chaveamento')) {
        mostrarChaveamento();
    } else {
        mostrarAlerta("O CHAVEAMENTO AINDA NÃO FOI GERADO PELA STAFF.");
    }
}

document.addEventListener('keydown', (e) => {
    const chatInput = document.getElementById('input-chat');
    const loginInput = document.getElementById('pass-login');

    if (e.key === 'Enter') {
        if (document.activeElement === chatInput) {
            enviarMensagem();
        } else if (document.activeElement === loginInput || document.activeElement === document.getElementById('user-login')) {
            realizarLogin();
        }
    }

    if (e.key === 'Escape') {
        fecharModais();
        if (document.getElementById('tela-chaveamento').style.display === 'block') {
            voltarParaPainel();
        }
    }
});

socket.on('disconnect', () => {
    atualizarNota("CONEXÃO PERDIDA... TENTANDO RECONECTAR");
    document.body.style.filter = "grayscale(0.5)";
});

socket.on('reconnect', () => {
    atualizarNota("CONEXÃO REESTABELECIDA!");
    document.body.style.filter = "none";
    mostrarAlerta("CONEXÃO COM O SERVIDOR SZ REESTABELECIDA.");
});

function formatarData(dataISO) {
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR') + " " + d.toLocaleTimeString('pt-BR');
}

window.onerror = function(msg, url, line) {
    console.error("Erro Global SZ: " + msg + "\nLinha: " + line);
    atualizarNota("ERRO DE SCRIPT DETECTADO");
    return true;
};

console.log("SISTEMA COMMUNIDADE SZ V2.0 - TODOS OS MÓDULOS CARREGADOS.");
