// devolucion_prestamo.js - Gestión de devolución de préstamos

let prestamoActual = null; // Guardar datos del préstamo para recalcular sanción

document.addEventListener('DOMContentLoaded', function() {
    // Obtener ticket de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketParam = urlParams.get('ticket');
    
    if (!ticketParam) {
        alert('No se proporcionó un ticket de préstamo. Por favor accede desde la lista de préstamos.');
        window.location.href = '/HTML/gestion_prestamos.html';
        return;
    }

    // Cargar empleado actual automáticamente
    cargarEmpleadoActual();

    // Cargar automáticamente el préstamo
    cargarPrestamo(ticketParam);

    // Establecer fecha/hora actual por defecto
    establecerFechaActual();

    // Configurar eventos
    configurarEventos();
});

// Cargar información del empleado/admin logueado
async function cargarEmpleadoActual() {
    try {
        const response = await fetch(`${window.location.origin}/api/auth/verificar`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.logged_in && data.usuario) {
            const { matricula } = data.usuario;
            
            // Establecer matrícula automáticamente
            document.getElementById('intmatricula_empleado').value = matricula;
            
            // Hacer el campo readonly para que no se pueda cambiar
            document.getElementById('intmatricula_empleado').readOnly = true;
            document.getElementById('intmatricula_empleado').style.backgroundColor = '#f0f0f0';
        }
    } catch (error) {
        console.error('Error al cargar empleado:', error);
    }
}

// Establecer fecha y hora actual
function establecerFechaActual() {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    document.getElementById('fechareal_devolucion').value = ahora.toISOString().slice(0, 16);
}

// Configurar eventos
function configurarEventos() {
    // Submit del formulario
    const form = document.getElementById('form-devolucion');
    if (form) {
        form.addEventListener('submit', procesarDevolucion);
    }

    // Recalcular sanción al cambiar fecha real de devolución
    const inputFechaReal = document.getElementById('fechareal_devolucion');
    if (inputFechaReal) {
        inputFechaReal.addEventListener('change', recalcularSancionPorFecha);
    }
}

// Mostrar error inicial
function mostrarErrorInicial(mensaje) {
    document.getElementById('loading-inicial').style.display = 'none';
    document.getElementById('texto-error').textContent = mensaje;
    document.getElementById('mensaje-error-inicial').style.display = 'block';
}

