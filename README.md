# 🪒 BarberShop - Sistema de Gestão para Barbearia

Sistema completo para gerenciamento de barbearias com agendamento online e controle financeiro.

## ✨ Funcionalidades

### Para o Cliente
- 📅 Agendamento online de horários
- 💳 Múltiplas formas de pagamento (PIX, Dinheiro, Cartão)
- ⭐ Clube de Assinatura (cortes ilimitados por mês)
- 📱 Site responsivo para celular e computador

### Para o Dono da Barbearia (Dashboard Admin)
- 📊 **Controle Financeiro Completo**:
  - Recebimentos por **dia**
  - Recebimentos por **semana**
  - Recebimentos por **mês**
  - Detalhamento por forma de pagamento
  - Separação entre receitas de agendamentos e assinaturas
- 📋 Gestão de agendamentos (confirmar, realizar, cancelar)
- 👥 Cadastro e histórico de clientes
- ⭐ Gestão de assinaturas do Clube BarberShop
- 📈 Gráficos e relatórios

## 🚀 Como Instalar e Rodar

### 1. Instalar dependências
```bash
cd C:\Users\caioe\OneDrive\Desktop\ProjetoBarbearia
npm install
```

### 2. Configurar o banco de dados
```bash
npm run setup
```
Este comando cria o banco de dados `barbearia.db` com:
- Todos os serviços cadastrados
- Dados de exemplo para teste
- Agendamentos e pagamentos de demonstração

### 3. Iniciar o servidor
```bash
npm start
```

### 4. Acessar o sistema
- **Site do Cliente**: http://localhost:3000
- **Dashboard Admin**: http://localhost:3000/admin.html

## 📁 Estrutura do Projeto

```
ProjetoBarbearia/
├── index.html          # Site principal para clientes
├── admin.html          # Dashboard administrativo
├── server.js           # Servidor backend (API)
├── schema_barbearia.sql # Estrutura do banco de dados
├── setup_db.js         # Script de configuração do banco
├── package.json        # Dependências do projeto
└── README.md           # Este arquivo
```

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite
- **Frontend**: HTML5, TailwindCSS, JavaScript
- **Ícones**: Phosphor Icons
- **Gráficos**: Chart.js

## 📊 API Endpoints

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Criar cliente
- `GET /api/clientes/buscar/:telefone` - Buscar por telefone

### Serviços
- `GET /api/servicos` - Listar serviços disponíveis

### Agendamentos
- `GET /api/agendamentos` - Listar agendamentos (com filtros)
- `POST /api/agendamentos` - Criar agendamento
- `PATCH /api/agendamentos/:id/status` - Atualizar status
- `DELETE /api/agendamentos/:id` - Cancelar agendamento

### Financeiro
- `GET /api/financeiro/dia` - Recebimentos do dia
- `GET /api/financeiro/semana` - Recebimentos por semana
- `GET /api/financeiro/mes` - Recebimentos por mês
- `GET /api/financeiro/dashboard` - Dashboard completo

### Assinaturas
- `GET /api/assinaturas` - Listar assinaturas ativas
- `POST /api/assinaturas` - Criar nova assinatura

## 💡 Dicas de Uso

1. **Primeiro Acesso**: Execute `npm run setup` para criar o banco com dados de exemplo
2. **Ver Financeiro**: Acesse o Admin > Financeiro para ver recebimentos por dia/semana/mês
3. **Gerenciar Agendamentos**: Use o Admin > Agendamentos para confirmar ou cancelar horários
4. **Assinaturas**: O Clube BarberShop gera receita recorrente mensal

## 🔐 Segurança

Este sistema é para uso local (localhost). Para colocar em produção:
- Adicione autenticação no admin
- Use HTTPS
- Configure um banco de dados mais robusto (PostgreSQL/MySQL)
- Implemente backup automático do banco

## 📝 Licença

MIT - Uso livre para fins comerciais e pessoais.

---

Desenvolvido com ❤️ para barbeiros profissionais
