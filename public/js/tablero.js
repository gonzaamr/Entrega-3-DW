const p = [
  { icono: "♜", fila: 0, col: 0, color: "blanca" }, { icono: "♞", fila: 0, col: 1, color: "blanca" },
  { icono: "♝", fila: 0, col: 2, color: "blanca" }, { icono: "♛", fila: 0, col: 3, color: "blanca" },
  { icono: "♚", fila: 0, col: 4, color: "blanca" }, { icono: "♝", fila: 0, col: 5, color: "blanca" },
  { icono: "♞", fila: 0, col: 6, color: "blanca" }, { icono: "♜", fila: 0, col: 7, color: "blanca" },
  { icono: "♟", fila: 1, col: 0, color: "blanca" }, { icono: "♟", fila: 1, col: 1, color: "blanca" },
  { icono: "♟", fila: 1, col: 2, color: "blanca" }, { icono: "♟", fila: 1, col: 3, color: "blanca" },
  { icono: "♟", fila: 1, col: 4, color: "blanca" }, { icono: "♟", fila: 1, col: 5, color: "blanca" },
  { icono: "♟", fila: 1, col: 6, color: "blanca" }, { icono: "♟", fila: 1, col: 7, color: "blanca" },

  { icono: "♜", fila: 7, col: 0, color: "negra" }, { icono: "♞", fila: 7, col: 1, color: "negra" },
  { icono: "♝", fila: 7, col: 2, color: "negra" }, { icono: "♛", fila: 7, col: 3, color: "negra" },
  { icono: "♚", fila: 7, col: 4, color: "negra" }, { icono: "♝", fila: 7, col: 5, color: "negra" },
  { icono: "♞", fila: 7, col: 6, color: "negra" }, { icono: "♜", fila: 7, col: 7, color: "negra" },
  { icono: "♟", fila: 6, col: 0, color: "negra" }, { icono: "♟", fila: 6, col: 1, color: "negra" },
  { icono: "♟", fila: 6, col: 2, color: "negra" }, { icono: "♟", fila: 6, col: 3, color: "negra" },
  { icono: "♟", fila: 6, col: 4, color: "negra" }, { icono: "♟", fila: 6, col: 5, color: "negra" },
  { icono: "♟", fila: 6, col: 6, color: "negra" }, { icono: "♟", fila: 6, col: 7, color: "negra" }
];

const piezasIniciales = p;
const m = [];
const movimientos = m;
const tablero = document.getElementById("tablero");
const estadoGuardado = localStorage.getItem("estadoAjedrez");
const piezasDesdeLocalStorage = estadoGuardado ? JSON.parse(estadoGuardado) : piezasIniciales;
const estadoMovimientos = localStorage.getItem("estadoMovimientos");
movimientos.push(...(estadoMovimientos ? JSON.parse(estadoMovimientos) : []));
const move1 = document.getElementById("m1");
const move2 = document.getElementById("m2");
const rendirse = document.getElementById("rendirse");
const empatar = document.getElementById("empatar");

function guardar() {
  const piezas = [];
  const casillas = document.querySelectorAll(".casilla");
  casillas.forEach(casilla => {
    const pieza = casilla.querySelector(".pieza");
    if (pieza) {
      const color = getComputedStyle(pieza).color;
      const tipo = color === 'rgb(255, 255, 255)' ? 'blanca' : 'negra';
      const [, fila, col] = casilla.id.split("-");
      piezas.push({
        icono: pieza.textContent,
        fila: parseInt(fila),
        col: parseInt(col),
        color: tipo
      });
    }
  });
  localStorage.setItem("estadoAjedrez", JSON.stringify(piezas));
};

function agregarMovimientoAlHistorial(mov) { 
  const li = document.createElement("li");
  li.textContent = `${mov.origen} → ${mov.destino}`;
  if(mov.color === "blanca"){
    move1.insertBefore(li, move1.firstChild);
    li.style.color = "white";
    li.style.background=" rgba(0, 0, 0, 0.6)";
  }
  else{
    move2.insertBefore(li, move2.firstChild);
    li.style.color = "black";
    li.style.background="rgba(255, 255, 255, 0.6)";
  };
};

