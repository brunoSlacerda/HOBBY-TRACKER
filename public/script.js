// 1. Carregar a lista assim que a página abre
document.addEventListener('DOMContentLoaded', carregarLista);

// 2. Verifica se mudou para "Leitura" para mostrar a busca
function verificarTipo() {
    const tipo = document.getElementById('tipo').value;
    const areaLivro = document.getElementById('area-livro');
    
    if (tipo === 'Leitura') {
        areaLivro.style.display = 'block';
    } else {
        areaLivro.style.display = 'none';
    }
}

// 3. Busca na API do Google Books
async function buscarLivro() {
    const termo = document.getElementById('nome-livro').value;
    const divResultado = document.getElementById('resultado-livro');
    const inputValor = document.getElementById('valor');

    if (!termo) return alert("Digite o nome do livro!");

    divResultado.innerHTML = "🔍 Buscando no Google...";

    try {
        const resposta = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termo)}`);
        const dados = await resposta.json();

        if (dados.totalItems === 0) {
            divResultado.innerHTML = "❌ Nenhum livro encontrado.";
            return;
        }

        const livro = dados.items[0].volumeInfo;
        const titulo = livro.title;
        const paginas = livro.pageCount || 0;
        const autores = livro.authors ? livro.authors.join(', ') : 'Desconhecido';
        const ano = livro.publishedDate ? livro.publishedDate.substring(0, 4) : '?';

        // Mostra visualmente
        divResultado.innerHTML = `
            📖 <strong>${titulo}</strong> (${ano})<br>
            ✍️ ${autores}<br>
            📄 ${paginas} páginas encontradas
        `;
        
        // Preenche o campo de valor automaticamente!
        inputValor.value = paginas;

    } catch (erro) {
        console.error(erro);
        divResultado.innerText = "Erro ao conectar com o Google.";
    }
}

// 4. Salvar no Banco de Dados
async function salvarHobby() {
    const tipo = document.getElementById('tipo').value;
    const valor = document.getElementById('valor').value;
    const data = document.getElementById('data').value;

    if (!valor || !data) return alert("Preencha todos os campos!");

    await fetch('/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, valor, data })
    });

    // Limpa campos
    document.getElementById('valor').value = '';
    document.getElementById('nome-livro').value = '';
    document.getElementById('resultado-livro').innerHTML = '';
    
    // Recarrega a lista
    carregarLista();
}

// 5. Carregar lista do Servidor
async function carregarLista() {
    const resposta = await fetch('/resumo');
    const json = await resposta.json();
    
    const divLista = document.getElementById('lista-hobbies');
    divLista.innerHTML = ''; 

    json.dados.forEach(item => {
        divLista.innerHTML += `
            <div class="item-lista">
                <div>
                    <strong>${formatarData(item.data)}</strong><br>
                    ${item.tipo}
                </div>
                <div style="font-size: 1.2em; font-weight: bold; color: #555;">
                    ${item.valor}
                </div>
            </div>
        `;
    });
}

// Pequeno ajudante para formatar a data bonita (dd/mm/aaaa)
function formatarData(dataISO) {
    if(!dataISO) return "";
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
}