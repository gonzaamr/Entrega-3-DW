let movimientos = []; // global

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id'); // devuelve el valor de ?id=xxx
}

// luego lo usas para cargar la partida:
async function cargarInfoPartida() {
  const id = getIdFromUrl();
  if (!id) {
    mostrarError('No se encontró ID de partida en la URL');
    return;
  }

  try {
    const res = await fetch(`/api/partida/${id}`);
    
    if (res.status === 403) {
      const errorData = await res.json();
      mostrarError(errorData.message || 'Acceso denegado. No eres participante de esta partida');
      redirigirALobby();
      return;
    }
    
    if (res.status === 404) {
      mostrarError('La partida no existe o fue eliminada');
      redirigirALobby();
      return;
    }
    
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

    const api = await res.json();
    const data = api.partida;
    const usuarioId = api.usuarioId;
    const invitarBtn = document.getElementById("invitar");
if (data.jugador2 && invitarBtn) {
  invitarBtn.style.display = "none";
} else if (invitarBtn) {
  invitarBtn.style.display = "block";
}

    // Mostrar mensaje si la partida ya terminó
    if (api.partidaTerminada) {
      mostrarError(`Esta partida ya terminó. Ganador: ${data.resultado === 'jugador1' ? data.jugador1.nombre : data.jugador2.nombre}`);
      return;
    }

    // Mostrar estado de espera si falta jugador
    // if (!data.jugador2) {
    //   document.getElementById('esperando-oponente').style.display = 'block';
    //   document.getElementById('invitar').style.display = 'block';
    //   return;
    // } else {
    //   document.getElementById('esperando-oponente').style.display = 'none';
    //   document.getElementById('invitar').style.display = 'none';
    // }

    // Inicializar tablero
    document.getElementById('tablero').innerHTML = "";
    movimientos = data.Movimientos || [];
    const turnoActual = turno(movimientos);

    // Procesar piezas
    const piezasVivas = data.tablero.filter(p => p.estado === "viva");
    const piezasCapturadas = data.tablero.filter(p => p.estado === "capturada");
    document.getElementById("bandeja-blancas").innerHTML = "";
document.getElementById("bandeja-negras").innerHTML = "";

    piezasCapturadas.forEach(p => {
    const bandeja = document.getElementById(
      p.color === "blanca" ? "bandeja-blancas" : "bandeja-negras"
    );
      const span = document.createElement("span");
      span.textContent = p.icono;
      span.classList.add("pieza-capturada", p.color === "negra" ? "negra" : "blanca", "visible");
      bandeja.appendChild(span);
    });

    // Verificar fin de partida solo si hay 2 jugadores
    if (data.jugador2) {
      const resultado = verificarFinDePartida(data.tablero, data.jugador1.color, data.jugador2.color);
      if (resultado !== 'en_curso') {
        const ganador = resultado === 'jugador1' ? data.jugador1.nombre : data.jugador2.nombre;
        mostrarError(`¡Partida terminada! Ganador: ${ganador}`);
        
        try {
          await fetch(`/api/partida/${id}/terminar`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resultado })
          });
        } catch (e) {
          console.error("Error al actualizar resultado", e);
        }
        
        return;
      }
    }

    // Iniciar juego
    actualizarTurnoVisual(turnoActual);
    mostrarMovimientos(movimientos);
    juego(piezasVivas, usuarioId, data);
    
  } catch (error) {
    mostrarError(`Error al cargar la partida: ${error.message}`);
    console.error('Error detallado:', error);
  }
}

function mostrarError(mensaje) {
  // Crear o reutilizar el contenedor de errores
  let errorDiv = document.getElementById('error-message');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ff3860;
      color: white;
      padding: 15px 25px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 80%;
      text-align: center;
      animation: fadeIn 0.3s;
    `;
    document.body.appendChild(errorDiv);
    
    // Agregar animación
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; top: 0; }
        to { opacity: 1; top: 20px; }
      }
    `;
    document.head.appendChild(style);
  }

  errorDiv.textContent = mensaje;
  errorDiv.style.display = 'block';

  // Ocultar elementos del juego
  const tablero = document.getElementById('tablero');
  const controles = document.getElementById('controles');
  if (tablero) tablero.style.display = 'none';
  if (controles) controles.style.display = 'none';
}

