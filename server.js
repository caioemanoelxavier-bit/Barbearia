/**
 * BarberShop - server.js completo ajustado para LOCAL + RAILWAY
 *
 * LOCAL:
 * npm install express cors sqlite3
 * node server.js
 * http://localhost:3000
 *
 * RAILWAY:
 * Variável:
 * DATABASE_PATH=/data/barbearia.db
 *
 * Volume:
 * Mount path: /data
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * IMPORTANTE:
 * Localmente, usa barbearia.db na pasta do projeto.
 * No Railway, usa process.env.DATABASE_PATH, exemplo:
 * /data/barbearia.db
 */
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'barbearia.db');

// Garante que a pasta do banco exista, principalmente no Railway
const DB_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Banco SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar no SQLite:', err.message);
    process.exit(1);
  }

  console.log('Banco conectado:', DB_PATH);
  db.run('PRAGMA foreign_keys = ON');
  inicializarBanco();
});

// Helpers
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      err ? reject(err) : resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      err ? reject(err) : resolve(rows);
    });
  });

const execScript = (sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      err ? reject(err) : resolve();
    });
  });

function enviarErro(res, err, status = 500) {
  console.error(err);

  res.status(status).json({
    erro: err.message || 'Erro interno no servidor'
  });
}

function normalizarTelefone(t = '') {
  return String(t).replace(/\D/g, '');
}

function normalizarStatus(s = '') {
  const mapa = {
    realizado: 'concluido',
    concluído: 'concluido',
    concluido: 'concluido',
    no_show: 'nao_compareceu',
    'não compareceu': 'nao_compareceu',
    nao_compareceu: 'nao_compareceu',
    pendente: 'pendente',
    confirmado: 'confirmado',
    cancelado: 'cancelado'
  };

  return mapa[String(s).toLowerCase()] || String(s).toLowerCase();
}

function normalizarPagamento(p = 'pix') {
  const valor = String(p || 'pix').toLowerCase();

  if (valor === 'cartao') return 'credito';
  if (valor === 'crédito') return 'credito';
  if (valor === 'débito') return 'debito';

  const permitidos = ['dinheiro', 'pix', 'credito', 'debito', 'assinatura'];

  return permitidos.includes(valor) ? valor : 'pix';
}

function ehSegundaFeira(data) {
  return new Date(`${data}T00:00:00`).getDay() === 1;
}

function horaParaMinutos(hora) {
  const [hh, mm] = String(hora).split(':').map(Number);
  return hh * 60 + mm;
}

function minutosParaHora(min) {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function intervalosConflitam(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && fimA > inicioB;
}

// Página inicial
app.get('/', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');

  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }

  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }

  res.send('BarberShop API rodando. Coloque index.html na pasta public/.');
});

