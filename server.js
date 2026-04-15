// ============================================================
// SERVIDOR BACKEND - BARBER SHOP
// ============================================================
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configuração do Banco de Dados
const db = new sqlite3.Database('./barbearia.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        inicializarBanco();
    }
});

// Inicializa o banco com o schema
function inicializarBanco() {
    const schema = require('fs').readFileSync('./schema_barbearia.sql', 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Erro ao inicializar schema:', err.message);
        } else {
            console.log('Banco de dados inicializado com sucesso!');
        }
    });
}

// ============================================================
// ROTAS DA API
// ============================================================

// --- CLIENTES ---

// Listar todos os clientes
app.get('/api/clientes', (req, res) => {
    db.all('SELECT * FROM clientes WHERE ativo = 1 ORDER BY nome', [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// Buscar cliente por telefone
app.get('/api/clientes/buscar/:telefone', (req, res) => {
    const { telefone } = req.params;
    db.get('SELECT * FROM clientes WHERE telefone = ?', [telefone], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(row || null);
    });
});

// Criar novo cliente
app.post('/api/clientes', (req, res) => {
    const { nome, telefone, email } = req.body;
    db.run(
        'INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)',
        [nome, telefone, email],
        function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ id: this.lastID, nome, telefone, email });
        }
    );
});

// --- SERVIÇOS ---