function redirigirALobby() {
  setTimeout(() => {
    window.location.href = '/pp'; // Ajusta según tu ruta
  }, 3000);
}

function verificarFinDePartida(tablero, jugador1Color, jugador2Color) {
  const blancasVivas = tablero.filter(p => p.color === 'blanca' && p.estado === 'viva').length;
  const negrasVivas = tablero.filter(p => p.color === 'negra' && p.estado === 'viva').length;

  if (blancasVivas === 0) {
    return jugador1Color === 'negra' ? 'jugador1' : 'jugador2';
  }

  if (negrasVivas === 0) {
    return jugador1Color === 'blanca' ? 'jugador1' : 'jugador2';
  }

  return 'en_curso';
}

async function guardar() {
  const id = getIdFromUrl();
  if (!id) return;

  try {
    const res = await fetch(`/api/partida/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        Movimientos: movimientos.map(m => ({
          origen: m.origen,
          destino: m.destino
        }))
      })
    });

    if (!res.ok) throw new Error('Error al guardar movimientos');
    return await res.json();
  } catch (error) {
    console.error('Error al guardar:', error);
    throw error;
  }
}

function turno(movimientos) {
  if (!Array.isArray(movimientos)) {
    return "blanca"; // Primer turno es siempre blancas
  }
  return movimientos.length % 2 === 0 ? "blanca" : "negra";
}
function actualizarTurnoVisual(turnoActual) {
  const playerSpan = document.querySelector(".player");
  const cuadroBlancas = document.querySelector(".c1");
  const cuadroNegras = document.querySelector(".c2");

  if (playerSpan) playerSpan.textContent = turnoActual;

  if (cuadroBlancas && cuadroNegras) {
    if (turnoActual === "blanca") {
      cuadroBlancas.classList.add("activo");
      cuadroNegras.classList.remove("activo");
    } else {
      cuadroBlancas.classList.remove("activo");
      cuadroNegras.classList.add("activo");
    }
  }
}

function coordenadaAlgebraica(fila, col) {
  const letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return letras[col] + (8 - fila);
}

function agregarPiezaCapturada(icono, color, origenElemento) {
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
  }, 500);
}


function verificarFinDePartida(tablero, jugador1Color, jugador2Color) {
  // Cuenta piezas vivas por color
  const blancasVivas = tablero.filter(p => p.color === 'blanca' && p.estado === 'viva').length;
  const negrasVivas = tablero.filter(p => p.color === 'negra' && p.estado === 'viva').length;

  if (blancasVivas === 0) {
    // Ganó el jugador con piezas negras
    return jugador1Color === 'negra' ? 'jugador1' : 'jugador2';
  }

  if (negrasVivas === 0) {
    // Ganó el jugador con piezas blancas
    return jugador1Color === 'blanca' ? 'jugador1' : 'jugador2';
  }

  return 'en_curso'; // Si nadie perdió todas las piezas
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


casilla.addEventListener("drop", async (e) => {
  e.preventDefault();
  
  // Verificar si la partida ya terminó
  if (info.resultado !== 'en_curso') {
    alert('La partida ya terminó.');
    return;
  }
  

  // Obtener pieza movida
  const piezaId = e.dataTransfer.getData("text/plain");
  const pieza = document.getElementById(piezaId);
  const origenId = pieza.parentElement.id;
  const destinoId = casilla.id;

  // Si se suelta en la misma casilla, no hacer nada
  if (origenId === destinoId) {
    casilla.style.transform = "scale(1)";
    return;
  }

  // Obtener coordenadas
  const [, filaOrigen, colOrigen] = origenId.split("-").map(Number);
  const [, filaDestino, colDestino] = destinoId.split("-").map(Number);

  // Determinar color y turno
  const colorPieza = getComputedStyle(pieza).color === 'rgb(255, 255, 255)' ? 'blanca' : 'negra';
  const turnoActual = turno(movimientos);
  
  // Validar turno
  if (colorPieza !== turnoActual) {
    alert(`¡Es turno de las ${turnoActual}s!`);
    casilla.style.transform = "scale(1)";
    return;
  }

  // Validar movimiento
  const piezaObj = {
    icono: pieza.textContent,
    color: colorPieza
  };

  if (!esMovimientoValido(piezaObj, filaOrigen, colOrigen, filaDestino, colDestino)) {
    alert("Movimiento inválido");
    casilla.style.transform = "scale(1)";
    return;
  }

  // Mover la pieza visualmente (esto debe hacerse ANTES de guardar)
  const piezaACapturar = casilla.querySelector(".pieza:not(#"+piezaId+")");
  if (piezaACapturar) {
    const icono = piezaACapturar.textContent;
    const colorCapturada = getComputedStyle(piezaACapturar).color === 'rgb(255, 255, 255)' ? "blanca" : "negra";
    agregarPiezaCapturada(icono, colorCapturada, piezaACapturar);
    piezaACapturar.remove();
    
    // Actualizar estado de pieza capturada en backend
    try {
      await fetch(`/api/partida/${getIdFromUrl()}/capturar-pieza`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fila: filaDestino, 
          col: colDestino 
        })
      });
    } catch (error) {
      console.error("Error al capturar pieza:", error);
    }
  }

  // Mover la pieza al nuevo lugar
  casilla.appendChild(pieza);
  casilla.style.transform = "scale(1)";

  // Crear movimiento (solo origen y destino)
  const movimiento = {
    origen: coordenadaAlgebraica(filaOrigen, colOrigen),
    destino: coordenadaAlgebraica(filaDestino, colDestino)
  };

  // Actualizar array de movimientos
  movimientos.push(movimiento);

  // Mostrar movimientos actualizados
  mostrarMovimientos(movimientos);
  
  // Actualizar turno visual
  actualizarTurnoVisual(turno(movimientos));

  // Guardar en backend
  try {
    await guardar();
  } catch (error) {
    console.error("Error al guardar movimiento:", error);
    // Revertir movimiento si falla el guardado
    document.getElementById(origenId).appendChild(pieza);
    movimientos.pop();
    mostrarMovimientos(movimientos);
    actualizarTurnoVisual(turno(movimientos));
    alert("Error al guardar el movimiento. Intenta nuevamente.");
  }
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
  console.log('Cookie usuario:', cookie);
  console.log('Jugador1 ID:', info.jugador1.usuario);
  console.log('Jugador2 ID:', info.jugador2?.usuario);
  const colorCSS = getComputedStyle(pieza).color;
  const isWhite = colorCSS.includes('255, 255, 255') || colorCSS === 'white';
  const colorPieza = isWhite ? 'blanca' : 'negra';

  // Convertir todos los IDs a string para comparar
  const cookieStr = String(cookie);
  const jugador1Id = String(info.jugador1.usuario?._id || info.jugador1.usuario);
  const jugador2Id = info.jugador2?.usuario ? String(info.jugador2.usuario?._id || info.jugador2.usuario) : null;

  console.log('Comparando IDs:',
    'Cookie:', cookieStr,
    'J1:', jugador1Id,
    'J2:', jugador2Id
  );

  let miColor;
  if (cookieStr === jugador1Id) {
    miColor = info.jugador1.color;
  } else if (jugador2Id && cookieStr === jugador2Id) {
    miColor = info.jugador2.color;
  } else {
    console.error('Usuario no coincide con ningún jugador');
    e.preventDefault();
    return;
  }

  if (colorPieza !== miColor) {
    e.preventDefault();
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

function piezaEn(fila, col) {
  return document.querySelector(`#casilla-${fila}-${col} .pieza`);
}

function colorPiezaEn(fila, col) {
  const pieza = piezaEn(fila, col);
  if (!pieza) return null;
  const color = getComputedStyle(pieza).color;
  return color === 'rgb(255, 255, 255)' ? 'blanca' : 'negra';
}

function validarPeon(pieza, filaO, colO, filaD, colD) {
  const dir = pieza.color === "blanca" ? -1 : 1;
  const filaInicio = pieza.color === "blanca" ? 6 : 1;

  // Movimiento normal de 1 casilla hacia adelante
  if (colO === colD && filaD - filaO === dir && !piezaEn(filaD, colD)) return true;

  // Movimiento doble desde fila inicial
  if (colO === colD &&
      filaO === filaInicio &&
      filaD - filaO === 2 * dir &&
      !piezaEn(filaO + dir, colO) &&
      !piezaEn(filaD, colD)) return true;

  // Captura en diagonal
  if (Math.abs(colD - colO) === 1 &&
      filaD - filaO === dir &&
      piezaEn(filaD, colD) &&
      colorPiezaEn(filaD, colD) !== pieza.color) return true;

  return false;
}


function validarTorre(pieza, filaO, colO, filaD, colD) {
  if (filaO !== filaD && colO !== colD) return false;
  if (filaO === filaD) {
    const min = Math.min(colO, colD) + 1, max = Math.max(colO, colD);
    for (let c = min; c < max; c++) if (piezaEn(filaO, c)) return false;
  } else {
    const min = Math.min(filaO, filaD) + 1, max = Math.max(filaO, filaD);
    for (let f = min; f < max; f++) if (piezaEn(f, colO)) return false;
  }
  if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
  return true;
}

function validarCaballo(pieza, filaO, colO, filaD, colD) {
  const dx = Math.abs(filaO - filaD);
  const dy = Math.abs(colO - colD);
  if (!((dx === 2 && dy === 1) || (dx === 1 && dy === 2))) return false;
  if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
  return true;
}

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
  }
  if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
  return true;
}

