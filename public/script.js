function showSection(sectionId) {
    // Esconde todas as seções
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));

    // Mostra a seção clicada
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
    }
}

// Futura função para buscar dados do seu MongoDB via API do servidor
async function loadRankings() {
    try {
        const response = await fetch('/api/ranking-endless');
        const data = await response.json();
        // Aqui você usaria um loop para montar a tabela de rankings
    } catch (err) {
        console.log("Ainda sem dados no banco.");
    }
}
