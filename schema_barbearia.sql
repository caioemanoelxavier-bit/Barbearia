-- ============================================================
-- SISTEMA DE GESTÃO PARA BARBEARIA
-- ============================================================

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL UNIQUE,
    email TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0, 1))
);

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
    id_servico INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_servico TEXT NOT NULL,
    descricao TEXT,
    preco REAL NOT NULL CHECK(preco >= 0),
    duracao_minutos INTEGER NOT NULL DEFAULT 30,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0, 1))
);

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id_agendamento INTEGER PRIMARY KEY AUTOINCREMENT,
    fk_cliente INTEGER NOT NULL,
    fk_servico INTEGER NOT NULL,
    data_agendamento DATE NOT NULL,
    hora_agendamento TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'confirmado', 'realizado', 'cancelado', 'no_show')),
    valor_total REAL NOT NULL,
    desconto REAL DEFAULT 0,
    valor_pago REAL NOT NULL,
    forma_pagamento TEXT CHECK(forma_pagamento IN ('dinheiro', 'pix', 'credito', 'debito', 'assinatura')),
    observacoes TEXT,
    data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_alteracao TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (fk_servico) REFERENCES servicos(id_servico)
);

-- Tabela de Assinaturas (Clube BarberShop)
CREATE TABLE IF NOT EXISTS assinaturas (
    id_assinatura INTEGER PRIMARY KEY AUTOINCREMENT,
    fk_cliente INTEGER NOT NULL,
    data_inicio TEXT NOT NULL DEFAULT CURRENT_DATE,
    data_fim TEXT,
    status TEXT NOT NULL DEFAULT 'ativa' CHECK(status IN ('ativa', 'cancelada', 'expirada')),
    valor_mensal REAL NOT NULL DEFAULT 130.00,
    ultimo_pagamento TEXT,
    proximo_vencimento TEXT,

    FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente)
);

-- Tabela de Pagamentos (para controle financeiro)
CREATE TABLE IF NOT EXISTS pagamentos (
    id_pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
    fk_agendamento INTEGER,
    fk_assinatura INTEGER,
    tipo TEXT NOT NULL CHECK(tipo IN ('agendamento', 'assinatura')),
    valor REAL NOT NULL,
    data_pagamento TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago', 'cancelado', 'reembolsado')),
    id_transacao_mercadopago TEXT,

    FOREIGN KEY (fk_agendamento) REFERENCES agendamentos(id_agendamento),
    FOREIGN KEY (fk_assinatura) REFERENCES assinaturas(id_assinatura)
);

-- Tabela de Profissionais (caso tenha múltiplos barbeiros)
CREATE TABLE IF NOT EXISTS profissionais (
    id_profissional INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    especialidade TEXT,
    comissao_percentual REAL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1
);

-- Tabela de Agendamento-Profissional (múltiplos profissionais por agendamento)
CREATE TABLE IF NOT EXISTS agendamento_profissional (
    fk_agendamento INTEGER NOT NULL,
    fk_profissional INTEGER NOT NULL,
    PRIMARY KEY (fk_agendamento, fk_profissional),
    FOREIGN KEY (fk_agendamento) REFERENCES agendamentos(id_agendamento),
    FOREIGN KEY (fk_profissional) REFERENCES profissionais(id_profissional)
);

-- ============================================================
-- VIEWS PARA RELATÓRIOS FINANCEIROS
-- ============================================================

-- View: Recebimentos por Dia
CREATE VIEW IF NOT EXISTS vw_recebimentos_dia AS
SELECT
    DATE(data_pagamento) as data,
    COUNT(*) as quantidade,
    SUM(valor) as total,
    forma_pagamento
FROM pagamentos
WHERE status = 'pago'
GROUP BY DATE(data_pagamento), forma_pagamento
ORDER BY data DESC;

-- View: Resumo Diário
CREATE VIEW IF NOT EXISTS vw_resumo_diario AS
SELECT
    DATE(data_pagamento) as data,
    COUNT(*) as total_agendamentos,
    SUM(CASE WHEN tipo = 'agendamento' THEN valor ELSE 0 END) as receita_agendamentos,
    SUM(CASE WHEN tipo = 'assinatura' THEN valor ELSE 0 END) as receita_assinaturas,
    SUM(valor) as receita_total
FROM pagamentos
WHERE status = 'pago'
GROUP BY DATE(data_pagamento)
ORDER BY data DESC;

-- View: Recebimentos Semanais (agrupado por semana)
CREATE VIEW IF NOT EXISTS vw_recebimentos_semanal AS
SELECT
    strftime('%Y', data_pagamento) as ano,
    strftime('%W', data_pagamento) as semana,
    DATE(MIN(data_pagamento), 'weekday 1', '-' || ((strftime('%w', data_pagamento) + 6) % 7) || ' days') as semana_inicio,
    DATE(MAX(data_pagamento), 'weekday 0', '+' || (6 - (strftime('%w', data_pagamento) + 6) % 7) || ' days') as semana_fim,
    COUNT(*) as quantidade,
    SUM(valor) as total
FROM pagamentos
WHERE status = 'pago'
GROUP BY strftime('%Y', data_pagamento), strftime('%W', data_pagamento)
ORDER BY ano DESC, semana DESC;

-- View: Recebimentos Mensais
CREATE VIEW IF NOT EXISTS vw_recebimentos_mensal AS
SELECT
    strftime('%Y', data_pagamento) as ano,
    strftime('%m', data_pagamento) as mes,
    COUNT(*) as quantidade,
    SUM(valor) as total,
    SUM(CASE WHEN tipo = 'agendamento' THEN valor ELSE 0 END) as agendamentos_total,
    SUM(CASE WHEN tipo = 'assinatura' THEN valor ELSE 0 END) as assinaturas_total
FROM pagamentos
WHERE status = 'pago'
GROUP BY strftime('%Y', data_pagamento), strftime('%m', data_pagamento)
ORDER BY ano DESC, mes DESC;

-- ============================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================================

-- Trigger para atualizar data_alteracao no agendamento
CREATE TRIGGER IF NOT EXISTS trg_atualiza_data_alteracao_agendamento
AFTER UPDATE ON agendamentos
BEGIN
    UPDATE agendamentos SET data_alteracao = CURRENT_TIMESTAMP WHERE id_agendamento = NEW.id_agendamento;
END;

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

-- Serviços da Barbearia
INSERT INTO servicos (nome_servico, descricao, preco, duracao_minutos) VALUES
('Corte Clássico', 'Corte de cabelo tradicional com tesoura ou máquina', 45.00, 45),
('Barba Terapia', 'Barba completa com toalha quente', 35.00, 30),
('Corte + Barba', 'Combo completo: cabelo e barba', 70.00, 75),
('Pezinho/Sobrancelha', 'Acabamento e limpeza', 15.00, 15),
('Corte Infantil', 'Corte para crianças até 12 anos', 40.00, 40),
('Barboterapia Premium', 'Barba com produtos especiais + massagem', 50.00, 45),
('Pigmentação de Barba', 'Preenchimento de falhas', 60.00, 60);

-- Cliente de exemplo
INSERT INTO clientes (nome, telefone, email) VALUES
('Cliente Exemplo', '(11) 99999-9999', 'cliente@email.com');
