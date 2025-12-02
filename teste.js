// Esse script serve apenas para testar se nossa API está salvando
async function testarRegistro() {
    const dados = {
        tipo: "Leitura",
        valor: 15, // Li 15 páginas
        data: "2023-10-27"
    };

    try {
        const resposta = await fetch('http://localhost:8080/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();
        console.log("RESPOSTA DO SERVIDOR:", resultado);
    } catch (erro) {
        console.error("ERRO:", erro);
    }
}

testarRegistro();