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

  const params = new URLSearchParams(window.location.search);
  const arenaKey = params.get("arena") || "intersul";
  const arena = arenas[arenaKey] || arenas.intersul;

  let selectedTime = "";
  let autoScrollHorarios;

  if (bookingBody) bookingBody.classList.add(`theme-${arenaKey}`);

  arenaTitle.textContent = arena.nome;
  arenaLogo.src = arena.logo;
  arenaLogo.alt = arena.nome;

  iniciarCarrossel(arena.imagens);

  const today = new Date();
  dataInput.min = today.toISOString().split("T")[0];

  function gerarHorarios(inicio, fim) {
    const horarios = [];

    for (let hora = inicio; hora <= fim; hora++) {
      horarios.push(`${String(hora).padStart(2, "0")}:00`);
    }

    return horarios;
  }

  function obterHorariosPorArenaEData(dataSelecionada) {
    if (!dataSelecionada) return [];

    const data = new Date(`${dataSelecionada}T12:00:00`);
    const diaSemana = data.getDay();

    const domingo = diaSemana === 0;
    const sabado = diaSemana === 6;
    const segundaASexta = diaSemana >= 1 && diaSemana <= 5;

    if (arenaKey === "intersul") {
      if (segundaASexta) return gerarHorarios(19, 23);
      if (sabado) return gerarHorarios(14, 23);
      if (domingo) return gerarHorarios(17, 23);
    }

    if (arenaKey === "alvorada") {
      if (segundaASexta) return gerarHorarios(19, 23);
      if (sabado) return gerarHorarios(18, 23);
      if (domingo) return [];
    }

    return [];
  }

  function getBookedKey(date, time) {
    return `arena_${arenaKey}_${date}_${time}`;
  }

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

  function criarBotaoHorario(hora, selectedDate) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-btn";

    button.innerHTML = `
      <span class="time-hour">${hora}</span>
      <span class="time-status">Disponível</span>
    `;

    const isBooked = selectedDate
      ? localStorage.getItem(getBookedKey(selectedDate, hora))
      : null;

    if (isBooked) {
      button.disabled = true;
      button.classList.add("disabled");
      button.querySelector(".time-status").textContent = "Ocupado";
    }

    button.addEventListener("click", () => {
      document.querySelectorAll(".time-btn").forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      selectedTime = hora;
    });

    return button;
  }

  function renderHorarios() {
    const selectedDate = dataInput.value;
    selectedTime = "";
    timeGrid.innerHTML = "";

    if (!selectedDate) {
      timeGrid.innerHTML = `
        <div class="closed-message">
          Escolha uma data para ver os horários disponíveis.
        </div>
      `;
      return;
    }

    const horarios = obterHorariosPorArenaEData(selectedDate);

    if (horarios.length === 0) {
      timeGrid.innerHTML = `
        <div class="closed-message">
          Esta arena não possui horários disponíveis nesta data.
        </div>
      `;
      return;
    }

    horarios.forEach((hora) => {
      timeGrid.appendChild(criarBotaoHorario(hora, selectedDate));
    });

    iniciarCarrosselHorarios();
  }

  dataInput.addEventListener("change", renderHorarios);
  renderHorarios();

  form.addEventListener("submit", (event) => {
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

    const agendamento = {
      arena: arena.nome,
      nome,
      whatsapp,
      data,
      horario: selectedTime,
      observacao
    };

    localStorage.setItem(
      getBookedKey(data, selectedTime),
      JSON.stringify(agendamento)
    );

    const mensagem = encodeURIComponent(
      `Olá! Gostaria de confirmar um agendamento na ${arena.nome}.\n\n` +
      `Nome: ${nome}\n` +
      `WhatsApp: ${whatsapp}\n` +
      `Data: ${data}\n` +
      `Horário: ${selectedTime}\n` +
      `Observação: ${observacao || "Sem observação"}`
    );

    successText.innerHTML = `
      ${arena.nome}<br>
      ${data} às ${selectedTime}<br>
      Cliente: ${nome}
    `;

    whatsLink.href = `https://wa.me/${arena.whatsapp}?text=${mensagem}`;

    form.classList.add("hidden");
    successBox.classList.remove("hidden");
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