// Inicializar banco
async function inicializarBanco() {
  const schema = `
    CREATE TABLE IF NOT EXISTS configuracoes (
      id_config INTEGER PRIMARY KEY CHECK (id_config = 1),
      nome_barbearia TEXT NOT NULL DEFAULT 'BarberShop',
      telefone TEXT DEFAULT '11999999999',
      endereco TEXT DEFAULT 'São Paulo - SP',
      horario_inicio TEXT NOT NULL DEFAULT '09:00',
      horario_fim TEXT NOT NULL DEFAULT '20:00',
      intervalo_minutos INTEGER NOT NULL DEFAULT 30,
      segunda_funciona INTEGER NOT NULL DEFAULT 0 CHECK(segunda_funciona IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nome TEXT NOT NULL DEFAULT 'Administrador',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL UNIQUE,
      email TEXT,
      data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS servicos (
      id_servico INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_servico TEXT NOT NULL UNIQUE,
      descricao TEXT,
      preco REAL NOT NULL CHECK(preco >= 0),
      duracao_minutos INTEGER NOT NULL DEFAULT 30 CHECK(duracao_minutos > 0),
      ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS profissionais (
      id_profissional INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      especialidade TEXT,
      comissao_percentual REAL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id_agendamento INTEGER PRIMARY KEY AUTOINCREMENT,
      fk_cliente INTEGER NOT NULL,
      fk_servico INTEGER NOT NULL,
      data_agendamento TEXT NOT NULL,
      hora_agendamento TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente'
        CHECK(status IN ('pendente','confirmado','cancelado','concluido','nao_compareceu')),
      valor_total REAL NOT NULL DEFAULT 0,
      desconto REAL NOT NULL DEFAULT 0,
      valor_pago REAL NOT NULL DEFAULT 0,
      forma_pagamento TEXT DEFAULT 'pix'
        CHECK(forma_pagamento IN ('dinheiro','pix','credito','debito','assinatura')),
      observacoes TEXT,
      data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      data_alteracao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente) ON DELETE RESTRICT ON UPDATE CASCADE,
      FOREIGN KEY (fk_servico) REFERENCES servicos(id_servico) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agendamento_profissional (
      fk_agendamento INTEGER NOT NULL,
      fk_profissional INTEGER NOT NULL,
      PRIMARY KEY (fk_agendamento, fk_profissional),
      FOREIGN KEY (fk_agendamento) REFERENCES agendamentos(id_agendamento) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (fk_profissional) REFERENCES profissionais(id_profissional) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id_pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
      fk_agendamento INTEGER,
      tipo TEXT NOT NULL DEFAULT 'agendamento',
      valor REAL NOT NULL DEFAULT 0,
      data_pagamento TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      forma_pagamento TEXT NOT NULL DEFAULT 'pix',
      status TEXT NOT NULL DEFAULT 'pendente'
        CHECK(status IN ('pendente','pago','cancelado','reembolsado')),
      FOREIGN KEY (fk_agendamento) REFERENCES agendamentos(id_agendamento) ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora
    ON agendamentos(data_agendamento, hora_agendamento);

    CREATE INDEX IF NOT EXISTS idx_clientes_telefone
    ON clientes(telefone);
  `;

  try {
    await execScript(schema);

    await run(`
      INSERT OR IGNORE INTO configuracoes
      (id_config, nome_barbearia, telefone, endereco, horario_inicio, horario_fim, intervalo_minutos, segunda_funciona)
      VALUES
      (1, 'BarberShop', '11999999999', 'São Paulo - SP', '09:00', '20:00', 30, 0)
    `);

    await inserirDadosIniciais();

    console.log('Banco inicializado com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar banco:', err.message);
  }
}

// Dados iniciais
async function inserirDadosIniciais() {
  const servicos = [
    ['Corte Clássico', 'Corte tradicional com acabamento.', 45.00, 45],
    ['Corte Degradê', 'Corte moderno com transição e finalização.', 50.00, 50],
    ['Barba Terapia', 'Barba completa com acabamento.', 35.00, 30],
    ['Corte + Barba', 'Combo completo de cabelo e barba.', 70.00, 75],
    ['Pezinho/Sobrancelha', 'Acabamento e limpeza.', 15.00, 15],
    ['Corte Infantil', 'Corte para crianças até 12 anos.', 40.00, 40]
  ];

  for (const servico of servicos) {
    await run(
      `INSERT OR IGNORE INTO servicos
      (nome_servico, descricao, preco, duracao_minutos)
      VALUES (?, ?, ?, ?)`,
      servico
    );
  }

  await run(`
    INSERT OR IGNORE INTO profissionais
    (nome, especialidade, comissao_percentual)
    VALUES ('Barbeiro Principal', 'Corte e barba', 40)
  `);

  await run(`
    INSERT OR IGNORE INTO admin_users
    (username, password, nome)
    VALUES ('admin1', '1234', 'Administrador')
  `);
}

