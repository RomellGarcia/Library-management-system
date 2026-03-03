require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'biblioteca-uthh-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// IMPORTAR RUTAS
const librosRoutes = require('./routers/libros');
const authRoutes = require('./routers/auth'); 

// MONTAR RUTAS
app.use('/api/libros', librosRoutes);
app.use('/api/auth', authRoutes); 

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HTML', 'index.html'));
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`API Auth: http://localhost:${PORT}/api/auth`);
    console.log(`API Libros: http://localhost:${PORT}/api/libros`);
});