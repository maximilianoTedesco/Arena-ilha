const arenas = {
  intersul: {
    nome: "Arena Intersul",
    logo: "assets/LOGO ARENA INTERSUL.png",
    whatsapp: "5551995766825",
    imagens: [
      "assets/intersul-01.jpeg",
      "assets/intersul-02.jpeg",
      "assets/intersul-03.jpeg",
      "assets/intersul-04.jpeg",
      "assets/intersul-05.jpeg",
      "assets/intersul-06.jpeg"
    ]
  },

  alvorada: {
    nome: "Arena Alvorada",
    logo: "assets/LOGO ARENA ALVORADA.png",
    whatsapp: "5551995766825",
    imagens: [
      "assets/alvorada-01.jpeg",
      "assets/alvorada-02.jpeg",
      "assets/alvorada-03.jpeg",
      "assets/alvorada-04.jpeg",
      "assets/alvorada-05.jpeg",
      "assets/alvorada-06.jpeg"
    ]
  }
};

function iniciarCarrossel(imagens) {
  const carousel = document.getElementById("bookingCarousel");
  if (!carousel || !imagens || imagens.length === 0) return;

  carousel.innerHTML = "";

  imagens.forEach((imagem, index) => {
    const slide = document.createElement("div");
    slide.className = "carousel-slide";
    slide.style.backgroundImage = `url('${imagem}')`;

    if (index === 0) slide.classList.add("active");

    carousel.appendChild(slide);
  });

  const slides = carousel.querySelectorAll(".carousel-slide");
  let currentSlide = 0;

  setInterval(() => {
    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add("active");
  }, 4500);
}

