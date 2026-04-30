const arenas = {
  intersul: {
    nome: "Arena Intersul",
    logo: "assets/LOGO ARENA INTERSUL.png",
    whatsapp: "5551995766825",
    imagens: [
      "assets/intersul-01.jpg",
      "assets/intersul-02.jpg",
      "assets/intersul-03.jpg"
    ]
  },

  alvorada: {
    nome: "Arena Alvorada",
    logo: "assets/LOGO ARENA ALVORADA.png",
    whatsapp: "5551995766825",
    imagens: [
      "assets/alvorada-01.jpg",
      "assets/alvorada-02.jpg",
      "assets/alvorada-03.jpg"
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

    if (index === 0) {
      slide.classList.add("active");
    }

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

  if (bookingBody) {
    bookingBody.classList.add(`theme-${arenaKey}`);
  }

  arenaTitle.textContent = arena.nome;
  arenaLogo.src = arena.logo;
  arenaLogo.alt = arena.nome;
  iniciarCarrossel(arena.imagens);

  const today = new Date();
  dataInput.min = today.toISOString().split("T")[0];

  const horarios = [
    "08:00", "09:00", "10:00", "11:00",
    "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00"
  ];

  function getBookedKey(date, time) {
    return `arena_${arenaKey}_${date}_${time}`;
  }

  function renderHorarios() {
    const selectedDate = dataInput.value;
    selectedTime = "";
    timeGrid.innerHTML = "";

    horarios.forEach((hora) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time-btn";
      button.textContent = hora;

      const isBooked = selectedDate
        ? localStorage.getItem(getBookedKey(selectedDate, hora))
        : null;

      if (!selectedDate) {
        button.disabled = true;
      }

      if (isBooked) {
        button.disabled = true;
        button.classList.add("disabled");
        button.textContent = `${hora} ocupado`;
      }

      button.addEventListener("click", () => {
        document.querySelectorAll(".time-btn").forEach((btn) => {
          btn.classList.remove("active");
        });

        button.classList.add("active");
        selectedTime = hora;
      });

      timeGrid.appendChild(button);
    });
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
      <strong>${arena.nome}</strong><br>
      ${data} às ${selectedTime}<br>
      Cliente: ${nome}
    `;

    whatsLink.href = `https://wa.me/${arena.whatsapp}?text=${mensagem}`;

    form.classList.add("hidden");
    successBox.classList.remove("hidden");
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
