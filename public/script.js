// Variável global para guardar os dados e não precisar baixar toda hora
let cacheDados = null;

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

        // 2. Atualiza o Título
        const titulos = {
            'livros': '📚 Meus Livros',
            'corridas': '🏃‍♂️ Minhas Corridas',
            'treinos': '💪 Meus Treinos',
            'trabalho': '💼 Produtividade'
        };
        document.getElementById('titulo-detalhe').innerText = titulos[categoria];

        // 3. Mostra/oculta botão de sincronizar Strava
        const btnSync = document.getElementById('btn-sync-strava');
        if (btnSync) {
            btnSync.style.display = categoria === 'corridas' ? 'block' : 'none';
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
        ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].forEach(dia => {
            const coluna = document.getElementById(`corridas-${dia}`);
            if (coluna) coluna.innerHTML = '';
        });

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
            // SE FOR CORRIDAS, MOSTRA KANBAN DE DIAS DA SEMANA
            divPadrao.style.display = 'none';
            divKanban.style.display = 'none';
            if (divKanbanCorridas) {
                divKanbanCorridas.style.display = 'block';
            } else {
                console.error('divKanbanCorridas não encontrado!');
                divPadrao.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">Erro: Elemento do Kanban não encontrado</div>';
                return;
            }
            
            // Agrupa corridas por dia da semana
            const corridasPorDia = {
                0: [], // Domingo
                1: [], // Segunda
                2: [], // Terça
                3: [], // Quarta
                4: [], // Quinta
                5: [], // Sexta
                6: []  // Sábado
            };
            
            lista.forEach(item => {
                try {
                    const data = new Date(item.data);
                    if (isNaN(data.getTime())) {
                        console.warn('Data inválida para item:', item);
                        return;
                    }
                    const diaSemana = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.
                    corridasPorDia[diaSemana].push(item);
                } catch (err) {
                    console.error('Erro ao processar item:', item, err);
                }
            });
            
            // Renderiza cada dia
            const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            dias.forEach((diaNome, index) => {
                const coluna = document.getElementById(`corridas-${diaNome}`);
                if (!coluna) {
                    console.warn(`Coluna corridas-${diaNome} não encontrada!`);
                    return;
                }
                
                const corridasDoDia = corridasPorDia[index];
                
                if (corridasDoDia.length === 0) {
                    coluna.innerHTML = '<div style="text-align: center; color: #999; font-size: 0.8em; padding: 20px;">Sem corridas</div>';
                    return;
                }
                
                corridasDoDia.forEach(item => {
                    const data = new Date(item.data);
                    const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    
                    const html = `
                        <div class="card-corrida">
                            <div class="card-corrida-header">
                                <div>
                                    <div class="card-corrida-title">
                                        ${item.strava_name ? `🏃‍♂️ ${item.strava_name}` : '🏃‍♂️ Corrida'}
                                    </div>
                                    ${item.strava_id ? '<span class="card-corrida-strava">(Strava)</span>' : ''}
                                </div>
                                <button class="card-corrida-delete" onclick="deletarItem('corridas', ${item.id})" title="Deletar">🗑️</button>
                            </div>
                            <div class="card-corrida-metrics">
                                <div>📏 <strong>${item.distancia_km} km</strong></div>
                                <div>⏱️ <strong>${item.tempo_minutos} min</strong></div>
                                ${item.pace ? `<div>⚡ <strong>${item.pace}</strong></div>` : ''}
                                ${item.average_speed_kmh ? `<div>🚀 <strong>${item.average_speed_kmh} km/h</strong></div>` : ''}
                                ${item.total_elevation_gain > 0 ? `<div>⛰️ <strong>${item.total_elevation_gain} m</strong></div>` : ''}
                                <div class="card-corrida-badge">${item.tipo_treino || 'Rodagem'}</div>
                            </div>
                            <div class="card-corrida-time">
                                ${dataFormatada} às ${hora}
                            </div>
                        </div>
                    `;
                    coluna.innerHTML += html;
                });
            });
            
        } else {
            // SE FOR OUTROS (Treino, Trabalho...), MOSTRA LISTA NORMAL
            divPadrao.style.display = 'block';
            if (divKanban) divKanban.style.display = 'none';
            if (divKanbanCorridas) divKanbanCorridas.style.display = 'none';
            
            if (categoria === 'treinos') {
                lista.forEach(item => {
                const html = `
                    <div class="card" style="margin-bottom: 15px;">
                        <strong>💪 ${item.foco || 'Treino'}</strong>
                        <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
                            Duração: ${item.duracao_min} min | Carga: ${item.carga_sensacao}
                        </div>
                        <div style="font-size: 0.8em; color: #999; margin-top: 5px;">
                            ${new Date(item.data).toLocaleString('pt-BR')}
                        </div>
                        <button onclick="deletarItem('treinos', ${item.id})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-top: 5px;">🗑️</button>
                    </div>
                `;
                divPadrao.innerHTML += html;
            });
        } else if (categoria === 'trabalho') {
            lista.forEach(item => {
                const html = `
                    <div class="card" style="margin-bottom: 15px;">
                        <strong>💼 Trabalho</strong>
                        <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
                            Tarefas: ${item.tarefas_concluidas} | Produtividade: ${'⭐'.repeat(item.nivel_produtividade || 0)}
                        </div>
                        ${item.observacao ? `<div style="margin-top: 5px; font-size: 0.9em; color: #666;">${item.observacao}</div>` : ''}
                        <div style="font-size: 0.8em; color: #999; margin-top: 5px;">
                            ${new Date(item.data).toLocaleString('pt-BR')}
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

// Funções auxiliares de visualização do formulário
function verificarTipo() {
    const tipo = document.getElementById('tipo').value;
    document.querySelectorAll('.secao-hobby').forEach(el => el.style.display = 'none');
    if (tipo) document.getElementById(`campos-${tipo}`).style.display = 'block';
}

// --- FUNÇÃO: Sincronizar Corridas do Strava ---
async function sincronizarStrava() {
    // Encontra o botão que foi clicado
    const btn = event ? event.target : document.querySelector('#btn-sync-strava') || document.querySelector('button[onclick*="sincronizarStrava"]');
    const textoOriginal = btn ? btn.textContent : 'Sincronizar';
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Sincronizando...';
        }

        const response = await fetch('/sincronizar/strava', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao sincronizar');
        }

        if (data.mensagem.includes('já sincronizada')) {
            alert('✅ ' + data.mensagem);
        } else {
            alert('✅ ' + data.mensagem);
            // Preenche os campos do formulário com os dados do Strava (se estiver na tela de cadastro)
            const distInput = document.getElementById('corrida-dist');
            if (distInput && data.corrida) {
                distInput.value = data.corrida.distancia_km;
                document.getElementById('corrida-tempo').value = data.corrida.tempo_minutos;
                document.getElementById('corrida-tipo').value = data.corrida.tipo_treino || 'Rodagem';
                document.getElementById('corrida-local').value = data.corrida.local || 'Strava';
            }
        }

        // Recarrega os dados
        await carregarDadosNoCache();
        
        // Se estiver na tela de corridas, atualiza
        const telaDetalhes = document.getElementById('tela-detalhes');
        if (telaDetalhes && telaDetalhes.classList.contains('ativa')) {
            renderizarListaEspecifica('corridas');
        }
    } catch (err) {
        alert('❌ Erro: ' + err.message);
        console.error(err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    }
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