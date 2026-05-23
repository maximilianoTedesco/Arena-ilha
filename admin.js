const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");

const adminArena = document.getElementById("adminArena");
const adminData = document.getElementById("adminData");
const buscarAgendaBtn = document.getElementById("buscarAgendaBtn");
const agendaHorariosList = document.getElementById("agendaHorariosList");

const acoesHorarioBox = document.getElementById("acoesHorarioBox");
const horarioSelecionadoTitulo = document.getElementById("horarioSelecionadoTitulo");

const abrirReservaBtn = document.getElementById("abrirReservaBtn");
const abrirPromocaoBtn = document.getElementById("abrirPromocaoBtn");
const desmarcarHorarioBtn = document.getElementById("desmarcarHorarioBtn");

const reservaBox = document.getElementById("reservaBox");
const promocaoBox = document.getElementById("promocaoBox");

const salvarReservaBtn = document.getElementById("salvarReservaBtn");
const salvarPromocaoBtn = document.getElementById("salvarPromocaoBtn");

let horarioSelecionado = null;
let statusSelecionado = null;
let agendamentoSelecionadoId = null;
let bloqueioSelecionadoId = null;
let descontoSelecionadoId = null;

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
buscarAgendaBtn.addEventListener("click", carregarAgenda);

abrirReservaBtn.addEventListener("click", mostrarFormReserva);
abrirPromocaoBtn.addEventListener("click", mostrarFormPromocao);
desmarcarHorarioBtn.addEventListener("click", desmarcarHorario);

salvarReservaBtn.addEventListener("click", salvarReserva);
salvarPromocaoBtn.addEventListener("click", salvarPromocao);

iniciarAdmin();

async function iniciarAdmin() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    mostrarPainel();
  } else {
    mostrarLogin();
  }
}

async function login() {
  const email = "usuario@ilha.com";
  const password = document.getElementById("password").value.trim();

  loginMessage.textContent = "Entrando...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = "Senha inválida.";
    return;
  }

  mostrarPainel();
}

async function logout() {
  await supabaseClient.auth.signOut();
  mostrarLogin();
}

function mostrarLogin() {
  loginBox.classList.remove("hidden");
  adminPanel.classList.add("hidden");
}

function mostrarPainel() {
  loginBox.classList.add("hidden");
  adminPanel.classList.remove("hidden");

  agendaHorariosList.innerHTML = `
    <p>Selecione uma arena e uma data para carregar os horários.</p>
  `;

  acoesHorarioBox.classList.add("hidden");
}

