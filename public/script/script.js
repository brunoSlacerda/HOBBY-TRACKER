// Variável global para guardar os dados e não precisar baixar toda hora
let cacheDados = null;

// Função auxiliar para normalizar data para timezone local (evita problemas de UTC)
// Quando o banco retorna uma data em UTC, precisamos extrair os componentes UTC
// e criar uma nova data no timezone local para evitar diferenças de 1 dia
function normalizarDataLocal(dataString) {
    if (!dataString) return new Date();
    
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return data;
    
    // Se a string contém 'Z' ou termina com timezone, é UTC
    // Caso contrário, pode ser local ou sem timezone
    const isUTC = typeof dataString === 'string' && (dataString.includes('Z') || dataString.match(/[+-]\d{2}:\d{2}$/));
    
    if (isUTC) {
        // Extrai os componentes UTC e cria uma data local
        // Isso preserva a data/hora original sem conversão de timezone
        const ano = data.getUTCFullYear();
        const mes = data.getUTCMonth();
        const dia = data.getUTCDate();
        const hora = data.getUTCHours();
        const minuto = data.getUTCMinutes();
        const segundo = data.getUTCSeconds();
        return new Date(ano, mes, dia, hora, minuto, segundo);
    } else {
        // Se não é UTC, usa os componentes locais diretamente
        // (já está no timezone local)
        return data;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, carregando dados...');
    await carregarDadosNoCache(); // Baixa os dados assim que abre o site
    console.log('Dados iniciais carregados');
});

// --- NAVEGAÇÃO ENTRE TELAS ---

function voltarHome() {
    document.getElementById('tela-detalhes').classList.remove('ativa');
    document.getElementById('tela-home').classList.add('ativa');
}

async function abrirDetalhes(categoria) {
    try {
        // 1. Troca de tela
        document.getElementById('tela-home').classList.remove('ativa');
        document.getElementById('tela-detalhes').classList.add('ativa');

        // 2. Controle de cabeçalho
        const cabecalhoPadrao = document.getElementById('cabecalho-detalhes-padrao');
        
        if (categoria === 'corridas') {
            // Se for corridas, esconde o cabeçalho padrão (pois tem um próprio)
            if (cabecalhoPadrao) cabecalhoPadrao.style.display = 'none';
            // Atualiza o título para corridas (o emoji será adicionado pelo CSS via ::before)
            const tituloEl = document.getElementById('titulo-detalhe');
            tituloEl.innerText = 'Minhas Corridas';
            tituloEl.classList.add('titulo-corridas');
            // Inicializa semana atual se não estiver definida
            inicializarCorridas();
        } else {
            // Para outros, mostra o cabeçalho padrão e atualiza o título
            if (cabecalhoPadrao) cabecalhoPadrao.style.display = 'flex';
            
            const tituloEl = document.getElementById('titulo-detalhe');
            tituloEl.classList.remove('titulo-corridas'); // Remove classe de corridas se existir
            
            const titulos = {
                'livros': '📚 Meus Livros',
                'treinos': '💪 Meus Treinos',
                'trabalho': '💼 Produtividade'
            };
            tituloEl.innerText = titulos[categoria] || 'Histórico';
            
            // Esconde botão sync antigo (só pra garantir)
            const btnSyncAntigo = document.getElementById('btn-sync-strava');
            if (btnSyncAntigo) btnSyncAntigo.style.display = 'none';
        }

        // 4. Garante que os dados estão carregados antes de renderizar
        if (!cacheDados) {
            await carregarDadosNoCache();
        }

        // 5. Renderiza a lista específica
        renderizarListaEspecifica(categoria);
    } catch (err) {
        console.error('Erro ao abrir detalhes:', err);
        alert('Erro ao carregar: ' + err.message);
    }
}

// --- BANCO DE DADOS E RENDERIZAÇÃO ---

// Baixa tudo do servidor e guarda na memória (cache)
async function carregarDadosNoCache() {
    try {
        const resp = await fetch('/resumo');
        if (!resp.ok) {
            throw new Error(`Erro ao carregar dados: ${resp.status}`);
        }
        cacheDados = await resp.json();
        console.log('Dados carregados:', cacheDados);
        // Se estiver na tela de detalhes, atualiza ela
        // (Útil para quando acabamos de salvar algo)
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        cacheDados = { livros: [], corridas: [], treinos: [], trabalho: [] };
    }
}

