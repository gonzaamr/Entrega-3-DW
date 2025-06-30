let movimientos = []; // global

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id'); // devuelve el valor de ?id=xxx
}

// luego lo usas para cargar la partida:
async function cargarInfoPartida() {
  const id = getIdFromUrl();
  if (!id) {
    console.error('No se encontró id en la URL');
    return;
  }

  try {
    const res = await fetch(`/api/partida/${id}`); // usa el id para la ruta correcta
    if (!res.ok) {
      throw new Error('Error al obtener la partida');
    }
    const api= await res.json();
    const data = api.partida;
    const usuarioId = api.usuarioId;
    const piezasIniciales = data.tablero;
    document.getElementById('tablero').innerHTML = "";
    movimientos = data.Movimientos || [];
    const turnoActual = turno(movimientos);
    actualizarTurnoVisual(turnoActual);
    juego(piezasIniciales, usuarioId, data);
    console.log(piezasIniciales);
    
  } catch (error) {
    console.error('Error al obtener la partida:', error);
  }
}

async function guardar() {
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

  const id = getIdFromUrl(); // usamos la misma función

  try {
    const res = await fetch(`/api/partida/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tablero: piezas, Movimientos: movimientos })
    });

    if (!res.ok) {
      throw new Error('Error al guardar el tablero en la base de datos');
    }

    const resultado = await res.json();
    console.log(resultado.mensaje); // Opcional
  } catch (error) {
    console.error('Error al guardar el tablero:', error);
  }
}


function turno(movimientos) {
  if (!Array.isArray(movimientos) || movimientos.length % 2 === 0) {
    return "blanca";
  } else {
    return "negra";
  }
}

function actualizarTurnoVisual(turnoActual) {
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
}

function coordenadaAlgebraica(fila, col) {
  const letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return letras[col] + (8 - fila);
}

function juego(piezasIniciales, cookie, info) {
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
      //   const casillaOrigenId = e.dataTransfer.getData("origen");
      //   const casillaDestinoId = e.currentTarget.id;
        const pieza = document.getElementById(piezaId);
        const colorCSS = getComputedStyle(pieza).color;
        const colorPieza = colorCSS === 'rgb(255, 255, 255)' ? 'blanca' : 'negra';
        const turnoActual = turno(movimientos);
          if (colorPieza !== turnoActual) {
            alert(`¡Es turno de las ${turnoActual}s!`);
            casilla.style.transform = "scale(1)";
            return;
          }
      //   const [, filaOrigen, colOrigen] = casillaOrigenId.split("-");
      //   const [, filaDestino, colDestino] = casillaDestinoId.split("-");
      //   const piezaObj = piezasDesdeLocalStorage.find(p => p.fila == filaOrigen && p.col == colOrigen && p.icono == pieza.textContent) || { icono: pieza.textContent, color: colorPieza };
         if (e.currentTarget.children.length === 0 ){
          // Simular movimiento para el cambio de turno
          
          const origenId = pieza.parentElement.id; // e.g., "casilla-6-4"
          const destinoId = casilla.id;            // e.g., "casilla-4-4"

          const [, filaOrigen, colOrigen] = origenId.split("-").map(Number);
          const [, filaDestino, colDestino] = destinoId.split("-").map(Number);

          const origen = coordenadaAlgebraica(filaOrigen, colOrigen);
          const destino = coordenadaAlgebraica(filaDestino, colDestino);
          e.currentTarget.appendChild(pieza);
          movimientos.push({ origen, destino});
          actualizarTurnoVisual(turno(movimientos));
          guardar();

      //     if (e.currentTarget.children.length === 1) {
      //       const capturada = e.currentTarget.querySelector('.pieza');
      //       if (capturada) {
      //         const icono = capturada.textContent;
      //         const colorCapturada = getComputedStyle(capturada).color === 'rgb(255, 255, 255)' ? "blanca" : "negra";
      //         agregarPiezaCapturada(icono, colorCapturada, capturada);
      //         capturada.remove(); 
      //       }
      //     }
            
      //     if (casillaOrigenId !== casillaDestinoId) {
      //       const mov = {
      //         origen: `${parseInt(filaOrigen)}-${parseInt(colOrigen)}`,
      //         destino: `${parseInt(filaDestino)}-${parseInt(colDestino)}`,
      //         color: colorPieza
      //       };
      //       movimientos.push(mov);
      //       localStorage.setItem("estadoMovimientos", JSON.stringify(movimientos));
      //       agregarMovimientoAlHistorial(mov);
      //       const turnoDe = document.querySelector(".player");
      //       const nombre = turnoActual === 'blanca' ? 'negra' : 'blanca';
      //       turnoDe.textContent = nombre;
      //       actualizarTurnoVisual();
      //       console.log(movimientos);
      //     }
         }
         else{
           console.log("Ya hay una pieza aquí");
         }
         casilla.style.transform = "scale(1)";
      });

      

      const piezaData = piezasIniciales.find(p => p.fila === fila && p.col === col);
      if (piezaData) {
        const pieza = document.createElement("div");
        pieza.textContent = piezaData.icono;
        pieza.classList.add("pieza");
        pieza.setAttribute("draggable", "true");
        pieza.id = `pieza-${fila}-${col}`;
        pieza.style.color = piezaData.color === "blanca" ? "white" : "black";
          pieza.addEventListener("dragstart", e => {
            if(info.resultado !== "en_curso") {
              e.preventDefault();
              return;
            }
          const colorCSS = getComputedStyle(pieza).color;
          const colorPieza = colorCSS === 'rgb(255, 255, 255)' ? 'blanca' : 'negra';
          const miColor = cookie === info.jugador1.usuario  ? info.jugador1.color : info.jugador2.color;
          if (colorPieza !== miColor) {
            e.preventDefault();
            console.log("No puedes mover piezas del oponente.");
            return;
          }
          e.dataTransfer.setData("text/plain", e.target.id);
          e.dataTransfer.setData("origen", e.target.parentElement.id);
        });

        casilla.appendChild(pieza);
      }
      tablero.appendChild(casilla);
    }
  }
}

const invitarBtn = document.getElementById("invitar");
invitarBtn.addEventListener("click", () => {
  const invitacion = document.createElement("input");
  invitacion.type = "email"; // mejor usar "email" que "mail"
  invitacion.placeholder = "Correo del oponente";
  invitacion.classList.add("invitacion");

  const enviarBtn = document.createElement("button");
  enviarBtn.textContent = "Enviar invitación";
  enviarBtn.classList.add("enviar-invitacion");

  enviarBtn.addEventListener("click", async () => {
    const email = invitacion.value;
    if (!email) {
      alert("Por favor, ingresa un correo electrónico.");
      return;
    }
    try {
      const res = await fetch('/api/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, partidaId: getIdFromUrl() })
      });

      if (!res.ok) {
        throw new Error('Error al enviar la invitación');
      }
      alert("Invitación enviada correctamente.");
      invitacion.remove();
      enviarBtn.remove();
    } catch (error) {
      console.error('Error al enviar la invitación:', error);
      alert("Error al enviar la invitación. Inténtalo de nuevo.");
    }
  });

  // Agregar al DOM, por ejemplo en el body o en un contenedor
  document.body.appendChild(invitacion);
  document.body.appendChild(enviarBtn);
});


setInterval(() => {
      cargarInfoPartida();
    }, 2000);

