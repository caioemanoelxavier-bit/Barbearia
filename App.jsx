import React, { useEffect, useState } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  ChevronRight
} from 'lucide-react';

const API = 'http://localhost:3000/api';

// --- Componente: Cabeçalho ---
const Header = ({ setView }) => (
  <header className="bg-zinc-900 text-white p-4 shadow-md sticky top-0 z-50">
    <div className="max-w-4xl mx-auto flex justify-between items-center">
      <div
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => setView('home')}
      >
        <Scissors className="text-amber-500" size={28} />
        <h1 className="text-2xl font-bold tracking-wider">
          BARBER<span className="text-amber-500">SHOP</span>
        </h1>
      </div>

      <button
        onClick={() => setView('agendar')}
        className="bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold py-2 px-4 rounded transition-colors"
      >
        Agendar
      </button>
    </div>
  </header>
);

// --- Tela Inicial ---
const HomeView = ({ setView, servicos }) => (
  <div className="animate-fade-in">
    <section className="bg-zinc-800 text-white py-16 px-4 text-center border-b border-zinc-700">
      <h2 className="text-4xl font-bold mb-4">Estilo e Tradição</h2>

      <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
        A melhor experiência em barbearia. Profissionais qualificados e um ambiente preparado para o seu conforto.
      </p>

      <button
        onClick={() => setView('agendar')}
        className="bg-amber-500 hover:bg-amber-600 text-zinc-900 font-bold py-3 px-8 rounded-lg shadow-lg flex items-center justify-center mx-auto space-x-2 transition-transform hover:scale-105"
      >
        <Calendar size={20} />
        <span>Marcar Horário</span>
      </button>
    </section>

    <section className="py-12 px-4 max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-zinc-800 mb-6 flex items-center">
        <Scissors className="mr-2 text-amber-600" />
        Nossos Serviços
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servicos.length === 0 && (
          <p className="text-zinc-500">Nenhum serviço encontrado.</p>
        )}

        {servicos.map((servico) => (
          <div
            key={servico.id_servico}
            className="bg-white p-4 rounded-lg shadow border border-zinc-100 flex justify-between items-center hover:shadow-md transition-shadow"
          >
            <div>
              <h4 className="font-bold text-lg text-zinc-800">
                {servico.nome_servico}
              </h4>

              <p className="text-zinc-500 text-sm flex items-center mt-1">
                <Clock size={14} className="mr-1" />
                {servico.duracao_minutos} min
              </p>
            </div>

            <div className="text-amber-600 font-bold text-xl">
              {Number(servico.preco).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

// --- Formulário de Agendamento ---
const AgendamentoView = ({ setView, servicos, profissionais }) => {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    servico: '',
    profissional: '',
    data: '',
    hora: '',
    forma_pagamento: 'pix'
  });

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const normalizarTelefone = (telefone) => {
    return String(telefone).replace(/\D/g, '');
  };

  const ehSegundaFeira = (dataISO) => {
    const data = new Date(`${dataISO}T00:00:00`);
    return data.getDay() === 1;
  };

  const validarFormulario = () => {
    const nome = formData.nome.trim();
    const telefone = normalizarTelefone(formData.telefone);

    if (nome.length < 3) {
      return 'O nome precisa ter pelo menos 3 caracteres.';
    }

    if (![10, 11].includes(telefone.length)) {
      return 'O telefone precisa ter 10 ou 11 dígitos.';
    }

    if (!formData.servico) {
      return 'Selecione um serviço.';
    }

    if (!formData.data) {
      return 'Selecione uma data.';
    }

    if (!formData.hora) {
      return 'Selecione um horário.';
    }

    if (ehSegundaFeira(formData.data)) {
      return 'A barbearia não funciona às segundas-feiras.';
    }

    return null;
  };

  const buscarOuCriarCliente = async () => {
    const telefone = normalizarTelefone(formData.telefone);

    const clienteExistenteResposta = await fetch(`${API}/clientes/buscar/${telefone}`);
    const clienteExistente = await clienteExistenteResposta.json();

    if (clienteExistente) {
      return clienteExistente;
    }

    const resposta = await fetch(`${API}/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: formData.nome.trim(),
        telefone,
        email: formData.email || null
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Erro ao cadastrar cliente.');
    }

    return dados;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem('');

    const erroValidacao = validarFormulario();

    if (erroValidacao) {
      setMensagem(erroValidacao);
      return;
    }

    try {
      setCarregando(true);

      const cliente = await buscarOuCriarCliente();

      const servicoSelecionado = servicos.find(
        (servico) => String(servico.id_servico) === String(formData.servico)
      );

      const respostaAgendamento = await fetch(`${API}/agendamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cliente_id: cliente.id_cliente || cliente.id,
          servico_id: Number(formData.servico),
          data: formData.data,
          hora: formData.hora,
          forma_pagamento: formData.forma_pagamento,
          valor_total: Number(servicoSelecionado?.preco || 0),
          observacoes: formData.profissional
            ? `Profissional selecionado: ${formData.profissional}`
            : ''
        })
      });

      const dadosAgendamento = await respostaAgendamento.json();

      if (!respostaAgendamento.ok) {
        throw new Error(dadosAgendamento.erro || 'Erro ao criar agendamento.');
      }

      alert('Agendamento realizado com sucesso!');

      setFormData({
        nome: '',
        telefone: '',
        email: '',
        servico: '',
        profissional: '',
        data: '',
        hora: '',
        forma_pagamento: 'pix'
      });

      setView('home');
    } catch (erro) {
      setMensagem(erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="py-10 px-4 max-w-lg mx-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-zinc-200">
        <h2 className="text-2xl font-bold text-zinc-800 mb-6 flex items-center border-b pb-4">
          <Calendar className="mr-2 text-amber-500" />
          Novo Agendamento
        </h2>

        {mensagem && (
          <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">
            {mensagem}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Seu Nome
            </label>

            <div className="relative">
              <User className="absolute left-3 top-3 text-zinc-400" size={18} />

              <input
                type="text"
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Ex: João Silva"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Telefone / WhatsApp
            </label>

            <div className="relative">
              <Phone className="absolute left-3 top-3 text-zinc-400" size={18} />

              <input
                type="tel"
                name="telefone"
                required
                value={formData.telefone}
                onChange={handleChange}
                className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Email opcional
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="cliente@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Serviço
            </label>

            <select
              name="servico"
              required
              value={formData.servico}
              onChange={handleChange}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none bg-white"
            >
              <option value="">Selecione um serviço...</option>

              {servicos.map((servico) => (
                <option key={servico.id_servico} value={servico.id_servico}>
                  {servico.nome_servico} -{' '}
                  {Number(servico.preco).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Profissional
            </label>

            <select
              name="profissional"
              value={formData.profissional}
              onChange={handleChange}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none bg-white"
            >
              <option value="">Qualquer profissional</option>

              {profissionais.map((profissional) => (
                <option
                  key={profissional.id_profissional}
                  value={profissional.nome}
                >
                  {profissional.nome}
                  {profissional.especialidade
                    ? ` - ${profissional.especialidade}`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Forma de pagamento
            </label>

            <select
              name="forma_pagamento"
              value={formData.forma_pagamento}
              onChange={handleChange}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none bg-white"
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="credito">Crédito</option>
              <option value="debito">Débito</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Data
              </label>

              <input
                type="date"
                name="data"
                required
                value={formData.data}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Horário
              </label>

              <input
                type="time"
                name="hora"
                required
                value={formData.hora}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-zinc-900 font-bold py-3 px-4 rounded-md mt-6 transition-colors flex justify-center items-center"
          >
            {carregando ? 'Salvando...' : 'Confirmar Agendamento'}
            {!carregando && <ChevronRight size={20} className="ml-1" />}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Componente Principal ---
export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [erroApi, setErroApi] = useState('');

  useEffect(() => {
    async function carregarDados() {
      try {
        const respostaServicos = await fetch(`${API}/servicos`);
        const dadosServicos = await respostaServicos.json();

        if (!respostaServicos.ok) {
          throw new Error('Erro ao carregar serviços.');
        }

        setServicos(dadosServicos);

        const respostaProfissionais = await fetch(`${API}/profissionais`);
        const dadosProfissionais = await respostaProfissionais.json();

        if (respostaProfissionais.ok) {
          setProfissionais(dadosProfissionais);
        }
      } catch (erro) {
        console.error(erro);
        setErroApi(
          'Não foi possível conectar com a API. Verifique se o servidor Node está rodando em http://localhost:3000.'
        );
      }
    }

    carregarDados();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <Header setView={setCurrentView} />

      {erroApi && (
        <div className="max-w-4xl mx-auto mt-4 px-4">
          <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">
            {erroApi}
          </div>
        </div>
      )}

      <main>
        {currentView === 'home' && (
          <HomeView setView={setCurrentView} servicos={servicos} />
        )}

        {currentView === 'agendar' && (
          <AgendamentoView
            setView={setCurrentView}
            servicos={servicos}
            profissionais={profissionais}
          />
        )}
      </main>

      <footer className="bg-zinc-900 text-zinc-400 py-6 text-center mt-auto border-t border-zinc-800">
        <div className="flex justify-center items-center space-x-2 mb-2">
          <MapPin size={16} />
          <span>Rua Exemplo, 123 - Centro</span>
        </div>

        <p className="text-sm">
          © 2026 BarberShop. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}