function validarDama(pieza, filaO, colO, filaD, colD) {
  return validarTorre(pieza, filaO, colO, filaD, colD) || validarAlfil(pieza, filaO, colO, filaD, colD);
}

function validarRey(pieza, filaO, colO, filaD, colD) {
  const dx = Math.abs(filaO - filaD);
  const dy = Math.abs(colO - colD);
  if (dx <= 1 && dy <= 1) {
    if (piezaEn(filaD, colD) && colorPiezaEn(filaD, colD) === pieza.color) return false;
    return true;
  }
  return false;
}

function esMovimientoValido(pieza, filaO, colO, filaD, colD) {
  switch (pieza.icono) {
    case "♟": return validarPeon(pieza, filaO, colO, filaD, colD);
    case "♜": return validarTorre(pieza, filaO, colO, filaD, colD);
    case "♞": return validarCaballo(pieza, filaO, colO, filaD, colD);
    case "♝": return validarAlfil(pieza, filaO, colO, filaD, colD);
    case "♛": return validarDama(pieza, filaO, colO, filaD, colD);
    case "♚": return validarRey(pieza, filaO, colO, filaD, colD);
    default: return false;
  }
}


const invitarBtn = document.getElementById("invitar");
function EsconderInvitacion(info) {
  const invitarBtn = document.getElementById("invitar");
  if (!invitarBtn) return; // Si el botón no existe, salir

  // Verificar si hay un jugador2 con datos válidos
  if (info.jugador2 && info.jugador2.usuario) {
    invitarBtn.style.display = "none";
  } else {
    invitarBtn.style.display = "block"; // Asegurarse de que esté visible si no hay oponente
  }
}
invitarBtn.addEventListener("click", () => {
  // Crear fondo semitransparente
  const backdrop = document.createElement("div");
  backdrop.classList.add("modal-backdrop");

  // Crear input
  const invitacion = document.createElement("input");
  invitacion.type = "email";
  invitacion.placeholder = "Correo del oponente";
  invitacion.classList.add("invitacion");

  // Crear botón
  const enviarBtn = document.createElement("button");
  enviarBtn.textContent = "Enviar invitación";
  enviarBtn.classList.add("enviar-invitacion");

  // Eliminar todo al hacer clic en el fondo
  backdrop.addEventListener("click", () => {
    document.body.removeChild(backdrop);
    document.body.removeChild(invitacion);
    document.body.removeChild(enviarBtn);
  });

  // Añadir al DOM
  document.body.appendChild(backdrop);
  document.body.appendChild(invitacion);
  document.body.appendChild(enviarBtn);

  // Enfocar el input automáticamente
  invitacion.focus();

  // Evitar que el clic en el modal cierre el fondo
  enviarBtn.addEventListener("click", (e) => e.stopPropagation());
  invitacion.addEventListener("click", (e) => e.stopPropagation());

  // Lógica de enviar (tu código existente)
  enviarBtn.addEventListener("click", async () => {
    const email = invitacion.value.trim();
    if (!email) {
      alert("Por favor, ingresa un correo válido.");
      return;
    }
    try {
      const res = await fetch('/api/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, partidaId: getIdFromUrl() })
      });
      if (!res.ok) throw new Error('Error al enviar invitación');
      alert("Invitación enviada.");
      // Limpiar y cerrar modal
      document.body.removeChild(backdrop);
      document.body.removeChild(invitacion);
      document.body.removeChild(enviarBtn);
    } catch (error) {
      alert("Error: " + error.message);
    }
  });
});

