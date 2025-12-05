// ============================================
// MÓDULO DE CORRIDAS
// ============================================
// Todas as funções e lógica relacionada a corridas

// Variável global para armazenar a semana atual sendo visualizada
let semanaAtual = null; // Será um objeto { inicio: Date, fim: Date }

// ============================================
// FUNÇÕES DE NAVEGAÇÃO DE SEMANAS
// ============================================

/**
 * Calcula o início e fim da semana atual (Domingo a Sábado)
 * @param {Date} data - Data de referência (opcional, usa hoje se não fornecido)
 * @returns {Object} { inicio: Date, fim: Date }
 */
function calcularSemana(data = new Date()) {
    const hoje = new Date(data);
    const diaSemana = hoje.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    
    // Calcula o domingo da semana (início)
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - diaSemana);
    inicio.setHours(0, 0, 0, 0);
    
    // Calcula o sábado da semana (fim)
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    
    return { inicio, fim };
}

/**
 * Calcula a semana atual (primeira vez que abre)
 */
function calcularSemanaAtual() {
    return calcularSemana(new Date());
}

/**
 * Navega para próxima ou anterior semana
 * @param {number} direcao - 1 para próxima semana, -1 para semana anterior
 */
function navegarSemana(direcao) {
    if (!semanaAtual) {
        semanaAtual = calcularSemanaAtual();
    }
    
    // Cria uma nova data baseada no início da semana atual
    const novaData = new Date(semanaAtual.inicio);
    novaData.setDate(semanaAtual.inicio.getDate() + (direcao * 7));
    
    // Calcula a nova semana
    semanaAtual = calcularSemana(novaData);
    
    // Re-renderiza as corridas
    renderizarListaEspecifica('corridas');
}

/**
 * Atualiza a informação da semana exibida no header
 */
function atualizarInfoSemana() {
    if (!semanaAtual) return;
    
    const infoSemanaEl = document.getElementById('info-semana');
    if (!infoSemanaEl) return;
    
    const inicioFormatado = semanaAtual.inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const fimFormatado = semanaAtual.fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    infoSemanaEl.textContent = `${inicioFormatado} - ${fimFormatado}`;
}

// ============================================
// FUNÇÃO: Sincronizar Corridas do Strava
// ============================================
async function sincronizarStrava() {
    // Encontra o botão que foi clicado
    const btn = (event && event.target) ? event.target.closest('button') : (document.getElementById('btn-sync-strava-corridas') || document.getElementById('btn-sync-strava'));
    const textoOriginal = btn ? btn.innerHTML : 'Sincronizar';
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Sincronizando...';
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
            btn.innerHTML = textoOriginal;
        }
    }
}

