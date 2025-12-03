document.addEventListener('DOMContentLoaded', carregarLista);

// Controla quais campos aparecem na tela
function verificarTipo() {
    const tipo = document.getElementById('tipo').value;
    
    // Esconde tudo primeiro
    document.getElementById('campos-livro').style.display = 'none';
    document.getElementById('campos-corrida').style.display = 'none';
    document.getElementById('campos-treino').style.display = 'none';
    document.getElementById('campos-trabalho').style.display = 'none';

    // Mostra só o escolhido
    if (tipo === 'livro') document.getElementById('campos-livro').style.display = 'block';
    if (tipo === 'corrida') document.getElementById('campos-corrida').style.display = 'block';
    if (tipo === 'treino') document.getElementById('campos-treino').style.display = 'block';
    if (tipo === 'trabalho') document.getElementById('campos-trabalho').style.display = 'block';
}

// Funções de Busca de Livro (Mantivemos a lógica do Google Books)
async function buscarLivro() {
    const termo = document.getElementById('busca-titulo').value;
    const divRes = document.getElementById('resultado-livro');
    
    if(!termo) return alert("Digite algo!");
    divRes.innerHTML = "Buscando...";

    const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termo)}`);
    const dados = await resp.json();
    
    if(dados.totalItems > 0) {
        const info = dados.items[0].volumeInfo;
        // Preenche os campos ocultos automaticamente
        document.getElementById('livro-titulo').value = info.title;
        document.getElementById('livro-autor').value = info.authors ? info.authors.join(', ') : 'Desc.';
        document.getElementById('livro-paginas').value = info.pageCount || 0;
        document.getElementById('livro-capa').value = info.imageLinks ? info.imageLinks.thumbnail : '';
        
        divRes.innerHTML = `✅ Achei: <strong>${info.title}</strong> (${info.pageCount} págs)`;
    } else {
        divRes.innerHTML = "❌ Nada encontrado.";
    }
}

// O Grande "Salvar" que decide pra onde mandar
async function salvarHobby() {
    const tipo = document.getElementById('tipo').value;
    let url = '';
    let corpo = {};

    if (tipo === 'livro') {
        url = '/registrar/livro';
        corpo = {
            titulo: document.getElementById('livro-titulo').value,
            autor: document.getElementById('livro-autor').value,
            paginas: document.getElementById('livro-paginas').value,
            capa: document.getElementById('livro-capa').value
        };
    } else if (tipo === 'corrida') {
        url = '/registrar/corrida';
        corpo = {
            distancia: document.getElementById('corrida-dist').value,
            tempo: document.getElementById('corrida-tempo').value,
            tipo: document.getElementById('corrida-tipo').value,
            local: document.getElementById('corrida-local').value
        };
    } 
    // ... (você pode completar com treino e trabalho se quiser testar só esses 2 primeiro)
    
    // Envia pro servidor
    await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(corpo)
    });

    alert("Salvo com sucesso!");
    carregarLista();
}

async function carregarLista() {
    const resp = await fetch('/resumo');
    const dados = await resp.json();
    
    const div = document.getElementById('lista-hobbies');
    div.innerHTML = '';

    // Renderiza Livros
    if(dados.livros.length > 0) div.innerHTML += '<h4>📚 Livros</h4>';
    dados.livros.forEach(l => {
        div.innerHTML += `<div class="item-lista"><img src="${l.capa_url}" width="30"> <strong>${l.titulo}</strong> - ${l.pagina_atual}/${l.total_paginas} págs</div>`;
    });

    // Renderiza Corridas
    if(dados.corridas.length > 0) div.innerHTML += '<h4>🏃‍♂️ Corridas</h4>';
    dados.corridas.forEach(c => {
        div.innerHTML += `<div class="item-lista"><strong>${c.distancia_km}km</strong> em ${c.tempo_minutos}min (${c.tipo_treino})</div>`;
    });
}