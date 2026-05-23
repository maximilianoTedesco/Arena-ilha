const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");

const arenaSelect = document.getElementById("arenaSelect");
const horariosList = document.getElementById("horariosList");

const salvarHorarioBtn = document.getElementById("salvarHorarioBtn");
const salvarDescontoBtn = document.getElementById("salvarDescontoBtn");
const salvarBloqueioBtn = document.getElementById("salvarBloqueioBtn");

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
arenaSelect.addEventListener("change", carregarTudo);

salvarHorarioBtn.addEventListener("click", salvarHorario);
salvarDescontoBtn.addEventListener("click", salvarDesconto);
salvarBloqueioBtn.addEventListener("click", salvarBloqueio);

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
  const email = "admin@arenailha.com";
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
  carregarTudo();
}

async function carregarTudo() {
  await carregarHorarios();
  await carregarDescontos();
  await carregarBloqueios();
  await carregarAgendamentos();
}

async function carregarHorarios() {
  const arena = arenaSelect.value;

  const { data, error } = await supabaseClient
    .from("arena_horarios")
    .select("*")
    .eq("arena_slug", arena)
    .order("dia_semana", { ascending: true });

  if (error) {
    horariosList.innerHTML = "Erro ao carregar horários.";
    return;
  }

  horariosList.innerHTML = data.map(item => `
    <div class="admin-item">
      <strong>Dia:</strong> ${nomeDia(item.dia_semana)}<br>
      <strong>Horário:</strong> ${formatarHora(item.hora_inicio)} às ${formatarHora(item.hora_fim)}<br>
      <button onclick="excluirHorario('${item.id}')">Excluir</button>
    </div>
  `).join("");
}

async function salvarHorario() {
  const arena = arenaSelect.value;
  const diaSemana = Number(document.getElementById("diaSemana").value);
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFim = document.getElementById("horaFim").value;

  if (!horaInicio || !horaFim) {
    alert("Preencha hora inicial e hora final.");
    return;
  }

  const { error } = await supabaseClient
    .from("arena_horarios")
    .insert({
      arena_slug: arena,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      ativo: true
    });

  if (error) {
    alert("Erro ao salvar horário.");
    return;
  }

  carregarHorarios();
}

async function excluirHorario(id) {
  const confirmar = confirm("Deseja excluir este horário?");
  if (!confirmar) return;

  await supabaseClient
    .from("arena_horarios")
    .delete()
    .eq("id", id);

  carregarHorarios();
}

async function salvarDesconto() {
  const arena = document.getElementById("descontoArena").value;
  const data = document.getElementById("descontoData").value;
  const horario = document.getElementById("descontoHorario").value;
  const valorNormal = document.getElementById("valorNormal").value;
  const valorPromocional = document.getElementById("valorPromocional").value;
  const descricao = document.getElementById("descricaoDesconto").value;

  if (!data || !horario || !valorPromocional) {
    alert("Preencha data, horário e valor promocional.");
    return;
  }

  const { error } = await supabaseClient
    .from("arena_descontos")
    .insert({
      arena_slug: arena,
      data,
      horario,
      valor_normal: valorNormal || null,
      valor_promocional: valorPromocional,
      descricao,
      ativo: true
    });

  if (error) {
    alert("Erro ao salvar desconto.");
    return;
  }

  carregarDescontos();
}

async function carregarDescontos() {
  const { data, error } = await supabaseClient
    .from("arena_descontos")
    .select("*")
    .order("data", { ascending: true });

  const descontosList = document.getElementById("descontosList");

  if (error) {
    descontosList.innerHTML = "Erro ao carregar descontos.";
    return;
  }

  descontosList.innerHTML = data.map(item => `
    <div class="admin-item">
      <strong>${item.arena_slug}</strong><br>
      ${formatarData(item.data)} - ${formatarHora(item.horario)}<br>
      De R$ ${item.valor_normal || "-"} por R$ ${item.valor_promocional}<br>
      ${item.descricao || ""}
      <button onclick="excluirDesconto('${item.id}')">Excluir</button>
    </div>
  `).join("");
}

async function excluirDesconto(id) {
  const confirmar = confirm("Deseja excluir este desconto?");
  if (!confirmar) return;

  await supabaseClient
    .from("arena_descontos")
    .delete()
    .eq("id", id);

  carregarDescontos();
}

async function salvarBloqueio() {
  const arena = document.getElementById("bloqueioArena").value;
  const data = document.getElementById("bloqueioData").value;
  const horario = document.getElementById("bloqueioHorario").value;
  const motivo = document.getElementById("motivoBloqueio").value;

  if (!data || !horario) {
    alert("Preencha data e horário.");
    return;
  }

  const { error } = await supabaseClient
    .from("arena_bloqueios")
    .insert({
      arena_slug: arena,
      data,
      horario,
      motivo
    });

  if (error) {
    alert("Erro ao bloquear horário.");
    return;
  }

  carregarBloqueios();
}

async function carregarBloqueios() {
  const { data, error } = await supabaseClient
    .from("arena_bloqueios")
    .select("*")
    .order("data", { ascending: true });

  const bloqueiosList = document.getElementById("bloqueiosList");

  if (error) {
    bloqueiosList.innerHTML = "Erro ao carregar bloqueios.";
    return;
  }

  bloqueiosList.innerHTML = data.map(item => `
    <div class="admin-item">
      <strong>${item.arena_slug}</strong><br>
      ${formatarData(item.data)} - ${formatarHora(item.horario)}<br>
      ${item.motivo || ""}
      <button onclick="excluirBloqueio('${item.id}')">Liberar</button>
    </div>
  `).join("");
}

async function excluirBloqueio(id) {
  const confirmar = confirm("Deseja liberar este horário?");
  if (!confirmar) return;

  await supabaseClient
    .from("arena_bloqueios")
    .delete()
    .eq("id", id);

  carregarBloqueios();
}

async function carregarAgendamentos() {
  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("*")
    .order("data", { ascending: false });

  const agendamentosList = document.getElementById("agendamentosList");

  if (error) {
    agendamentosList.innerHTML = "Erro ao carregar agendamentos.";
    return;
  }

  agendamentosList.innerHTML = data.map(item => `
    <div class="admin-item">
      <strong>${item.nome}</strong><br>
      ${item.arena_slug}<br>
      ${formatarData(item.data)} - ${formatarHora(item.horario)}<br>
      WhatsApp: ${item.whatsapp}<br>
      Status: ${item.status}
      <button onclick="cancelarAgendamento('${item.id}')">Cancelar</button>
    </div>
  `).join("");
}

async function cancelarAgendamento(id) {
  const confirmar = confirm("Deseja cancelar este agendamento?");
  if (!confirmar) return;

  await supabaseClient
    .from("agendamentos")
    .update({ status: "cancelado" })
    .eq("id", id);

  carregarAgendamentos();
}

function nomeDia(numero) {
  const dias = {
    0: "Domingo",
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado"
  };

  return dias[numero] || "-";
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
