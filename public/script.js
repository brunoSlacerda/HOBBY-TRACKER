document.addEventListener('DOMContentLoaded', carregarLista);

function verificarTipo() {
    const tipo = document.getElementById('tipo').value;
    // Esconde tudo
    document.querySelectorAll('.secao-hobby').forEach(el => el.style.display = 'none');
    // Mostra o selecionado
    if (tipo) document.getElementById(`campos-${tipo}`).style.display = 'block';
}

// --- FUNÇÃO DELETAR (Genérica) ---
async function deletarItem(tabela, id) {
    if (!confirm("Tem certeza que quer apagar este registro?")) return;

    await fetch(`/remover/${tabela}/${id}`, { method: 'DELETE' });
    carregarLista(); // Atualiza a tela
}

// --- FUNÇÃO ATUALIZAR PÁGINA (Exclusiva de Livros) ---
async function atualizarPagina(id, titulo) {
    // Abre uma caixinha simples perguntando a nova página
    const novaPagina = prompt(`📖 ${titulo}\nEm qual página você parou agora?`);
    
    if (novaPagina && !isNaN(novaPagina)) {
        await fetch(`/atualizar/livro/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pagina_atual: novaPagina })
        });
        carregarLista();
    }
}

// --- FUNÇÕES DE BUSCA E SALVAR (Iguais a antes) ---
async function buscarLivro() {
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
        divRes.innerHTML = `✅ Achei: <strong>${info.title}</strong> (${info.pageCount} págs)`;
    } else {
        divRes.innerHTML = "❌ Nada encontrado.";
    }
}

async function salvarHobby() {
    const tipo = document.getElementById('tipo').value;
    if(!tipo) return alert("Selecione um tipo!");

    let url = `/registrar/${tipo}`; // A URL muda baseada no tipo (livro, corrida...)
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
        corpo = {
            foco: document.getElementById('treino-foco').value,
            duracao: document.getElementById('treino-duracao').value,
            carga: document.getElementById('treino-carga').value
        };
    } else if (tipo === 'trabalho') {
        corpo = {
            tarefas: document.getElementById('trab-tarefas').value,
            produtividade: document.getElementById('trab-prod').value,
            obs: document.getElementById('trab-obs').value
        };
    }
    
    await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(corpo)
    });

    alert("Salvo!");
    // Limpar campos simples para facilitar
    document.querySelectorAll('input').forEach(input => input.value = '');
    carregarLista();
}

// --- CARREGAR LISTA (Agora com Botões) ---
async function carregarLista() {
    const resp = await fetch('/resumo');
    const dados = await resp.json();
    
    const div = document.getElementById('lista-hobbies');
    div.innerHTML = '';

    // Renderiza LIVROS
    if(dados.livros.length > 0) div.innerHTML += '<h4>📚 Livros</h4>';
    dados.livros.forEach(l => {
        // Calcula porcentagem lida
        const porcentagem = Math.round((l.pagina_atual / l.total_paginas) * 100) || 0;
        
        div.innerHTML += `
            <div class="item-lista">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${l.capa_url}" style="width:40px; border-radius:4px;">
                    <div>
                        <strong>${l.titulo}</strong><br>
                        <span style="font-size:0.9em; color:#555;">
                            Pág: ${l.pagina_atual} / ${l.total_paginas} (${porcentagem}%)
                        </span>
                    </div>
                </div>
                <div>
                    <button onclick="atualizarPagina(${l.id}, '${l.titulo}')" style="background:#f39c12; padding:5px 10px; font-size:0.8em;">📖 Atualizar</button>
                    <button onclick="deletarItem('livros', ${l.id})" style="background:#e74c3c; padding:5px 10px; font-size:0.8em;">🗑️</button>
                </div>
            </div>`;
    });

    // Renderiza CORRIDAS
    if(dados.corridas.length > 0) div.innerHTML += '<h4>🏃‍♂️ Corridas</h4>';
    dados.corridas.forEach(c => {
        div.innerHTML += `
            <div class="item-lista">
                <div>
                    <strong>${c.distancia_km}km</strong> - ${c.tipo_treino}<br>
                    <small>${c.local} (${c.tempo_minutos} min)</small>
                </div>
                <button onclick="deletarItem('corridas', ${c.id})" style="background:#e74c3c; padding:5px 10px; font-size:0.8em;">🗑️</button>
            </div>`;
    });

    // Renderiza TREINOS e TRABALHO (Seguindo a mesma lógica simples)
    if(dados.treinos.length > 0) div.innerHTML += '<h4>💪 Treinos</h4>';
    dados.treinos.forEach(t => {
        div.innerHTML += `
            <div class="item-lista">
                <div>${t.foco} (${t.duracao_min} min)</div>
                <button onclick="deletarItem('treinos', ${t.id})" style="background:#e74c3c; padding:5px 10px; font-size:0.8em;">🗑️</button>
            </div>`;
    });
    
    if(dados.trabalho.length > 0) div.innerHTML += '<h4>💼 Trabalho</h4>';
    dados.trabalho.forEach(t => {
        div.innerHTML += `
            <div class="item-lista">
                <div>${t.tarefas_concluidas} tarefas (Prod: ${t.nivel_produtividade}/5)</div>
                <button onclick="deletarItem('trabalho', ${t.id})" style="background:#e74c3c; padding:5px 10px; font-size:0.8em;">🗑️</button>
            </div>`;
    });
}