const express = require('express')
const { engine } = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const Usuario = require('./models/usuarios');
const Partida = require('./models/partidas');
const bcrypt = require('bcrypt');
const app = express()
const port = 80


app.engine('handlebars', engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());

mongoose.connect('mongodb+srv://gonzalomorales1:db_password@cluster0.8fvbx8v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Conexión exitosa a MongoDB Atlas')
})
.catch(err => {
  console.error('Error conectando a MongoDB', err)
})

function authMiddleware(req, res, next) {
  const usuarioId = req.cookies.usuario_id;

  if (usuarioId) {
    next(); // La cookie existe → usuario autenticado
  } else {
    res.redirect('/login'); // No hay cookie → redirigir a login
  }
}

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password, nombre, apellido, mail, cumpleaños } = req.body;

  const existe = await Usuario.findOne({ username });
  if (existe) return res.send('Usuario ya existe. <a href="/register">Volver</a>');

  // 🔒 Encriptar contraseña
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const nuevoUsuario = new Usuario({
    username,
    password: hashedPassword, // usar la contraseña encriptada
    nombre,
    apellido,
    mail,
    cumpleaños
  });

  await nuevoUsuario.save();
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const usuario = await Usuario.findOne({ username });

  if (!usuario) {
    return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>');
  }

  // 🔍 Comparar contraseña ingresada con la encriptada
  const passwordValida = await bcrypt.compare(password, usuario.password);

  if (!passwordValida) {
    return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>');
  }

  // Autenticación exitosa → establecer cookies
  res.cookie('usuario_id', usuario._id.toString(), { httpOnly: true });
  res.cookie('username', usuario.username);

  res.redirect('/pp');
});

app.get('/pp', authMiddleware, async (req, res) => {
  const usuarioId = req.cookies.usuario_id;
  res.render('pp', { Partida, usuarioId });
});

app.get('/partidaLocal', authMiddleware, (req, res) => {
  res.render('partidaLocal', {
    script: '<script src="/js/tableroLocal.js"></script>',
    username: req.cookies.username  // Cambiado de req.session.usuario.username
  });
});

app.get('/api/info-partidas', authMiddleware, async (req, res) => {
  try {
    const usuarioId = req.cookies.usuario_id;

    const partidas = await Partida.find({
      $or: [
        { 'jugador1.usuario': usuarioId },
        { 'jugador2.usuario': usuarioId }
      ]
    }).populate('jugador1.usuario jugador2.usuario');

    res.json({partidas, usuarioId});
  } catch (err) {
    console.error('Error en /api/info-partidas:', err);
    res.status(500).json({ error: 'Error interno al obtener las partidas' });
  }
});