function mostrarMovimientos(movimientos) {
  const move1 = document.getElementById('m1'); // Contenedor para blancas
  const move2 = document.getElementById('m2'); // Contenedor para negras
  
  // Limpiar contenedores
  move1.innerHTML = '<h4>Blancas</h4>';
  move2.innerHTML = '<h4>Negras</h4>';

  // Mostrar movimientos según el turno (color implícito por orden)
  movimientos.forEach((mov, index) => {
    const li = document.createElement("li");
    li.textContent = `${mov.origen} → ${mov.destino}`;
    li.style.padding = '4px 8px';
    li.style.margin = '2px 0';
    li.style.borderRadius = '3px';
    li.style.listStyle = 'none';
    
    if (index % 2 === 0) {
      // Movimiento de blancas (turnos pares: 0, 2, 4...)
      li.style.color = "white";
      li.style.background = "rgba(0, 0, 0, 0.6)";
      move1.insertBefore(li, move1.children[1] || null); // Insertar después del h4
    } else {
      // Movimiento de negras (turnos impares: 1, 3, 5...)
      li.style.color = "black";
      li.style.background = "rgba(255, 255, 255, 0.6)";
      move2.insertBefore(li, move2.children[1] || null); // Insertar después del h4
    }
  });
}
setInterval(() => {
      cargarInfoPartida();
    }, 2000);

