const express = require('express');
const router = express.Router();
const conexion = require('../bd');

// Middleware para verificar autenticación
function verificarAutenticacion(req, res, next) {
    if (!req.session || !req.session.logueado || !req.session.usuario) {
        return res.status(401).json({
            success: false,
            error: 'No autenticado'
        });
    }
    next();
}

// Middleware para verificar rol (solo admin y empleado)
function verificarRolAdminEmpleado(req, res, next) {
    const idRol = req.session.usuario.idrol;
    if (idRol !== 1 && idRol !== 2) {
        return res.status(403).json({
            success: false,
            error: 'No tienes permisos para acceder a esta sección'
        });
    }
    next();
}

// GET /api/prestamos - Obtener todos los préstamos con filtros
router.get('/', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const { busqueda = '', filtro = 'todos' } = req.query;

    let sql = `
        SELECT 
            p.intidprestamo,
            p.vchticket,
            p.intmatricula_usuario,
            p.intmatricula_empleado,
            p.fecha_prestamo,
            p.fecha_devolucion,
            p.booldevuelto,
            p.vchobservaciones,
            p.intidejemplar,
            p.dtfecharegistro,
            CONCAT(u.vchnombre, ' ', u.vchapaterno, ' ', COALESCE(u.vchamaterno, '')) as nombre_usuario,
            u.vchcorreo as correo_usuario,
            u.vchtelefono as telefono_usuario,
            CONCAT(e.vchnombre, ' ', e.vchapaterno, ' ', COALESCE(e.vchamaterno, '')) as nombre_empleado,
            l.vchtitulo as titulo_libro,
            l.vchautor as autor_libro,
            l.vchfolio,
            ej.vchcodigobarras,
            ej.vchedicion,
            d.intiddevolucion,
            d.fechareal_devolucion,
            d.intmatricula_empleado as matricula_recibio,
            d.vchsancion,
            d.flmontosancion,
            d.boolsancion,
            d.intidestrega,
            COALESCE(
                CONCAT(emp.vchnombre, ' ', emp.vchapaterno, ' ', COALESCE(emp.vchamaterno, '')),
                CONCAT(adm.vchnombre, ' ', adm.vchapaterno, ' ', COALESCE(adm.vchamaterno, ''))
            ) as nombre_recibio,
            DATEDIFF(p.fecha_devolucion, CURDATE()) as dias_restantes,
            CASE 
                WHEN p.booldevuelto = 1 THEN 'devuelto'              
                WHEN p.booldevuelto = 0 AND CURDATE() > p.fecha_devolucion THEN 'vencido'    
                WHEN p.booldevuelto = 0 AND DATEDIFF(p.fecha_devolucion, CURDATE()) <= 3 THEN 'proximo' 
                WHEN p.booldevuelto = 0 THEN 'activo'         
                ELSE 'activo'
            END as estado
        FROM tblprestamos p
        LEFT JOIN tblusuarios u ON p.intmatricula_usuario = u.intmatricula
        LEFT JOIN tblusuarios e ON p.intmatricula_empleado = e.intmatricula
        LEFT JOIN tblejemplares ej ON p.intidejemplar = ej.intidejemplar
        LEFT JOIN tbllibros l ON ej.vchfolio = l.vchfolio
        LEFT JOIN tbldevolucion d ON p.intidprestamo = d.intidprestamo
        LEFT JOIN tblempleados emp ON d.intmatricula_empleado = emp.intmatricula
        LEFT JOIN tbladministrador adm ON d.intmatricula_empleado = adm.intmatricula
        WHERE 1=1
    `;

    const params = [];

    // Aplicar filtro de estado
    if (filtro === 'activos') {
        sql += " AND p.booldevuelto = 0 AND CURDATE() <= p.fecha_devolucion";
    } else if (filtro === 'devueltos') {
        sql += " AND p.booldevuelto = 1";
    } else if (filtro === 'vencidos') {
        sql += " AND p.booldevuelto = 0 AND CURDATE() > p.fecha_devolucion";
    } else if (filtro === 'proximos') {
        sql += " AND p.booldevuelto = 0 AND DATEDIFF(p.fecha_devolucion, CURDATE()) BETWEEN 0 AND 3";
    } else if (filtro === 'con_sancion') {
        sql += " AND d.flmontosancion > 0 AND d.boolsancion = 0";
    }

    // Aplicar búsqueda
    if (busqueda.trim()) {
        sql += ` AND (
            p.vchticket LIKE ? OR
            p.intmatricula_usuario LIKE ? OR
            u.vchnombre LIKE ? OR
            u.vchapaterno LIKE ? OR
            u.vchamaterno LIKE ? OR
            l.vchtitulo LIKE ? OR
            l.vchautor LIKE ? OR
            ej.vchcodigobarras LIKE ?
        )`;
        const busquedaParam = `%${busqueda}%`;
        params.push(busquedaParam, busquedaParam, busquedaParam, busquedaParam, 
                   busquedaParam, busquedaParam, busquedaParam, busquedaParam);
    }

    sql += " ORDER BY p.fecha_prestamo DESC";

    conexion.query(sql, params, (error, resultados) => {
        if (error) {
            console.error('Error al obtener préstamos:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        // Calcular estadísticas
        const estadisticas = {
            total: resultados.length,
            activos: 0,
            devueltos: 0,
            vencidos: 0,
            proximos: 0,
            con_sancion_pendiente: 0
        };

        resultados.forEach(prestamo => {
            if (prestamo.estado === 'devuelto') {
                estadisticas.devueltos++;
                if (prestamo.flmontosancion > 0 && prestamo.boolsancion == 0) {
                    estadisticas.con_sancion_pendiente++;
                }
            } else if (prestamo.estado === 'vencido') {
                estadisticas.vencidos++;
            } else if (prestamo.estado === 'proximo') {
                estadisticas.proximos++;
            } else {
                estadisticas.activos++;
            }
        });

        res.json({
            success: true,
            data: {
                prestamos: resultados,
                estadisticas
            }
        });
    });
});


// GET /api/prestamos/buscar-ejemplares - Buscar ejemplares disponibles
router.get('/buscar-ejemplares', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const { termino = '' } = req.query;

    if (termino.length < 1) {
        return res.json({ success: true, libros: [], total: 0 });
    }

    const terminoBusqueda = `%${termino}%`;

    const sql = `
        SELECT 
            e.intidejemplar,
            e.vchcodigobarras,
            e.vchedicion,
            e.vchfolio,
            e.booldisponible,
            e.intidestado,
            l.vchtitulo,
            l.vchautor,
            l.vcheditorial,
            l.vchisbn,
            l.imagen,
            l.intanio,
            c.vchcategoria,
            u.vchubicacion,
            u.vchdescripcion AS descripcion_ubicacion,
            es.vchestadolibro,
            (SELECT COUNT(*) FROM tblejemplares 
             WHERE vchfolio = l.vchfolio AND booldisponible = 1) as ejemplares_disponibles
        FROM tblejemplares e
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        LEFT JOIN tblubicacion u ON e.intidubicacion = u.intidubicacion
        LEFT JOIN tblestado es ON e.intidestado = es.intidestado
        WHERE e.booldisponible = 1
        AND (
            l.vchtitulo LIKE ? OR
            l.vchautor LIKE ? OR
            l.vchisbn LIKE ? OR
            l.vcheditorial LIKE ? OR
            e.vchcodigobarras LIKE ? OR
            e.vchfolio LIKE ? OR
            c.vchcategoria LIKE ?
        )
        ORDER BY l.vchtitulo ASC
        LIMIT 50
    `;

    conexion.query(sql, [terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda, 
                         terminoBusqueda, terminoBusqueda, terminoBusqueda], 
    (error, ejemplares) => {
        if (error) {
            console.error('Error al buscar ejemplares:', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al buscar ejemplares'
            });
        }

        // Agrupar por libro
        const librosAgrupados = {};

        ejemplares.forEach(ejemplar => {
            const folio = ejemplar.vchfolio;

            let imagenBase64 = null;
            if (ejemplar.imagen) {
                const imagenBuffer = Buffer.from(ejemplar.imagen);
                imagenBase64 = `data:image/webp;base64,${imagenBuffer.toString('base64')}`;
            }

            if (!librosAgrupados[folio]) {
                librosAgrupados[folio] = {
                    vchfolio: folio,
                    vchtitulo: ejemplar.vchtitulo,
                    vchautor: ejemplar.vchautor,
                    vcheditorial: ejemplar.vcheditorial,
                    vchisbn: ejemplar.vchisbn,
                    intanio: ejemplar.intanio,
                    imagen: imagenBase64,
                    vchcategoria: ejemplar.vchcategoria,
                    ejemplares_disponibles: ejemplar.ejemplares_disponibles,
                    ejemplares: []
                };
            }

            librosAgrupados[folio].ejemplares.push({
                intidejemplar: ejemplar.intidejemplar,
                vchcodigobarras: ejemplar.vchcodigobarras,
                vchedicion: ejemplar.vchedicion,
                vchubicacion: ejemplar.vchubicacion,
                descripcion_ubicacion: ejemplar.descripcion_ubicacion,
                vchestadolibro: ejemplar.vchestadolibro
            });
        });

        res.json({
            success: true,
            libros: Object.values(librosAgrupados),
            total: Object.keys(librosAgrupados).length
        });
    });
});