// --- RENDERIZAÇÃO INTELIGENTE ---
function renderizarListaEspecifica(categoria) {
    try {
        console.log('Renderizando categoria:', categoria);
        const divPadrao = document.getElementById('lista-especifica');
        const divKanban = document.getElementById('area-kanban-livros');
        const divKanbanCorridas = document.getElementById('area-kanban-corridas');
        
        if (!divPadrao) {
            console.error('divPadrao não encontrado!');
            return;
        }
        if (!divKanban) {
            console.error('divKanban não encontrado!');
        }
        if (!divKanbanCorridas) {
            console.error('divKanbanCorridas não encontrado!');
        }
        
        // Limpa tudo
        divPadrao.innerHTML = '';
        const listaNovos = document.getElementById('lista-novos');
        const listaLendo = document.getElementById('lista-lendo');
        const listaConcluidos = document.getElementById('lista-concluidos');
        
        if (listaNovos) listaNovos.innerHTML = '';
        if (listaLendo) listaLendo.innerHTML = '';
        if (listaConcluidos) listaConcluidos.innerHTML = '';
        
        // Limpa colunas de corridas
        limparColunasCorridas();

        // Verifica se cacheDados existe
        if (!cacheDados) {
            console.warn('cacheDados não carregado ainda, tentando carregar...');
            carregarDadosNoCache().then(() => {
                renderizarListaEspecifica(categoria);
            });
            return;
        }

        const lista = cacheDados[categoria] || [];

        // SE FOR LIVROS, MOSTRA O KANBAN
        if (categoria === 'livros') {
            divPadrao.style.display = 'none';
            divKanban.style.display = 'block';
            if (divKanbanCorridas) divKanbanCorridas.style.display = 'none';
            
            if (lista.length === 0) {
                document.getElementById('lista-novos').innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Nenhum livro encontrado</div>';
                return;
            }

        lista.forEach(item => {
            const pct = Math.round((item.pagina_atual / item.total_paginas) * 100) || 0;
            
            // Define a cor da barrinha de progresso
            let corBarra = pct < 100 ? '#3498db' : '#2ecc71';
            
            // Melhora a qualidade da imagem se for do Google Books
            let capaUrl = item.capa_url || 'https://via.placeholder.com/150x200?text=Sem+Capa';
            if (capaUrl.includes('books.google.com') || capaUrl.includes('googleapis.com')) {
                // Tenta melhorar a qualidade substituindo 'zoom=1' por 'zoom=2' ou removendo parâmetros de tamanho
                capaUrl = capaUrl.replace(/zoom=\d+/, 'zoom=2').replace(/&w=\d+/, '').replace(/&h=\d+/, '');
            }
            
            // HTML do Cartão do Livro
            const htmlLivro = `
                <div class="card-livro">
                    <img src="${capaUrl}" alt="${item.titulo}" loading="lazy">
                    <strong>${item.titulo}</strong>
                    <div style="font-size:0.75em; color:#888; margin:3px 0;">
                        ${item.autor || 'Autor desconhecido'}
                    </div>
                    <div style="font-size:0.8em; color:#666; margin:5px 0;">
                        ${item.pagina_atual}/${item.total_paginas} págs (${pct}%)
                    </div>
                    <div style="background:#eee; height:6px; border-radius:3px; margin-bottom:10px;">
                        <div style="background:${corBarra}; width:${pct}%; height:100%; border-radius:3px; transition: width 0.3s;"></div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:5px; flex-wrap:wrap;">
                        ${item.status !== 'concluido' ? 
                            `<button class="btn-atualizar-pagina" data-id="${item.id}" data-titulo="${item.titulo.replace(/"/g, '&quot;')}" data-total="${item.total_paginas}" title="Atualizar página">📖</button>` : 
                            `<button class="btn-abrir-modal" data-id="${item.id}" data-titulo="${item.titulo.replace(/"/g, '&quot;')}" data-nota="${item.nota || ''}" data-resumo="${(item.resumo || '').replace(/"/g, '&quot;')}" title="Avaliar livro" style="background:#f39c12; color:white; font-weight:bold;">
                                ⭐ ${item.nota || 'Avaliar'}
                            </button>`
                        }
                        <button class="btn-abrir-modal" data-id="${item.id}" data-titulo="${item.titulo.replace(/"/g, '&quot;')}" data-nota="${item.nota || ''}" data-resumo="${(item.resumo || '').replace(/"/g, '&quot;')}" title="Ver/Editar resumo" style="background:#9b59b6;">📝</button>
                        <button class="btn-deletar" data-tabela="livros" data-id="${item.id}" title="Deletar livro" style="background:#e74c3c;">🗑️</button>
                    </div>
                </div>
            `;

            // Decide em qual coluna jogar
            if (item.status === 'concluido') {
                document.getElementById('lista-concluidos').innerHTML += htmlLivro;
            } else if (item.status === 'lendo') {
                document.getElementById('lista-lendo').innerHTML += htmlLivro;
            } else {
                document.getElementById('lista-novos').innerHTML += htmlLivro;
            }
        });

        // Usa event delegation no container para evitar listeners duplicados
        const kanbanContainer = document.getElementById('area-kanban-livros');
        if (kanbanContainer && !kanbanContainer.dataset.listenersAdded) {
            kanbanContainer.dataset.listenersAdded = 'true';
            
            kanbanContainer.addEventListener('click', function(e) {
                const btn = e.target.closest('.btn-abrir-modal');
                if (btn) {
                    e.preventDefault();
                    const id = parseInt(btn.getAttribute('data-id'));
                    const titulo = btn.getAttribute('data-titulo');
                    const nota = btn.getAttribute('data-nota') || null;
                    const resumo = btn.getAttribute('data-resumo') || '';
                    abrirModalResumo(id, titulo, nota, resumo);
                    return;
                }
                
                const btnPagina = e.target.closest('.btn-atualizar-pagina');
                if (btnPagina) {
                    e.preventDefault();
                    const id = parseInt(btnPagina.getAttribute('data-id'));
                    const titulo = btnPagina.getAttribute('data-titulo');
                    const total = parseInt(btnPagina.getAttribute('data-total'));
                    atualizarPagina(id, titulo, total);
                    return;
                }
                
                const btnDeletar = e.target.closest('.btn-deletar');
                if (btnDeletar) {
                    e.preventDefault();
                    const tabela = btnDeletar.getAttribute('data-tabela');
                    const id = parseInt(btnDeletar.getAttribute('data-id'));
                    deletarItem(tabela, id);
                    return;
                }
            });
        }

        } else if (categoria === 'corridas') {
            // SE FOR CORRIDAS, USA A FUNÇÃO DO MÓDULO DE CORRIDAS
            renderizarCorridas(lista);
            
        } else {
            // SE FOR OUTROS (Treino, Trabalho...), MOSTRA LISTA NORMAL
            divPadrao.style.display = 'block';
            if (divKanban) divKanban.style.display = 'none';
            if (divKanbanCorridas) divKanbanCorridas.style.display = 'none';
            
            if (categoria === 'treinos') {
                lista.forEach(item => {
                const data = normalizarDataLocal(item.data);
                const html = `
                    <div class="card" style="margin-bottom: 15px;">
                        <strong>💪 ${item.foco || 'Treino'}</strong>
                        <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
                            Duração: ${item.duracao_min} min | Carga: ${item.carga_sensacao}
                        </div>
                        <div style="font-size: 0.8em; color: #999; margin-top: 5px;">
                            ${data.toLocaleString('pt-BR')}
                        </div>
                        <button onclick="deletarItem('treinos', ${item.id})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-top: 5px;">🗑️</button>
                    </div>
                `;
                divPadrao.innerHTML += html;
            });
        } else if (categoria === 'trabalho') {
            lista.forEach(item => {
                const data = normalizarDataLocal(item.data);
                const html = `
                    <div class="card" style="margin-bottom: 15px;">
                        <strong>💼 Trabalho</strong>
                        <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
                            Tarefas: ${item.tarefas_concluidas} | Produtividade: ${'⭐'.repeat(item.nivel_produtividade || 0)}
                        </div>
                        ${item.observacao ? `<div style="margin-top: 5px; font-size: 0.9em; color: #666;">${item.observacao}</div>` : ''}
                        <div style="font-size: 0.8em; color: #999; margin-top: 5px;">
                            ${data.toLocaleString('pt-BR')}
                        </div>
                        <button onclick="deletarItem('trabalho', ${item.id})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-top: 5px;">🗑️</button>
                    </div>
                `;
                divPadrao.innerHTML += html;
            });
        }
        }
    } catch (err) {
        console.error('Erro ao renderizar:', err);
        const divPadrao = document.getElementById('lista-especifica');
        if (divPadrao) {
            divPadrao.innerHTML = `<div style="text-align: center; padding: 40px; color: #e74c3c;">Erro ao carregar dados: ${err.message}</div>`;
        }
    }
}

// --- FUNÇÃO DE ATUALIZAR PÁGINAS (Com Inteligência) ---
async function atualizarPagina(id, titulo, total) {
    const novaPagina = prompt(`📖 ${titulo}\nPágina atual (Total: ${total})?`);
    
    if (novaPagina && !isNaN(novaPagina)) {
        const paginaNum = parseInt(novaPagina);
        let statusNovo = 'lendo'; // Padrão: se tem páginas lidas, está lendo
        
        // Lógica automática de status:
        if (paginaNum >= total) {
            statusNovo = 'concluido';
            alert("Parabéns! Livro concluído! 🏆\nNão esqueça de deixar sua nota.");
        } else if (paginaNum === 0) {
            statusNovo = 'novo'; // Ainda não começou
        } else if (paginaNum > 0 && paginaNum < total) {
            statusNovo = 'lendo'; // Está lendo
        }

        await fetch(`/atualizar/livro/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                pagina_atual: paginaNum,
                status: statusNovo 
            })
        });
        await carregarDadosNoCache();
        renderizarListaEspecifica('livros');
    }
}