const rendirse = document.getElementById("rendirse");

rendirse.addEventListener("click", async () => {
  const seguro = confirm("¿Estás segur@ de querer rendirte?");
  if (!seguro) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const partidaId = urlParams.get('id');

    const res = await fetch(`/api/partida/${partidaId}/rendirse`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error al procesar la rendición');
    }

    alert(data.message);
    window.location.href = "/pp";
    
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al rendirse');
  }
});

const empatarBtn = document.getElementById("empatar");
let intervaloEmpate;

// Función para ofrecer empate
empatarBtn.addEventListener("click", async () => {
  const partidaId = getIdFromUrl();
  
  if (!confirm("¿Quieres ofrecer empate a tu oponente?")) return;

  try {
    const res = await fetch(`/api/partida/${partidaId}/solicitar-empate`, {
      method: "POST"
    });
    
    if (!res.ok) throw new Error("Error al enviar solicitud");
    
    alert("Solicitud de empate enviada. Esperando respuesta...");
    
    // Verificar respuesta cada 5 segundos
    intervaloEmpate = setInterval(() => verificarRespuestaEmpate(partidaId), 5000);
  } catch (error) {
    alert(error.message);
  }
});

// Función para verificar respuesta
async function verificarRespuestaEmpate(partidaId) {
  try {
    const res = await fetch(`/api/partida/${partidaId}/estado-empate`);
    const data = await res.json();
    
    if (data.solicitudEmpate?.estado === 'aceptado') {
      clearInterval(intervaloEmpate);
      alert("¡Empate aceptado! La partida terminó.");
      window.location.href = "/pp";
    } else if (data.solicitudEmpate?.estado === 'rechazado') {
      clearInterval(intervaloEmpate);
      alert("Tu oponente rechazó el empate.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Verificar si hay solicitud pendiente al cargar
document.addEventListener("DOMContentLoaded", async () => {
  const partidaId = getIdFromUrl();
  const res = await fetch(`/api/partida/${partidaId}/estado-empate`);
  const data = await res.json();
  
  if (data.solicitudEmpate?.estado === 'pendiente') {
    if (confirm("Tu oponente ofrece empate. ¿Aceptas?")) {
      await fetch(`/api/partida/${partidaId}/responder-empate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aceptar: true })
      });
      alert("Empate aceptado. Redirigiendo...");
      window.location.href = "/pp";
    } else {
      await fetch(`/api/partida/${partidaId}/responder-empate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aceptar: false })
      });
    }
  }
});