-- ============================================================
-- 1. BANCOS E CATEGORIAS (Tabelas Base)
-- ============================================================
CREATE TABLE bancos (
    pk_banco INTEGER PRIMARY KEY,
    nome_banco TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE
);

CREATE TABLE categoria (
    id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_categoria TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('Despesa','Receita','Transferência')),
    icone TEXT DEFAULT '📌',
    cor TEXT DEFAULT '#808080',
    ativa INTEGER NOT NULL DEFAULT 1 CHECK(ativa IN (0, 1)),
    UNIQUE (nome_categoria, tipo)
);

-- ============================================================
-- 2. CONTAS E CARTÕES (Sem fk_cpf)
-- ============================================================
CREATE TABLE conta (
    pk_banco INTEGER NOT NULL,
    pk_agencia INTEGER NOT NULL,
    pk_conta INTEGER NOT NULL,
    nome_conta TEXT DEFAULT 'Conta Principal',
    saldo NUMERIC NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    tipo_conta TEXT DEFAULT 'Corrente' CHECK(tipo_conta IN ('Corrente','Poupança','Investimento')),
    ativa INTEGER NOT NULL DEFAULT 1 CHECK(ativa IN (0, 1)),
    criada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (pk_banco, pk_agencia, pk_conta),
    FOREIGN KEY (pk_banco) REFERENCES bancos (pk_banco) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE cartao_credito (
    id_cartao INTEGER PRIMARY KEY AUTOINCREMENT,
    fk_banco INTEGER NOT NULL,
    numero_cartao TEXT NOT NULL,
    limite NUMERIC NOT NULL DEFAULT 0.00,
    dia_fechamento INTEGER NOT NULL DEFAULT 15,
    dia_vencimento INTEGER NOT NULL DEFAULT 25,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0, 1)),
    
    FOREIGN KEY (fk_banco) REFERENCES bancos (pk_banco)
);

-- ============================================================
-- 3. TRANSAÇÕES E TRANSFERÊNCIAS (Sem fk_cpf)
-- ============================================================
CREATE TABLE transacoes (
    id_transacao INTEGER PRIMARY KEY AUTOINCREMENT,
    data_transacao TEXT NOT NULL DEFAULT CURRENT_DATE,
    fk_categoria INTEGER NOT NULL,
    fk_conta_banco INTEGER DEFAULT NULL,
    fk_conta_agencia INTEGER DEFAULT NULL,
    fk_conta_numero INTEGER DEFAULT NULL,
    fk_cartao INTEGER DEFAULT NULL,
    descricao TEXT NOT NULL,
    tipo_pagto TEXT NOT NULL CHECK(tipo_pagto IN ('Débito','Dinheiro','Crédito','PIX','Transferência')),
    valor NUMERIC NOT NULL CHECK (valor > 0),
    parcelas INTEGER DEFAULT 1,
    parcela_atual INTEGER DEFAULT 1,
    excluido INTEGER NOT NULL DEFAULT 0 CHECK(excluido IN (0, 1)),
    data_exclusao TEXT DEFAULT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (fk_categoria) REFERENCES categoria (id_categoria),
    FOREIGN KEY (fk_cartao) REFERENCES cartao_credito (id_cartao),
    FOREIGN KEY (fk_conta_banco, fk_conta_agencia, fk_conta_numero) REFERENCES conta (pk_banco, pk_agencia, pk_conta)
);

CREATE TABLE transferencias (
    id_transferencia INTEGER PRIMARY KEY AUTOINCREMENT,
    data_transferencia TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    banco_origem INTEGER NOT NULL,
    agencia_origem INTEGER NOT NULL,
    conta_origem INTEGER NOT NULL,
    
    banco_destino INTEGER NOT NULL,
    agencia_destino INTEGER NOT NULL,
    conta_destino INTEGER NOT NULL,
    
    valor NUMERIC NOT NULL CHECK (valor > 0),
    descricao TEXT DEFAULT 'Transferência entre contas',
    
    FOREIGN KEY (banco_origem, agencia_origem, conta_origem) REFERENCES conta (pk_banco, pk_agencia, pk_conta),
    FOREIGN KEY (banco_destino, agencia_destino, conta_destino) REFERENCES conta (pk_banco, pk_agencia, pk_conta)
);

-- ============================================================
-- 4. METAS E LOG (Sem fk_cpf)
-- ============================================================
CREATE TABLE metas (
    id_meta INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_meta TEXT NOT NULL,
    valor_objetivo NUMERIC NOT NULL CHECK (valor_objetivo > 0),
    valor_atual NUMERIC NOT NULL DEFAULT 0.00 CHECK (valor_atual >= 0),
    data_inicio TEXT NOT NULL DEFAULT CURRENT_DATE,
    data_objetivo TEXT NOT NULL,
    concluida INTEGER NOT NULL DEFAULT 0 CHECK(concluida IN (0, 1))
);

CREATE TABLE log_auditoria (
    id_log INTEGER PRIMARY KEY AUTOINCREMENT,
    tabela_afetada TEXT NOT NULL,
    operacao TEXT NOT NULL CHECK(operacao IN ('INSERT','UPDATE','DELETE')),
    registro_id INTEGER NOT NULL,
    dados_anteriores TEXT DEFAULT NULL, 
    dados_novos TEXT DEFAULT NULL,
    data_operacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);