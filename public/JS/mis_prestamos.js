const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '---';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return '---';
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const calcularDiasRestantes = (fechaDevolucion) => {
    if (!fechaDevolucion) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const devolucion = new Date(fechaDevolucion);
    if (isNaN(devolucion.getTime())) return 0;
    return Math.round((devolucion - hoy) / (1000 * 60 * 60 * 24));
};

const obtenerEstado = (prestamo) => {
    if (prestamo.booldevuelto == 1) return 'devuelto';
    const fechaFin = prestamo.fecha_devolucion || prestamo.fechadevolucion;
    const dias = calcularDiasRestantes(fechaFin);
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
        throw new Error("No tienes permiso para ver estos préstamos.");
    }

    if (!respuesta.ok) {
        throw new Error(`Error API: ${respuesta.status}`);
    }

    return await respuesta.json();
};

// ============================================================
// PAGO DE SANCIONES CON STRIPE
// ============================================================
window.pagarSancionAlm = async (ticket, monto) => {
    // Confirmar antes de redirigir
    const confirmar = confirm(
        `Vas a pagar $${monto.toFixed(2)} MXN por la sancion del ticket ${ticket}.\n\n` +
        `Seras redirigido al sitio seguro de Stripe para completar el pago.\n\n` +
        `Continuar?`
    );

    if (!confirmar) return;

    // Mostrar indicador de carga
    const botones = document.querySelectorAll('.btn-pagar');
    botones.forEach(btn => {
        btn.disabled = true;
        btn.textContent = 'Procesando...';
    });

    try {
        const respuesta = await fetchConToken('/api/pagos/crear-sesion', {
            method: 'POST',
            body: JSON.stringify({ vchticket: ticket })
        });

        const data = await respuesta.json();

        if (!data.success) {
            throw new Error(data.message || 'Error al crear la sesion de pago');
        }

        // Redirigir al checkout de Stripe
        window.location.href = data.url;

    } catch (error) {
        console.error('Error al iniciar pago:', error);
        alert('No se pudo iniciar el pago: ' + error.message);

        // Restaurar botones
        botones.forEach(btn => {
            btn.disabled = false;
            btn.textContent = 'Pagar Sancion';
        });
    }
};

const renderPrestamo = (prestamo) => {
    const estado = obtenerEstado(prestamo);
    const fPrestamo = prestamo.fecha_prestamo || prestamo.fechaprestamo;
    const fDevolucion = prestamo.fecha_devolucion || prestamo.fechadevolucion;
    const fReal = prestamo.fechareal_devolucion || prestamo.fechareal;

    const dias = calcularDiasRestantes(fDevolucion);

    let infoDias = "";
    if (prestamo.booldevuelto == 1) {
        infoDias = `<span>Devuelto el ${formatearFecha(fReal)}</span>`;
    } else {
        const clase = dias >= 0 ? 'positivo' : 'negativo';
        const texto = dias > 0 ? `${dias} días restantes` : dias === 0 ? 'Vence hoy' : `${Math.abs(dias)} días de retraso`;
        infoDias = `<span class="dias-restantes ${clase}">${texto}</span>`;
    }

    const monto = parseFloat(prestamo.flmontosancion || 0);
    const pagado = parseInt(prestamo.boolsancion || 0);
    let btnSancion = "";

    if (monto > 0 && pagado === 0) {
        btnSancion = `
            <div class="sancion-container" style="margin-top:10px; border-top:1px dashed #ccc; padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <span class="monto-deuda" style="color:#e74c3c; font-weight:bold;">Sanción: $${monto.toFixed(2)}</span>
                <button class="btn-pagar"
                        style="background:#e74c3c; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;"
                        onclick="pagarSancionAlm('${prestamo.vchticket}', ${monto})">
                    Pagar Sancion
                </button>
            </div>`;
    } else if (monto > 0 && pagado === 1) {
        btnSancion = `
            <div class="sancion-container" style="margin-top:10px; border-top:1px dashed #ccc; padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <span class="monto-deuda" style="color:#2E7D32; font-weight:bold;">Sanción pagada: $${monto.toFixed(2)}</span>
                <span style="background:#2E7D32; color:white; padding:6px 12px; border-radius:4px; font-size:0.85rem;">PAGADO</span>
            </div>`;
    }

    return `
        <article class="prestamo-item ${estado}" data-estado="${estado}">
            <div class="prestamo-header">
                <span class="prestamo-ticket">${prestamo.vchticket || 'S/N'}</span>
                <span class="prestamo-estado estado-${estado}">${etiquetaEstado(estado)}</span>
            </div>
            <div class="prestamo-libro">
                <div class="libro-titulo">${prestamo.titulo_libro || prestamo.vchtitulo || 'Sin título'}</div>
                <div class="libro-autor">Por: ${prestamo.autor_libro || prestamo.vchautor || 'Desconocido'}</div>
            </div>
            <div class="prestamo-fechas">
                <div class="fecha-item"><label>Préstamo</label><span>${formatearFecha(fPrestamo)}</span></div>
                <div class="fecha-item"><label>Devolución</label><span>${formatearFecha(fDevolucion)}</span></div>
                <div class="fecha-item"><label>Estado</label>${infoDias}</div>
            </div>
            ${btnSancion}
        </article>`;
};

