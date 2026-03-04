const express = require('express');
const router = express.Router();
const conexion = require('../bd');

// Middleware para verificar autenticación (debes tenerlo en un archivo separado)
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