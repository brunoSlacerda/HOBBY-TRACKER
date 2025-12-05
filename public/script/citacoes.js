// ============================================
// MÓDULO DE CITAÇÕES
// ============================================

let livroSelecionadoId = null;

// Carregar citação do dia
async function carregarCitacaoDoDia() {
    try {
        const container = document.getElementById('citacao-do-dia-container');
        const textoEl = document.getElementById('citacao-texto');
        const fonteEl = document.getElementById('citacao-fonte');
        
        if (!container || !textoEl || !fonteEl) {
            console.error('Elementos da citação do dia não encontrados');
            return;
        }
        
        const response = await fetch('/citacao-do-dia');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.citacao) {
            // Se não houver citação, mostra mensagem informativa mas mantém o container visível
            textoEl.textContent = 'Nenhuma citação cadastrada ainda.';
            fonteEl.innerHTML = '<em style="opacity: 0.8;">Clique no ícone de edição acima para adicionar citações aos seus livros!</em>';
            container.style.display = 'block';
            return;
        }
        
        textoEl.textContent = `"${data.citacao.texto}"`;
        fonteEl.innerHTML = `<strong>${data.citacao.titulo}</strong> - ${data.citacao.autor}`;
        container.style.display = 'block';
    } catch (err) {
        console.error('Erro ao carregar citação do dia:', err);
        const container = document.getElementById('citacao-do-dia-container');
        if (container) {
            const textoEl = document.getElementById('citacao-texto');
            if (textoEl) {
                textoEl.textContent = 'Erro ao carregar citação. Verifique o console para mais detalhes.';
            }
            container.style.display = 'block';
        }
    }
}

// Abrir modal de citações
async function abrirModalCitacoes() {
    const modal = document.getElementById('modal-citacoes');
    modal.style.display = 'flex';
    
    // Carrega lista de livros
    await carregarListaLivros();
}

// Fechar modal de citações
function fecharModalCitacoes() {
    const modal = document.getElementById('modal-citacoes');
    modal.style.display = 'none';
    
    // Limpa seleção
    document.getElementById('select-livro-citacoes').value = '';
    document.getElementById('area-citacoes-livro').style.display = 'none';
    document.getElementById('form-nova-citacao').style.display = 'none';
    livroSelecionadoId = null;
}

// Carregar lista de livros no select
async function carregarListaLivros() {
    try {
        if (!cacheDados || !cacheDados.livros) {
            await carregarDadosNoCache();
        }
        
        const select = document.getElementById('select-livro-citacoes');
        select.innerHTML = '<option value="">-- Selecione um livro --</option>';
        
        cacheDados.livros.forEach(livro => {
            const option = document.createElement('option');
            option.value = livro.id;
            option.textContent = `${livro.titulo} - ${livro.autor}`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Erro ao carregar lista de livros:', err);
    }
}

// Carregar citações de um livro
async function carregarCitacoesLivro() {
    const select = document.getElementById('select-livro-citacoes');
    const livroId = select.value;
    
    if (!livroId) {
        document.getElementById('area-citacoes-livro').style.display = 'none';
        return;
    }
    
    livroSelecionadoId = livroId;
    
    try {
        const response = await fetch(`/citacoes/${livroId}`);
        const citacoes = await response.json();
        
        // Atualiza título do livro
        const livro = cacheDados.livros.find(l => l.id == livroId);
        if (livro) {
            document.getElementById('titulo-livro-citacoes').textContent = `${livro.titulo} - ${livro.autor}`;
        }
        
        // Renderiza citações
        const listaEl = document.getElementById('lista-citacoes-livro');
        listaEl.innerHTML = '';
        
        if (citacoes.length === 0) {
            listaEl.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Nenhuma citação cadastrada ainda.</p>';
        } else {
            citacoes.forEach(citacao => {
                const div = document.createElement('div');
                div.className = 'citacao-item';
                
                // Escapa o texto para HTML e para JavaScript
                const textoEscapado = citacao.texto
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                
                const textoParaJS = citacao.texto
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n');
                
                div.innerHTML = `
                    <div class="citacao-item-texto">${textoEscapado}</div>
                    <div class="citacao-item-acoes">
                        <button class="btn-editar-citacao" onclick="editarCitacao(${citacao.id}, '${textoParaJS}')" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-deletar-citacao" onclick="deletarCitacao(${citacao.id})" title="Deletar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
                listaEl.appendChild(div);
            });
        }
        
        document.getElementById('area-citacoes-livro').style.display = 'block';
        document.getElementById('form-nova-citacao').style.display = 'none';
    } catch (err) {
        console.error('Erro ao carregar citações:', err);
        alert('Erro ao carregar citações: ' + err.message);
    }
}

// Adicionar nova citação
function adicionarNovaCitacao() {
    if (!livroSelecionadoId) {
        alert('Selecione um livro primeiro');
        return;
    }
    
    document.getElementById('form-nova-citacao').style.display = 'block';
    document.getElementById('input-nova-citacao').value = '';
    document.getElementById('input-nova-citacao').focus();
}

// Cancelar nova citação
function cancelarNovaCitacao() {
    document.getElementById('form-nova-citacao').style.display = 'none';
    document.getElementById('input-nova-citacao').value = '';
}

// Salvar nova citação
async function salvarNovaCitacao() {
    const texto = document.getElementById('input-nova-citacao').value.trim();
    
    if (!texto) {
        alert('Digite uma citação');
        return;
    }
    
    if (!livroSelecionadoId) {
        alert('Selecione um livro');
        return;
    }
    
    try {
        const response = await fetch('/citacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                livro_id: livroSelecionadoId,
                texto: texto
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao salvar citação');
        }
        
        // Recarrega citações
        await carregarCitacoesLivro();
        cancelarNovaCitacao();
        
        // Recarrega citação do dia
        await carregarCitacaoDoDia();
    } catch (err) {
        alert('Erro: ' + err.message);
        console.error(err);
    }
}

// Editar citação
function editarCitacao(id, textoAtual) {
    const novoTexto = prompt('Editar citação:', textoAtual);
    
    if (novoTexto === null || novoTexto.trim() === '') {
        return;
    }
    
    atualizarCitacao(id, novoTexto.trim());
}

// Atualizar citação
async function atualizarCitacao(id, texto) {
    try {
        const response = await fetch(`/citacoes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: texto })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao atualizar citação');
        }
        
        // Recarrega citações
        await carregarCitacoesLivro();
        
        // Recarrega citação do dia
        await carregarCitacaoDoDia();
    } catch (err) {
        alert('Erro: ' + err.message);
        console.error(err);
    }
}

// Deletar citação
async function deletarCitacao(id) {
    if (!confirm('Tem certeza que deseja deletar esta citação?')) {
        return;
    }
    
    try {
        const response = await fetch(`/citacoes/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao deletar citação');
        }
        
        // Recarrega citações
        await carregarCitacoesLivro();
        
        // Recarrega citação do dia
        await carregarCitacaoDoDia();
    } catch (err) {
        alert('Erro: ' + err.message);
        console.error(err);
    }
}

// Fechar modal ao clicar fora
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-citacoes');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharModalCitacoes();
            }
        });
    }
});