// --- FUNÇÕES DO MODAL DE RESUMO ---
function abrirModalResumo(id, titulo, nota, resumo) {
    try {
        console.log('Abrindo modal:', { id, titulo, nota, resumo });
        
        const modal = document.getElementById('modal-resumo');
        if (!modal) {
            console.error('Modal não encontrado!');
            alert('Erro: Modal não encontrado. Recarregue a página.');
            return;
        }
        
        // Trata valores null/undefined
        const notaValor = (nota === null || nota === undefined || nota === 'null') ? '' : nota;
        const resumoValor = (resumo === null || resumo === undefined) ? '' : resumo;
        
        modal.style.display = 'flex';
        document.getElementById('modal-id-livro').value = id;
        document.getElementById('modal-titulo-livro').innerText = titulo || 'Livro';
        document.getElementById('modal-nota').value = notaValor;
        document.getElementById('modal-texto').value = resumoValor;
        
        console.log('Modal aberto com sucesso');
    } catch (err) {
        console.error('Erro ao abrir modal:', err);
        alert('Erro ao abrir modal. Verifique o console para mais detalhes.');
    }
}

function fecharModal() {
    document.getElementById('modal-resumo').style.display = 'none';
}

async function salvarResumo() {
    const id = document.getElementById('modal-id-livro').value;
    const notaInput = document.getElementById('modal-nota').value;
    const resumo = document.getElementById('modal-texto').value;

    // Converte nota para número (ou null se vazio)
    const nota = notaInput && notaInput.trim() !== '' ? parseInt(notaInput) : null;

    // Valida nota se fornecida
    if (nota !== null && (nota < 1 || nota > 10)) {
        alert("A nota deve ser entre 1 e 10!");
        return;
    }

    try {
        const response = await fetch(`/atualizar/livro/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nota: nota !== null ? nota : undefined,
                resumo: resumo.trim() || undefined
            })
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.erro || 'Erro ao salvar');
        }

        fecharModal();
        alert("Avaliação salva!");
        await carregarDadosNoCache();
        renderizarListaEspecifica('livros');
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
        console.error(err);
    }
}

// --- FUNÇÕES DE AÇÃO (Salvar, Deletar, Buscar) --- 
// (Mantive quase iguais, só adicionando o recarregamento do cache)

async function salvarHobby() {
    const tipo = document.getElementById('tipo').value;
    if(!tipo) return alert("Selecione um tipo!");
    
    let url = `/registrar/${tipo}`;
    let corpo = {};
    
    if (tipo === 'livro') {
        const titulo = document.getElementById('livro-titulo').value.trim();
        const autor = document.getElementById('livro-autor').value.trim();
        const paginas = document.getElementById('livro-paginas').value;
        
        if (!titulo) return alert("Preencha o título do livro!");
        if (!autor) return alert("Preencha o autor do livro!");
        if (!paginas || paginas <= 0) return alert("Preencha o total de páginas!");
        
        corpo = {
            titulo: titulo,
            autor: autor,
            paginas: parseInt(paginas),
            capa: document.getElementById('livro-capa').value || ''
        };
    } else if (tipo === 'corrida') {
        const distancia = document.getElementById('corrida-dist').value;
        const tempo = document.getElementById('corrida-tempo').value;
        
        if (!distancia || distancia <= 0) return alert("Preencha a distância!");
        if (!tempo || tempo <= 0) return alert("Preencha o tempo!");
        
        corpo = {
            distancia: parseFloat(distancia),
            tempo: parseInt(tempo),
            tipo: document.getElementById('corrida-tipo').value,
            local: document.getElementById('corrida-local').value || 'Não informado'
        };
    } else if (tipo === 'treino') {
        const foco = document.getElementById('treino-foco').value.trim();
        const duracao = document.getElementById('treino-duracao').value;
        
        if (!foco) return alert("Preencha o foco do treino!");
        if (!duracao || duracao <= 0) return alert("Preencha a duração!");
        
        corpo = { 
            foco: foco, 
            duracao: parseInt(duracao), 
            carga: document.getElementById('treino-carga').value 
        };
    } else if (tipo === 'trabalho') {
        const tarefas = document.getElementById('trab-tarefas').value;
        
        if (!tarefas || tarefas <= 0) return alert("Preencha a quantidade de tarefas!");
        
        corpo = { 
            tarefas: parseInt(tarefas), 
            produtividade: parseInt(document.getElementById('trab-prod').value), 
            obs: document.getElementById('trab-obs').value || '' 
        };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(corpo)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao salvar');
        }

        alert("✅ " + (data.mensagem || "Salvo com sucesso!"));
        
        // Limpa campos
        document.getElementById('tipo').value = '';
        document.querySelectorAll('.secao-hobby').forEach(el => el.style.display = 'none');
        document.querySelectorAll('input').forEach(i => {
            if (i.type !== 'hidden') i.value = '';
        });
        document.querySelectorAll('select').forEach(s => {
            if (s.id !== 'tipo') s.selectedIndex = 0;
        });
        
        // Recarrega os dados
        await carregarDadosNoCache();
    } catch (err) {
        alert("❌ Erro: " + err.message);
        console.error('Erro ao salvar:', err);
    }
}

async function deletarItem(tabela, id) {
    if (!confirm("Apagar?")) return;
    await fetch(`/remover/${tabela}/${id}`, { method: 'DELETE' });
    await carregarDadosNoCache(); // Atualiza cache
    renderizarListaEspecifica(tabela); // Atualiza tela atual
}

// Funções auxiliares de visualização do formulário
function verificarTipo() {
    const tipo = document.getElementById('tipo').value;
    document.querySelectorAll('.secao-hobby').forEach(el => el.style.display = 'none');
    if (tipo) document.getElementById(`campos-${tipo}`).style.display = 'block';
}

// --- FUNÇÃO: Sincronizar Corridas do Strava ---
// Movida para corrida.js

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
        // Tenta pegar a melhor qualidade de imagem disponível
        let capaUrl = '';
        if (info.imageLinks) {
            // Prioriza: large > medium > small > thumbnail
            capaUrl = info.imageLinks.large || 
                      info.imageLinks.medium || 
                      info.imageLinks.small || 
                      info.imageLinks.thumbnail || '';
        }
        document.getElementById('livro-capa').value = capaUrl;
        divRes.innerHTML = `✅ ${info.title}`;
    } else { divRes.innerHTML = "❌ Nada."; }
}

// --- FUNÇÕES DE NAVEGAÇÃO DE SEMANAS (CORRIDAS) ---
// Movidas para corrida.js