// Listar serviços disponíveis
app.get('/api/servicos', (req, res) => {
    db.all('SELECT * FROM servicos WHERE ativo = 1 ORDER BY nome_servico', [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// --- AGENDAMENTOS ---

// Criar novo agendamento
app.post('/api/agendamentos', (req, res) => {
    const {
        cliente_id,
        servico_id,
        data,
        hora,
        valor_total,
        forma_pagamento,
        observacoes
    } = req.body;

    // Verificar se já existe agendamento no mesmo horário
    db.get(
        'SELECT * FROM agendamentos WHERE data_agendamento = ? AND hora_agendamento = ? AND status != "cancelado"',
        [data, hora],
        (err, row) => {
            if (err) return res.status(500).json({ erro: err.message });
            if (row) {
                return res.status(400).json({ erro: 'Já existe um agendamento neste horário' });
            }

            db.run(
                `INSERT INTO agendamentos
                (fk_cliente, fk_servico, data_agendamento, hora_agendamento, valor_total, forma_pagamento, observacoes, valor_pago, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
                [cliente_id, servico_id, data, hora, valor_total, forma_pagamento, observacoes, valor_total],
                function(err) {
                    if (err) return res.status(500).json({ erro: err.message });

                    // Criar registro de pagamento pendente
                    db.run(
                        'INSERT INTO pagamentos (fk_agendamento, tipo, valor, forma_pagamento, status) VALUES (?, "agendamento", ?, ?, "pendente")',
                        [this.lastID, valor_total, forma_pagamento],
                        (err) => {
                            if (err) console.error('Erro ao criar pagamento:', err.message);
                        }
                    );

                    res.json({
                        id: this.lastID,
                        mensagem: 'Agendamento criado com sucesso!',
                        dados: { cliente_id, servico_id, data, hora, valor_total }
                    });
                }
            );
        }
    );
});

// Listar agendamentos (com filtros opcionais)
app.get('/api/agendamentos', (req, res) => {
    const { data, status, periodo } = req.query;

    let query = `
        SELECT
            a.*,
            c.nome as cliente_nome,
            c.telefone as cliente_telefone,
            s.nome_servico,
            s.preco as servico_preco
        FROM agendamentos a
        JOIN clientes c ON a.fk_cliente = c.id_cliente
        JOIN servicos s ON a.fk_servico = s.id_servico
        WHERE 1=1
    `;

    const params = [];

    if (data) {
        query += ' AND a.data_agendamento = ?';
        params.push(data);
    }

    if (status) {
        query += ' AND a.status = ?';
        params.push(status);
    }

    if (periodo === 'hoje') {
        query += " AND a.data_agendamento = DATE('now')";
    } else if (periodo === 'semana') {
        query += " AND a.data_agendamento >= DATE('now', 'weekday 1', '-' || ((strftime('%w', 'now') + 6) % 7) || ' days')";
    } else if (periodo === 'mes') {
        query += " AND strftime('%Y-%m', a.data_agendamento) = strftime('%Y-%m', 'now')";
    }

    query += ' ORDER BY a.data_agendamento DESC, a.hora_agendamento DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// Atualizar status do agendamento
app.patch('/api/agendamentos/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run(
        'UPDATE agendamentos SET status = ? WHERE id_agendamento = ?',
        [status, id],
        function(err) {
            if (err) return res.status(500).json({ erro: err.message });

            // Se foi realizado, atualizar pagamento para pago
            if (status === 'realizado') {
                db.run(
                    'UPDATE pagamentos SET status = "pago", data_pagamento = CURRENT_TIMESTAMP WHERE fk_agendamento = ?',
                    [id],
                    (err) => {
                        if (err) console.error('Erro ao atualizar pagamento:', err.message);
                    }
                );
            }

            res.json({ mensagem: `Status atualizado para: ${status}` });
        }
    );
});

// Cancelar agendamento
app.delete('/api/agendamentos/:id', (req, res) => {
    const { id } = req.params;
    db.run(
        'UPDATE agendamentos SET status = "cancelado" WHERE id_agendamento = ?',
        [id],
        function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            db.run(
                'UPDATE pagamentos SET status = "cancelado" WHERE fk_agendamento = ?',
                [id],
                (err) => {
                    if (err) console.error('Erro ao cancelar pagamento:', err.message);
                }
            );
            res.json({ mensagem: 'Agendamento cancelado' });
        }
    );
});

// --- PAGAMENTOS / FINANCEIRO ---

// Recebimentos por dia
app.get('/api/financeiro/dia', (req, res) => {
    const { data } = req.query;
    const dataConsulta = data || new Date().toISOString().split('T')[0];

    const query = `
        SELECT
            COUNT(*) as quantidade,
            SUM(valor) as total,
            forma_pagamento,
            tipo
        FROM pagamentos
        WHERE status = 'pago' AND DATE(data_pagamento) = ?
        GROUP BY forma_pagamento, tipo
    `;

    db.all(query, [dataConsulta], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });

        const totalGeral = rows.reduce((sum, r) => sum + r.total, 0);
        const quantidadeTotal = rows.reduce((sum, r) => sum + r.quantidade, 0);

        res.json({
            data: dataConsulta,
            recebimentos: rows,
            resumo: {
                total: totalGeral,
                quantidade: quantidadeTotal,
                por_tipo: {
                    agendamento: rows.filter(r => r.tipo === 'agendamento').reduce((s, r) => s + r.total, 0),
                    assinatura: rows.filter(r => r.tipo === 'assinatura').reduce((s, r) => s + r.total, 0)
                }
            }
        });
    });
});

// Recebimentos por semana
app.get('/api/financeiro/semana', (req, res) => {
    const query = `
        SELECT
            strftime('%Y', data_pagamento) as ano,
            strftime('%W', data_pagamento) as semana,
            DATE(MIN(data_pagamento), 'weekday 1', '-' || ((strftime('%w', data_pagamento) + 6) % 7) || ' days') as semana_inicio,
            DATE(MAX(data_pagamento), 'weekday 0', '+' || (6 - (strftime('%w', data_pagamento) + 6) % 7) || ' days') as semana_fim,
            COUNT(*) as quantidade,
            SUM(valor) as total,
            SUM(CASE WHEN tipo = 'agendamento' THEN valor ELSE 0 END) as agendamentos,
            SUM(CASE WHEN tipo = 'assinatura' THEN valor ELSE 0 END) as assinaturas
        FROM pagamentos
        WHERE status = 'pago'
        GROUP BY strftime('%Y', data_pagamento), strftime('%W', data_pagamento)
        ORDER BY ano DESC, semana DESC
        LIMIT 12
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// Recebimentos por mês
app.get('/api/financeiro/mes', (req, res) => {
    const query = `
        SELECT
            strftime('%Y', data_pagamento) as ano,
            strftime('%m', data_pagamento) as mes,
            CASE strftime('%m', data_pagamento)
                WHEN '01' THEN 'Janeiro'
                WHEN '02' THEN 'Fevereiro'
                WHEN '03' THEN 'Março'
                WHEN '04' THEN 'Abril'
                WHEN '05' THEN 'Maio'
                WHEN '06' THEN 'Junho'
                WHEN '07' THEN 'Julho'
                WHEN '08' THEN 'Agosto'
                WHEN '09' THEN 'Setembro'
                WHEN '10' THEN 'Outubro'
                WHEN '11' THEN 'Novembro'
                WHEN '12' THEN 'Dezembro'
            END as nome_mes,
            COUNT(*) as quantidade,
            SUM(valor) as total,
            SUM(CASE WHEN tipo = 'agendamento' THEN valor ELSE 0 END) as agendamentos_total,
            SUM(CASE WHEN tipo = 'assinatura' THEN valor ELSE 0 END) as assinaturas_total
        FROM pagamentos
        WHERE status = 'pago'
        GROUP BY strftime('%Y', data_pagamento), strftime('%m', data_pagamento)
        ORDER BY ano DESC, mes DESC
        LIMIT 12
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// Dashboard completo (resumo geral)
app.get('/api/financeiro/dashboard', (req, res) => {
    const queries = {
        hoje: "SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE status = 'pago' AND DATE(data_pagamento) = DATE('now')",
        semana: `SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE status = 'pago' AND DATE(data_pagamento) >= DATE('now', 'weekday 1', '-' || ((strftime('%w', 'now') + 6) % 7) || ' days')`,
        mes: "SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE status = 'pago' AND strftime('%Y-%m', data_pagamento) = strftime('%Y-%m', 'now')",
        agendamentos_hoje: "SELECT COUNT(*) as total FROM agendamentos WHERE DATE(data_agendamento) = DATE('now') AND status != 'cancelado'",
        clientes_ativos: "SELECT COUNT(DISTINCT fk_cliente) as total FROM agendamentos WHERE status = 'realizado'"
    };

    let resultados = {};
    let pendentes = 0;

    Object.keys(queries).forEach((key, index) => {
        db.get(queries[key], [], (err, row) => {
            if (err) {
                console.error(`Erro na query ${key}:`, err.message);
            } else {
                resultados[key] = row.total;
            }
            pendentes++;
            if (pendentes === Object.keys(queries).length) {
                res.json(resultados);
            }
        });
    });
});

// --- ASSINATURAS ---

// Criar assinatura
app.post('/api/assinaturas', (req, res) => {
    const { cliente_id, valor_mensal } = req.body;

    db.run(
        'INSERT INTO assinaturas (fk_cliente, valor_mensal, proximo_vencimento) VALUES (?, ?, DATE("now", "+1 month"))',
        [cliente_id, valor_mensal || 130.00],
        function(err) {
            if (err) return res.status(500).json({ erro: err.message });

            // Criar pagamento da primeira mensalidade
            db.run(
                'INSERT INTO pagamentos (fk_assinatura, tipo, valor, forma_pagamento, status) VALUES (?, "assinatura", ?, "pix", "pago")',
                [this.lastID, valor_mensal || 130.00],
                (err) => {
                    if (err) console.error('Erro ao criar pagamento:', err.message);
                }
            );

            res.json({ id: this.lastID, mensagem: 'Assinatura criada com sucesso!' });
        }
    );
});

// Listar assinaturas ativas
app.get('/api/assinaturas', (req, res) => {
    const query = `
        SELECT
            a.*,
            c.nome as cliente_nome,
            c.telefone as cliente_telefone
        FROM assinaturas a
        JOIN clientes c ON a.fk_cliente = c.id_cliente
        WHERE a.status = 'ativa'
        ORDER BY a.data_inicio DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 API disponível em http://localhost:${PORT}/api\n`);
});
