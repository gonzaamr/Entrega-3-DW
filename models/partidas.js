const e = require('express');
const mongoose = require('mongoose');

// Subesquema para una pieza del tablero
const PiezaSchema = new mongoose.Schema({
  icono: { type: String, required: true },
  fila: { type: Number, required: true },
  col: { type: Number, required: true },
  color: { type: String, enum: ['blanca', 'negra'], required: true },
  estado: { type: String, enum: ['viva', 'capturada'], default: 'viva'}
}, { _id: false }); // No necesitamos un _id por cada pieza

const JugadorEnPartidaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  color: { type: String, enum: ['blanca', 'negra'], required: true }
}, { _id: false });

const MovimientosSchema = new mongoose.Schema({
  origen: { type: String, required: true }, 
  destino: { type: String, required: true }
}, { _id: false });

const PartidaSchema = new mongoose.Schema({
  jugador1: { type: JugadorEnPartidaSchema, required: true },
  jugador2: { type: JugadorEnPartidaSchema, default: null },
  fechaInicio: { type: Date, default: Date.now },
  resultado: {
    type: String,
    enum: ['jugador1', 'jugador2', 'empate', 'en_curso', 'esperando_oponente'],
    default: 'en_curso'
  },
  tablero: {
    type: [PiezaSchema],
    default: () => [
      // Piezas blancas
      { icono: "♜", fila: 0, col: 0, color: "negra" }, { icono: "♞", fila: 0, col: 1, color: "negra" },
      { icono: "♝", fila: 0, col: 2, color: "negra" }, { icono: "♛", fila: 0, col: 3, color: "negra" },
      { icono: "♚", fila: 0, col: 4, color: "negra" }, { icono: "♝", fila: 0, col: 5, color: "negra" },
      { icono: "♞", fila: 0, col: 6, color: "negra" }, { icono: "♜", fila: 0, col: 7, color: "negra" },
      { icono: "♟", fila: 1, col: 0, color: "negra" }, { icono: "♟", fila: 1, col: 1, color: "negra" },
      { icono: "♟", fila: 1, col: 2, color: "negra" }, { icono: "♟", fila: 1, col: 3, color: "negra" },
      { icono: "♟", fila: 1, col: 4, color: "negra" }, { icono: "♟", fila: 1, col: 5, color: "negra" },
      { icono: "♟", fila: 1, col: 6, color: "negra" }, { icono: "♟", fila: 1, col: 7, color: "negra" },
      // Piezas negras
      { icono: "♜", fila: 7, col: 0, color: "blanca" }, { icono: "♞", fila: 7, col: 1, color: "blanca" },
      { icono: "♝", fila: 7, col: 2, color: "blanca" }, { icono: "♛", fila: 7, col: 3, color: "blanca" },
      { icono: "♚", fila: 7, col: 4, color: "blanca" }, { icono: "♝", fila: 7, col: 5, color: "blanca" },
      { icono: "♞", fila: 7, col: 6, color: "blanca" }, { icono: "♜", fila: 7, col: 7, color: "blanca" },
      { icono: "♟", fila: 6, col: 0, color: "blanca" }, { icono: "♟", fila: 6, col: 1, color: "blanca" },
      { icono: "♟", fila: 6, col: 2, color: "blanca" }, { icono: "♟", fila: 6, col: 3, color: "blanca" },
      { icono: "♟", fila: 6, col: 4, color: "blanca" }, { icono: "♟", fila: 6, col: 5, color: "blanca" },
      { icono: "♟", fila: 6, col: 6, color: "blanca" }, { icono: "♟", fila: 6, col: 7, color: "blanca" }
    ]
  },
  Movimientos: { type: [MovimientosSchema], default: null },
  solicitudEmpate: {
    solicitante: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    estado: { type: String, enum: ['pendiente', 'aceptado', 'rechazado'], default: null }
  },
  solicitudEliminacion: {
    solicitante: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    estado: { type: String, enum: ['pendiente', 'aceptado', 'rechazado'] },
    fecha: { type: Date, default: Date.now }
  }
});

module.exports = mongoose.model('Partida', PartidaSchema);

