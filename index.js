const express = require('express');
const path    = require('path');
const app     = express();

// Servir archivos estáticos de public/
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal → index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HTML', 'index.html'));
});

// Cualquier otra ruta → 404
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frontend corriendo en http://localhost:${PORT}`);
});
