function iniciarGaleriaArena(imagens) {
  const galleryTrack = document.getElementById("arenaGalleryTrack");
  if (!galleryTrack || !imagens || imagens.length === 0) return;

  galleryTrack.innerHTML = "";

  imagens.forEach((imagem, index) => {
    const item = document.createElement("div");
    item.className = "arena-gallery-item";

    item.innerHTML = `
      <img src="${imagem}" alt="Foto da arena ${index + 1}" loading="lazy">
    `;

    galleryTrack.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const bookingBody = document.getElementById("bookingBody");
  const arenaTitle = document.getElementById("arenaTitle");
  const arenaLogo = document.getElementById("arenaLogo");
  const dataInput = document.getElementById("data");
  const timeGrid = document.getElementById("timeGrid");
  const form = document.getElementById("bookingForm");
  const successBox = document.getElementById("successBox");
  const successText = document.getElementById("successText");
  const whatsLink = document.getElementById("whatsLink");

  if (!form || !timeGrid || !dataInput) return;

  if (typeof supabaseClient === "undefined") {
    console.error("Supabase não carregado. Verifique o supabase-config.js no agendamento.html.");
    timeGrid.innerHTML = `
      <div class="closed-message">
        Erro ao carregar conexão com o sistema de horários.
      </div>
    `;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const arenaKey = params.get("arena") || "intersul";
  const arena = arenas[arenaKey] || arenas.intersul;

  let selectedTime = "";
  let selectedDiscount = null;
  let autoScrollHorarios;

  if (bookingBody) bookingBody.classList.add(`theme-${arenaKey}`);

  arenaTitle.textContent = arena.nome;
  arenaLogo.src = arena.logo;
  arenaLogo.alt = arena.nome;

  iniciarCarrossel(arena.imagens);
  iniciarGaleriaArena(arena.imagens);

  const today = new Date();
  dataInput.min = today.toISOString().split("T")[0];

  function iniciarCarrosselHorarios() {
    clearInterval(autoScrollHorarios);

    autoScrollHorarios = setInterval(() => {
      const card = timeGrid.querySelector(".time-btn:not(:disabled)");
      if (!card) return;

      const cardWidth = card.offsetWidth + 12;
      const chegouNoFim =
        timeGrid.scrollLeft + timeGrid.clientWidth >= timeGrid.scrollWidth - 5;

      if (chegouNoFim) {
        timeGrid.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        timeGrid.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 3000);
  }

  async function buscarHorariosDaArena(arenaSlug, dataSelecionada) {
    const dataObj = new Date(`${dataSelecionada}T12:00:00`);
    const diaSemana = dataObj.getDay();

    const { data: regras, error } = await supabaseClient
      .from("arena_horarios")
      .select("*")
      .eq("arena_slug", arenaSlug)
      .eq("dia_semana", diaSemana)
      .eq("ativo", true);

    if (error) {
      console.error("Erro ao buscar horários:", error);
      return [];
    }

    let horariosGerados = [];

    regras.forEach((regra) => {
      const inicio = Number(regra.hora_inicio.slice(0, 2));
      const fim = Number(regra.hora_fim.slice(0, 2));

      for (let hora = inicio; hora <= fim; hora++) {
        horariosGerados.push(`${String(hora).padStart(2, "0")}:00`);
      }
    });

    const { data: bloqueios } = await supabaseClient
      .from("arena_bloqueios")
      .select("horario")
      .eq("arena_slug", arenaSlug)
      .eq("data", dataSelecionada);

    const { data: agendamentos } = await supabaseClient
      .from("agendamentos")
      .select("horario")
      .eq("arena_slug", arenaSlug)
      .eq("data", dataSelecionada)
      .eq("status", "confirmado");

    const horariosBloqueados = (bloqueios || []).map((item) =>
      item.horario.slice(0, 5)
    );

    const horariosOcupados = (agendamentos || []).map((item) =>
      item.horario.slice(0, 5)
    );

    return horariosGerados.filter((hora) => {
      return !horariosBloqueados.includes(hora) && !horariosOcupados.includes(hora);
    });
  }

  async function buscarDesconto(arenaSlug, dataSelecionada, horario) {
    const { data, error } = await supabaseClient
      .from("arena_descontos")
      .select("*")
      .eq("arena_slug", arenaSlug)
      .eq("data", dataSelecionada)
      .eq("horario", horario)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar desconto:", error);
      return null;
    }

    return data;
  }

  async function criarBotaoHorario(hora, selectedDate) {
    const desconto = await buscarDesconto(arenaKey, selectedDate, hora);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-btn";

    button.innerHTML = `
      <span class="time-hour">${hora}</span>
      <span class="time-status">
        ${desconto ? `Promoção R$ ${desconto.valor_promocional}` : "Disponível"}
      </span>
    `;

    if (desconto) {
      button.classList.add("has-discount");
    }

    button.addEventListener("click", () => {
      document.querySelectorAll(".time-btn").forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      selectedTime = hora;
      selectedDiscount = desconto;
    });

    return button;
  }

  async function renderHorarios() {
    const selectedDate = dataInput.value;
    selectedTime = "";
    selectedDiscount = null;
    timeGrid.innerHTML = "";

    clearInterval(autoScrollHorarios);

    if (!selectedDate) {
      timeGrid.innerHTML = `
        <div class="closed-message">
          Escolha uma data para ver os horários disponíveis.
        </div>
      `;
      return;
    }

    timeGrid.innerHTML = `
      <div class="closed-message">
        Carregando horários disponíveis...
      </div>
    `;

    const horarios = await buscarHorariosDaArena(arenaKey, selectedDate);

    timeGrid.innerHTML = "";

    if (horarios.length === 0) {
      timeGrid.innerHTML = `
        <div class="closed-message">
          Esta arena não possui horários disponíveis nesta data.
        </div>
      `;
      return;
    }

    for (const hora of horarios) {
      const botao = await criarBotaoHorario(hora, selectedDate);
      timeGrid.appendChild(botao);
    }

    iniciarCarrosselHorarios();
  }

  dataInput.addEventListener("change", renderHorarios);
  renderHorarios();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const data = dataInput.value;
    const observacao = document.getElementById("observacao").value.trim();

    if (!nome || !whatsapp || !data) {
      alert("Preencha nome, WhatsApp e data.");
      return;
    }

    if (!selectedTime) {
      alert("Escolha um horário disponível.");
      return;
    }

    const valorFinal = selectedDiscount
      ? selectedDiscount.valor_promocional
      : null;

    const { error } = await supabaseClient
      .from("agendamentos")
      .insert({
        arena_slug: arenaKey,
        nome,
        whatsapp,
        data,
        horario: selectedTime,
        valor: valorFinal,
        observacao,
        status: "confirmado"
      });

    if (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert("Erro ao salvar agendamento. Tente novamente.");
      return;
    }

    const textoValor = selectedDiscount
      ? `\nValor promocional: R$ ${selectedDiscount.valor_promocional}`
      : "";

    const mensagem = encodeURIComponent(
      `Olá! Gostaria de confirmar um agendamento na ${arena.nome}.\n\n` +
      `Nome: ${nome}\n` +
      `WhatsApp: ${whatsapp}\n` +
      `Data: ${data}\n` +
      `Horário: ${selectedTime}${textoValor}\n` +
      `Observação: ${observacao || "Sem observação"}`
    );

    successText.innerHTML = `
      ${arena.nome}<br>
      ${data} às ${selectedTime}<br>
      Cliente: ${nome}
      ${selectedDiscount ? `<br>Promoção: R$ ${selectedDiscount.valor_promocional}` : ""}
    `;

    whatsLink.href = `https://wa.me/${arena.whatsapp}?text=${mensagem}`;

    form.classList.add("hidden");
    successBox.classList.remove("hidden");
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
