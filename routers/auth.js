const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const conexion = require('../bd');

// Función helper para hashear con MD5 (como tu PHP)
function md5(texto) {
    return crypto.createHash('md5').update(texto).digest('hex');
}

// ============================================
// MIDDLEWARES DE AUTENTICACIÓN
// ============================================

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

// Middleware para verificar rol admin/empleado (ya lo tienes al final, lo movemos aquí)
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
// POST /api/auth/login - Iniciar sesión
router.post('/login', (req, res) => {
    const { matricula, password, recordar } = req.body;

    // Validaciones
    if (!matricula || !password) {
        return res.status(400).json({
            success: false,
            message: 'Matrícula y contraseña son requeridos'
        });
    }

    const matriculaNum = parseInt(matricula);
    if (isNaN(matriculaNum) || matriculaNum <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Matrícula inválida'
        });
    }

    // Buscar en todas las tablas con UNION ALL
    const sql = `
        SELECT 
            u.intmatricula, 
            u.vchnombre, 
            u.vchapaterno, 
            u.vchamaterno,
            u.vchcorreo, 
            u.vchpassword, 
            u.intidrol,
            'Usuario' as tipo_tabla
        FROM tblusuarios u
        WHERE u.intmatricula = ?
        
        UNION ALL
        
        SELECT 
            a.intmatricula, 
            a.vchnombre, 
            a.vchapaterno, 
            a.vchamaterno,
            a.vchcorreo, 
            a.vchpassword, 
            a.intidrol,
            'Administrador' as tipo_tabla
        FROM tbladministrador a
        WHERE a.intmatricula = ?
        
        UNION ALL
        
        SELECT 
            e.intmatricula, 
            e.vchnombre, 
            e.vchapaterno, 
            e.vchamaterno,
            e.vchcorreo, 
            e.vchpassword, 
            e.intidrol,
            'Empleado' as tipo_tabla
        FROM tblempleados e
        WHERE e.intmatricula = ?
    `;

    conexion.query(sql, [matriculaNum, matriculaNum, matriculaNum], (error, resultados) => {
        if (error) {
            console.error('Error al buscar usuario:', error);
            return res.status(500).json({
                success: false,
                message: 'Error de base de datos: ' + error.message
            });
        }

        // Verificar si existe el usuario
        if (resultados.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Perfil no encontrado'
            });
        }

        const usuario = resultados[0];

        // Verificar contraseña (usar MD5 como tu PHP)
        const passwordHash = md5(password);
        if (passwordHash !== usuario.vchpassword) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        // Obtener nombre del rol
        const sqlRol = "SELECT vchrol FROM tblroles WHERE intidrol = ?";
        conexion.query(sqlRol, [usuario.intidrol], (errorRol, resultadosRol) => {
            if (errorRol) {
                console.error('Error al obtener rol:', errorRol);
                return res.status(500).json({
                    success: false,
                    message: 'Error al obtener rol'
                });
            }

            const nombreRol = resultadosRol.length > 0 ? resultadosRol[0].vchrol.trim() : 'Sin Rol';
            const apellidos = `${usuario.vchapaterno || ''} ${usuario.vchamaterno || ''}`.trim();
            const nombreCompleto = `${usuario.vchnombre} ${apellidos}`.trim();

            // CREAR SESIÓN
            req.session.logueado = true;
            req.session.usuario = {
                id: usuario.intmatricula,
                matricula: usuario.intmatricula,
                nombre: usuario.vchnombre,
                apellido_paterno: usuario.vchapaterno || '',
                apellido_materno: usuario.vchamaterno || '',
                apellidos: apellidos,
                nombre_completo: nombreCompleto,
                correo: usuario.vchcorreo,
                idrol: usuario.intidrol,
                rol: nombreRol,
                tipo_tabla: usuario.tipo_tabla
            };

            // Si marcó "Recordarme", crear cookie de larga duración
            if (recordar) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 días
            }

            // Guardar sesión antes de responder
            req.session.save((err) => {
                if (err) {
                    console.error('Error al guardar sesión:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error al crear sesión'
                    });
                }

                res.json({
                    success: true,
                    message: 'Inicio de sesión exitoso',
                    usuario: {
                        id: usuario.intmatricula,
                        matricula: usuario.intmatricula,
                        nombre: usuario.vchnombre,
                        apellidos: apellidos,
                        nombre_completo: nombreCompleto,
                        correo: usuario.vchcorreo,
                        rol: nombreRol,
                        idrol: usuario.intidrol,
                        tipo_tabla: usuario.tipo_tabla
                    },
                    redirect: '/HTML/index.html'
                });
            });
        });
    });
});

