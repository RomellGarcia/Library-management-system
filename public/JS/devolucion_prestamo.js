// devolucion_prestamo.js - Gestión de devolución de préstamos

let prestamoActual = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Proteger página: solo admin (1) y empleado (2)
    const usuario = await protegerPagina([1, 2]);
    if (!usuario) return;

    const urlParams = new URLSearchParams(window.location.search);
    const ticketParam = urlParams.get('ticket');

    if (!ticketParam) {
        alert('No se proporcionó un ticket de préstamo. Por favor accede desde la lista de préstamos.');
        window.location.href = obtenerRuta('/HTML/gestion_prestamos.html');
        return;
    }

    cargarEmpleadoActual();
    cargarPrestamo(ticketParam);
    establecerFechaActual();
    configurarEventos();
});

function cargarEmpleadoActual() {
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const input = document.getElementById('intmatricula_empleado');
    input.value = usuario.matricula;
    input.readOnly = true;
    input.style.backgroundColor = '#f0f0f0';
}

function establecerFechaActual() {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    document.getElementById('fechareal_devolucion').value = ahora.toISOString().slice(0, 16);
}

function configurarEventos() {
    document.getElementById('form-devolucion')?.addEventListener('submit', procesarDevolucion);
    document.getElementById('fechareal_devolucion')?.addEventListener('change', recalcularSancionPorFecha);
}

function mostrarErrorInicial(mensaje) {
    document.getElementById('loading-inicial').style.display = 'none';
    document.getElementById('texto-error').textContent = mensaje;
    document.getElementById('mensaje-error-inicial').style.display = 'block';
}