// GET /api/prestamos/buscar-usuario - Buscar usuario por matrícula
router.get('/buscar-usuario', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const { matricula } = req.query;

    if (!matricula) {
        return res.status(400).json({
            success: false,
            mensaje: 'Matrícula requerida'
        });
    }

    const sql = `
        SELECT 
            u.intmatricula,
            u.vchnombre,
            u.vchapaterno,
            u.vchamaterno,
            u.vchcorreo,
            u.vchtelefono,
            r.vchrol
        FROM tblusuarios u
        LEFT JOIN tblroles r ON u.intidrol = r.intidrol
        WHERE u.intmatricula = ?
    `;

    conexion.query(sql, [matricula], (error, resultados) => {
        if (error) {
            console.error('Error al buscar usuario:', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al buscar usuario'
            });
        }

        if (resultados.length === 0) {
            return res.json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        const usuario = resultados[0];

        // Verificar préstamos pendientes
        const sqlPrestamos = `
            SELECT COUNT(*) as pendientes 
            FROM tblprestamos 
            WHERE intmatricula_usuario = ? 
            AND booldevuelto = 0
        `;

        conexion.query(sqlPrestamos, [matricula], (errorP, prestamos) => {
            if (errorP) {
                console.error('Error al contar préstamos:', errorP);
            }

            usuario.prestamos_pendientes = prestamos && prestamos[0] ? prestamos[0].pendientes : 0;

            res.json({
                success: true,
                usuario
            });
        });
    });
});

