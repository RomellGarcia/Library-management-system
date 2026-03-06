// gestionar_prestamos.js - Gestión de préstamos de la biblioteca

let prestamosOriginales = [];
let estadisticasActuales = {};

document.addEventListener('DOMContentLoaded', function() {
    cargarPrestamos();
    configurarEventos();
});

// Configurar eventos de búsqueda y filtro
function configurarEventos() {
    const inputBusqueda = document.getElementById('busqueda');
    const selectFiltro = document.getElementById('filtro');

    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', filtrarPrestamosLocal);
    }

    if (selectFiltro) {
        selectFiltro.addEventListener('change', function() {
            // Recargar desde el servidor con el nuevo filtro
            cargarPrestamos(this.value);
        });
    }
}

// Cargar préstamos desde el servidor
async function cargarPrestamos(filtro = 'todos', busqueda = '') {
    try {
        const url = `${window.location.origin}/api/prestamos?filtro=${filtro}&busqueda=${encodeURIComponent(busqueda)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/HTML/iniciarsesion.html';
                return;
            }
            throw new Error('Error al cargar préstamos');
        }

        const data = await response.json();

        if (data.success) {
            prestamosOriginales = data.data.prestamos;
            estadisticasActuales = data.data.estadisticas;
            
            mostrarEstadisticas(estadisticasActuales);
            mostrarPrestamos(prestamosOriginales);
        } else {
            mostrarError(data.error || 'Error al cargar préstamos');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al cargar préstamos');
    }
}

// Mostrar estadísticas
function mostrarEstadisticas(stats) {
    const container = document.getElementById('estadisticas-prestamos');
    
    container.innerHTML = `
        <article class="tarjeta-estadistica activos">
            <h3>${stats.activos}</h3>
            <p>Préstamos Activos</p>
        </article>
        <article class="tarjeta-estadistica devueltos">
            <h3>${stats.devueltos}</h3>
            <p>Libros Devueltos</p>
        </article>
        <article class="tarjeta-estadistica vencidos">
            <h3>${stats.vencidos}</h3>
            <p>Préstamos Vencidos</p>
        </article>
        <article class="tarjeta-estadistica proximos">
            <h3>${stats.proximos}</h3>
            <p>Próximos a Vencer</p>
        </article>
        <article class="tarjeta-estadistica sanciones">
            <h3>${stats.con_sancion_pendiente}</h3>
            <p>Sanciones Pendientes</p>
        </article>
    `;
}

// Mostrar tabla de préstamos
function mostrarPrestamos(prestamos) {
    const container = document.getElementById('tabla-container');
    const contador = document.getElementById('contador-resultados');
    const noResultados = document.getElementById('no-resultados');

    if (prestamos.length === 0) {
        container.innerHTML = '';
        noResultados.style.display = 'block';
        contador.textContent = '0 resultado(s)';
        return;
    }

    noResultados.style.display = 'none';
    contador.textContent = `${prestamos.length} resultado(s)`;

    const tabla = document.createElement('table');
    tabla.className = 'tabla-usuarios';
    tabla.id = 'tabla-prestamos';

    // Crear thead
    tabla.innerHTML = `
        <thead>
            <tr>
                <th>Ticket</th>
                <th>Usuario</th>
                <th>Libro</th>
                <th>Fecha Préstamo</th>
                <th>Fecha Devolución</th>
                <th>Días</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody id="tbody-prestamos"></tbody>
    `;

    container.innerHTML = '';
    container.appendChild(tabla);

    const tbody = document.getElementById('tbody-prestamos');
    
    prestamos.forEach(prestamo => {
        const fila = crearFilaPrestamo(prestamo);
        tbody.appendChild(fila);
    });
}

// Crear fila de préstamo
function crearFilaPrestamo(prestamo) {
    const tr = document.createElement('tr');
    tr.className = `fila-${prestamo.estado}`;
    tr.dataset.ticket = prestamo.vchticket || '';
    tr.dataset.usuario = prestamo.nombre_usuario || '';
    tr.dataset.matricula = prestamo.intmatricula_usuario || '';
    tr.dataset.libro = prestamo.titulo_libro || '';
    tr.dataset.estado = prestamo.estado;

    // Columna Ticket
    const tdTicket = document.createElement('td');
    tdTicket.innerHTML = `
        <strong>${escapeHtml(prestamo.vchticket || 'Sin ticket')}</strong>
        ${prestamo.dtfecharegistro ? `
            <div class="detalle-prestamo">
                Registrado: ${formatearFechaHora(prestamo.dtfecharegistro)}
            </div>
        ` : ''}
    `;

    // Columna Usuario
    const tdUsuario = document.createElement('td');
    tdUsuario.innerHTML = `
        <div><strong>${escapeHtml(prestamo.intmatricula_usuario || '')}</strong></div>
        <div style="font-size: 0.9rem;">${escapeHtml(prestamo.nombre_usuario || 'Sin nombre')}</div>
        ${prestamo.correo_usuario ? `
            <div class="detalle-prestamo">
                📧 ${escapeHtml(prestamo.correo_usuario)}
            </div>
        ` : ''}
    `;

    // Columna Libro
    const tdLibro = document.createElement('td');
    tdLibro.innerHTML = `
        <div class="libro-info">
            <span class="libro-titulo">${escapeHtml(prestamo.titulo_libro || 'Sin título')}</span>
            <span class="libro-autor">Por: ${escapeHtml(prestamo.autor_libro || 'Sin autor')}</span>
            ${prestamo.vchcodigobarras ? `
                <div class="detalle-prestamo">
                    ${escapeHtml(prestamo.vchcodigobarras)}
                </div>
            ` : ''}
        </div>
    `;

    // Columna Fecha Préstamo
    const tdFechaPrestamo = document.createElement('td');
    tdFechaPrestamo.textContent = formatearFecha(prestamo.fecha_prestamo);

    // Columna Fecha Devolución
    const tdFechaDevolucion = document.createElement('td');
    let fechaDevHTML = formatearFecha(prestamo.fecha_devolucion);
    if (prestamo.booldevuelto == 1 && prestamo.fechareal_devolucion) {
        fechaDevHTML += `
            <div class="info-devolucion">
                <strong>Real:</strong> ${formatearFecha(prestamo.fechareal_devolucion)}
            </div>
        `;
    }
    tdFechaDevolucion.innerHTML = fechaDevHTML;

    // Columna Días
    const tdDias = document.createElement('td');
    if (prestamo.booldevuelto == 1) {
        let diasHTML = '<span class="badge-estado badge-devuelto">Devuelto</span>';
        if (prestamo.flmontosancion > 0) {
            diasHTML += `<span class="badge-estado badge-sancion">$${parseFloat(prestamo.flmontosancion).toFixed(2)}</span>`;
        }
        tdDias.innerHTML = diasHTML;
    } else {
        const dias = prestamo.dias_restantes;
        let texto = '';
        let clase = dias >= 0 ? 'positivo' : 'negativo';
        
        if (dias > 0) {
            texto = `${dias} días`;
        } else if (dias == 0) {
            texto = 'Hoy';
        } else {
            texto = `${Math.abs(dias)} días de retraso`;
        }
        
        tdDias.innerHTML = `<span class="dias-restantes ${clase}">${texto}</span>`;
    }

    // Columna Estado
    const tdEstado = document.createElement('td');
    const estadoTexto = {
        'devuelto': 'Devuelto',
        'vencido': 'Vencido',
        'proximo': 'Por Vencer',
        'activo': 'Activo'
    };
    tdEstado.innerHTML = `<span class="badge-estado badge-${prestamo.estado}">${estadoTexto[prestamo.estado] || 'Activo'}</span>`;

    // Columna Acciones
    const tdAcciones = document.createElement('td');
    const divAcciones = document.createElement('div');
    divAcciones.className = 'acciones-btn';

    if (prestamo.booldevuelto == 1) {
        // Préstamo devuelto
        const btnInfo = document.createElement('button');
        btnInfo.type = 'button';
        btnInfo.className = 'btn-accion btn-info';
        btnInfo.innerHTML = '📋 Ver Info';
        btnInfo.onclick = () => verInfoDevolucion(prestamo);
        divAcciones.appendChild(btnInfo);

        if (prestamo.flmontosancion > 0 && prestamo.boolsancion == 0) {
            // Sanción pendiente
            const btnSancion = document.createElement('button');
            btnSancion.type = 'button';
            btnSancion.className = 'btn-accion btn-sancion';
            btnSancion.innerHTML = 'Cobrar Sanción';
            btnSancion.onclick = () => marcarSancionCumplida(prestamo.intiddevolucion);
            divAcciones.appendChild(btnSancion);
        } else if (prestamo.flmontosancion > 0 && prestamo.boolsancion == 1) {
            // Sanción pagada
            const spanPagada = document.createElement('span');
            spanPagada.className = 'btn-accion btn-sancion pagada';
            spanPagada.style.cursor = 'default';
            spanPagada.innerHTML = 'Sanción Pagada';
            divAcciones.appendChild(spanPagada);
        }
    } else {
        // Préstamo activo
        const linkDevolucion = document.createElement('a');
        linkDevolucion.href = `/HTML/devolucion_prestamo.html?ticket=${encodeURIComponent(prestamo.vchticket)}`;
        linkDevolucion.className = 'btn-accion btn-devolver';
        linkDevolucion.innerHTML = 'Devolución';
        divAcciones.appendChild(linkDevolucion);
    }

    tdAcciones.appendChild(divAcciones);

    // Agregar todas las columnas a la fila
    tr.appendChild(tdTicket);
    tr.appendChild(tdUsuario);
    tr.appendChild(tdLibro);
    tr.appendChild(tdFechaPrestamo);
    tr.appendChild(tdFechaDevolucion);
    tr.appendChild(tdDias);
    tr.appendChild(tdEstado);
    tr.appendChild(tdAcciones);

    return tr;
}

// Filtrar préstamos localmente (búsqueda en tiempo real)
function filtrarPrestamosLocal() {
    const inputBusqueda = document.getElementById('busqueda');
    const textoBusqueda = inputBusqueda.value.toLowerCase().trim();

    if (!textoBusqueda) {
        mostrarPrestamos(prestamosOriginales);
        return;
    }

    const prestamosFiltrados = prestamosOriginales.filter(prestamo => {
        const ticket = (prestamo.vchticket || '').toLowerCase();
        const usuario = (prestamo.nombre_usuario || '').toLowerCase();
        const matricula = String(prestamo.intmatricula_usuario || '').toLowerCase();
        const libro = (prestamo.titulo_libro || '').toLowerCase();
        const autor = (prestamo.autor_libro || '').toLowerCase();

        return ticket.includes(textoBusqueda) ||
               usuario.includes(textoBusqueda) ||
               matricula.includes(textoBusqueda) ||
               libro.includes(textoBusqueda) ||
               autor.includes(textoBusqueda);
    });

    mostrarPrestamos(prestamosFiltrados);
}

// Ver información de devolución
function verInfoDevolucion(prestamo) {
    const estadoEntregaTexto = {
        1: '<span class="estado-entrega bueno">Bueno</span>',
        2: '<span class="estado-entrega regular">Regular</span>',
        3: '<span class="estado-entrega mal">Mal Estado</span>'
    };

    let sancionHTML = '';
    if (prestamo.flmontosancion > 0) {
        const estadoSancion = prestamo.boolsancion == 1 
            ? '<span style="color: #38a169;">Pagada</span>' 
            : '<span style="color: #e53e3e;">Pendiente</span>';
        
        sancionHTML = `
            <div class="info-grupo">
                <label>💰 Sanción</label>
                <p>$${parseFloat(prestamo.flmontosancion).toFixed(2)} - ${estadoSancion}</p>
            </div>
            ${prestamo.vchsancion ? `
                <div class="info-grupo">
                    <label>Observación de Sanción</label>
                    <p>${escapeHtml(prestamo.vchsancion)}</p>
                </div>
            ` : ''}
        `;
    }

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="info-grupo">
            <label>Ticket</label>
            <p>${escapeHtml(prestamo.vchticket || 'N/A')}</p>
        </div>
        <div class="info-grupo">
            <label>Usuario</label>
            <p>${escapeHtml(prestamo.nombre_usuario || 'N/A')}<br>
               <small style="color:#718096;">${prestamo.intmatricula_usuario || 'N/A'}</small></p>
        </div>
        <div class="info-grupo">
            <label>Libro</label>
            <p>${escapeHtml(prestamo.titulo_libro || 'N/A')}</p>
        </div>
        <div class="info-grupo">
            <label>Fecha de Préstamo</label>
            <p>${formatearFecha(prestamo.fecha_prestamo)}</p>
        </div>
        <div class="info-grupo">
            <label>Fecha Devolución Esperada</label>
            <p>${formatearFecha(prestamo.fecha_devolucion)}</p>
        </div>
        <div class="info-grupo">
            <label>Fecha Devolución Real</label>
            <p>${prestamo.fechareal_devolucion ? formatearFechaHora(prestamo.fechareal_devolucion) : 'N/A'}</p>
        </div>
        <div class="info-grupo">
            <label>Recibido por</label>
            <p>${escapeHtml(prestamo.nombre_recibio || 'No registrado')}<br>
               <small style="color:#718096;">Matrícula: ${prestamo.matricula_recibio || 'N/A'}</small></p>
        </div>
        <div class="info-grupo">
            <label>Estado de Entrega</label>
            <p>${estadoEntregaTexto[prestamo.intidestrega] || 'No especificado'}</p>
        </div>
        ${sancionHTML}
    `;

    document.getElementById('modal-info').style.display = 'flex';
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modal-info').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
document.getElementById('modal-info')?.addEventListener('click', function(e) {
    if (e.target === this) {
        cerrarModal();
    }
});

// Marcar sanción como cumplida
async function marcarSancionCumplida(idDevolucion) {
    if (!confirm('¿Confirmar que la sanción ha sido pagada?')) {
        return;
    }

    try {
        const response = await fetch(`${window.location.origin}/api/prestamos/sancion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                intiddevolucion: idDevolucion
            })
        });

        const data = await response.json();

        if (data.success) {
            mostrarAlerta(data.message, 'success');
            // Recargar préstamos
            setTimeout(() => {
                cargarPrestamos(document.getElementById('filtro').value);
            }, 1000);
        } else {
            mostrarAlerta('Error: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al procesar la solicitud', 'error');
    }
}

// Mostrar alerta
function mostrarAlerta(mensaje, tipo) {
    const container = document.getElementById('alertas-container');
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    
    container.appendChild(alerta);

    setTimeout(() => {
        alerta.style.transition = 'opacity 0.5s ease';
        alerta.style.opacity = '0';
        setTimeout(() => alerta.remove(), 500);
    }, 5000);
}

// Mostrar error general
function mostrarError(mensaje) {
    const container = document.getElementById('tabla-container');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e53e3e;">
            <h3>Error</h3>
            <p>${escapeHtml(mensaje)}</p>
            <button onclick="cargarPrestamos()" 
                    style="margin-top: 20px; padding: 12px 24px; background: #BC955B; color: white; border: none; border-radius: 8px; cursor: pointer;">
                Reintentar
            </button>
        </div>
    `;
}

// Utilidades
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

function formatearFechaHora(fecha) {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Exportar funciones globalmente
window.verInfoDevolucion = verInfoDevolucion;
window.cerrarModal = cerrarModal;
window.marcarSancionCumplida = marcarSancionCumplida;
window.cargarPrestamos = cargarPrestamos;