/**
 * BarberShop - setup.js
 * Cria o banco barbearia.db com schema + dados de exemplo.
 * Execute UMA VEZ antes de iniciar o servidor:
 *   node setup.js
 */

const fs      = require('fs');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'barbearia.db');

// Remove banco antigo
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('Banco antigo removido.');
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('Erro ao criar banco:', err.message); process.exit(1); }
  console.log('Banco criado:', DB_PATH);
});

const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS clientes (
    id_cliente    INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT    NOT NULL,
    telefone      TEXT    NOT NULL UNIQUE,
    email         TEXT,
    data_cadastro TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo         INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1))
  );

  CREATE TABLE IF NOT EXISTS servicos (
    id_servico      INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_servico    TEXT    NOT NULL UNIQUE,
    descricao       TEXT,
    preco           REAL    NOT NULL CHECK(preco >= 0),
    duracao_minutos INTEGER NOT NULL DEFAULT 30 CHECK(duracao_minutos > 0),
    ativo           INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1))
  );

  CREATE TABLE IF NOT EXISTS profissionais (
    id_profissional     INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                TEXT    NOT NULL,
    especialidade       TEXT,
    comissao_percentual REAL    DEFAULT 0,
    ativo               INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1))
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id_agendamento   INTEGER PRIMARY KEY AUTOINCREMENT,
    fk_cliente       INTEGER NOT NULL,
    fk_servico       INTEGER NOT NULL,
    data_agendamento TEXT    NOT NULL,
    hora_agendamento TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'pendente'
      CHECK(status IN ('pendente','confirmado','cancelado','concluido','nao_compareceu')),
    valor_total      REAL    NOT NULL DEFAULT 0,
    desconto         REAL    NOT NULL DEFAULT 0,
    valor_pago       REAL    NOT NULL DEFAULT 0,
    forma_pagamento  TEXT    DEFAULT 'pix'
      CHECK(forma_pagamento IN ('dinheiro','pix','credito','debito','assinatura')),
    observacoes      TEXT,
    data_criacao     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_alteracao   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (fk_servico) REFERENCES servicos(id_servico)
  );

  CREATE TABLE IF NOT EXISTS assinaturas (
    id_assinatura      INTEGER PRIMARY KEY AUTOINCREMENT,
    fk_cliente         INTEGER NOT NULL,
    data_inicio        TEXT    NOT NULL DEFAULT CURRENT_DATE,
    data_fim           TEXT,
    status             TEXT    NOT NULL DEFAULT 'ativa'
      CHECK(status IN ('ativa','cancelada','expirada')),
    valor_mensal       REAL    NOT NULL DEFAULT 130.00,
    ultimo_pagamento   TEXT,
    proximo_vencimento TEXT,
    FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente)
  );

  CREATE TABLE IF NOT EXISTS pagamentos (
    id_pagamento             INTEGER PRIMARY KEY AUTOINCREMENT,
    fk_agendamento           INTEGER,
    fk_assinatura            INTEGER,
    tipo                     TEXT NOT NULL CHECK(tipo IN ('agendamento','assinatura')),
    valor                    REAL NOT NULL CHECK(valor >= 0),
    data_pagamento           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento          TEXT NOT NULL DEFAULT 'pix',
    status                   TEXT NOT NULL DEFAULT 'pendente'
      CHECK(status IN ('pendente','pago','cancelado','reembolsado')),
    id_transacao_mercadopago TEXT,
    FOREIGN KEY (fk_agendamento) REFERENCES agendamentos(id_agendamento) ON DELETE SET NULL,
    FOREIGN KEY (fk_assinatura)  REFERENCES assinaturas(id_assinatura)   ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS agendamento_profissional (
    fk_agendamento  INTEGER NOT NULL,
    fk_profissional INTEGER NOT NULL,
    PRIMARY KEY (fk_agendamento, fk_profissional),
    FOREIGN KEY (fk_agendamento)  REFERENCES agendamentos(id_agendamento)  ON DELETE CASCADE,
    FOREIGN KEY (fk_profissional) REFERENCES profissionais(id_profissional) ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora ON agendamentos(data_agendamento, hora_agendamento);
  CREATE INDEX IF NOT EXISTS idx_agendamentos_status    ON agendamentos(status);
  CREATE INDEX IF NOT EXISTS idx_pagamentos_status_data ON pagamentos(status, data_pagamento);
  CREATE INDEX IF NOT EXISTS idx_clientes_telefone      ON clientes(telefone);
`;

db.exec(schema, (err) => {
  if (err) { console.error('Erro no schema:', err.message); db.close(); process.exit(1); }
  console.log('Schema criado com sucesso!');

  const hoje   = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  db.serialize(() => {
    // Serviços
    const servicos = [
      ['Corte Clássico',       'Corte de cabelo tradicional.', 45.00, 45],
      ['Corte Degradê',        'Corte moderno com transição.', 50.00, 50],
      ['Barba Terapia',        'Barba com toalha quente.',     35.00, 30],
      ['Corte + Barba',        'Combo completo.',              70.00, 75],
      ['Pezinho/Sobrancelha',  'Acabamento e limpeza.',        15.00, 15],
      ['Corte Infantil',       'Até 12 anos.',                 40.00, 40],
      ['Barboterapia Premium', 'Barba premium + massagem.',    50.00, 45],
      ['Pigmentação de Barba', 'Preenchimento de falhas.',     60.00, 60],
    ];

    const stmtSrv = db.prepare(
      'INSERT OR IGNORE INTO servicos (nome_servico, descricao, preco, duracao_minutos) VALUES (?,?,?,?)'
    );
    servicos.forEach(s => stmtSrv.run(s));
    stmtSrv.finalize();

    // Profissionais
    db.run("INSERT OR IGNORE INTO profissionais (nome, especialidade, comissao_percentual) VALUES ('Barbeiro Principal','Corte e barba',40)");
    db.run("INSERT OR IGNORE INTO profissionais (nome, especialidade, comissao_percentual) VALUES ('Barbeiro Júnior','Corte',30)");

    // Clientes de exemplo
    db.run("INSERT OR IGNORE INTO clientes (nome, telefone, email) VALUES ('João Silva','11987654321','joao@email.com')");
    db.run("INSERT OR IGNORE INTO clientes (nome, telefone, email) VALUES ('Carlos Oliveira','11976543210','carlos@email.com')");

    // Agendamentos de exemplo
    db.run(
      "INSERT INTO agendamentos (fk_cliente, fk_servico, data_agendamento, hora_agendamento, status, valor_total, valor_pago, forma_pagamento) VALUES (1, 1, ?, '10:00', 'concluido', 45.00, 45.00, 'pix')",
      [hoje],
      function() {
        // Pagamento do agendamento concluído
        db.run(
          "INSERT INTO pagamentos (fk_agendamento, tipo, valor, forma_pagamento, status) VALUES (?, 'agendamento', 45.00, 'pix', 'pago')",
          [this.lastID]
        );
      }
    );

    db.run(
      "INSERT INTO agendamentos (fk_cliente, fk_servico, data_agendamento, hora_agendamento, status, valor_total, valor_pago, forma_pagamento) VALUES (2, 2, ?, '14:00', 'pendente', 35.00, 35.00, 'dinheiro')",
      [hoje]
    );

    db.run(
      "INSERT INTO agendamentos (fk_cliente, fk_servico, data_agendamento, hora_agendamento, status, valor_total, valor_pago, forma_pagamento) VALUES (1, 3, ?, '09:00', 'confirmado', 70.00, 70.00, 'credito')",
      [amanha]
    );

    // Assinatura de exemplo
    db.run(
      "INSERT INTO assinaturas (fk_cliente, valor_mensal, status, ultimo_pagamento, proximo_vencimento) VALUES (1, 130.00, 'ativa', CURRENT_DATE, DATE('now','+1 month'))",
      [],
      function() {
        db.run(
          "INSERT INTO pagamentos (fk_assinatura, tipo, valor, forma_pagamento, status) VALUES (?, 'assinatura', 130.00, 'pix', 'pago')",
          [this.lastID]
        );
      }
    );

    console.log('');
    console.log('============================================');
    console.log('  Setup concluído!');
    console.log('');
    console.log('  Banco:    barbearia.db');
    console.log('  Serviços: 8 cadastrados');
    console.log('  Clientes: 2 de exemplo');
    console.log('  Agenda:   3 agendamentos de exemplo');
    console.log('');
    console.log('  Para iniciar:');
    console.log('    node server.js');
    console.log('');
    console.log('  Acesse:');
    console.log('    http://localhost:3000');
    console.log('    http://localhost:3000/admin.html');
    console.log('============================================');
    console.log('');
  });

  // Fecha após as operações assíncronas terminarem
  setTimeout(() => db.close(), 1000);
});