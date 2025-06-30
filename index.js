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

app.post('/register', async (req, res) => { //ENCRIPTAR DATOS
  const { username, password, nombre, apellido, mail, cumpleaños } = req.body
  const existe = await Usuario.findOne({ username })
  if (existe) return res.send('Usuario ya existe. <a href="/register">Volver</a>');
  const nuevoUsuario = new Usuario({ username, password, nombre, apellido, mail, cumpleaños })
  await nuevoUsuario.save()
  res.redirect('/login')
})

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const usuario = await Usuario.findOne({ username })

  if (!usuario || usuario.password !== password) { // CAMBIAR A CONTRASEÑA ENCRIPTADA
    return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>')
  }

  // Establecemos cookies con datos básicos
  res.cookie('usuario_id', usuario._id.toString(), { httpOnly: true })
  res.cookie('username', usuario.username)
  
  res.redirect('/pp')
});

app.get('/pp', authMiddleware, async (req, res) => {
  const usuarioId = req.cookies.usuario_id;
  res.render('pp', { Partida, usuarioId });
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
  const partidaId = req.params.id;
  const usuarioId = req.cookies.usuario_id;
  const partida = await Partida.findById(partidaId).populate('jugador1 jugador2');
  
  if (!partida) {
    return res.status(404).send('Partida no encontrada');
  }

  res.json({partida, usuarioId});
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
  const { tablero, Movimientos, resultado } = req.body;

  const updateFields = {};

  // Solo agregamos los campos que estén presentes y válidos
  if (Array.isArray(tablero)) {
    updateFields.tablero = tablero;
  }
  if (Array.isArray(Movimientos)) {
    updateFields.Movimientos = Movimientos;
  }
  if (typeof resultado === 'string') {
    updateFields.resultado = resultado;
  }

  // Si no hay ningún campo para actualizar
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
  }

  try {
    const partida = await Partida.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!partida) {
      return res.status(404).json({ error: 'Partida no encontrada' });
    }

    res.json({ mensaje: 'Partida actualizada con éxito' });
  } catch (error) {
    console.error('Error al actualizar partida:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar la partida' });
  }
});



app.delete('/api/borrar-partida/:id', authMiddleware, async (req, res) => {
  const partidaId = req.params.id; 
  await Partida.findByIdAndDelete(partidaId);
  res.status(204).send();
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