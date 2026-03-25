// mis_prestamos.js

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
        devuelto: 'Devuelto', vencido: 'Vencido',
        proximo: 'Por Vencer', activo: 'Activo'
    };
    return etiquetas[estado] ?? 'Activo';
};

const obtenerPrestamos = async (matricula) => {
    const API_URL = "https://api-biblioteca-uthh.vercel.app"; 
    const token = localStorage.getItem('token');

    if (!token) {
        throw new Error("No hay token de sesión disponible.");
    }

    const respuesta = await fetch(`${API_URL}/api/prestamos/misprestamos/${matricula}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    if (respuesta.status === 403) {
        throw new Error("No tienes permiso para ver estos préstamos (403).");
    }

    if (!respuesta.ok) {
        throw new Error(`Error API: ${respuesta.status}`);
    }

    return await respuesta.json();
};

const renderPrestamo = (prestamo) => {
    const estado = obtenerEstado(prestamo);
    const dias = calcularDiasRestantes(prestamo.fecha_devolucion);
    
    let infoDias = "";
    if (prestamo.booldevuelto == 1) {
        infoDias = `<span>Devuelto el ${formatearFecha(prestamo.fechareal_devolucion)}</span>`;
    } else {
        const clase = dias >= 0 ? 'positivo' : 'negativo';
        const texto = dias > 0 ? `${dias} días restantes` : dias === 0 ? 'Vence hoy' : `${Math.abs(dias)} días de retraso`;
        infoDias = `<span class="dias-restantes ${clase}">${texto}</span>`;
    }

    return `
        <article class="prestamo-item ${estado}" data-estado="${estado}">
            <div class="prestamo-header">
                <span class="prestamo-ticket">${prestamo.vchticket || 'S/N'}</span>
                <span class="prestamo-estado estado-${estado}">${etiquetaEstado(estado)}</span>
            </div>
            <div class="prestamo-libro">
                <div class="libro-titulo">${prestamo.titulo_libro || 'Sin título'}</div>
                <div class="libro-autor">Por: ${prestamo.autor_libro || 'Desconocido'}</div>
            </div>
            <div class="prestamo-fechas">
                <div class="fecha-item"><label>Préstamo</label><span>${formatearFecha(prestamo.fecha_prestamo)}</span></div>
                <div class="fecha-item"><label>Devolución</label><span>${formatearFecha(prestamo.fecha_devolucion)}</span></div>
                <div class="fecha-item"><label>Estado</label>${infoDias}</div>
            </div>
        </article>`;
};

const init = async () => {
    // Intentamos obtener la matrícula del objeto 'usuario' en localStorage
    const usuarioStored = localStorage.getItem('usuario');
    let matricula = null;

    if (usuarioStored) {
        try {
            const userObj = JSON.parse(usuarioStored);
            matricula = userObj.matricula || userObj.id;
        } catch (e) {
            console.error("Error al parsear el objeto usuario");
        }
    }

    // Si no funcionó, intentamos buscar la matrícula directa
    if (!matricula) {
        matricula = localStorage.getItem('usuario_matricula');
    }
    
    if (!matricula) {
        console.error("No se encontró matrícula en el almacenamiento.");
        return;
    }

    const lista = document.getElementById('lista-prestamos');
    try {
        const data = await obtenerPrestamos(matricula);
        const prestamos = Array.isArray(data) ? data : [];

        const stats = { activos: 0, devueltos: 0, vencidos: 0, sanciones: 0 };
        prestamos.forEach(p => {
            const e = obtenerEstado(p);
            if (e === 'devuelto') stats.devueltos++;
            else if (e === 'vencido') stats.vencidos++;
            else stats.activos++;
            
            if (parseFloat(p.flmontosancion) > 0 && parseInt(p.boolsancion) === 0) stats.sanciones++;
        });

        // Actualizar estadísticas en el HTML
        if(document.getElementById('stat-activos')) document.getElementById('stat-activos').textContent = stats.activos;
        if(document.getElementById('stat-devueltos')) document.getElementById('stat-devueltos').textContent = stats.devueltos;
        if(document.getElementById('stat-vencidos')) document.getElementById('stat-vencidos').textContent = stats.vencidos;
        if(document.getElementById('stat-sanciones')) document.getElementById('stat-sanciones').textContent = stats.sanciones;

        lista.innerHTML = prestamos.length 
            ? prestamos.map(renderPrestamo).join('') 
            : '<div class="sin-prestamos"><h3>No tienes préstamos registrados</h3></div>';

    } catch (e) {
        console.error("Error al cargar:", e);
        if(lista) lista.innerHTML = `<div class="error">${e.message}</div>`;
    }
};

document.addEventListener('DOMContentLoaded', init);