function turno() {
  if (movimientos.length === 0) return "blanca"; 
  const ultimo = movimientos.at(-1);
  return ultimo.color === "blanca" ? "negra" : "blanca";
};

function actualizarTurnoVisual() {
  const turnoActual = turno();
  const playerSpan = document.querySelector(".player");
  const cuadroBlancas = document.querySelector(".c1");
  const cuadroNegras = document.querySelector(".c2");

  playerSpan.textContent = turnoActual;

  if (turnoActual === "blanca") {
    cuadroBlancas.classList.add("activo");
    cuadroNegras.classList.remove("activo");
  } else {
    cuadroBlancas.classList.remove("activo");
    cuadroNegras.classList.add("activo");
  }
};

function piezaEn(fila, col) {
  return document.querySelector(`#casilla-${fila}-${col} .pieza`);
};

function colorPiezaEn(fila, col) {
  const pieza = piezaEn(fila, col);
  if (!pieza) return null;
  const color = getComputedStyle(pieza).color;
  return color === 'rgb(255, 255, 255)' ? 'blanca' : 'negra';
};

function validarPeon(pieza, filaO, colO, filaD, colD) {
  const dir = pieza.color === "blanca" ? 1 : -1;
  const filaInicio = pieza.color === "blanca" ? 1 : 6;
  if (colO === colD && filaD - filaO === dir && !piezaEn(filaD, colD)) return true;
  if (colO === colD && filaO === filaInicio && filaD - filaO === 2 * dir && !piezaEn(filaO + dir, colO) && !piezaEn(filaD, colD)) return true;
  if (Math.abs(colD - colO) === 1 && filaD - filaO === dir && piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) !== pieza.color ) return true;
  return false;
};

function validarTorre(pieza, filaO, colO, filaD, colD) {
  if (filaO !== filaD && colO !== colD) return false;
  if (filaO === filaD) {
    const min = Math.min(colO, colD) + 1, max = Math.max(colO, colD);
    for (let c = min; c < max; c++) if (piezaEn(filaO, c)) return false;
  } 
  else {
    const min = Math.min(filaO, filaD) + 1, max = Math.max(filaO, filaD);
    for (let f = min; f < max; f++) if (piezaEn(f, colO)) return false;
  };
  if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
  return true;
};

function validarCaballo(pieza, filaO, colO, filaD, colD) {
  const dx = Math.abs(filaO - filaD);
  const dy = Math.abs(colO - colD);
  if (!((dx === 2 && dy === 1) || (dx === 1 && dy === 2))) return false;
  if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
  return true;
};

function validarAlfil(pieza, filaO, colO, filaD, colD) {
  const dx = Math.abs(filaO - filaD);
  const dy = Math.abs(colO - colD);
  if (dx !== dy) return false;
  const stepX = filaD > filaO ? 1 : -1;
  const stepY = colD > colO ? 1 : -1;
  let f = filaO + stepX, c = colO + stepY;
  while (f !== filaD && c !== colD) {
    if (piezaEn(f, c)) return false;
    f += stepX; c += stepY;
  };
  if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
  return true;
};

function validarDama(pieza, filaO, colO, filaD, colD) {
  return validarTorre(pieza, filaO, colO, filaD, colD) || validarAlfil(pieza, filaO, colO, filaD, colD);
};

function validarRey(pieza, filaO, colO, filaD, colD) {
  const dx = Math.abs(filaO - filaD);
  const dy = Math.abs(colO - colD);
  if (dx <= 1 && dy <= 1) {
    if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
    return true;
  };
  return false;
};

