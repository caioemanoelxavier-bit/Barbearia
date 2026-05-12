const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Remove banco antigo se existir
const dbPath = './barbearia.db';
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Banco de dados antigo removido.');
}

// Cria novo banco
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao criar banco de dados:', err.message);
        return;
    }
    console.log('Banco de dados criado com sucesso!');
});

// Lê e executa o schema
const schema = fs.readFileSync('./schema_barbearia.sql', 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('Erro ao executar schema:', err.message);
    } else {
        console.log('Schema criado com sucesso!');

        // Inserir alguns dados de exemplo
        const hoje = new Date().toISOString().split('T')[0];
        const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        db.serialize(() => {
            // Criar alguns agendamentos de exemplo
            db.run(`INSERT INTO agendamentos (fk_cliente, fk_servico, data_agendamento, hora_agendamento, status, valor_total, valor_pago, forma_pagamento)
                    VALUES (1, 1, ?, '10:00', 'realizado', 45.00, 45.00, 'pix')`, [hoje]);

            db.run(`INSERT INTO agendamentos (fk_cliente, fk_servico, data_agendamento, hora_agendamento, status, valor_total, valor_pago, forma_pagamento)
                    VALUES (1, 2, ?, '14:00', 'pendente', 35.00, 35.00, 'dinheiro')`, [hoje]);

            db.run(`INSERT INTO agendamentos (fk_cliente, fk_servico, data_agendamento, hora_agendamento, status, valor_total, valor_pago, forma_pagamento)
                    VALUES (1, 3, ?, '09:00', 'pendente', 70.00, 70.00, 'credito')`, [amanha]);

            // Criar pagamentos para os agendamentos realizados
            db.run(`INSERT INTO pagamentos (fk_agendamento, tipo, valor, forma_pagamento, status, data_pagamento)
                    SELECT 1, 'agendamento', valor_pago, forma_pagamento, 'pago', data_criacao FROM agendamentos WHERE id_agendamento = 1`);

            // Criar uma assinatura de exemplo
            db.run(`INSERT INTO assinaturas (fk_cliente, valor_mensal, status, proximo_vencimento)
                    VALUES (1, 130.00, 'ativa', date('now', '+1 month'))`);

            // Pagamento da assinatura
            db.run(`INSERT INTO pagamentos (fk_assinatura, tipo, valor, forma_pagamento, status)
                    VALUES (1, 'assinatura', 130.00, 'pix', 'pago')`);

            console.log('\nDados de exemplo inseridos!');
            console.log('\n===========================================');
            console.log('Sistema pronto para uso!');
            console.log('===========================================');
            console.log('\nPara iniciar o servidor, execute:');
            console.log('  npm start\n');
            console.log('Acesse:');
            console.log('  Site: http://localhost:3000');
            console.log('  Admin: http://localhost:3000/admin.html');
            console.log('===========================================\n');
        });
    }

    db.close();
});
