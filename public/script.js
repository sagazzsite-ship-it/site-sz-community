// Conexão com o servidor via Socket.io
const socket = io();

// --- LOGICA DE NAVEGAÇÃO ENTRE ABAS ---
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
    }
}

// --- LOGICA DE INSCRIÇÃO (Mudar da Imagem 1 para a Imagem 2) ---
function iniciarInscricao() {
    // Aqui no futuro você enviará o comando para o banco de dados
    alert("Inscrição realizada com sucesso!");
    
    // Esconde o card de inscrição e mostra o painel de jogo (Imagem 2)
    document.querySelector('.card-inscricao').style.display = 'none';
    document.getElementById('game-panel').style.display = 'grid';
}

// --- CONTROLE DE MODAIS (Imagens 4, 5 e 6) ---
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Fecha modal se clicar fora da caixa roxa
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
    }
}

// --- CRIAÇÃO DE GRUPO (Imagem 4 e 5) ---
function confirmarGrupo() {
    const nomeGrupo = document.getElementById('group-name-input').value;
    
    if (nomeGrupo.length > 0 && nomeGrupo.length <= 5) {
        // Gera um código de sala aleatório de 6 dígitos
        const codigoSala = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        closeModal('modal-grupo');
        
        // Atualiza o status na tela (Imagem 7)
        const liveStatus = document.getElementById('live-status');
        liveStatus.innerHTML = `
            <div class="grupo-info">
                <p>GRUPO: <span class="destaque">${nomeGrupo.toUpperCase()}</span></p>
                <p>CÓDIGO: <span class="destaque">${codigoSala}</span></p>
                <p style="font-size: 0.8rem; color: #aaa;">AGUARDANDO OPONENTE...</p>
            </div>
        `;
    } else {
        alert("O nome deve ter entre 1 e 5 letras!");
    }
}

// --- CHAVEAMENTO (Imagem 9) ---
function toggleChaveamento() {
    const overlay = document.getElementById('chaveamento-overlay');
    if (overlay.style.display === 'none' || overlay.style.display === '') {
        overlay.style.display = 'block';
        renderBrackets(); // Desenha as chaves quando abre
    } else {
        overlay.style.display = 'none';
    }
}

// Simulação de desenho das chaves (Brackets)
function renderBrackets() {
    const container = document.getElementById('brackets-draw');
    // Exemplo de como os times apareceriam
    container.innerHTML = `
        <div class="bracket-column">
            <div class="match-card">TIME SZ</div>
            <div class="match-card">TIME ALPHA</div>
        </div>
        <div class="bracket-column">
            <div class="match-card">VENCEDOR J1</div>
        </div>
    `;
}

// --- LOGIN E PERMISSÕES ---
// Função para verificar se o usuário é o DONO (Staff)
async function verificarStaff() {
    try {
        const response = await fetch('/api/user-info');
        const user = await response.json();
        
        if (user.isStaff) {
            document.getElementById('admin-link').style.display = 'block';
        }
    } catch (err) {
        console.log("Usuário não logado ou sem permissão.");
    }
}

// Executa ao carregar a página
window.onload = () => {
    verificarStaff();
};