app.get('/api/partida/:id', authMiddleware, async (req, res) => {
  try {
    const partida = await Partida.findById(req.params.id)
      .populate('jugador1.usuario jugador2.usuario')
      .lean();

    if (!partida) return res.status(404).json({ message: 'Partida no encontrada' });

    // Verificación de acceso simplificada
    const jugadoresIds = [
      partida.jugador1?.usuario?._id?.toString(),
      partida.jugador2?.usuario?._id?.toString()
    ].filter(Boolean);

    if (!jugadoresIds.includes(req.cookies.usuario_id)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    res.json({ 
      partida: {
        ...partida,
        resultado: partida.resultado || 'en_curso'
      },
      usuarioId: req.cookies.usuario_id
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.post('/api/invitar', authMiddleware, async (req, res) => {
  const { email, partidaId } = req.body;
  const jugador1Id = req.cookies.usuario_id;

  try {
    if (!email || !partidaId) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const usuarioInvitado = await Usuario.findOne({ mail: email });
    if (!usuarioInvitado) {
      return res.status(404).json({ error: "Usuario invitado no encontrado" });
    }

    const partida = await Partida.findById(partidaId);
    if (!partida) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }

    if (partida.jugador1.usuario.toString() !== jugador1Id) {
      return res.status(403).json({ error: "No eres el creador de esta partida" });
    }

    if (partida.jugador2) {
      return res.status(400).json({ error: "La partida ya tiene un oponente" });
    }

    const colorJugador1 = partida.jugador1.color;
    const colorJugador2 = colorJugador1 === "blanca" ? "negra" : "blanca";

    partida.jugador2 = {
      usuario: usuarioInvitado._id,
      color: colorJugador2
    };

    partida.resultado = "esperando_oponente";

    await partida.save();

    res.json({ mensaje: "Invitación enviada", jugador2: partida.jugador2 });

  } catch (error) {
    console.error("Error al invitar al jugador:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post('/api/crear-partida', authMiddleware, async (req, res) => {
  try {
    const usuarioId = req.cookies.usuario_id;
    const { color } = req.body;

    if (!['blanca', 'negra'].includes(color)) {
      return res.status(400).json({ error: 'Color inválido' });
    }

    const partida = await Partida.create({
      jugador1: {
        usuario: usuarioId,
        color: color
      },
      resultado: 'esperando_oponente'
    });

    res.json({ partidaId: partida._id });

  } catch (err) {
    console.error('Error al crear la partida:', err);
    res.status(500).json({ error: 'Error al crear la partida' });
  }
});

app.patch('/api/partida/:id', async (req, res) => {
  const { id } = req.params;
  const { Movimientos, resultado } = req.body;

  try {
    const partida = await Partida.findById(id);
    if (!partida) return res.status(404).json({ error: 'Partida no encontrada' });

    if (Array.isArray(Movimientos)) {
      partida.Movimientos = Movimientos;

      // Aplicar el último movimiento al tablero
      const ultimo = Movimientos[Movimientos.length - 1];
      if (ultimo) {
        const filaOrigen = 8 - parseInt(ultimo.origen[1]);
        const colOrigen = ultimo.origen.charCodeAt(0) - 'a'.charCodeAt(0);
        const filaDestino = 8 - parseInt(ultimo.destino[1]);
        const colDestino = ultimo.destino.charCodeAt(0) - 'a'.charCodeAt(0);

        // Encontrar la pieza que se movió
        const piezaMovida = partida.tablero.find(
          p => p.fila === filaOrigen && p.col === colOrigen && p.estado === "viva"
        );

        if (piezaMovida) {
          piezaMovida.fila = filaDestino;
          piezaMovida.col = colDestino;
        }
      }
    }

    if (typeof resultado === 'string') {
      partida.resultado = resultado;
    }

    await partida.save();
    res.json({ mensaje: 'Partida actualizada con éxito' });
  } catch (error) {
    console.error('Error al actualizar partida:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar la partida' });
  }
});

app.patch('/api/partida/:id/terminar', async (req, res) => {
  try {
    const { resultado } = req.body;
    if (!['jugador1', 'jugador2', 'empate'].includes(resultado)) {
      return res.status(400).json({ success: false, mensaje: 'Resultado inválido' });
    }

    const partida = await Partida.findByIdAndUpdate(
      req.params.id,
      { resultado },
      { new: true }
    );

    if (!partida) return res.status(404).json({ success: false, mensaje: 'Partida no encontrada' });

    res.json({ success: true, partida });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error del servidor' });
  }
});


// PATCH o PUT /api/partida/:id/capturar-pieza
app.put('/api/partida/:id/capturar-pieza', async (req, res) => {
  const { id } = req.params;
  const { fila, col } = req.body;

  try {
    const partida = await Partida.findById(id);
    if (!partida) return res.status(404).json({ success: false, mensaje: 'Partida no encontrada' });

    // Buscar la pieza por posición
    const pieza = partida.tablero.find(p => p.fila === fila && p.col === col && p.estado === 'viva');
    if (!pieza) return res.status(404).json({ success: false, mensaje: 'Pieza viva no encontrada en esa posición' });

    // Marcar como capturada
    pieza.estado = 'capturada';

    await partida.save();
    res.json({ success: true, mensaje: 'Pieza capturada actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, mensaje: 'Error del servidor' });
  }
});

// En tu archivo de rutas (api.js o similar)
app.post('/api/partida/:id/rendirse', authMiddleware, async (req, res) => {
  try {
    const partidaId = req.params.id;
    const usuarioId = req.cookies.usuario_id;

    const partida = await Partida.findById(partidaId).populate('jugador1.usuario jugador2.usuario');
    
    if (!partida) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }

    // Determinar qué jugador se está rindiendo
    let jugadorRindiendose;
    let ganador;

    if (partida.jugador1.usuario._id.toString() === usuarioId) {
      jugadorRindiendose = partida.jugador1;
      ganador = 'jugador2'; // El otro jugador gana
    } else if (partida.jugador2?.usuario?._id.toString() === usuarioId) {
      jugadorRindiendose = partida.jugador2;
      ganador = 'jugador1'; // El otro jugador gana
    } else {
      return res.status(403).json({ success: false, message: 'No eres un jugador en esta partida' });
    }

    // Actualizar la partida
    partida.resultado = ganador;
    await partida.save();

    // Determinar mensaje para el frontend
    let mensaje;
    if (ganador === 'jugador1') {
      mensaje = `Ganador: ${partida.jugador1.usuario.username} (${partida.jugador1.color})`;
    } else {
      mensaje = `Ganador: ${partida.jugador2?.usuario?.username || 'Oponente'} (${partida.jugador2?.color || 'color opuesto'})`;
    }

    res.status(200).json({ 
      success: true,
      message: mensaje,
      resultado: ganador
    });

  } catch (error) {
    console.error('Error al rendirse:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Solicitar empate
app.post('/api/partida/:id/solicitar-empate', authMiddleware, async (req, res) => {
  try {
    const partidaId = req.params.id;
    const usuarioId = req.cookies.usuario_id;

    const partida = await Partida.findById(partidaId);
    
    if (!partida) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }

    // Verificar que el usuario es jugador en esta partida
    if (![partida.jugador1.usuario.toString(), partida.jugador2?.usuario?.toString()].includes(usuarioId)) {
      return res.status(403).json({ success: false, message: 'No eres un jugador en esta partida' });
    }

    // Crear solicitud
    partida.solicitudEmpate = {
      solicitante: usuarioId,
      estado: 'pendiente'
    };
    await partida.save();

    res.status(200).json({ success: true, message: 'Solicitud de empate enviada' });
  } catch (error) {
    console.error('Error al solicitar empate:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Responder a empate
app.post('/api/partida/:id/responder-empate', authMiddleware, async (req, res) => {
  try {
    const partidaId = req.params.id;
    const usuarioId = req.cookies.usuario_id;
    const { aceptar } = req.body;

    const partida = await Partida.findById(partidaId);
    
    if (!partida) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }

    // Verificar que hay una solicitud pendiente
    if (!partida.solicitudEmpate || partida.solicitudEmpate.estado !== 'pendiente') {
      return res.status(400).json({ success: false, message: 'No hay solicitud de empate pendiente' });
    }

    // Verificar que el usuario no es el solicitante
    if (partida.solicitudEmpate.solicitante.toString() === usuarioId) {
      return res.status(400).json({ success: false, message: 'No puedes responder a tu propia solicitud' });
    }

    // Actualizar estado
    partida.solicitudEmpate.estado = aceptar ? 'aceptado' : 'rechazado';
    
    // Si se acepta, terminar partida como empate
    if (aceptar) {
      partida.resultado = 'empate';
    }
    
    await partida.save();

    res.status(200).json({ 
      success: true,
      message: aceptar ? 'Empate aceptado' : 'Empate rechazado',
      resultado: partida.resultado
    });
  } catch (error) {
    console.error('Error al responder empate:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Verificar estado de empate
app.get('/api/partida/:id/estado-empate', authMiddleware, async (req, res) => {
  try {
    const partidaId = req.params.id;
    const partida = await Partida.findById(partidaId);
    
    if (!partida) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }

    res.status(200).json({ 
      success: true,
      solicitudEmpate: partida.solicitudEmpate
    });
  } catch (error) {
    console.error('Error al verificar empate:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


app.delete('/api/borrar-partida/:id', authMiddleware, async (req, res) => {
  try {
    const partidaId = req.params.id;
    const usuarioId = req.cookies.usuario_id;

    // Buscar la partida y verificar permisos
    const partida = await Partida.findById(partidaId);
    
    if (!partida) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }

    // Verificar que el usuario es el jugador1
    if (partida.jugador1.usuario.toString() !== usuarioId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo el creador de la partida puede eliminarla' 
      });
    }

    // Eliminar la partida
    await Partida.findByIdAndDelete(partidaId);
    
    res.status(200).json({ success: true, message: 'Partida eliminada' });
  } catch (error) {
    console.error('Error al eliminar partida:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para solicitar eliminación (jugador2)
app.post('/api/partida/:id/solicitar-eliminacion', authMiddleware, async (req, res) => {
  try {
    const partidaId = req.params.id;
    const usuarioId = req.cookies.usuario_id;

    const partida = await Partida.findById(partidaId);
    
    if (!partida) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }

    // Verificar que el usuario es el jugador2
    if (partida.jugador2?.usuario?.toString() !== usuarioId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo el segundo jugador puede solicitar eliminación' 
      });
    }

    // Crear solicitud de eliminación
    partida.solicitudEliminacion = {
      solicitante: usuarioId,
      estado: 'pendiente'
    };
    
    await partida.save();
    
    res.status(200).json({ 
      success: true,
      message: 'Solicitud de eliminación enviada al creador de la partida'
    });
  } catch (error) {
    console.error('Error al solicitar eliminación:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para responder a eliminación (jugador1)
app.post('/api/partida/:id/responder-eliminacion', authMiddleware, async (req, res) => {
  try {
    const partidaId = req.params.id;
    const usuarioId = req.cookies.usuario_id;
    const { aceptar } = req.body;

    const partida = await Partida.findById(partidaId);
    
    if (!partida) {
      return res.status(404).json({ success: false, message: 'Partida no encontrada' });
    }

    // Verificar que el usuario es el jugador1
    if (partida.jugador1.usuario.toString() !== usuarioId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo el creador puede responder a la solicitud' 
      });
    }

    // Verificar que hay solicitud pendiente
    if (!partida.solicitudEliminacion || partida.solicitudEliminacion.estado !== 'pendiente') {
      return res.status(400).json({ 
        success: false, 
        message: 'No hay solicitud de eliminación pendiente' 
      });
    }

    if (aceptar) {
      // Eliminar la partida si se acepta
      await Partida.findByIdAndDelete(partidaId);
      res.status(200).json({ 
        success: true,
        message: 'Partida eliminada por acuerdo mutuo'
      });
    } else {
      // Rechazar la solicitud
      partida.solicitudEliminacion.estado = 'rechazado';
      await partida.save();
      res.status(200).json({ 
        success: true,
        message: 'Solicitud de eliminación rechazada'
      });
    }
  } catch (error) {
    console.error('Error al responder eliminación:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});
 
app.get('/partida',authMiddleware, (req, res)=>{
  res.render('partida',{
    script: '<script src="/js/tablero.js"></script>',
    username: req.cookies.username
  });
});

app.get('/desarrolladores', (req, res)=>{
  res.render('desarrolladores');
});

app.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuarioId = req.cookies.usuario_id;
    const usuario = await Usuario.findById(usuarioId);

    if (!usuario) {
      return res.status(404).send('Usuario no encontrado');
    }

    res.render('perfil', {
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      mail: usuario.mail
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar el perfil');
  }
});


app.get('/logout', (req, res) => {
  res.clearCookie('username');
  res.clearCookie('usuario_id');
  res.redirect('/login')
});

app.get('/historia', (req, res)=>{
  res.render('historia');
});

app.listen(port, () => {
  console.log(`App corriendo en http://localhost:${port}`);
});