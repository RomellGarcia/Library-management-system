(() => {
    // 1. Utilidades de Formateo y Lógica de Negocio
    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return '---';
        const fecha = new Date(fechaStr + 'T00:00:00');
        return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const calcularDiasRestantes = (fechaDevolucion) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const devolucion = new Date(fechaDevolucion + 'T00:00:00');
        return Math.round((devolucion - hoy) / (1000 * 60 * 60 * 24));
    };

    const obtenerEstado = (prestamo) => {
        if (prestamo.booldevuelto == 1) return 'devuelto';
        const dias = calcularDiasRestantes(prestamo.fecha_devolucion);
        if (dias < 0) return 'vencido';
        if (dias <= 3) return 'proximo';
        return 'activo';
    };

    const etiquetaEstado = (estado) => {
        const etiquetas = {
            devuelto: 'Devuelto',
            vencido: 'Vencido',
            proximo: 'Por Vencer',
            activo: 'Activo'
        };
        return etiquetas[estado] ?? 'Activo';
    };

    // 2. Validación de Seguridad (Local a este archivo)
    const verificarSesionLocal = () => {
        const matricula = localStorage.getItem('usuario_matricula');
        const idRol = localStorage.getItem('usuario_idrol');

        if (!matricula || !idRol) {
            window.location.href = 'iniciarsesion.html';
            return null;
        }

        // Solo rol 3 (usuarios/lectores) pueden ver esta página
        if (parseInt(idRol) !== 3) {
            console.warn("Acceso denegado: Rol insuficiente");
            window.location.href = 'index.html';
            return null;
        }

        return matricula;
    };

    // 3. Comunicación con la API
    const obtenerPrestamos = async (matricula) => {
        // Asegúrate de que esta URL sea la de tu servidor backend
        const API_URL = typeof getApiUrl === 'function' ? getApiUrl() : 'http://localhost:3000';
        const token = localStorage.getItem('token');

        const respuesta = await fetch(`${API_URL}/api/prestamos/misprestamos/${matricula}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error(`Error al cargar préstamos: ${respuesta.status}`);
        }

        return await respuesta.json();
    };

    // 4. Lógica de Renderizado (UI)
    const calcularEstadisticas = (prestamos) => {
        let activos = 0, devueltos = 0, vencidos = 0;
        let sancionesPendientes = 0, montoTotal = 0;

        prestamos.forEach(p => {
            const estado = p.estado ?? obtenerEstado(p);

            if (estado === 'devuelto') {
                devueltos++;
                if (p.flmontosancion > 0 && p.boolsancion == 0) {
                    sancionesPendientes++;
                    montoTotal += parseFloat(p.flmontosancion);
                }
            } else if (estado === 'vencido') {
                vencidos++;
            } else {
                activos++;
            }
        });

        return { activos, devueltos, vencidos, sancionesPendientes, montoTotal };
    };

    const renderPrestamo = (prestamo) => {
        const estado = prestamo.estado ?? obtenerEstado(prestamo);
        const dias = calcularDiasRestantes(prestamo.fecha_devolucion);

        const estadoDiasHtml = (() => {
            if (prestamo.booldevuelto == 1 && prestamo.fechareal_devolucion) {
                return `<span>Devuelto el ${formatearFecha(prestamo.fechareal_devolucion)}</span>`;
            }
            const clase = dias >= 0 ? 'positivo' : 'negativo';
            let texto = (dias > 0) ? `${dias} días restantes` : (dias === 0) ? 'Vence hoy' : `${Math.abs(dias)} días de retraso`;
            return `<span class="dias-restantes ${clase}">${texto}</span>`;
        })();

        return `
            <article class="prestamo-item ${estado}" data-estado="${estado}">
                <div class="prestamo-header">
                    <span class="prestamo-ticket">${prestamo.vchticket || 'N/A'}</span>
                    <span class="prestamo-estado estado-${estado}">${etiquetaEstado(estado)}</span>
                </div>
                <div class="prestamo-libro">
                    <div class="libro-titulo">${prestamo.titulo_libro ?? 'Sin título'}</div>
                    <div class="libro-autor">Por: ${prestamo.autor_libro ?? 'Autor desconocido'}</div>
                </div>
                <div class="prestamo-fechas">
                    <div class="fecha-item"><label>Préstamo</label><span>${formatearFecha(prestamo.fecha_prestamo)}</span></div>
                    <div class="fecha-item"><label>Devolución</label><span>${formatearFecha(prestamo.fecha_devolucion)}</span></div>
                    <div class="fecha-item"><label>Estado</label>${estadoDiasHtml}</div>
                </div>
            </article>`;
    };

    const renderEstadisticas = ({ activos, devueltos, vencidos, sancionesPendientes, montoTotal }) => {
        if(document.getElementById('stat-activos')) document.getElementById('stat-activos').textContent = activos;
        if(document.getElementById('stat-devueltos')) document.getElementById('stat-devueltos').textContent = devueltos;
        if(document.getElementById('stat-vencidos')) document.getElementById('stat-vencidos').textContent = vencidos;
        if(document.getElementById('stat-sanciones')) document.getElementById('stat-sanciones').textContent = sancionesPendientes;
    };

    // 5. Inicialización
    const init = async () => {
        const matricula = verificarSesionLocal();
        if (!matricula) return;

        const lista = document.getElementById('lista-prestamos');
        if (!lista) return;

        try {
            const data = await obtenerPrestamos(matricula);
            const prestamos = Array.isArray(data) ? data : [];

            renderEstadisticas(calcularEstadisticas(prestamos));
            
            lista.innerHTML = prestamos.length 
                ? prestamos.map(renderPrestamo).join('') 
                : '<div class="sin-prestamos"><h3>No tienes préstamos registrados</h3></div>';

        } catch (error) {
            console.error("Error en init:", error);
            lista.innerHTML = `<div class="error">Error al conectar con el servidor.</div>`;
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();