// Cargar préstamo por ticket
async function cargarPrestamo(ticket) {
    try {
        const response = await fetch(
            `${window.location.origin}/api/prestamos/buscar-por-ticket?ticket=${encodeURIComponent(ticket)}`,
            { credentials: 'include' }
        );

        const data = await response.json();

        if (data.success) {
            document.getElementById('loading-inicial').style.display = 'none';
            prestamoActual = data.prestamo; // Guardar para recalcular
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
    // Llenar campos ocultos
    document.getElementById('intidprestamo').value = prestamo.intidprestamo;
    document.getElementById('intidejemplar').value = prestamo.intidejemplar;

    // Llenar información visible
    document.getElementById('display-ticket').textContent = prestamo.vchticket;
    document.getElementById('display-usuario').textContent = 
        `${prestamo.nombre_usuario} (${prestamo.intmatricula_usuario})`;
    document.getElementById('display-libro').textContent = prestamo.titulo_libro;
    document.getElementById('display-codigo').textContent = prestamo.vchcodigobarras || '-';
    document.getElementById('display-fecha-prestamo').textContent = formatearFecha(prestamo.fecha_prestamo);
    document.getElementById('display-fecha-devolucion').textContent = formatearFecha(prestamo.fecha_devolucion);

    // Calcular estado y días
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaDevolucion = new Date(prestamo.fecha_devolucion);
    fechaDevolucion.setHours(0, 0, 0, 0);
    const diasDiferencia = Math.ceil((hoy - fechaDevolucion) / (1000 * 60 * 60 * 24));

    let estadoHTML = '';
    let alertaHTML = '';
    const btnSubmit = document.getElementById('btn-submit');

    // Resetear botón
    btnSubmit.disabled = false;

    if (prestamo.booldevuelto == 1) {
        estadoHTML = '<span class="estado-badge estado-activo">Ya Devuelto</span>';
        alertaHTML = '<div class="alert alert-info">Este préstamo ya fue devuelto anteriormente.</div>';
        btnSubmit.disabled = true;
        document.getElementById('calculo-sancion').style.display = 'none';
    } else if (diasDiferencia > 0) {
        estadoHTML = '<span class="estado-badge estado-vencido">Vencido</span>';
        alertaHTML = `<div class="alert alert-danger"Este préstamo tiene <strong>${diasDiferencia} día(s) de retraso</strong>. Se recomienda aplicar sanción.</div>`;
        calcularSancion(diasDiferencia);
    } else if (diasDiferencia === 0) {
        estadoHTML = '<span class="estado-badge estado-proximo">Vence Hoy</span>';
        alertaHTML = '<div class="alert alert-warning">Este préstamo vence hoy.</div>';
        document.getElementById('calculo-sancion').style.display = 'none';
    } else {
        estadoHTML = '<span class="estado-badge estado-activo">A Tiempo</span>';
        alertaHTML = '';
        document.getElementById('calculo-sancion').style.display = 'none';
    }

    document.getElementById('display-estado').innerHTML = estadoHTML;
    document.getElementById('alerta-estado').innerHTML = alertaHTML;

    // Mostrar formulario
    document.getElementById('datos-prestamo').style.display = 'block';
    document.getElementById('mensaje-error').innerHTML = '';
}

// Recalcular sanción cuando cambia la fecha real de devolución
function recalcularSancionPorFecha() {
    if (!prestamoActual) return;

    const fechaRealDevolucion = new Date(document.getElementById('fechareal_devolucion').value);
    const fechaDevolucionEsperada = new Date(prestamoActual.fecha_devolucion);
    
    // Normalizar fechas (solo día, sin horas)
    fechaRealDevolucion.setHours(0, 0, 0, 0);
    fechaDevolucionEsperada.setHours(0, 0, 0, 0);

    // Calcular días de diferencia
    const diasDiferencia = Math.ceil((fechaRealDevolucion - fechaDevolucionEsperada) / (1000 * 60 * 60 * 24));

    if (diasDiferencia > 0) {
        // Hay retraso, calcular sanción
        calcularSancion(diasDiferencia);
    } else {
        // No hay retraso, limpiar sanción
        document.getElementById('calculo-sancion').style.display = 'none';
        document.getElementById('flmontosancion').value = '0.00';
        document.getElementById('vchsancion').value = '';
    }
}

// Calcular sanción
function calcularSancion(diasRetraso) {
    const TARIFA_POR_DIA = 10; // $10 por día de retraso
    const montoSancion = diasRetraso * TARIFA_POR_DIA;

    document.getElementById('dias-retraso').textContent = diasRetraso;
    document.getElementById('monto-sancion').textContent = `$${montoSancion.toFixed(2)}`;
    document.getElementById('flmontosancion').value = montoSancion.toFixed(2);
    document.getElementById('calculo-sancion').style.display = 'block';

    // Agregar descripción automática de sanción
    document.getElementById('vchsancion').value = `Sanción por ${diasRetraso} día(s) de retraso en la devolución.`;
}

// Procesar devolución
async function procesarDevolucion(e) {
    e.preventDefault();

    const matricula = document.getElementById('intmatricula_empleado').value.trim();
    const estadoEntrega = document.getElementById('vchentrega').value;

    // Validaciones
    if (!matricula || matricula.length < 4) {
        alert('⚠️ La matrícula del empleado debe tener al menos 4 dígitos');
        return;
    }

    if (!estadoEntrega) {
        alert('Debe seleccionar el estado de entrega del libro');
        return;
    }

    // Confirmación
    const montoSancion = document.getElementById('flmontosancion').value;
    let mensajeConfirm = '¿Confirmar devolución?\n\n' +
        'Empleado: ' + matricula + '\n' +
        'Estado del libro: ' + estadoEntrega;

    if (parseFloat(montoSancion) > 0) {
        mensajeConfirm += '\nSanción: $' + montoSancion;
    }

    mensajeConfirm += '\n\nEsta acción no se puede deshacer.';

    if (!confirm(mensajeConfirm)) {
        return;
    }

    // Preparar datos
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
        const response = await fetch(`${window.location.origin}/api/prestamos/devolucion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            // Mensaje de éxito con alerta del navegador
            let mensaje = '¡Devolución registrada exitosamente!\n\n';
            mensaje += 'El préstamo ha sido devuelto correctamente.';
            
            if (data.data && data.data.sancion_aplicada) {
                mensaje += '\n\nSanción aplicada: $' + data.data.monto_sancion;
            }
            
            alert(mensaje);
            
            // Redirigir a gestionar préstamos
            window.location.href = '/HTML/gestion_prestamos.html';
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

// Formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}