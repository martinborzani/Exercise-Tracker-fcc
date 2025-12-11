'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// CORS
app.use(cors({ optionsSuccessStatus: 200 }));

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Archivos estáticos
app.use('/public', express.static(process.cwd() + '/public'));

// Página principal
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// ----- "Base de datos" en memoria -----
const users = [];      // { username, _id }
const exercises = [];  // { userId, description, duration, date: Date }

// Helper para IDs
function makeId() {
  return crypto.randomUUID();
}

// ----- Rutas ----- //

// Crear usuario
// POST 
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  const user = {
    username,
    _id: makeId()
  };
  users.push(user);
  res.json(user);
});

// Listar usuarios
// GET 
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Agregar ejercicio
// POST 
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const user = users.find(u => u._id === userId);

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'description and duration are required' });
  }

  const durationNum = Number(duration);
  if (Number.isNaN(durationNum)) {
    return res.status(400).json({ error: 'duration must be a number' });
  }

  let exerciseDate;
  if (date) {
    exerciseDate = new Date(date);
    if (exerciseDate.toString() === 'Invalid Date') {
      return res.json({ error: 'Invalid Date' });
    }
  } else {
    exerciseDate = new Date();
  }

  const exercise = {
    userId: user._id,
    description: description,
    duration: durationNum,
    date: exerciseDate
  };

  exercises.push(exercise);

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString(),
    _id: user._id
  });
});

// Obtener log de ejercicios
// GET 
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const user = users.find(u => u._id === userId);

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const { from, to, limit } = req.query;

  let fromDate, toDate;
  if (from) {
    fromDate = new Date(from);
    if (fromDate.toString() === 'Invalid Date') fromDate = null;
  }
  if (to) {
    toDate = new Date(to);
    if (toDate.toString() === 'Invalid Date') toDate = null;
  }

  let userExercises = exercises.filter(e => e.userId === user._id);

  if (fromDate) {
    userExercises = userExercises.filter(e => e.date >= fromDate);
  }
  if (toDate) {
    userExercises = userExercises.filter(e => e.date <= toDate);
  }

  let limitedExercises = userExercises;
  if (limit) {
    const lim = Number(limit);
    if (!Number.isNaN(lim) && lim > 0) {
      limitedExercises = userExercises.slice(0, lim);
    }
  }

  const log = limitedExercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));

  res.json({
    username: user.username,
    count: userExercises.length,
    _id: user._id,
    log: log
  });
});

// Levantar servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Exercise Tracker listening on port ' + port);
});

module.exports = app;
