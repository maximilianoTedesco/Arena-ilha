const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");

const arenaSelect = document.getElementById("arenaSelect");
const horariosList = document.getElementById("horariosList");

const salvarHorarioBtn = document.getElementById("salvarHorarioBtn");
const salvarBloqueioBtn = document.getElementById("salvarBloqueioBtn");

const promoArena = document.getElementById("promoArena");
const promoData = document.getElementById("promoData");
const buscarHorariosPromoBtn = document.getElementById("buscarHorariosPromoBtn");
const promoHorariosList = document.getElementById("promoHorariosList");
const promoFormBox = document.getElementById("promoFormBox");
const promoHorarioSelecionado = document.getElementById("promoHorarioSelecionado");
const salvarPromoSelecionadaBtn = document.getElementById("salvarPromoSelecionadaBtn");

let horarioPromoSelecionado = "";

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
arenaSelect.addEventListener("change", carregarTudo);

salvarHorarioBtn.addEventListener("click", salvarHorario);
salvarBloqueioBtn.addEventListener("click", salvarBloqueio);

buscarHorariosPromoBtn.addEventListener("click", carregarHorariosPromocao);
salvarPromoSelecionadaBtn.addEventListener("click", salvarPromocaoSelecionada);

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

async function carregarHorariosPromocao() {
  const arena = promoArena.value;
  const dataSelecionada = promoData.value;

  horarioPromoSelecionado = "";
  promoFormBox.classList.add("hidden");
  promoHorariosList.innerHTML = "";

  if (!arena || !dataSelecionada) {
    alert("Selecione a arena e a data.");
    return;
  }

  promoHorariosList.innerHTML = `<p>Carregando horários...</p>`;

  const dataObj = new Date(`${dataSelecionada}T12:00:00`);
  const diaSemana = dataObj.getDay();

  const { data: regras, error } = await supabaseClient
    .from("arena_horarios")
    .select("*")
    .eq("arena_slug", arena)
    .eq("dia_semana", diaSemana)
    .eq("ativo", true);

  if (error) {
    console.error(error);
    promoHorariosList.innerHTML = `<p>Erro ao carregar horários.</p>`;
    return;
  }

  if (!regras || regras.length === 0) {
    promoHorariosList.innerHTML = `<p>Não há horários cadastrados para esta arena nesta data.</p>`;
    return;
  }

  let horarios = [];

  regras.forEach((regra) => {
    const inicio = Number(regra.hora_inicio.slice(0, 2));
    const fim = Number(regra.hora_fim.slice(0, 2));

    for (let hora = inicio; hora <= fim; hora++) {
      horarios.push(`${String(hora).padStart(2, "0")}:00`);
    }
  });

  horarios = [...new Set(horarios)].sort();

  const { data: agendamentos } = await supabaseClient
    .from("agendamentos")
    .select("horario")
    .eq("arena_slug", arena)
    .eq("data", dataSelecionada)
    .eq("status", "confirmado");

  const { data: bloqueios } = await supabaseClient
    .from("arena_bloqueios")
    .select("horario")
    .eq("arena_slug", arena)
    .eq("data", dataSelecionada);

  const { data: descontos } = await supabaseClient
    .from("arena_descontos")
    .select("*")
    .eq("arena_slug", arena)
    .eq("data", dataSelecionada)
    .eq("ativo", true);

  const horariosOcupados = (agendamentos || []).map((item) =>
    item.horario.slice(0, 5)
  );

  const horariosBloqueados = (bloqueios || []).map((item) =>
    item.horario.slice(0, 5)
  );

  const horariosComPromocao = (descontos || []).map((item) =>
    item.horario.slice(0, 5)
  );

  promoHorariosList.innerHTML = "";

  horarios.forEach((horario) => {
    const ocupado = horariosOcupados.includes(horario);
    const bloqueado = horariosBloqueados.includes(horario);
    const temPromocao = horariosComPromocao.includes(horario);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "promo-horario-item";

    if (ocupado || bloqueado) {
      item.classList.add("ocupado");
      item.disabled = true;
      item.innerHTML = `
        <strong>${horario}</strong>
        <span>${ocupado ? "Ocupado" : "Bloqueado"}</span>
      `;
    } else {
      item.classList.add("livre");

      if (temPromocao) {
        item.classList.add("com-promocao");
      }

      item.innerHTML = `
        <strong>${horario}</strong>
        <span>${temPromocao ? "Já tem promoção" : "Livre"}</span>
      `;

      item.addEventListener("click", () => {
        document.querySelectorAll(".promo-horario-item").forEach((btn) => {
          btn.classList.remove("selecionado");
        });

        item.classList.add("selecionado");
        horarioPromoSelecionado = horario;

        promoHorarioSelecionado.textContent = `Promoção para ${horario}`;
        promoFormBox.classList.remove("hidden");
      });
    }

    promoHorariosList.appendChild(item);
  });
}

async function salvarPromocaoSelecionada() {
  const arena = promoArena.value;
  const dataSelecionada = promoData.value;
  const valorNormal = document.getElementById("promoValorNormal").value;
  const valorPromocional = document.getElementById("promoValorPromocional").value;
  const descricao = document.getElementById("promoDescricao").value.trim();

  if (!horarioPromoSelecionado) {
    alert("Selecione um horário livre.");
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
      horario: horarioPromoSelecionado,
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

  horarioPromoSelecionado = "";
  promoFormBox.classList.add("hidden");

  await carregarHorariosPromocao();
  await carregarDescontos();
}

async function carregarDescontos() {
  const { data, error } = await supabaseClient
    .from("arena_descontos")
    .select("*")
    .order("data", { ascending: true });

  const descontosList = document.getElementById("descontosList");

  if (error) {
    descontosList.innerHTML = "Erro ao carregar promoções.";
    return;
  }

  descontosList.innerHTML = `
    <h3 style="margin-top: 22px;">Promoções cadastradas</h3>
    ${
      data.length
        ? data.map(item => `
          <div class="admin-item">
            <strong>${nomeArena(item.arena_slug)}</strong><br>
            ${formatarData(item.data)} - ${formatarHora(item.horario)}<br>
            De R$ ${item.valor_normal || "-"} por R$ ${item.valor_promocional}<br>
            ${item.descricao || ""}
            <button onclick="excluirDesconto('${item.id}')">Excluir</button>
          </div>
        `).join("")
        : `<p>Nenhuma promoção cadastrada.</p>`
    }
  `;
}

async function excluirDesconto(id) {
  const confirmar = confirm("Deseja excluir esta promoção?");
  if (!confirmar) return;

  await supabaseClient
    .from("arena_descontos")
    .delete()
    .eq("id", id);

  carregarDescontos();

  if (promoData.value) {
    carregarHorariosPromocao();
  }
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

  if (promoData.value) {
    carregarHorariosPromocao();
  }
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
      <strong>${nomeArena(item.arena_slug)}</strong><br>
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

  if (promoData.value) {
    carregarHorariosPromocao();
  }
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
      ${nomeArena(item.arena_slug)}<br>
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

  if (promoData.value) {
    carregarHorariosPromocao();
  }
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