function esMovimientoValido(pieza, filaO, colO, filaD, colD) {
  switch (pieza.icono) {
    case "♟":
      return validarPeon(pieza, filaO, colO, filaD, colD);
    case "♜":
      return validarTorre(pieza, filaO, colO, filaD, colD);
    case "♞":
      return validarCaballo(pieza, filaO, colO, filaD, colD);
    case "♝":
      return validarAlfil(pieza, filaO, colO, filaD, colD);
    case "♛":
      return validarDama(pieza, filaO, colO, filaD, colD);
    case "♚":
      return validarRey(pieza, filaO, colO, filaD, colD);
    default:
      return false;
  };
};

function agregarPiezaCapturada(icono, color, origenElemento) { //Hecho en chat gpt puro y duro
  const bandeja = document.getElementById(color === "blanca" ? "bandeja-blancas" : "bandeja-negras");
  const clone = origenElemento.cloneNode(true);
  clone.classList.add("pieza-capturada", color, "p-clone");
  clone.style.position = "absolute";
  clone.style.zIndex = "1000";
  document.body.appendChild(clone);
  const rectFrom = origenElemento.getBoundingClientRect();
  clone.style.top = `${rectFrom.top}px`;
  clone.style.left = `${rectFrom.left}px`;
  clone.style.width = `${rectFrom.width}px`;
  clone.style.height = `${rectFrom.height}px`;
  const rectTo = bandeja.getBoundingClientRect();
  const finalTop = rectTo.top + bandeja.offsetHeight / 2 - rectFrom.height / 2;
  const finalLeft = rectTo.left + bandeja.offsetWidth / 2 - rectFrom.width / 2;
  requestAnimationFrame(() => {
    clone.style.transition = "all 0.5s ease";
    clone.style.top = `${finalTop}px`;
    clone.style.left = `${finalLeft}px`;
    clone.style.transform = "scale(0.7)";
    clone.style.opacity = "0.5";
  });
  setTimeout(() => {
    const pieza = document.createElement("span");
    pieza.textContent = icono;
    pieza.classList.add("pieza-capturada", color, "visible");
    bandeja.appendChild(pieza);
    document.body.removeChild(clone);
    guardarBandejas();
  }, 500);
};

function guardarBandejas() {
  const capturadasBlancas = Array.from(document.querySelectorAll('#bandeja-blancas .pieza-capturada')).map(p => p.textContent);
  const capturadasNegras = Array.from(document.querySelectorAll('#bandeja-negras .pieza-capturada')).map(p => p.textContent);
  localStorage.setItem('capturadasBlancas', JSON.stringify(capturadasBlancas));
  localStorage.setItem('capturadasNegras', JSON.stringify(capturadasNegras));
};

function cargarBandejas() {
  const capturadasBlancas = JSON.parse(localStorage.getItem('capturadasBlancas')) || [];
  const capturadasNegras = JSON.parse(localStorage.getItem('capturadasNegras')) || [];
  const bandejaBlancas = document.getElementById('bandeja-blancas');
  const bandejaNegras = document.getElementById('bandeja-negras');
  bandejaBlancas.innerHTML = '';
  bandejaNegras.innerHTML = '';
  capturadasBlancas.forEach(icono => {
    const pieza = document.createElement("span");
    pieza.textContent = icono;
    pieza.classList.add("pieza-capturada", "blanca", "visible");
    bandejaBlancas.appendChild(pieza);
  });
  capturadasNegras.forEach(icono => {
    const pieza = document.createElement("span");
    pieza.textContent = icono;
    pieza.classList.add("pieza-capturada", "negra", "visible");
    bandejaNegras.appendChild(pieza);
  });
};