// ============================================
// FUNÇÃO: Renderizar Corridas
// ============================================
function renderizarCorridas(lista) {
    const divPadrao = document.getElementById('lista-especifica');
    const divKanban = document.getElementById('area-kanban-livros');
    const divKanbanCorridas = document.getElementById('area-kanban-corridas');
    
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
    
    // Inicializa semana atual se não estiver definida
    if (!semanaAtual) {
        semanaAtual = calcularSemanaAtual();
    }
    
    // Atualiza exibição da semana no header
    atualizarInfoSemana();
    
    // Filtra corridas pela semana selecionada
    const corridasDaSemana = lista.filter(item => {
        try {
            // Normaliza a data para o timezone local
            const data = normalizarDataLocal(item.data);
            if (isNaN(data.getTime())) return false;
            
            // Remove horas para comparar apenas datas
            const dataItem = new Date(data.getFullYear(), data.getMonth(), data.getDate());
            const inicioSemana = new Date(semanaAtual.inicio.getFullYear(), semanaAtual.inicio.getMonth(), semanaAtual.inicio.getDate());
            const fimSemana = new Date(semanaAtual.fim.getFullYear(), semanaAtual.fim.getMonth(), semanaAtual.fim.getDate());
            
            return dataItem >= inicioSemana && dataItem <= fimSemana;
        } catch (err) {
            console.error('Erro ao filtrar item:', item, err);
            return false;
        }
    });
    
    // Calcula e exibe o resumo da semana
    atualizarResumoSemana(corridasDaSemana);
    
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
    
    corridasDaSemana.forEach(item => {
        try {
            // Normaliza a data para o timezone local antes de obter o dia da semana
            const data = normalizarDataLocal(item.data);
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
            coluna.innerHTML = '<div class="sem-corridas">Sem corridas</div>';
            return;
        }
        
        corridasDoDia.forEach(item => {
            // Normaliza a data para o timezone local antes de formatar
            const data = normalizarDataLocal(item.data);
            const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            // Define classe baseada no tipo de treino para estilização
            let classeTipo = '';
            let badgeClass = '';
            const tipo = (item.tipo_treino || '').toLowerCase();
            
            if (tipo.includes('longo')) {
                classeTipo = 'tipo-longo';
                badgeClass = 'badge-longo';
            } else if (tipo.includes('tiro')) {
                classeTipo = 'tipo-tiro';
                badgeClass = 'badge-tiro';
            } else {
                classeTipo = 'tipo-rodagem';
                badgeClass = 'badge-rodagem';
            }

            const html = `
                <div class="card-corrida ${classeTipo}">
                    <div class="card-corrida-header">
                        <div class="card-corrida-title">
                            ${item.strava_name ? `🏃‍♂️ ${item.strava_name}` : '🏃‍♂️ Corrida'}
                            ${item.strava_id ? '<span class="card-corrida-strava"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065l5.154 10.172 5.154-10.172h-3.065zM9.658 13.828h3.065l-5.154-10.172-5.154 10.172h3.065l2.089-4.117z"/></svg> Strava</span>' : ''}
                        </div>
                        <button class="card-corrida-delete" onclick="deletarItem('corridas', ${item.id})" title="Deletar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                    <div class="card-corrida-metrics">
                        <div class="metric-item"><span class="metric-icon">📏</span> <span class="metric-value">${item.distancia_km} km</span></div>
                        <div class="metric-item"><span class="metric-icon">⏱️</span> <span class="metric-value">${item.tempo_minutos} min</span></div>
                        ${item.pace ? `<div class="metric-item"><span class="metric-icon">⚡</span> <span class="metric-value">${item.pace}</span></div>` : ''}
                        ${item.average_speed_kmh ? `<div class="metric-item"><span class="metric-icon">🚀</span> <span class="metric-value">${item.average_speed_kmh} km/h</span></div>` : ''}
                        ${item.total_elevation_gain > 0 ? `<div class="metric-item"><span class="metric-icon">⛰️</span> <span class="metric-value">${item.total_elevation_gain} m</span></div>` : ''}
                        <div><span class="card-corrida-badge ${badgeClass}">${item.tipo_treino || 'Rodagem'}</span></div>
                    </div>
                    <div class="card-corrida-time">
                        ${dataFormatada} às ${hora}
                    </div>
                </div>
            `;
            coluna.innerHTML += html;
        });
    });
}

// ============================================
// FUNÇÃO: Limpar Colunas de Corridas
// ============================================
function limparColunasCorridas() {
    ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].forEach(dia => {
        const coluna = document.getElementById(`corridas-${dia}`);
        if (coluna) coluna.innerHTML = '';
    });
}

// ============================================
// FUNÇÃO: Atualizar Resumo da Semana
// ============================================
function atualizarResumoSemana(corridasDaSemana) {
    // Calcula totais
    let totalKm = 0;
    let totalMinutos = 0;
    
    corridasDaSemana.forEach(corrida => {
        totalKm += parseFloat(corrida.distancia_km) || 0;
        totalMinutos += parseInt(corrida.tempo_minutos) || 0;
    });
    
    // Atualiza os elementos HTML
    const totalKmEl = document.getElementById('total-km-semana');
    const totalMinutosEl = document.getElementById('total-minutos-semana');
    
    if (totalKmEl) {
        totalKmEl.textContent = `${totalKm.toFixed(2)} km`;
    }
    
    if (totalMinutosEl) {
        // Converte minutos para horas e minutos se necessário
        if (totalMinutos >= 60) {
            const horas = Math.floor(totalMinutos / 60);
            const minutos = totalMinutos % 60;
            totalMinutosEl.textContent = minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
        } else {
            totalMinutosEl.textContent = `${totalMinutos} min`;
        }
    }
}

// ============================================
// FUNÇÃO: Inicializar Corridas (chamada ao abrir detalhes)
// ============================================
function inicializarCorridas() {
    // Inicializa semana atual se não estiver definida
    if (!semanaAtual) {
        semanaAtual = calcularSemanaAtual();
    }
}