// GET /api/prestamos/generar-ticket - Generar ticket único
router.get('/generar-ticket', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const anio = new Date().getFullYear();
    const patron = `TK-${anio}-%`;

    const sql = `
        SELECT vchticket FROM tblprestamos 
        WHERE vchticket LIKE ? 
        ORDER BY intidprestamo DESC LIMIT 1
    `;

    conexion.query(sql, [patron], (error, resultados) => {
        if (error) {
            console.error('Error al generar ticket:', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al generar ticket'
            });
        }

        let numero = 1;

        if (resultados.length > 0) {
            const ultimo = resultados[0].vchticket;
            const partes = ultimo.split('-');
            numero = parseInt(partes[partes.length - 1]) + 1;
        }

        const ticket = `TK-${anio}-${String(numero).padStart(3, '0')}`;

        res.json({
            success: true,
            ticket
        });
    });
});

// POST /api/prestamos/registrar - Registrar nuevo préstamo
router.post('/registrar', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const matriculaEmpleado = req.session.usuario.matricula;
    const idRol = req.session.usuario.idrol;

    const { vchticket, intmatriculausuario, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones } = req.body;

    // Validar campos requeridos
    if (!vchticket || !intmatriculausuario || !fechaprestamo || !fechadevolucion || !intidejemplar) {
        return res.status(400).json({
            success: false,
            mensaje: 'Faltan campos requeridos'
        });
    }

    // Iniciar transacción
    conexion.beginTransaction(error => {
        if (error) {
            console.error('Error al iniciar transacción:', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al iniciar transacción'
            });
        }

        // Verificar que el usuario existe
        const sqlUsuario = "SELECT intmatricula FROM tblusuarios WHERE intmatricula = ?";
        
        conexion.query(sqlUsuario, [intmatriculausuario], (errorU, usuarioResult) => {
            if (errorU || usuarioResult.length === 0) {
                return conexion.rollback(() => {
                    res.json({
                        success: false,
                        mensaje: `El usuario con matrícula ${intmatriculausuario} no existe`
                    });
                });
            }

            // Verificar que el empleado existe en la tabla correcta
            let sqlEmpleado;
            if (idRol === 1) {
                sqlEmpleado = "SELECT intmatricula FROM tbladministrador WHERE intmatricula = ?";
            } else {
                sqlEmpleado = "SELECT intmatricula FROM tblempleados WHERE intmatricula = ?";
            }

            conexion.query(sqlEmpleado, [matriculaEmpleado], (errorE, empleadoResult) => {
                if (errorE || empleadoResult.length === 0) {
                    return conexion.rollback(() => {
                        const tipoUsuario = idRol === 1 ? 'administrador' : 'empleado';
                        res.json({
                            success: false,
                            mensaje: `La matrícula ${matriculaEmpleado} no existe en la tabla de ${tipoUsuario}s`
                        });
                    });
                }

                // Verificar disponibilidad del ejemplar
                const sqlVerificar = "SELECT booldisponible FROM tblejemplares WHERE intidejemplar = ?";
                
                conexion.query(sqlVerificar, [intidejemplar], (errorV, ejemplarResult) => {
                    if (errorV || ejemplarResult.length === 0 || ejemplarResult[0].booldisponible != 1) {
                        return conexion.rollback(() => {
                            res.json({
                                success: false,
                                mensaje: 'El ejemplar ya no está disponible'
                            });
                        });
                    }

                    // Insertar préstamo
                    const sqlPrestamo = `
                        INSERT INTO tblprestamos 
                        (vchticket, intmatricula_usuario, intmatricula_empleado, 
                         fecha_prestamo, fecha_devolucion, booldevuelto, intidejemplar, vchobservaciones)
                        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                    `;

                    conexion.query(sqlPrestamo, 
                        [vchticket, intmatriculausuario, matriculaEmpleado, fechaprestamo, 
                         fechadevolucion, intidejemplar, vchobservaciones || null],
                    (errorP, resultadoP) => {
                        if (errorP) {
                            return conexion.rollback(() => {
                                console.error('Error al insertar préstamo:', errorP);
                                res.status(500).json({
                                    success: false,
                                    mensaje: 'Error al registrar préstamo'
                                });
                            });
                        }

                        // Actualizar disponibilidad
                        const sqlActualizar = "UPDATE tblejemplares SET booldisponible = 0 WHERE intidejemplar = ?";
                        
                        conexion.query(sqlActualizar, [intidejemplar], (errorA) => {
                            if (errorA) {
                                return conexion.rollback(() => {
                                    console.error('Error al actualizar ejemplar:', errorA);
                                    res.status(500).json({
                                        success: false,
                                        mensaje: 'Error al actualizar disponibilidad'
                                    });
                                });
                            }

                            // Commit
                            conexion.commit(errorC => {
                                if (errorC) {
                                    return conexion.rollback(() => {
                                        console.error('Error al hacer commit:', errorC);
                                        res.status(500).json({
                                            success: false,
                                            mensaje: 'Error al confirmar transacción'
                                        });
                                    });
                                }

                                res.json({
                                    success: true,
                                    mensaje: 'Préstamo registrado exitosamente',
                                    idprestamo: resultadoP.insertId,
                                    ticket: vchticket,
                                    matricula_empleado: matriculaEmpleado
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});


// POST /api/prestamos/sancion - Marcar sanción como cumplida
router.post('/sancion', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const { intiddevolucion } = req.body;

    if (!intiddevolucion) {
        return res.status(400).json({
            success: false,
            error: 'ID de devolución requerido'
        });
    }

    const sql = "UPDATE tbldevolucion SET boolsancion = 1 WHERE intiddevolucion = ?";

    conexion.query(sql, [intiddevolucion], (error, resultado) => {
        if (error) {
            console.error('Error al actualizar sanción:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Devolución no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Sanción marcada como pagada correctamente'
        });
    });
});

module.exports = router;