for (let fila = 0; fila < 8; fila++) {
  for (let col = 0; col < 8; col++) {
    const casilla = document.createElement("div");
    casilla.classList.add("casilla");
    casilla.classList.add((fila + col) % 2 === 0 ? "claro" : "oscuro");
    casilla.id = `casilla-${fila}-${col}`;
    casilla.addEventListener("dragover", e => {
      e.preventDefault();
      casilla.style.transform = "scale(1.2)";
    });
    casilla.addEventListener("dragleave", () => {
      casilla.style.transform = "scale(1)";
    });
    casilla.addEventListener("drop", e => {
      e.preventDefault();
      const piezaId = e.dataTransfer.getData("text/plain");
      const casillaOrigenId = e.dataTransfer.getData("origen");
      const casillaDestinoId = e.currentTarget.id;
      const pieza = document.getElementById(piezaId);
      const colorCSS = getComputedStyle(pieza).color;
      const colorPieza = colorCSS === 'rgb(255, 255, 255)' ? 'blanca' : 'negra';
      const turnoActual = turno();
      if (colorPieza !== turnoActual) {
        alert(`¡Es turno de las ${turnoActual}s!`);
        casilla.style.transform = "scale(1)";
        return; 
      }
      const [, filaOrigen, colOrigen] = casillaOrigenId.split("-");
      const [, filaDestino, colDestino] = casillaDestinoId.split("-");
      const piezaObj = piezasDesdeLocalStorage.find(p => p.fila == filaOrigen && p.col == colOrigen && p.icono == pieza.textContent) || { icono: pieza.textContent, color: colorPieza };
      if (!esMovimientoValido(piezaObj, Number(filaOrigen), Number(colOrigen), Number(filaDestino), Number(colDestino))) {
        alert("Movimiento inválido");
        casilla.style.transform = "scale(1)";
        return;
      }
      if (e.currentTarget.children.length === 0 ||(e.currentTarget.children.length === 1 && e.currentTarget.querySelector('.pieza'))){
        if (e.currentTarget.children.length === 1) {
          const capturada = e.currentTarget.querySelector('.pieza');
          if (capturada) {
            const icono = capturada.textContent;
            const colorCapturada = getComputedStyle(capturada).color === 'rgb(255, 255, 255)' ? "blanca" : "negra";
            agregarPiezaCapturada(icono, colorCapturada, capturada);
            capturada.remove(); 
          }
        }
        e.currentTarget.appendChild(pieza);
        if (casillaOrigenId !== casillaDestinoId) {
          const mov = {
            origen: `${parseInt(filaOrigen)}-${parseInt(colOrigen)}`,
            destino: `${parseInt(filaDestino)}-${parseInt(colDestino)}`,
            color: colorPieza
          };
          movimientos.push(mov);
          localStorage.setItem("estadoMovimientos", JSON.stringify(movimientos));
          agregarMovimientoAlHistorial(mov);
          const turnoDe = document.querySelector(".player");
          const nombre = turnoActual === 'blanca' ? 'negra' : 'blanca';
          turnoDe.textContent = nombre;
          actualizarTurnoVisual();
          console.log(movimientos);
        }
        guardar();
      }
      else{
        console.log("Ya hay una pieza aquí");
      }
      casilla.style.transform = "scale(1)";
    });
    const piezaData = piezasDesdeLocalStorage.find(p => p.fila === fila && p.col === col);
    if (piezaData) {
      const pieza = document.createElement("div");
      pieza.textContent = piezaData.icono;
      pieza.classList.add("pieza");
      pieza.setAttribute("draggable", "true");
      pieza.id = `pieza-${fila}-${col}`;
      pieza.style.color = piezaData.color === "blanca" ? "white" : "black";
      pieza.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", e.target.id);
        e.dataTransfer.setData("origen", e.target.parentElement.id);
      });
      casilla.appendChild(pieza);
    }
    tablero.appendChild(casilla);
  }
}

movimientos.forEach(agregarMovimientoAlHistorial);
actualizarTurnoVisual(); 
cargarBandejas();

rendirse.addEventListener("click", () => {
  const seguro = confirm("¿Estás segur@ de querer rendirte?");
  if (seguro) {
    const jugador = turno(); 
    if (jugador === "negra") {
      alert("Ganador: Piezas blancas");
    } else {
      alert("Ganador: Piezas negras");
    }
    localStorage.clear();
    location.href = "/pp";
  }
});

empatar.addEventListener("click", () => {
  const seguro = confirm("¿Están seguros de querer empatar?");
  if (seguro) {
    alert("Empate");
    localStorage.clear();
    location.href = "/pp";
  }
});