// Variable global para mantener los datos en memoria
let todosLosPrestamos = [];

const filtrarYRenderizar = () => {
    const filtro = document.getElementById('filtro-estado').value;
    const lista = document.getElementById('lista-prestamos');

    const prestamosFiltrados = todosLosPrestamos.filter(p => {
        if (filtro === 'todos') return true;
        const estadoActual = obtenerEstado(p);
        return estadoActual === filtro;
    });

    if (prestamosFiltrados.length === 0) {
        lista.innerHTML = `<div class="sin-prestamos"><h3>No hay préstamos con el estado: ${filtro}</h3></div>`;
    } else {
        lista.innerHTML = prestamosFiltrados.map(renderPrestamo).join('');
    }
};

// Mostrar mensaje si el usuario regresa de un pago cancelado
const verificarRetornoDePago = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pago') === 'cancelado') {
        const div = document.createElement('div');
        div.style.cssText = 'background:#FFF3E0;border:1px solid #E65100;color:#E65100;padding:14px 20px;border-radius:10px;margin-bottom:20px;font-weight:600;';
        div.textContent = 'El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.';
        const main = document.querySelector('main');
        if (main) main.insertBefore(div, main.firstChild);

        // Limpiar la URL
        window.history.replaceState({}, '', window.location.pathname);
    }
};

const init = async () => {
    verificarRetornoDePago();

    const usuarioStored = localStorage.getItem('usuario');
    let matricula = null;

    if (usuarioStored) {
        try {
            const userObj = JSON.parse(usuarioStored);
            matricula = userObj.matricula || userObj.id;
        } catch (e) { console.error("Error al parsear el objeto usuario"); }
    }

    if (!matricula) {
        matricula = localStorage.getItem('usuario_matricula');
    }

    if (!matricula) return;

    const lista = document.getElementById('lista-prestamos');
    const selectFiltro = document.getElementById('filtro-estado');

    try {
        const data = await obtenerPrestamos(matricula);
        todosLosPrestamos = Array.isArray(data) ? data : [];

        if (selectFiltro) {
            selectFiltro.addEventListener('change', filtrarYRenderizar);
        }

        filtrarYRenderizar();

        const stats = { activos: 0, devueltos: 0, vencidos: 0, sanciones: 0 };
        todosLosPrestamos.forEach(p => {
            const e = obtenerEstado(p);
            if (e === 'devuelto') stats.devueltos++;
            else if (e === 'vencido') stats.vencidos++;
            else stats.activos++;

            if (parseFloat(p.flmontosancion) > 0 && parseInt(p.boolsancion) === 0) stats.sanciones++;
        });

        if(document.getElementById('stat-activos')) document.getElementById('stat-activos').textContent = stats.activos;
        if(document.getElementById('stat-devueltos')) document.getElementById('stat-devueltos').textContent = stats.devueltos;
        if(document.getElementById('stat-vencidos')) document.getElementById('stat-vencidos').textContent = stats.vencidos;
        if(document.getElementById('stat-sanciones')) document.getElementById('stat-sanciones').textContent = stats.sanciones;

    } catch (e) {
        console.error("Error al cargar:", e);
        if(lista) lista.innerHTML = `<div class="error">${e.message}</div>`;
    }
};

document.addEventListener('DOMContentLoaded', init);