async function carregarAgenda() {
  const arena = adminArena.value;
  const dataSelecionada = adminData.value;

  limparSelecao();

  if (!arena || !dataSelecionada) {
    alert("Selecione a arena e a data.");
    return;
  }

  agendaHorariosList.innerHTML = `<p>Carregando horários...</p>`;

  const horarios = await gerarHorariosPorArenaEData(arena, dataSelecionada);

  if (!horarios.length) {
    agendaHorariosList.innerHTML = `<p>Não há horários cadastrados para esta arena nesta data.</p>`;
    return;
  }

  const { data: agendamentos } = await supabaseClient
    .from("agendamentos")
    .select("*")
    .eq("arena_slug", arena)
    .eq("data", dataSelecionada)
    .eq("status", "confirmado");

  const { data: bloqueios } = await supabaseClient
    .from("arena_bloqueios")
    .select("*")
    .eq("arena_slug", arena)
    .eq("data", dataSelecionada);

  const { data: descontos } = await supabaseClient
    .from("arena_descontos")
    .select("*")
    .eq("arena_slug", arena)
    .eq("data", dataSelecionada)
    .eq("ativo", true);

  agendaHorariosList.innerHTML = "";

  horarios.forEach((horario) => {
    const agendamento = (agendamentos || []).find(
      item => formatarHora(item.horario) === horario
    );

    const bloqueio = (bloqueios || []).find(
      item => formatarHora(item.horario) === horario
    );

    const desconto = (descontos || []).find(
      item => formatarHora(item.horario) === horario
    );

    const card = document.createElement("button");
    card.type = "button";
    card.className = "horario-card";

    let status = "livre";
    let texto = "Livre";

    if (agendamento) {
      status = "ocupado";
      texto = `Reservado: ${agendamento.nome}`;
      card.classList.add("ocupado");
    } else if (bloqueio) {
      status = "bloqueado";
      texto = "Bloqueado";
      card.classList.add("ocupado");
    } else if (desconto) {
      status = "promocao";
      texto = `Promoção R$ ${desconto.valor_promocional}`;
      card.classList.add("promocao");
    } else {
      card.classList.add("livre");
    }

    card.innerHTML = `
      <strong>${horario}</strong>
      <span>${texto}</span>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".horario-card").forEach(btn => {
        btn.classList.remove("selecionado");
      });

      card.classList.add("selecionado");

      horarioSelecionado = horario;
      statusSelecionado = status;
      agendamentoSelecionadoId = agendamento ? agendamento.id : null;
      bloqueioSelecionadoId = bloqueio ? bloqueio.id : null;
      descontoSelecionadoId = desconto ? desconto.id : null;

      abrirAcoesHorario();
    });

    agendaHorariosList.appendChild(card);
  });
}

async function gerarHorariosPorArenaEData(arena, dataSelecionada) {
  const dataObj = new Date(`${dataSelecionada}T12:00:00`);
  const diaSemana = dataObj.getDay();

  const { data: regras, error } = await supabaseClient
    .from("arena_horarios")
    .select("*")
    .eq("arena_slug", arena)
    .eq("dia_semana", diaSemana)
    .eq("ativo", true);

  if (error || !regras) {
    console.error(error);
    return [];
  }

  let horarios = [];

  regras.forEach((regra) => {
    const inicio = Number(regra.hora_inicio.slice(0, 2));
    const fim = Number(regra.hora_fim.slice(0, 2));

    for (let hora = inicio; hora <= fim; hora++) {
      horarios.push(`${String(hora).padStart(2, "0")}:00`);
    }
  });

  return [...new Set(horarios)].sort();
}

function abrirAcoesHorario() {
  const arena = nomeArena(adminArena.value);
  const dataSelecionada = formatarData(adminData.value);

  horarioSelecionadoTitulo.textContent =
    `${arena} - ${dataSelecionada} às ${horarioSelecionado}`;

  reservaBox.classList.add("hidden");
  promocaoBox.classList.add("hidden");
  acoesHorarioBox.classList.remove("hidden");

  if (statusSelecionado === "ocupado" || statusSelecionado === "bloqueado") {
    abrirReservaBtn.disabled = true;
    abrirPromocaoBtn.disabled = true;
    desmarcarHorarioBtn.disabled = false;
  } else {
    abrirReservaBtn.disabled = false;
    abrirPromocaoBtn.disabled = false;
    desmarcarHorarioBtn.disabled = statusSelecionado !== "promocao";
  }
}

function mostrarFormReserva() {
  reservaBox.classList.remove("hidden");
  promocaoBox.classList.add("hidden");
}

function mostrarFormPromocao() {
  promocaoBox.classList.remove("hidden");
  reservaBox.classList.add("hidden");
}

async function salvarReserva() {
  const arena = adminArena.value;
  const dataSelecionada = adminData.value;
  const nome = document.getElementById("reservaNome").value.trim();
  const whatsapp = document.getElementById("reservaWhatsapp").value.trim();
  const observacao = document.getElementById("reservaObservacao").value.trim();

  if (!horarioSelecionado) {
    alert("Selecione um horário.");
    return;
  }

  if (!nome || !whatsapp) {
    alert("Preencha nome e WhatsApp.");
    return;
  }

  const { error } = await supabaseClient
    .from("agendamentos")
    .insert({
      arena_slug: arena,
      nome,
      whatsapp,
      data: dataSelecionada,
      horario: horarioSelecionado,
      observacao,
      status: "confirmado"
    });

  if (error) {
    console.error(error);
    alert("Erro ao reservar horário.");
    return;
  }

  alert("Reserva criada com sucesso!");

  document.getElementById("reservaNome").value = "";
  document.getElementById("reservaWhatsapp").value = "";
  document.getElementById("reservaObservacao").value = "";

  await carregarAgenda();
}

async function salvarPromocao() {
  const arena = adminArena.value;
  const dataSelecionada = adminData.value;
  const valorNormal = document.getElementById("promoValorNormal").value;
  const valorPromocional = document.getElementById("promoValorPromocional").value;
  const descricao = document.getElementById("promoDescricao").value.trim();

  if (!horarioSelecionado) {
    alert("Selecione um horário.");
    return;
  }

  if (!valorPromocional) {
    alert("Informe o valor promocional.");
    return;
  }

  const { error } = await supabaseClient
    .from("arena_descontos")
    .insert({
      arena_slug: arena,
      data: dataSelecionada,
      horario: horarioSelecionado,
      valor_normal: valorNormal || null,
      valor_promocional: valorPromocional,
      descricao: descricao || "Condição especial",
      ativo: true
    });

  if (error) {
    console.error(error);
    alert("Erro ao salvar promoção.");
    return;
  }

  alert("Promoção criada com sucesso!");

  document.getElementById("promoValorNormal").value = "";
  document.getElementById("promoValorPromocional").value = "";
  document.getElementById("promoDescricao").value = "";

  await carregarAgenda();
}

async function desmarcarHorario() {
  if (!horarioSelecionado) {
    alert("Selecione um horário.");
    return;
  }

  const confirmar = confirm("Deseja desmarcar/liberar este horário?");
  if (!confirmar) return;

  if (agendamentoSelecionadoId) {
    await supabaseClient
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", agendamentoSelecionadoId);
  }

  if (bloqueioSelecionadoId) {
    await supabaseClient
      .from("arena_bloqueios")
      .delete()
      .eq("id", bloqueioSelecionadoId);
  }

  if (descontoSelecionadoId) {
    await supabaseClient
      .from("arena_descontos")
      .delete()
      .eq("id", descontoSelecionadoId);
  }

  alert("Horário liberado com sucesso!");
  await carregarAgenda();
}

function limparSelecao() {
  horarioSelecionado = null;
  statusSelecionado = null;
  agendamentoSelecionadoId = null;
  bloqueioSelecionadoId = null;
  descontoSelecionadoId = null;

  acoesHorarioBox.classList.add("hidden");
  reservaBox.classList.add("hidden");
  promocaoBox.classList.add("hidden");
}

function nomeArena(slug) {
  const arenas = {
    intersul: "Arena Intersul",
    alvorada: "Arena Alvorada"
  };

  return arenas[slug] || slug;
}

function formatarHora(hora) {
  if (!hora) return "-";
  return hora.slice(0, 5);
}

function formatarData(data) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}
