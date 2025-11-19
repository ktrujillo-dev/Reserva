const dotenv = require("dotenv");
dotenv.config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require("./config/db.js");

const authRouter = require('./routes/auth');
const salasRouter = require('./routes/salas');
const reservasRouter = require('./routes/reservas');
const directorioRouter = require('./routes/directorio');
const equiposRouter = require('./routes/equipos');

const app = express();

// --- Middlewares de Seguridad y Rendimiento ---
app.use(helmet()); // Securiza la app estableciendo varias cabeceras HTTP
app.use(compression()); // Comprime las respuestas HTTP para mejorar el rendimiento

// --- Middlewares Generales ---
app.use(logger('dev'));

//Configuracion del CORS para producción
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key', // Usar variable de entorno para el secreto
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Usar cookies seguras en producción
    httpOnly: true,
  }
}));

app.use(passport.initialize());
app.use(passport.session());


app.get('/api/', (req, res) => {
  res.send('API funcionando');
});

app.use('/api/auth', authRouter);
app.use('/api/salas', salasRouter);
app.use('/api/reservas', reservasRouter);
app.use('/api/directorio', directorioRouter);
app.use('/api/equipos', equiposRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