// Cargar préstamo por ticket
async function cargarPrestamo(ticket) {
    try {
        // ✅ fetchConToken
        const response = await fetchConToken(
            `/api/prestamos/buscar-por-ticket?ticket=${encodeURIComponent(ticket)}`
        );
        const data = await response.json();

        if (data.success) {
            document.getElementById('loading-inicial').style.display = 'none';
            prestamoActual = data.prestamo;
            mostrarDatosPrestamo(data.prestamo);
        } else {
            mostrarErrorInicial(data.mensaje || 'Préstamo no encontrado');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarErrorInicial('Error al cargar el préstamo: ' + error.message);
    }
}

// Mostrar datos del préstamo
function mostrarDatosPrestamo(prestamo) {
    document.getElementById('intidprestamo').value = prestamo.intidprestamo;
    document.getElementById('intidejemplar').value = prestamo.intidejemplar;

    document.getElementById('display-ticket').textContent = prestamo.vchticket;
    document.getElementById('display-usuario').textContent =
        `${prestamo.nombre_usuario} (${prestamo.intmatricula_usuario})`;
    document.getElementById('display-libro').textContent = prestamo.titulo_libro;
    document.getElementById('display-codigo').textContent = prestamo.vchcodigobarras || '-';
    document.getElementById('display-fecha-prestamo').textContent = formatearFecha(prestamo.fecha_prestamo);
    document.getElementById('display-fecha-devolucion').textContent = formatearFecha(prestamo.fecha_devolucion);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaDevolucion = new Date(prestamo.fecha_devolucion);
    fechaDevolucion.setHours(0, 0, 0, 0);
    const diasDiferencia = Math.ceil((hoy - fechaDevolucion) / (1000 * 60 * 60 * 24));

    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.disabled = false;

    let estadoHTML = '';
    let alertaHTML = '';

    if (prestamo.booldevuelto == 1) {
        estadoHTML = '<span class="estado-badge estado-activo">Ya Devuelto</span>';
        alertaHTML = '<div class="alert alert-info">Este préstamo ya fue devuelto anteriormente.</div>';
        btnSubmit.disabled = true;
        document.getElementById('calculo-sancion').style.display = 'none';
    } else if (diasDiferencia > 0) {
        estadoHTML = '<span class="estado-badge estado-vencido">Vencido</span>';
        alertaHTML = `<div class="alert alert-danger">Este préstamo tiene <strong>${diasDiferencia} día(s) de retraso</strong>. Se recomienda aplicar sanción.</div>`;
        calcularSancion(diasDiferencia);
    } else if (diasDiferencia === 0) {
        estadoHTML = '<span class="estado-badge estado-proximo">Vence Hoy</span>';
        alertaHTML = '<div class="alert alert-warning">Este préstamo vence hoy.</div>';
        document.getElementById('calculo-sancion').style.display = 'none';
    } else {
        estadoHTML = '<span class="estado-badge estado-activo">A Tiempo</span>';
        document.getElementById('calculo-sancion').style.display = 'none';
    }

    document.getElementById('display-estado').innerHTML = estadoHTML;
    document.getElementById('alerta-estado').innerHTML = alertaHTML;
    document.getElementById('datos-prestamo').style.display = 'block';
    document.getElementById('mensaje-error').innerHTML = '';
}

function recalcularSancionPorFecha() {
    if (!prestamoActual) return;

    const fechaReal = new Date(document.getElementById('fechareal_devolucion').value);
    const fechaEsperada = new Date(prestamoActual.fecha_devolucion);
    fechaReal.setHours(0, 0, 0, 0);
    fechaEsperada.setHours(0, 0, 0, 0);

    const diasDiferencia = Math.ceil((fechaReal - fechaEsperada) / (1000 * 60 * 60 * 24));

    if (diasDiferencia > 0) {
        calcularSancion(diasDiferencia);
    } else {
        document.getElementById('calculo-sancion').style.display = 'none';
        document.getElementById('flmontosancion').value = '0.00';
        document.getElementById('vchsancion').value = '';
    }
}

function calcularSancion(diasRetraso) {
    const monto = diasRetraso * 10; // $10 por día
    document.getElementById('dias-retraso').textContent = diasRetraso;
    document.getElementById('monto-sancion').textContent = `$${monto.toFixed(2)}`;
    document.getElementById('flmontosancion').value = monto.toFixed(2);
    document.getElementById('calculo-sancion').style.display = 'block';
    document.getElementById('vchsancion').value = `Sanción por ${diasRetraso} día(s) de retraso en la devolución.`;
}

// Procesar devolución
async function procesarDevolucion(e) {
    e.preventDefault();

    const matricula = document.getElementById('intmatricula_empleado').value.trim();
    const estadoEntrega = document.getElementById('vchentrega').value;

    if (!matricula || matricula.length < 4) {
        alert('⚠️ La matrícula del empleado debe tener al menos 4 dígitos');
        return;
    }

    if (!estadoEntrega) {
        alert('Debe seleccionar el estado de entrega del libro');
        return;
    }

    const montoSancion = document.getElementById('flmontosancion').value;
    let mensajeConfirm = `¿Confirmar devolución?\n\nEmpleado: ${matricula}\nEstado del libro: ${estadoEntrega}`;
    if (parseFloat(montoSancion) > 0) mensajeConfirm += `\nSanción: $${montoSancion}`;
    mensajeConfirm += '\n\nEsta acción no se puede deshacer.';

    if (!confirm(mensajeConfirm)) return;

    const datos = {
        intidprestamo: document.getElementById('intidprestamo').value,
        intidejemplar: document.getElementById('intidejemplar').value,
        intmatricula_empleado: matricula,
        vchentrega: estadoEntrega,
        fechareal_devolucion: document.getElementById('fechareal_devolucion').value,
        vchsancion: document.getElementById('vchsancion').value,
        flmontosancion: montoSancion,
        boolsancion: document.getElementById('boolsancion').checked ? 1 : 0
    };

    const btnSubmit = document.getElementById('btn-submit');
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'Procesando...';
    btnSubmit.disabled = true;

    try {
        // ✅ fetchConToken
        const response = await fetchConToken('/api/prestamos/devolucion', {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            let mensaje = '¡Devolución registrada exitosamente!\n\nEl préstamo ha sido devuelto correctamente.';
            if (data.data?.sancion_aplicada) {
                mensaje += `\n\nSanción aplicada: $${data.data.monto_sancion}`;
            }
            alert(mensaje);
            window.location.href = obtenerRuta('/HTML/gestion_prestamos.html');
        } else {
            alert('Error: ' + data.mensaje);
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión. Intenta nuevamente.');
        btnSubmit.innerHTML = textoOriginal;
        btnSubmit.disabled = false;
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}