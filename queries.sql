-- ============================================================
-- DADOS INICIAIS (SEED DATA) - FINANÇAS PESSOAIS (Single-User)
-- ============================================================

-- 1. Cadastrando os Bancos Principais
INSERT INTO bancos (pk_banco, nome_banco, codigo) VALUES
(1, 'Banco do Brasil', '001'),
(2, 'Itaú', '341'),
(3, 'Bradesco', '237'),
(4, 'Caixa Econômica', '104'),
(5, 'Santander', '033'),
(6, 'Nubank', '260'),
(7, 'Inter', '077');

-- 2. Cadastrando as Categorias
INSERT INTO categoria (nome_categoria, tipo, icone, cor) VALUES
('Alimentação', 'Despesa', '🍔', '#FF6B6B'),
('Transporte', 'Despesa', '🚗', '#4ECDC4'),
('Moradia', 'Despesa', '🏠', '#45B7D1'),
('Saúde', 'Despesa', '💊', '#96CEB4'),
('Educação', 'Despesa', '📚', '#FFEAA7'),
('Lazer', 'Despesa', '🎮', '#DDA0DD'),
('Salário', 'Receita', '💰', '#98D8C8'),
('Freelance', 'Receita', '💼', '#F7DC6F'),
('Transferência', 'Transferência', '🔄', '#A9CCE3');

-- 3. Cadastrando suas Contas Bancárias
-- Conta Principal no Nubank
INSERT INTO conta (pk_banco, pk_agencia, pk_conta, nome_conta, saldo, tipo_conta)
VALUES (6, 1, 123456, 'Nubank Principal', 2500.00, 'Corrente');

-- Conta Reserva no Itaú
INSERT INTO conta (pk_banco, pk_agencia, pk_conta, nome_conta, saldo, tipo_conta)
VALUES (2, 3300, 987654, 'Reserva de Emergência Itaú', 1000.00, 'Poupança');

-- 4. Cadastrando seu Cartão de Crédito
-- fk_banco = 6 refere-se ao Nubank
INSERT INTO cartao_credito (fk_banco, numero_cartao, limite, dia_fechamento, dia_vencimento)
VALUES (6, '5555444433332222', 4500.00, 15, 25);

-- 5. Cadastrando sua Meta Financeira
INSERT INTO metas (nome_meta, valor_objetivo, valor_atual, data_objetivo)
VALUES ('iPhone 16 Pro', 7500.00, 1500.00, '2026-08-15');

-- ============================================================
-- TRANSAÇÕES DE TESTE (Para os gráficos do Dashboard)
-- ============================================================

-- Recebimento de Salário (Categoria 7) -> Caiu no Nubank (A Trigger vai somar o saldo automaticamente)
INSERT INTO transacoes (fk_categoria, fk_conta_banco, fk_conta_agencia, fk_conta_numero, descricao, tipo_pagto, valor)
VALUES (7, 6, 1, 123456, 'Salário Santa Casa', 'PIX', 3500.00);

-- Despesa com Moradia (Categoria 3) -> Conta de Luz paga no Débito do Nubank
INSERT INTO transacoes (fk_categoria, fk_conta_banco, fk_conta_agencia, fk_conta_numero, descricao, tipo_pagto, valor)
VALUES (3, 6, 1, 123456, 'Conta de Luz', 'Débito', 180.50);

-- Compras no Cartão de Crédito Nubank (fk_cartao = 1) -> Não desconta do saldo da conta agora
INSERT INTO transacoes (fk_categoria, fk_cartao, descricao, tipo_pagto, valor, parcelas)
VALUES 
(1, 1, 'Supermercado Extra', 'Crédito', 450.75, 1),
(6, 1, 'Netflix', 'Crédito', 39.90, 1),
(1, 1, 'Ifood Final de Semana', 'Crédito', 85.00, 1);

-- Dinheiro extra de um freela (Categoria 8) -> Caiu na conta do Itaú
INSERT INTO transacoes (fk_categoria, fk_conta_banco, fk_conta_agencia, fk_conta_numero, descricao, tipo_pagto, valor)
VALUES (8, 2, 3300, 987654, 'Desenvolvimento de Site', 'PIX', 600.00);