COMO RODAR O PROJETO BARBERSHOP AJUSTADO

1) Abra a pasta ProjetoBarbearia_Ajustado no VS Code.

2) No terminal, rode:
   npm install

3) Crie o banco SQLite inicial:
   npm run setup

4) Inicie o servidor:
   npm start

5) Abra no navegador:
   http://localhost:3000

LOGIN ADMIN PADRÃO
Usuário: admin1
Senha: 1234

O QUE FOI IMPLEMENTADO
- Login admin com usuário e senha
- Alterar usuário e senha pelo admin
- Cadastrar, editar e desativar serviços
- Editar preço e duração dos serviços
- Cadastrar, editar e desativar barbeiros/profissionais
- Editar/remarcar agendamento
- Excluir agendamento
- Mudar status: pendente, confirmado, cancelado, concluído, não compareceu
- Dashboard financeiro
- Exportar agendamentos em CSV
- WhatsApp de confirmação
- Bloqueio de horários ocupados por barbeiro
- Bloqueio de dias fechados, com segunda-feira fechada por padrão
- Configurar horário de funcionamento
- Suporte a mais de um barbeiro

ARQUIVOS PRINCIPAIS
- server.js: API/backend Express + SQLite
- setup.js: cria o banco barbearia.db e dados iniciais
- public/index.html: site, agendamento e admin em uma tela
- package.json: dependências e comandos

OBSERVAÇÃO
A senha do admin é salva com hash SHA-256 + salt no SQLite. Para projeto acadêmico/portfólio está bom. Para produção real, o ideal seria usar bcrypt, HTTPS e autenticação por sessão/JWT com expiração.
