if (typeof window.verificarSesion === 'undefined') {
    window.verificarSesion = () => {
        const matricula = localStorage.getItem('usuario_matricula');
        const idRol = localStorage.getItem('usuario_idrol');

        if (!matricula || !idRol) {
            window.location.href = 'iniciarsesion.html';
            return null;
        }
        return matricula;
    };
}

// 2. LÓGICA DE LA PÁGINA (Funciones auxiliares)
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

// 3. OBTENCIÓN DE DATOS
const obtenerPrestamos = async (matricula) => {
    const API_URL = typeof getApiUrl === 'function' ? getApiUrl() : 'http://localhost:3000';
    const token = localStorage.getItem('token');

    const respuesta = await fetch(`${API_URL}/api/prestamos/misprestamos/${matricula}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!respuesta.ok) throw new Error(`Error API: ${respuesta.status}`);
    return await respuesta.json();
};

// 4. RENDERIZADO
const renderPrestamo = (prestamo) => {
    const estado = prestamo.estado ?? obtenerEstado(prestamo);
    const dias = calcularDiasRestantes(prestamo.fecha_devolucion);

    let diasTexto = dias > 0 ? `${dias} días restantes` : dias === 0 ? 'Vence hoy' : `${Math.abs(dias)} días de retraso`;
    let estadoHtml = prestamo.booldevuelto == 1 
        ? `<span>Devuelto el ${formatearFecha(prestamo.fechareal_devolucion)}</span>`
        : `<span class="dias-restantes ${dias >= 0 ? 'positivo' : 'negativo'}">${diasTexto}</span>`;

    return `
        <article class="prestamo-item ${estado}" data-estado="${estado}">
            <div class="prestamo-header">
                <span class="prestamo-ticket">${prestamo.vchticket || 'T-000'}</span>
                <span class="prestamo-estado estado-${estado}">${etiquetaEstado(estado)}</span>
            </div>
            <div class="prestamo-libro">
                <div class="libro-titulo">${prestamo.titulo_libro ?? 'Libro'}</div>
                <div class="libro-autor">Por: ${prestamo.autor_libro ?? 'Desconocido'}</div>
            </div>
            <div class="prestamo-fechas">
                <div class="fecha-item"><label>Préstamo</label><span>${formatearFecha(prestamo.fecha_prestamo)}</span></div>
                <div class="fecha-item"><label>Devolución</label><span>${formatearFecha(prestamo.fecha_devolucion)}</span></div>
                <div class="fecha-item"><label>Estado</label>${estadoHtml}</div>
            </div>
        </article>`;
};

// 5. INICIALIZACIÓN
const init = async () => {
    const usuario = await window.verificarSesion();

    const matricula = usuario ? usuario.matricula : null;
    
    const idRol = localStorage.getItem('usuario_idrol');

    if (!matricula) {
        console.error("No se encontró la matrícula en el objeto de sesión");
        return;
    }

    if (idRol && parseInt(idRol) !== 3) {
        window.location.href = 'index.html';
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
            
            if (parseFloat(p.flmontosancion) > 0 && p.boolsancion == 0) stats.sanciones++;
        });

        if(document.getElementById('stat-activos')) document.getElementById('stat-activos').textContent = stats.activos;
        if(document.getElementById('stat-devueltos')) document.getElementById('stat-devueltos').textContent = stats.devueltos;
        if(document.getElementById('stat-vencidos')) document.getElementById('stat-vencidos').textContent = stats.vencidos;
        if(document.getElementById('stat-sanciones')) document.getElementById('stat-sanciones').textContent = stats.sanciones;

        lista.innerHTML = prestamos.length 
            ? prestamos.map(renderPrestamo).join('') 
            : '<div class="sin-prestamos"><h3>No tienes préstamos registrados</h3></div>';

    } catch (e) {
        console.error("Error al cargar préstamos:", e);
        if(lista) lista.innerHTML = '<div class="error">No se pudieron cargar tus préstamos.</div>';
    }
};


document.addEventListener('DOMContentLoaded', init);