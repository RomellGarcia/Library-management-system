const express = require('express');
const router = express.Router();
const conexion = require('../bd');

// GET /libros/recomendados/aleatorios - Obtener 8 libros aleatorios
router.get('/recomendados/aleatorios', (req, res) => {
    const sql = `
        SELECT 
            l.vchfolio,
            l.vchtitulo,
            l.vchautor,
            l.vcheditorial,
            l.intanio,
            l.imagen,
            c.vchcategoria
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        ORDER BY RAND()
        LIMIT 8
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al obtener libros recomendados:', error);
            return res.status(500).json({
                success: false,
                error: 'Error de base de datos: ' + error.message,
                codigo: error.code
            });
        }

        if (resultados.length === 0) {
            return res.json({
                success: true,
                data: [],
                total: 0,
                mensaje: 'No hay libros en la base de datos'
            });
        }

        const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F4A460'];

        const librosConImagenes = resultados.map(libro => {
            const libroProcessado = { ...libro };

            if (libro.imagen) {
                const imagenBase64 = Buffer.from(libro.imagen).toString('base64');
                const imagenBuffer = Buffer.from(libro.imagen);
                let mimeType = 'image/jpeg';
                
                if (imagenBuffer[0] === 0x89 && 
                    imagenBuffer[1] === 0x50 && 
                    imagenBuffer[2] === 0x4E && 
                    imagenBuffer[3] === 0x47) {
                    mimeType = 'image/png';
                }

                libroProcessado.imagen = `data:${mimeType};base64,${imagenBase64}`;
            } else {
                libroProcessado.color_fondo = colores[Math.floor(Math.random() * colores.length)];
                libroProcessado.imagen = null;
            }

            return libroProcessado;
        });

        res.json({
            success: true,
            data: librosConImagenes,
            total: librosConImagenes.length
        });
    });
});
// GET /api/libros/categorias - Obtener categorías con imágenes
router.get('/categorias', (req, res) => {
    const sql = `
        SELECT DISTINCT
            c.intidcategoria,
            c.vchcategoria,
            c.vchdescripcion
        FROM tblcategoria c
        LEFT JOIN tbllibros l ON c.intidcategoria = l.intidcategoria
        WHERE l.vchfolio IS NOT NULL
        GROUP BY c.intidcategoria, c.vchcategoria, c.vchdescripcion
        ORDER BY c.vchcategoria ASC
    `;
    
    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al obtener categorías:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        const categoriasConImagenes = resultados.map(categoria => {
            let rutaImagen = '/images/categorias/Ciencias.png';
            
            if (categoria.vchcategoria) {
                const nombre = categoria.vchcategoria.toLowerCase().trim();
                
                // Mapeo exacto
                if (nombre === 'ficción - aventura') {
                    rutaImagen = '/images/categorias/Ficción_Aventura.png';
                } else if (nombre === 'historia') {
                    rutaImagen = '/images/categorias/Historia.png';
                } else if (nombre === 'cómics') {
                    rutaImagen = '/images/categorias/Comics.png';
                } else if (nombre === 'cocina y recetas') {
                    rutaImagen = '/images/categorias/Cocina.png';
                } else if (nombre === 'diccionarios') {
                    rutaImagen = '/images/categorias/Diccionario.png';
                } else if (nombre === 'literatura juvenil') {
                    rutaImagen = '/images/categorias/Literatura_Juvenil.png';
                } else if (nombre === 'ciencias') {
                    rutaImagen = '/images/categorias/Ciencias.png';
                } else if (nombre === 'tecnología') {
                    rutaImagen = '/images/categorias/Tecnologia.png';
                } else if (nombre === 'salud y deporte') {
                    rutaImagen = '/images/categorias/Salud.png';
                } else if (nombre === 'divulgativos') {
                    rutaImagen = '/images/categorias/Divulgativos.png';
                } else if (nombre === 'administración y negocios') {
                    rutaImagen = '/images/categorias/Administracion.png';
                } else if (nombre === 'educación y pedagogía') {
                    rutaImagen = '/images/categorias/Pedagogia.png';
                } else if (nombre === 'ingeniería') {
                    rutaImagen = '/images/categorias/Ingenieria.png';
                } else if (nombre === 'filosofía') {
                    rutaImagen = '/images/categorias/Filosofia.png';
                } else if (nombre === 'programación') {
                    rutaImagen = '/images/categorias/Programacion.png';
                } else if (nombre === 'matemáticas') {
                    rutaImagen = '/images/categorias/Matematicas.png';
                } else if (nombre === 'novela') {
                    rutaImagen = '/images/categorias/novelas.png';
                } else if (nombre === 'economía') {
                    rutaImagen = '/images/categorias/Economia.png';
                } else if (nombre === 'idiomas y lingüística') {
                    rutaImagen = '/images/categorias/Idiomas.png';
                }
            }
            return {
                intidcategoria: categoria.intidcategoria,
                vchcategoria: categoria.vchcategoria,
                icono: rutaImagen
            };
        });

        res.json({
            success: true,
            data: categoriasConImagenes
        });
    });
});

// GET /api/libros/mas-pedidos - Libros más prestados
router.get('/mas-pedidos', (req, res) => {
    const sql = `
        SELECT 
            l.vchfolio,
            l.vchtitulo,
            l.vchautor,
            l.vcheditorial,
            l.imagen,
            c.vchcategoria,
            COUNT(p.intidprestamo) as total_prestamos
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
        LEFT JOIN tblprestamos p ON e.intidejemplar = p.intidejemplar
        GROUP BY l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.imagen, c.vchcategoria
        ORDER BY total_prestamos DESC, RAND()
        LIMIT 6
    `;
    
    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al obtener libros más pedidos:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        const colores = ['#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4', '#DDA0DD', '#F4A460'];

        const librosConImagenes = resultados.map(libro => {
            const libroProcessado = { ...libro };

            if (libro.imagen) {
                const imagenBase64 = Buffer.from(libro.imagen).toString('base64');
                const imagenBuffer = Buffer.from(libro.imagen);
                let mimeType = 'image/jpeg';
                
                // Detectar PNG
                if (imagenBuffer[0] === 0x89 && 
                    imagenBuffer[1] === 0x50 && 
                    imagenBuffer[2] === 0x4E && 
                    imagenBuffer[3] === 0x47) {
                    mimeType = 'image/png';
                }

                libroProcessado.imagen = `data:${mimeType};base64,${imagenBase64}`;
            } else {
                libroProcessado.color_fondo = colores[Math.floor(Math.random() * colores.length)];
                libroProcessado.imagen = null;
            }

            return libroProcessado;
        });

        res.json({
            success: true,
            data: librosConImagenes
        });
    });
});
// GET /api/libros - Obtener todos los libros del catálogo
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            l.vchfolio, 
            l.vchtitulo, 
            l.vchautor, 
            l.vcheditorial, 
            l.intanio, 
            l.vchsinopsis, 
            l.intidcategoria, 
            l.boolactivo, 
            l.imagen,
            (SELECT COUNT(*) 
             FROM tblejemplares e 
             WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1
            ) as ejemplares_disponibles,
            (SELECT COUNT(*) 
             FROM tblejemplares e 
             WHERE e.vchfolio = l.vchfolio
            ) as total_ejemplares
        FROM tbllibros l 
        ORDER BY l.vchfolio DESC
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al obtener catálogo:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener el catálogo',
                detalles: error.message
            });
        }

        // Procesar imágenes
        const librosConImagenes = resultados.map(libro => {
            const libroProcessado = { ...libro };

            if (libro.imagen) {
                const imagenBase64 = Buffer.from(libro.imagen).toString('base64');
                const imagenBuffer = Buffer.from(libro.imagen);
                let mimeType = 'image/jpeg';
                
                // Detectar PNG
                if (imagenBuffer[0] === 0x89 && 
                    imagenBuffer[1] === 0x50 && 
                    imagenBuffer[2] === 0x4E && 
                    imagenBuffer[3] === 0x47) {
                    mimeType = 'image/png';
                }

                libroProcessado.imagen = `data:${mimeType};base64,${imagenBase64}`;
            } else {
                libroProcessado.imagen = null;
            }

            return libroProcessado;
        });

        res.json({
            success: true,
            data: librosConImagenes,
            total: librosConImagenes.length
        });
    });
});

// GET /api/libros/buscar - Buscar libros
router.get('/buscar', (req, res) => {
    const q = req.query.q;

    if (!q) {
        return res.status(400).json({
            success: false,
            error: 'Parámetro de búsqueda requerido'
        });
    }

    const sql = `
        SELECT 
            l.*,
            c.vchcategoria,
            (SELECT COUNT(*) FROM tblejemplares e 
             WHERE e.vchfolio = l.vchfolio 
             AND e.booldisponible = 1) as ejemplares_disponibles
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE l.vchtitulo LIKE ?
        OR l.vchautor LIKE ?
    `;
    
    conexion.query(sql, [`%${q}%`, `%${q}%`], (error, resultados) => {
        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'];

        const librosConImagenes = resultados.map(libro => {
            const libroProcessado = { ...libro };

            if (libro.imagen) {
                const imagenBase64 = Buffer.from(libro.imagen).toString('base64');
                const imagenBuffer = Buffer.from(libro.imagen);
                let mimeType = 'image/jpeg';
                
                if (imagenBuffer[0] === 0x89 && 
                    imagenBuffer[1] === 0x50 && 
                    imagenBuffer[2] === 0x4E && 
                    imagenBuffer[3] === 0x47) {
                    mimeType = 'image/png';
                }

                libroProcessado.imagen = `data:${mimeType};base64,${imagenBase64}`;
            } else {
                libroProcessado.color_fondo = colores[Math.floor(Math.random() * colores.length)];
            }

            return libroProcessado;
        });

        res.json({
            success: true,
            data: librosConImagenes
        });
    });
});
module.exports = router;