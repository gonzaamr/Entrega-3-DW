const mongoose = require('mongoose')

const UsuarioSchema = new mongoose.Schema({
  username: String,
  password: String,
  nombre: String,
  apellido: String,
  mail: String,
  cumpleaños: Date
})

module.exports = mongoose.model('Usuario', UsuarioSchema)
