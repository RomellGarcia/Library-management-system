require('dotenv').config();
const mysql = require('mysql');

const conexion = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4'
});

conexion.connect((error) => {
    if (error) {
        console.error('Error al conectar a MySQL:', error.message);
        console.error('Código de error:', error.code);
        process.exit(1);
    }
    console.log('Conectado a MySQL - Base de datos:', process.env.DB_NAME);
});

conexion.on('error', (error) => {
    console.error('Error de MySQL:', error);
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('La conexión a la base de datos se perdió');
    } else {
        throw error;
    }
});

module.exports = conexion;