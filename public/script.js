// Variável global para guardar os dados e não precisar baixar toda hora
let cacheDados = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosNoCache(); // Baixa os dados assim que abre o site
});

// --- NAVEGAÇÃO ENTRE TELAS ---

function voltarHome() {
    document.getElementById('tela-detalhes').classList.remove('ativa');
    document.getElementById('tela-home').classList.add('ativa');
}

async function abrirDetalhes(categoria) {
    // 1. Troca de tela
    document.getElementById('tela-home').classList.remove('ativa');
    document.getElementById('tela-detalhes').classList.add('ativa');

    // 2. Atualiza o Título
    const titulos = {
        'livros': '📚 Meus Livros',
        'corridas': '🏃‍♂️ Minhas Corridas',
        'treinos': '💪 Meus Treinos',
        'trabalho': '💼 Produtividade'
    };
    document.getElementById('titulo-detalhe').innerText = titulos[categoria];

    // 3. Renderiza a lista específica
    renderizarListaEspecifica(categoria);
}

// --- BANCO DE DADOS E RENDERIZAÇÃO ---

// Baixa tudo do servidor e guarda na memória (cache)
async function carregarDadosNoCache() {
    const resp = await fetch('/resumo');
    cacheDados = await resp.json();
    // Se estiver na tela de detalhes, atualiza ela
    // (Útil para quando acabamos de salvar algo)
}

function renderizarListaEspecifica(categoria) {
    const div = document.getElementById('lista-especifica');
    div.innerHTML = '';

    if (!cacheDados || !cacheDados[categoria] || cacheDados[categoria].length === 0) {
        div.innerHTML = '<p style="text-align:center; color:#888;">Nenhum registro encontrado.</p>';
        return;
    }

    // Pega a lista certa do cache (livros, corridas, etc)
    const lista = cacheDados[categoria];

    lista.forEach(item => {
        let htmlItem = '';

        // Monta o HTML dependendo do tipo
        if (categoria === 'livros') {
            const pct = Math.round((item.pagina_atual / item.total_paginas) * 100) || 0;
            htmlItem = `
                <div class="item-lista">
                    <div style="display:flex; gap:10px;">
                        <img src="${item.capa_url}" style="width:40px; border-radius:4px;">
                        <div>
                            <strong>${item.titulo}</strong><br>
                            <small>${item.pagina_atual}/${item.total_paginas} (${pct}%)</small>
                        </div>
                    </div>
                    <div>
                        <button onclick="atualizarPagina(${item.id}, '${item.titulo}')" style="background:#f39c12; padding:5px;">📖</button>
                        <button onclick="deletarItem('${categoria}', ${item.id})" style="background:#e74c3c; padding:5px;">🗑️</button>
                    </div>
                </div>`;
        
        } else if (categoria === 'corridas') {
            htmlItem = `
                <div class="item-lista">
                    <div>
                        <strong>${item.distancia_km}km</strong> (${item.tipo_treino})<br>
                        <small>${item.tempo_minutos} min - ${item.local}</small>
                    </div>
                    <button onclick="deletarItem('${categoria}', ${item.id})" style="background:#e74c3c; padding:5px;">🗑️</button>
                </div>`;
        
        } else {
            // Genérico para treino e trabalho
            let texto = categoria === 'treinos' ? item.foco : `${item.tarefas_concluidas} tarefas`;
            htmlItem = `
                <div class="item-lista">
                    <strong>${texto}</strong>
                    <button onclick="deletarItem('${categoria}', ${item.id})" style="background:#e74c3c; padding:5px;">🗑️</button>
                </div>`;
        }

        div.innerHTML += htmlItem;
    });
}

// --- FUNÇÕES DE AÇÃO (Salvar, Deletar, Buscar) --- 
// (Mantive quase iguais, só adicionando o recarregamento do cache)

async function salvarHobby() {
    const tipo = document.getElementById('tipo').value;
    if(!tipo) return alert("Selecione um tipo!");
    
    // ... (Aqui vai a mesma lógica de pegar os valores dos inputs que fizemos antes)
    // Para economizar espaço na resposta, vou resumir:
    // Copie a lógica do 'corpo' e 'url' do seu script anterior aqui.
    
    // ATENÇÃO: Vou colocar a lógica resumida abaixo para funcionar:
    let url = `/registrar/${tipo}`;
    let corpo = {};
    
    if (tipo === 'livro') {
        corpo = {
            titulo: document.getElementById('livro-titulo').value,
            autor: document.getElementById('livro-autor').value,
            paginas: document.getElementById('livro-paginas').value,
            capa: document.getElementById('livro-capa').value
        };
    } else if (tipo === 'corrida') {
        corpo = {
            distancia: document.getElementById('corrida-dist').value,
            tempo: document.getElementById('corrida-tempo').value,
            tipo: document.getElementById('corrida-tipo').value,
            local: document.getElementById('corrida-local').value
        };
    } else if (tipo === 'treino') {
        corpo = { foco: document.getElementById('treino-foco').value, duracao: document.getElementById('treino-duracao').value, carga: document.getElementById('treino-carga').value };
    } else if (tipo === 'trabalho') {
        corpo = { tarefas: document.getElementById('trab-tarefas').value, produtividade: document.getElementById('trab-prod').value, obs: document.getElementById('trab-obs').value };
    }

    await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(corpo)
    });

    alert("Salvo!");
    // Limpa campos
    document.querySelectorAll('input').forEach(i => i.value = '');
    
    // Recarrega os dados e volta pra home
    await carregarDadosNoCache();
    // Opcional: Se quiser ir direto pro detalhe do que salvou:
    // abrirDetalhes(tipo + 's'); // ajuste de plural (livro -> livros)
}

async function deletarItem(tabela, id) {
    if (!confirm("Apagar?")) return;
    await fetch(`/remover/${tabela}/${id}`, { method: 'DELETE' });
    await carregarDadosNoCache(); // Atualiza cache
    renderizarListaEspecifica(tabela); // Atualiza tela atual
}

async function atualizarPagina(id, titulo) {
    const novaPagina = prompt(`📖 ${titulo}\nPágina atual?`);
    if (novaPagina) {
        await fetch(`/atualizar/livro/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pagina_atual: novaPagina })
        });
        await carregarDadosNoCache();
        renderizarListaEspecifica('livros');
    }
}

// Funções auxiliares de visualização do formulário
function verificarTipo() {
    const tipo = document.getElementById('tipo').value;
    document.querySelectorAll('.secao-hobby').forEach(el => el.style.display = 'none');
    if (tipo) document.getElementById(`campos-${tipo}`).style.display = 'block';
}

async function buscarLivro() {
    // ... (Copiar a mesma função buscarLivro do código anterior) ...
    // Vou deixar aqui para garantir que funcione:
    const termo = document.getElementById('busca-titulo').value;
    const divRes = document.getElementById('resultado-livro');
    if(!termo) return alert("Digite algo!");
    divRes.innerHTML = "Buscando...";
    const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termo)}`);
    const dados = await resp.json();
    if(dados.totalItems > 0) {
        const info = dados.items[0].volumeInfo;
        document.getElementById('livro-titulo').value = info.title;
        document.getElementById('livro-autor').value = info.authors ? info.authors.join(', ') : 'Desc.';
        document.getElementById('livro-paginas').value = info.pageCount || 0;
        document.getElementById('livro-capa').value = info.imageLinks ? info.imageLinks.thumbnail : '';
        divRes.innerHTML = `✅ ${info.title}`;
    } else { divRes.innerHTML = "❌ Nada."; }
}