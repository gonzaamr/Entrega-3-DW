const mongoose = require('mongoose')

const PartidaSchema = new mongoose.Schema({
  jugador1: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  jugador2: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fechaInicio: { type: Date, default: Date.now },
  resultado: {
    type: String,
    enum: ['jugador1', 'jugador2', 'empate', 'en_curso'],
    default: 'en_curso'
  }
})

module.exports  = mongoose.model('Partida', PartidaSchema)
