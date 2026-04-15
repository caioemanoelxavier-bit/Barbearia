const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conecta ao banco de dados
const db = new sqlite3.Database('./financas.db', (err) => {
    if (err) console.error('Erro ao abrir o banco:', err.message);
    else console.log('Conectado ao banco de dados SQLite.');
});

// 1. Rota de Resumo (Cards do topo)
app.get('/api/resumo', (req, res) => {
    const query = `
        SELECT 
            (SELECT COALESCE(SUM(saldo), 0) FROM conta) as patrimonio_total,
            (SELECT COALESCE(SUM(valor), 0) FROM transacoes t JOIN categoria c ON t.fk_categoria = c.id_categoria WHERE c.tipo = 'Receita' AND strftime('%Y-%m', t.data_transacao) = strftime('%Y-%m', 'now') AND t.excluido = 0) as receitas_mes,
            (SELECT COALESCE(SUM(valor), 0) FROM transacoes t JOIN categoria c ON t.fk_categoria = c.id_categoria WHERE c.tipo = 'Despesa' AND strftime('%Y-%m', t.data_transacao) = strftime('%Y-%m', 'now') AND t.excluido = 0) as despesas_mes
    `;
    db.get(query, [], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        row.saldo_mes = (row.receitas_mes || 0) - (row.despesas_mes || 0);
        res.json(row);
    });
});

// 2. Rota de Contas
app.get('/api/contas', (req, res) => {
    const query = `SELECT c.*, b.nome_banco, b.codigo FROM conta c JOIN bancos b ON c.pk_banco = b.pk_banco`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// 3. Rota de Transações
app.get('/api/transacoes', (req, res) => {
    const query = `
        SELECT t.*, c.nome_categoria, c.icone, c.cor, c.tipo as tipo_categoria, b.nome_banco 
        FROM transacoes t 
        JOIN categoria c ON t.fk_categoria = c.id_categoria
        LEFT JOIN conta co ON t.fk_conta_numero = co.pk_conta
        LEFT JOIN bancos b ON co.pk_banco = b.pk_banco
        WHERE t.excluido = 0 ORDER BY t.data_transacao DESC LIMIT 50
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// 4. Rota de Metas
app.get('/api/metas', (req, res) => {
    const query = `SELECT *, ROUND((valor_atual / valor_objetivo) * 100, 1) as percentual FROM metas`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// 5. Rota do Dashboard (Gráficos)
app.get('/api/dashboard', (req, res) => {
    const dashboardData = {};
    
    // Pegando as últimas transações para a lista rápida
    db.all(`SELECT t.*, c.nome_categoria, c.icone, c.tipo as tipo_categoria FROM transacoes t JOIN categoria c ON t.fk_categoria = c.id_categoria WHERE t.excluido = 0 ORDER BY t.data_transacao DESC LIMIT 5`, (err, transacoes) => {
        dashboardData.ultimas_transacoes = transacoes || [];
        
        // Pegando despesas por categoria no mês atual
        db.all(`SELECT c.nome_categoria, c.icone, c.cor, SUM(t.valor) as total FROM transacoes t JOIN categoria c ON t.fk_categoria = c.id_categoria WHERE c.tipo = 'Despesa' AND t.excluido = 0 AND strftime('%Y-%m', t.data_transacao) = strftime('%Y-%m', 'now') GROUP BY c.id_categoria ORDER BY total DESC`, (err, despesas_cat) => {
            dashboardData.despesas_por_categoria = despesas_cat || [];
            
            // Enviando tudo para o front-end
            res.json(dashboardData);
        });
    });
});

// Auxiliares (Bancos e Categorias para o formulário)
app.get('/api/bancos', (req, res) => {
    db.all(`SELECT * FROM bancos`, [], (err, rows) => res.json(rows || []));
});
app.get('/api/categorias', (req, res) => {
    db.all(`SELECT * FROM categoria`, [], (err, rows) => res.json(rows || []));
});

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 API rodando na porta http://localhost:${PORT}`);
});