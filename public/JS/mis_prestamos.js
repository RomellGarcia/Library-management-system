const formatearFecha = (fechaStr) => {
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


const verificarSesion = () => {
    const matricula = localStorage.getItem('usuario_matricula');
    const idRol = localStorage.getItem('usuario_idrol');

    if (!matricula || !idRol) {
        window.location.href = 'iniciarsesion.html';
        return null;
    }

    // Solo rol 3 (usuarios/lectores) pueden ver esta página
    if (parseInt(idRol) !== 3) {
        window.location.href = 'index.html';
        return null;
    }

    return matricula;
};


const obtenerPrestamos = async (matricula) => {
    const API_URL = typeof getApiUrl === 'function' ? getApiUrl() : '';
    const token = localStorage.getItem('token');

    const respuesta = await fetch(`${API_URL}/api/misprestamos/${matricula}`, {
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
        let texto = '';
        if (dias > 0) texto = `${dias} días restantes`;
        else if (dias === 0) texto = 'Vence hoy';
        else texto = `${Math.abs(dias)} días de retraso`;

        return `<span class="dias-restantes ${clase}">${texto}</span>`;
    })();

    const codigoHtml = prestamo.vchcodigobarras
        ? `<div class="libro-codigo">Código: ${prestamo.vchcodigobarras}</div>`
        : '';

    const sancionHtml = prestamo.flmontosancion > 0 ? (() => {
        const estadoSancion = prestamo.boolsancion == 1 ? 'pagada' : 'pendiente';
        const textoSancion = prestamo.boolsancion == 1 ? 'Pagada' : 'Pendiente de pago';
        const motivoHtml = prestamo.vchsancion
            ? `<div class="motivo-sancion">${prestamo.vchsancion}</div>`
            : '';
        return `
            <div class="sancion-info">
                <span class="monto">Sanción: $${parseFloat(prestamo.flmontosancion).toFixed(2)}</span>
                <div class="estado-sancion ${estadoSancion}">${textoSancion}</div>
                ${motivoHtml}
            </div>`;
    })() : '';

    return `
        <article class="prestamo-item ${estado}" data-estado="${estado}">
            <div class="prestamo-header">
                <span class="prestamo-ticket">${prestamo.vchticket}</span>
                <span class="prestamo-estado estado-${estado}">${etiquetaEstado(estado)}</span>
            </div>

            <div class="prestamo-libro">
                <div class="libro-titulo">${prestamo.titulo_libro ?? 'Sin título'}</div>
                <div class="libro-autor">Por: ${prestamo.autor_libro ?? 'Autor desconocido'}</div>
                ${codigoHtml}
            </div>

            <div class="prestamo-fechas">
                <div class="fecha-item">
                    <label>Fecha Préstamo</label>
                    <span>${formatearFecha(prestamo.fecha_prestamo)}</span>
                </div>
                <div class="fecha-item">
                    <label>Fecha Devolución</label>
                    <span>${formatearFecha(prestamo.fecha_devolucion)}</span>
                </div>
                <div class="fecha-item">
                    <label>Estado</label>
                    ${estadoDiasHtml}
                </div>
            </div>

            ${sancionHtml}
        </article>`;
};

const renderLista = (prestamos) => {
    const lista = document.getElementById('lista-prestamos');

    if (!prestamos.length) {
        lista.innerHTML = `
            <div class="sin-prestamos">
                <h3>No tienes préstamos registrados</h3>
                <p>Cuando solicites un libro en préstamo, aparecerá aquí.</p>
            </div>`;
        return;
    }

    lista.innerHTML = prestamos.map(renderPrestamo).join('');
};

const renderEstadisticas = ({ activos, devueltos, vencidos, sancionesPendientes, montoTotal }) => {
    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-devueltos').textContent = devueltos;
    document.getElementById('stat-vencidos').textContent = vencidos;
    document.getElementById('stat-sanciones').textContent = sancionesPendientes;

    if (montoTotal > 0) {
        const alerta = document.getElementById('alerta-sancion');
        alerta.innerHTML = `
            <strong>Tienes sanciones pendientes</strong>
            Monto total a pagar: <strong>$${montoTotal.toFixed(2)}</strong><br>
            Por favor, acude a biblioteca para regularizar tu situación.`;
        alerta.style.display = 'block';
    }
};


const iniciarFiltros = () => {
    const select = document.getElementById('filtro-estado');

    select.addEventListener('change', function () {
        const filtro = this.value;
        const items = document.querySelectorAll('.prestamo-item');

        items.forEach(item => {
            const estado = item.dataset.estado;
            const visible = filtro === 'todos'
                || estado === filtro
                || (filtro === 'activo' && estado === 'proximo');

            item.style.display = visible ? 'block' : 'none';
        });
    });
};

const init = async () => {
    const matricula = verificarSesion();
    if (!matricula) return;

    try {
        const prestamos = await obtenerPrestamos(matricula);
        const stats = calcularEstadisticas(prestamos);

        renderEstadisticas(stats);
        renderLista(prestamos);
        iniciarFiltros();

    } catch (error) {
        console.error(error);
        const mensajeError = document.getElementById('mensaje-error');
        mensajeError.textContent = `Error al cargar préstamos: ${error.message}`;
        mensajeError.style.display = 'block';

        document.getElementById('lista-prestamos').innerHTML = `
            <div class="sin-prestamos">
                <h3>No se pudieron cargar los préstamos</h3>
                <p>Intenta recargar la página.</p>
            </div>`;
    }
};

document.addEventListener('DOMContentLoaded', init);