// Conflito de horário
async function horarioTemConflito(data, hora, servicoId, ignorarId = null) {
  const servico = await get(
    'SELECT duracao_minutos FROM servicos WHERE id_servico = ? AND ativo = 1',
    [servicoId]
  );

  if (!servico) {
    throw new Error('Serviço não encontrado');
  }

  const inicioNovo = horaParaMinutos(hora);
  const fimNovo = inicioNovo + Number(servico.duracao_minutos || 30);

  let sql = `
    SELECT a.id_agendamento, a.hora_agendamento, s.duracao_minutos
    FROM agendamentos a
    JOIN servicos s ON s.id_servico = a.fk_servico
    WHERE a.data_agendamento = ?
      AND a.status IN ('pendente', 'confirmado')
  `;

  const params = [data];

  if (ignorarId) {
    sql += ' AND a.id_agendamento != ?';
    params.push(ignorarId);
  }

  const rows = await all(sql, params);

  return rows.some((ag) => {
    const inicioExistente = horaParaMinutos(ag.hora_agendamento);
    const fimExistente = inicioExistente + Number(ag.duracao_minutos || 30);

    return intervalosConflitam(
      inicioNovo,
      fimNovo,
      inicioExistente,
      fimExistente
    );
  });
}

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    const admin = await get(
      'SELECT * FROM admin_users WHERE username = ? AND password = ?',
      [usuario, senha]
    );

    if (!admin) {
      return res.status(401).json({
        ok: false,
        erro: 'Usuário ou senha inválidos'
      });
    }

    res.json({
      ok: true,
      token: 'barbershop-admin-logado',
      usuario: {
        nome: admin.nome,
        login: admin.username,
        cargo: 'admin'
      }
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// RESET ADMIN
// Use apenas se esquecer login/senha.
// Acesse: /api/reset-admin
app.get('/api/reset-admin', async (req, res) => {
  try {
    await run('DELETE FROM admin_users');

    await run(`
      INSERT INTO admin_users
      (username, password, nome)
      VALUES ('admin1', '1234', 'Administrador')
    `);

    res.json({
      ok: true,
      mensagem: 'Admin resetado com sucesso',
      usuario: 'admin1',
      senha: '1234'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// CONFIGURAÇÕES
app.get('/api/configuracoes', async (req, res) => {
  try {
    const config = await get('SELECT * FROM configuracoes WHERE id_config = 1');
    res.json(config);
  } catch (err) {
    enviarErro(res, err);
  }
});

app.put('/api/configuracoes', async (req, res) => {
  try {
    await run(
      `UPDATE configuracoes
       SET nome_barbearia = ?,
           telefone = ?,
           endereco = ?,
           horario_inicio = ?,
           horario_fim = ?,
           intervalo_minutos = ?,
           segunda_funciona = ?
       WHERE id_config = 1`,
      [
        req.body.nome_barbearia || 'BarberShop',
        req.body.telefone || '',
        req.body.endereco || '',
        req.body.horario_inicio || '09:00',
        req.body.horario_fim || '20:00',
        Number(req.body.intervalo_minutos || 30),
        Number(req.body.segunda_funciona || 0)
      ]
    );

    const config = await get('SELECT * FROM configuracoes WHERE id_config = 1');

    res.json(config);
  } catch (err) {
    enviarErro(res, err);
  }
});

// ALTERAR CREDENCIAIS ADMIN
app.post('/api/admin/credenciais', async (req, res) => {
  try {
    const { usuarioAtual, senhaAtual, novoUsuario, novaSenha } = req.body;

    if (!usuarioAtual || !senhaAtual || !novoUsuario || !novaSenha) {
      return res.status(400).json({
        ok: false,
        erro: 'Preencha usuário atual, senha atual, novo usuário e nova senha'
      });
    }

    const admin = await get(
      'SELECT * FROM admin_users WHERE username = ? AND password = ?',
      [usuarioAtual, senhaAtual]
    );

    if (!admin) {
      return res.status(401).json({
        ok: false,
        erro: 'Usuário ou senha atual inválidos'
      });
    }

    await run(
      `UPDATE admin_users
       SET username = ?,
           password = ?,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id_admin = ?`,
      [novoUsuario, novaSenha, admin.id_admin]
    );

    res.json({
      ok: true,
      mensagem: 'Credenciais atualizadas com sucesso'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// SERVIÇOS
app.get('/api/servicos', async (req, res) => {
  try {
    const rows = await all(
      'SELECT * FROM servicos WHERE ativo = 1 ORDER BY nome_servico'
    );

    res.json(rows);
  } catch (err) {
    enviarErro(res, err);
  }
});

app.post('/api/servicos', async (req, res) => {
  try {
    const nome = String(req.body.nome_servico || '').trim();
    const descricao = req.body.descricao || '';
    const preco = Number(req.body.preco || 0);
    const duracao = Number(req.body.duracao_minutos || 30);

    if (!nome) {
      return res.status(400).json({
        erro: 'Nome do serviço é obrigatório'
      });
    }

    if (preco < 0) {
      return res.status(400).json({
        erro: 'Preço inválido'
      });
    }

    const r = await run(
      `INSERT INTO servicos
       (nome_servico, descricao, preco, duracao_minutos)
       VALUES (?, ?, ?, ?)`,
      [nome, descricao, preco, duracao]
    );

    res.status(201).json({
      id_servico: r.lastID,
      nome_servico: nome,
      descricao,
      preco,
      duracao_minutos: duracao
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.put('/api/servicos/:id', async (req, res) => {
  try {
    await run(
      `UPDATE servicos
       SET nome_servico = ?,
           descricao = ?,
           preco = ?,
           duracao_minutos = ?
       WHERE id_servico = ?`,
      [
        req.body.nome_servico,
        req.body.descricao || '',
        Number(req.body.preco || 0),
        Number(req.body.duracao_minutos || 30),
        req.params.id
      ]
    );

    res.json({
      mensagem: 'Serviço atualizado'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.delete('/api/servicos/:id', async (req, res) => {
  try {
    await run(
      'UPDATE servicos SET ativo = 0 WHERE id_servico = ?',
      [req.params.id]
    );

    res.json({
      mensagem: 'Serviço removido'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// PROFISSIONAIS
app.get('/api/profissionais', async (req, res) => {
  try {
    const rows = await all(
      'SELECT * FROM profissionais WHERE ativo = 1 ORDER BY nome'
    );

    res.json(rows);
  } catch (err) {
    enviarErro(res, err);
  }
});

app.post('/api/profissionais', async (req, res) => {
  try {
    const nome = String(req.body.nome || '').trim();
    const especialidade = req.body.especialidade || '';
    const comissao = Number(req.body.comissao_percentual || 0);

    if (!nome) {
      return res.status(400).json({
        erro: 'Nome do barbeiro é obrigatório'
      });
    }

    const r = await run(
      `INSERT INTO profissionais
       (nome, especialidade, comissao_percentual)
       VALUES (?, ?, ?)`,
      [nome, especialidade, comissao]
    );

    res.status(201).json({
      id_profissional: r.lastID,
      nome,
      especialidade,
      comissao_percentual: comissao
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.put('/api/profissionais/:id', async (req, res) => {
  try {
    await run(
      `UPDATE profissionais
       SET nome = ?,
           especialidade = ?,
           comissao_percentual = ?
       WHERE id_profissional = ?`,
      [
        req.body.nome,
        req.body.especialidade || '',
        Number(req.body.comissao_percentual || 0),
        req.params.id
      ]
    );

    res.json({
      mensagem: 'Barbeiro atualizado'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.delete('/api/profissionais/:id', async (req, res) => {
  try {
    await run(
      'UPDATE profissionais SET ativo = 0 WHERE id_profissional = ?',
      [req.params.id]
    );

    res.json({
      mensagem: 'Barbeiro removido'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// CLIENTES
app.get('/api/clientes', async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.*,
             COUNT(a.id_agendamento) AS qtd_agendamentos
      FROM clientes c
      LEFT JOIN agendamentos a ON a.fk_cliente = c.id_cliente
      WHERE c.ativo = 1
      GROUP BY c.id_cliente
      ORDER BY c.nome
    `);

    res.json(rows);
  } catch (err) {
    enviarErro(res, err);
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const nome = String(req.body.nome || '').trim();
    const telefone = normalizarTelefone(req.body.telefone);
    const email = req.body.email || null;

    if (nome.length < 3) {
      return res.status(400).json({
        erro: 'Nome deve ter pelo menos 3 caracteres'
      });
    }

    if (![10, 11].includes(telefone.length)) {
      return res.status(400).json({
        erro: 'Telefone deve ter 10 ou 11 dígitos'
      });
    }

    const existente = await get(
      'SELECT * FROM clientes WHERE telefone = ?',
      [telefone]
    );

    if (existente) {
      await run(
        'UPDATE clientes SET nome = ?, email = ?, ativo = 1 WHERE id_cliente = ?',
        [nome, email, existente.id_cliente]
      );

      return res.json({
        ...existente,
        nome,
        email,
        ativo: 1
      });
    }

    const r = await run(
      `INSERT INTO clientes
       (nome, telefone, email)
       VALUES (?, ?, ?)`,
      [nome, telefone, email]
    );

    res.status(201).json({
      id_cliente: r.lastID,
      nome,
      telefone,
      email
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await run(
      'UPDATE clientes SET ativo = 0 WHERE id_cliente = ?',
      [req.params.id]
    );

    res.json({
      mensagem: 'Cliente removido'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// HORÁRIOS
app.get('/api/horarios', async (req, res) => {
  try {
    const data = req.query.data;
    const servicoId = req.query.servico_id;

    if (!data) {
      return res.status(400).json({
        erro: 'Data é obrigatória'
      });
    }

    if (!servicoId) {
      return res.status(400).json({
        erro: 'Serviço é obrigatório'
      });
    }

    const config = await get(
      'SELECT * FROM configuracoes WHERE id_config = 1'
    );

    const servico = await get(
      'SELECT * FROM servicos WHERE id_servico = ? AND ativo = 1',
      [servicoId]
    );

    if (!servico) {
      return res.status(404).json({
        erro: 'Serviço não encontrado'
      });
    }

    if (ehSegundaFeira(data) && Number(config.segunda_funciona) !== 1) {
      return res.json([]);
    }

    const inicio = horaParaMinutos(config.horario_inicio || '09:00');
    const fim = horaParaMinutos(config.horario_fim || '20:00');
    const intervalo = Number(config.intervalo_minutos || 30);
    const duracao = Number(servico.duracao_minutos || 30);

    const hoje = new Date().toISOString().slice(0, 10);
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

    const resultado = [];

    for (let min = inicio; min + duracao <= fim; min += intervalo) {
      const hora = minutosParaHora(min);

      let disponivel = true;
      let motivo = '';

      if (data < hoje) {
        disponivel = false;
        motivo = 'Data passada';
      }

      if (data === hoje && min <= minutosAgora) {
        disponivel = false;
        motivo = 'Horário passado';
      }

      if (disponivel) {
        const conflito = await horarioTemConflito(data, hora, servicoId);

        if (conflito) {
          disponivel = false;
          motivo = 'Horário ocupado';
        }
      }

      resultado.push({
        hora,
        disponivel,
        motivo
      });
    }

    res.json(resultado);
  } catch (err) {
    enviarErro(res, err);
  }
});

// AGENDAMENTOS
app.get('/api/agendamentos', async (req, res) => {
  try {
    let sql = `
      SELECT a.*,
             c.nome AS cliente_nome,
             c.telefone AS cliente_telefone,
             c.email AS cliente_email,
             s.nome_servico,
             s.preco AS servico_preco,
             s.duracao_minutos,
             p.id_profissional AS fk_profissional,
             p.nome AS profissional_nome
      FROM agendamentos a
      JOIN clientes c ON c.id_cliente = a.fk_cliente
      JOIN servicos s ON s.id_servico = a.fk_servico
      LEFT JOIN agendamento_profissional ap ON ap.fk_agendamento = a.id_agendamento
      LEFT JOIN profissionais p ON p.id_profissional = ap.fk_profissional
      WHERE 1 = 1
    `;

    const params = [];

    if (req.query.data) {
      sql += ' AND a.data_agendamento = ?';
      params.push(req.query.data);
    }

    if (req.query.status) {
      sql += ' AND a.status = ?';
      params.push(normalizarStatus(req.query.status));
    }

    sql += ' ORDER BY a.data_agendamento DESC, a.hora_agendamento DESC';

    const rows = await all(sql, params);

    res.json(rows);
  } catch (err) {
    enviarErro(res, err);
  }
});

app.post('/api/agendamentos', async (req, res) => {
  try {
    const clienteBody = req.body.cliente || {};

    let clienteId = req.body.cliente_id || req.body.fk_cliente;

    const nomeCliente = String(
      clienteBody.nome || req.body.nome || ''
    ).trim();

    const telefoneCliente = normalizarTelefone(
      clienteBody.telefone || req.body.telefone || ''
    );

    const emailCliente = clienteBody.email || req.body.email || null;

    const servicoId = req.body.servico_id || req.body.fk_servico;
    const profissionalId = req.body.profissional_id || req.body.fk_profissional || null;
    const data = req.body.data || req.body.data_agendamento;
    const hora = req.body.hora || req.body.hora_agendamento;
    const formaPagamento = normalizarPagamento(req.body.forma_pagamento);
    const observacoes = req.body.observacoes || '';

    if (!clienteId) {
      if (nomeCliente.length < 3) {
        return res.status(400).json({
          erro: 'Nome deve ter pelo menos 3 caracteres'
        });
      }

      if (![10, 11].includes(telefoneCliente.length)) {
        return res.status(400).json({
          erro: 'Telefone deve ter 10 ou 11 dígitos'
        });
      }

      let cliente = await get(
        'SELECT * FROM clientes WHERE telefone = ?',
        [telefoneCliente]
      );

      if (cliente) {
        clienteId = cliente.id_cliente;

        await run(
          'UPDATE clientes SET nome = ?, email = ?, ativo = 1 WHERE id_cliente = ?',
          [nomeCliente, emailCliente, clienteId]
        );
      } else {
        const novoCliente = await run(
          `INSERT INTO clientes
           (nome, telefone, email)
           VALUES (?, ?, ?)`,
          [nomeCliente, telefoneCliente, emailCliente]
        );

        clienteId = novoCliente.lastID;
      }
    }

    if (!servicoId) {
      return res.status(400).json({
        erro: 'Serviço é obrigatório'
      });
    }

    if (!data) {
      return res.status(400).json({
        erro: 'Data é obrigatória'
      });
    }

    if (!hora) {
      return res.status(400).json({
        erro: 'Hora é obrigatória'
      });
    }

    const config = await get(
      'SELECT * FROM configuracoes WHERE id_config = 1'
    );

    if (ehSegundaFeira(data) && Number(config.segunda_funciona) !== 1) {
      return res.status(400).json({
        erro: 'Não funcionamos às segundas-feiras'
      });
    }

    const servico = await get(
      'SELECT * FROM servicos WHERE id_servico = ? AND ativo = 1',
      [servicoId]
    );

    if (!servico) {
      return res.status(400).json({
        erro: 'Serviço não encontrado'
      });
    }

    const conflito = await horarioTemConflito(data, hora, servicoId);

    if (conflito) {
      return res.status(409).json({
        erro: 'Horário em conflito com agendamento existente'
      });
    }

    const valorTotal = Number(req.body.valor_total ?? servico.preco ?? 0);
    const desconto = Number(req.body.desconto || 0);
    const valorPago = Number(req.body.valor_pago ?? valorTotal - desconto);

    const ag = await run(
      `INSERT INTO agendamentos
       (fk_cliente, fk_servico, data_agendamento, hora_agendamento, status,
        valor_total, desconto, valor_pago, forma_pagamento, observacoes)
       VALUES (?, ?, ?, ?, 'pendente', ?, ?, ?, ?, ?)`,
      [
        clienteId,
        servicoId,
        data,
        hora,
        valorTotal,
        desconto,
        valorPago,
        formaPagamento,
        observacoes
      ]
    );

    if (profissionalId) {
      await run(
        `INSERT OR IGNORE INTO agendamento_profissional
         (fk_agendamento, fk_profissional)
         VALUES (?, ?)`,
        [ag.lastID, profissionalId]
      );
    }

    await run(
      `INSERT INTO pagamentos
       (fk_agendamento, tipo, valor, forma_pagamento, status)
       VALUES (?, 'agendamento', ?, ?, 'pendente')`,
      [ag.lastID, valorPago, formaPagamento]
    );

    res.status(201).json({
      mensagem: 'Agendamento criado com sucesso',
      id_agendamento: ag.lastID,
      agendamento: {
        id_agendamento: ag.lastID,
        fk_cliente: clienteId,
        fk_servico: servicoId,
        data_agendamento: data,
        hora_agendamento: hora,
        valor_total: valorTotal
      }
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.put('/api/agendamentos/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const atual = await get(
      'SELECT * FROM agendamentos WHERE id_agendamento = ?',
      [id]
    );

    if (!atual) {
      return res.status(404).json({
        erro: 'Agendamento não encontrado'
      });
    }

    const clienteBody = req.body.cliente || {};

    const nomeCliente = String(
      clienteBody.nome || req.body.nome || ''
    ).trim();

    const telefoneCliente = normalizarTelefone(
      clienteBody.telefone || req.body.telefone || ''
    );

    const emailCliente = clienteBody.email || req.body.email || null;

    if (nomeCliente && telefoneCliente) {
      await run(
        `UPDATE clientes
         SET nome = ?, telefone = ?, email = ?
         WHERE id_cliente = ?`,
        [nomeCliente, telefoneCliente, emailCliente, atual.fk_cliente]
      );
    }

    const servicoId = req.body.fk_servico || req.body.servico_id || atual.fk_servico;
    const profissionalId = req.body.fk_profissional || req.body.profissional_id || null;
    const data = req.body.data_agendamento || req.body.data || atual.data_agendamento;
    const hora = req.body.hora_agendamento || req.body.hora || atual.hora_agendamento;
    const status = normalizarStatus(req.body.status || atual.status);
    const observacoes = req.body.observacoes || '';
    const formaPagamento = normalizarPagamento(req.body.forma_pagamento || atual.forma_pagamento);

    const servico = await get(
      'SELECT * FROM servicos WHERE id_servico = ? AND ativo = 1',
      [servicoId]
    );

    if (!servico) {
      return res.status(400).json({
        erro: 'Serviço não encontrado'
      });
    }

    const conflito = await horarioTemConflito(data, hora, servicoId, id);

    if (conflito) {
      return res.status(409).json({
        erro: 'Horário em conflito com outro agendamento'
      });
    }

    const valorTotal = Number(req.body.valor_total ?? servico.preco ?? 0);
    const desconto = Number(req.body.desconto || 0);
    const valorPago = Number(req.body.valor_pago ?? valorTotal - desconto);

    await run(
      `UPDATE agendamentos
       SET fk_servico = ?,
           data_agendamento = ?,
           hora_agendamento = ?,
           status = ?,
           valor_total = ?,
           desconto = ?,
           valor_pago = ?,
           forma_pagamento = ?,
           observacoes = ?,
           data_alteracao = CURRENT_TIMESTAMP
       WHERE id_agendamento = ?`,
      [
        servicoId,
        data,
        hora,
        status,
        valorTotal,
        desconto,
        valorPago,
        formaPagamento,
        observacoes,
        id
      ]
    );

    await run(
      'DELETE FROM agendamento_profissional WHERE fk_agendamento = ?',
      [id]
    );

    if (profissionalId) {
      await run(
        `INSERT OR IGNORE INTO agendamento_profissional
         (fk_agendamento, fk_profissional)
         VALUES (?, ?)`,
        [id, profissionalId]
      );
    }

    res.json({
      mensagem: 'Agendamento atualizado'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.patch('/api/agendamentos/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const status = normalizarStatus(req.body.status);

    const permitidos = [
      'pendente',
      'confirmado',
      'cancelado',
      'concluido',
      'nao_compareceu'
    ];

    if (!permitidos.includes(status)) {
      return res.status(400).json({
        erro: 'Status inválido'
      });
    }

    const r = await run(
      `UPDATE agendamentos
       SET status = ?,
           data_alteracao = CURRENT_TIMESTAMP
       WHERE id_agendamento = ?`,
      [status, id]
    );

    if (r.changes === 0) {
      return res.status(404).json({
        erro: 'Agendamento não encontrado'
      });
    }

    if (status === 'concluido') {
      await run(
        `UPDATE pagamentos
         SET status = 'pago',
             data_pagamento = CURRENT_TIMESTAMP
         WHERE fk_agendamento = ?`,
        [id]
      );
    }

    if (status === 'cancelado') {
      await run(
        `UPDATE pagamentos
         SET status = 'cancelado'
         WHERE fk_agendamento = ?`,
        [id]
      );
    }

    res.json({
      mensagem: `Status atualizado para ${status}`,
      status
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

app.delete('/api/agendamentos/:id', async (req, res) => {
  try {
    const r = await run(
      `UPDATE agendamentos
       SET status = 'cancelado',
           data_alteracao = CURRENT_TIMESTAMP
       WHERE id_agendamento = ?`,
      [req.params.id]
    );

    if (r.changes === 0) {
      return res.status(404).json({
        erro: 'Agendamento não encontrado'
      });
    }

    await run(
      `UPDATE pagamentos
       SET status = 'cancelado'
       WHERE fk_agendamento = ?`,
      [req.params.id]
    );

    res.json({
      mensagem: 'Agendamento cancelado'
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// DASHBOARD
app.get('/api/dashboard', async (req, res) => {
  try {
    const hoje = await get(`
      SELECT COALESCE(SUM(valor_pago), 0) AS receita,
             COUNT(*) AS qtd
      FROM agendamentos
      WHERE data_agendamento = DATE('now','localtime')
        AND status != 'cancelado'
    `);

    const semana = await get(`
      SELECT COALESCE(SUM(valor_pago), 0) AS receita,
             COUNT(*) AS qtd
      FROM agendamentos
      WHERE data_agendamento >= DATE('now','localtime','-7 days')
        AND status != 'cancelado'
    `);

    const mes = await get(`
      SELECT COALESCE(SUM(valor_pago), 0) AS receita,
             COUNT(*) AS qtd
      FROM agendamentos
      WHERE strftime('%Y-%m', data_agendamento) = strftime('%Y-%m', DATE('now','localtime'))
        AND status != 'cancelado'
    `);

    const pagamentos = await all(`
      SELECT forma_pagamento,
             COALESCE(SUM(valor_pago), 0) AS total
      FROM agendamentos
      WHERE status != 'cancelado'
      GROUP BY forma_pagamento
      ORDER BY total DESC
    `);

    const servicosMaisVendidos = await all(`
      SELECT s.nome_servico,
             COUNT(a.id_agendamento) AS qtd
      FROM agendamentos a
      JOIN servicos s ON s.id_servico = a.fk_servico
      WHERE a.status != 'cancelado'
      GROUP BY s.id_servico
      ORDER BY qtd DESC
      LIMIT 5
    `);

    res.json({
      hoje,
      semana,
      mes,
      pagamentos,
      servicosMaisVendidos
    });
  } catch (err) {
    enviarErro(res, err);
  }
});

// EXPORT CSV
app.get('/api/export/agendamentos.csv', async (req, res) => {
  try {
    const rows = await all(`
      SELECT a.id_agendamento,
             c.nome AS cliente,
             c.telefone,
             s.nome_servico AS servico,
             a.data_agendamento,
             a.hora_agendamento,
             a.status,
             a.valor_total,
             a.forma_pagamento
      FROM agendamentos a
      JOIN clientes c ON c.id_cliente = a.fk_cliente
      JOIN servicos s ON s.id_servico = a.fk_servico
      ORDER BY a.data_agendamento DESC, a.hora_agendamento DESC
    `);

    const header = [
      'id',
      'cliente',
      'telefone',
      'servico',
      'data',
      'hora',
      'status',
      'valor',
      'pagamento'
    ];

    const linhas = rows.map((r) => [
      r.id_agendamento,
      r.cliente,
      r.telefone,
      r.servico,
      r.data_agendamento,
      r.hora_agendamento,
      r.status,
      r.valor_total,
      r.forma_pagamento
    ]);

    const csv = [header, ...linhas]
      .map((linha) =>
        linha
          .map((campo) => `"${String(campo ?? '').replaceAll('"', '""')}"`)
          .join(';')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="agendamentos.csv"');

    res.send('\uFEFF' + csv);
  } catch (err) {
    enviarErro(res, err);
  }
});

// TESTE
app.get('/api/teste', (req, res) => {
  res.json({
    ok: true,
    mensagem: 'Servidor funcionando corretamente',
    banco: DB_PATH,
    ambiente: process.env.NODE_ENV || 'local'
  });
});

// STATUS PARA RAILWAY
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'BarberShop API',
    database: DB_PATH
  });
});

// START
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Teste local: http://localhost:${PORT}/api/teste`);
  console.log(`Banco em uso: ${DB_PATH}`);
});