// GET /api/auth/verificar - Verificar sesión activa
router.get('/verificar', (req, res) => {
    if (!req.session.logueado || !req.session.usuario) {
        return res.json({
            success: false,
            logged_in: false
        });
    }

    res.json({
        success: true,
        logged_in: true,
        usuario: req.session.usuario
    });
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al cerrar sesión'
            });
        }

        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Sesión cerrada correctamente',
            redirect: '/HTML/index.html'
        });
    });
});

// GET /api/auth/usuarios - Obtener todos los usuarios (estudiantes)
router.get('/usuarios', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const sql = `
        SELECT 
            u.intmatricula,
            u.vchnombre,
            u.vchapaterno,
            u.vchamaterno,
            u.vchcorreo,
            u.vchtelefono,
            u.vchcalle,
            u.vchcolonia,
            u.intidrol,
            'Usuario' as tipo_usuario,
            'tblusuarios' as tabla_origen
        FROM tblusuarios u
        ORDER BY u.vchnombre ASC
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al obtener usuarios:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener usuarios'
            });
        }

        res.json({
            success: true,
            data: resultados
        });
    });
});

// GET /api/auth/administradores - Obtener todos los administradores
router.get('/administradores', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const sql = `
        SELECT 
            a.intmatricula,
            a.vchnombre,
            a.vchapaterno,
            a.vchamaterno,
            a.vchcorreo,
            a.vchtelefono,
            a.vchcalle,
            a.vchcolonia,
            a.intidrol,
            'Administrador' as tipo_usuario,
            'tbladministrador' as tabla_origen
        FROM tbladministrador a
        ORDER BY a.vchnombre ASC
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al obtener administradores:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener administradores'
            });
        }

        res.json({
            success: true,
            data: resultados
        });
    });
});

// GET /api/auth/empleados - Obtener todos los empleados
router.get('/empleados', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const sql = `
        SELECT 
            e.intmatricula,
            e.vchnombre,
            e.vchapaterno,
            e.vchamaterno,
            e.vchcorreo,
            e.vchtelefono,
            e.vchcalle,
            e.vchcolonia,
            e.intidrol,
            'Empleado' as tipo_usuario,
            'tblempleados' as tabla_origen
        FROM tblempleados e
        ORDER BY e.vchnombre ASC
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al obtener empleados:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener empleados'
            });
        }

        res.json({
            success: true,
            data: resultados
        });
    });
});

// DELETE /api/auth/usuarios/:matricula - Eliminar usuario
router.delete('/usuarios/:matricula', verificarAutenticacion, verificarRolAdminEmpleado, (req, res) => {
    const { matricula } = req.params;
    const { tabla } = req.query;

    if (!tabla || !['tblusuarios', 'tbladministrador', 'tblempleados'].includes(tabla)) {
        return res.status(400).json({
            success: false,
            error: 'Tabla no válida'
        });
    }

    const sql = `DELETE FROM ${tabla} WHERE intmatricula = ?`;

    conexion.query(sql, [matricula], (error, resultado) => {
        if (error) {
            console.error('Error al eliminar usuario:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al eliminar usuario'
            });
        }

        if (resultado.affectedRows === 0) {
            return res.json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    });
});

// Middleware para verificar rol admin/empleado
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

module.exports = router;