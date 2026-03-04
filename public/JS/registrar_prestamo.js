// registrar_prestamo.js - Gestión de registro de préstamos

let timerBusqueda = null;

document.addEventListener('DOMContentLoaded', function() {
    generarTicket();
    configurarFechas();
    cargarEmpleadoActual();
    configurarEventos();
});

// Configurar eventos
function configurarEventos() {
    // Búsqueda de libros con debounce
    const inputBuscar = document.getElementById('buscarLibro');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', function() {
            clearTimeout(timerBusqueda);
            timerBusqueda = setTimeout(() => buscarLibros(), 300);
        });
    }

    // Búsqueda de usuario al salir del campo
    const inputUsuario = document.getElementById('intmatriculausuario');
    if (inputUsuario) {
        inputUsuario.addEventListener('blur', buscarUsuario);
        // También buscar al presionar Enter
        inputUsuario.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarUsuario();
            }
        });
    }

    // Submit del formulario
    const form = document.getElementById('formPrestamo');
    if (form) {
        form.addEventListener('submit', registrarPrestamo);
    }
}

// Generar ticket único
async function generarTicket() {
    try {
        const response = await fetch(`${window.location.origin}/api/prestamos/generar-ticket`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('vchticket').value = data.ticket;
        } else {
            console.error('Error al generar ticket:', data.mensaje);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Configurar fechas por defecto
function configurarFechas() {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split('T')[0];
    
    const inputPrestamo = document.getElementById('fechaprestamo');
    const inputDevolucion = document.getElementById('fechadevolucion');

    if (inputPrestamo) {
        inputPrestamo.value = fechaHoyStr;
        inputPrestamo.min = fechaHoyStr;
    }

    // Fecha de devolución: 7 días después
    const fechaDevolucion = new Date(hoy);
    fechaDevolucion.setDate(fechaDevolucion.getDate() + 7);
    const fechaDevStr = fechaDevolucion.toISOString().split('T')[0];

    if (inputDevolucion) {
        inputDevolucion.value = fechaDevStr;
        inputDevolucion.min = fechaHoyStr;
    }
}

// Cargar información del empleado actual
async function cargarEmpleadoActual() {
    try {
        const response = await fetch(`${window.location.origin}/api/auth/verificar`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.logged_in && data.usuario) {
            const { matricula, nombre, apellidos, rol } = data.usuario;
            
            document.getElementById('intmatriculaempleado').value = matricula;
            document.getElementById('infoEmpleado').innerHTML = `
                <div class="info-usuario-encontrado">
                    <p><strong>✓ Registrando como:</strong> ${nombre} ${apellidos}</p>
                    <p><strong>Matrícula:</strong> ${matricula}</p>
                    <p><strong>Rol:</strong> ${rol}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar empleado:', error);
    }
}

// Buscar usuario por matrícula
async function buscarUsuario() {
    const matricula = document.getElementById('intmatriculausuario').value.trim();
    const contenedor = document.getElementById('infoUsuario');

    if (!matricula) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = '<p style="color: #666;">🔍 Buscando...</p>';

    try {
        const response = await fetch(
            `${window.location.origin}/api/prestamos/buscar-usuario?matricula=${matricula}`,
            { credentials: 'include' }
        );

        const data = await response.json();

        if (data.success) {
            const usuario = data.usuario;
            contenedor.innerHTML = `
                <div class="info-usuario-encontrado">
                    <p><strong>✓ ${usuario.vchnombre} ${usuario.vchapaterno} ${usuario.vchamaterno || ''}</strong></p>
                    <p><strong>Rol:</strong> ${usuario.vchrol || 'N/A'}</p>
                    <p><strong>Préstamos pendientes:</strong> ${usuario.prestamos_pendientes}</p>
                    ${usuario.vchcorreo ? `<p><strong>Correo:</strong> ${usuario.vchcorreo}</p>` : ''}
                </div>
            `;
            contenedor.style.color = '#2e7d32';
        } else {
            contenedor.innerHTML = `<p style="color: #c62828;">❌ ${data.mensaje}</p>`;
            document.getElementById('intmatriculausuario').value = '';
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p style="color: #c62828;">❌ Error al buscar usuario</p>';
    }
}

// Buscar libros disponibles
async function buscarLibros() {
    const termino = document.getElementById('buscarLibro').value.trim();
    const contenedor = document.getElementById('resultadosLibros');

    if (termino.length < 1) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = `
        <div class="loading" style="padding: 20px; text-align: center;">
            <div class="spinner"></div>
            <p>Buscando libros...</p>
        </div>
    `;

    try {
        const response = await fetch(
            `${window.location.origin}/api/prestamos/buscar-ejemplares?termino=${encodeURIComponent(termino)}`,
            { credentials: 'include' }
        );

        const data = await response.json();

        if (data.success && data.libros.length > 0) {
            mostrarResultadosLibros(data.libros);
        } else {
            contenedor.innerHTML = `
                <div class="sin-resultados">
                    <div class="sin-resultados-icono">📚</div>
                    <p>No se encontraron libros disponibles</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = `
            <div class="sin-resultados">
                <div class="sin-resultados-icono">⚠️</div>
                <p>Error al buscar libros</p>
            </div>
        `;
    }
}

// Mostrar resultados de libros
function mostrarResultadosLibros(libros) {
    const contenedor = document.getElementById('resultadosLibros');

    contenedor.innerHTML = libros.map(libro => `
        <div class="libro-item">
            <div class="libro-imagen-container">
                <div class="libro-imagen">
                    ${libro.imagen 
                        ? `<img src="${libro.imagen}" alt="${escapeHtml(libro.vchtitulo)}">`
                        : `<div class="libro-imagen-placeholder">📖</div>`
                    }
                </div>
                <button type="button" class="btn-seleccionar-ejemplar" 
                        data-libro='${JSON.stringify(libro).replace(/'/g, "&#39;")}'>
                    Seleccionar
                </button>
            </div>
            <div class="libro-info">
                <div class="libro-titulo">${escapeHtml(libro.vchtitulo)}</div>
                <div class="libro-autor">Por: ${escapeHtml(libro.vchautor || 'Autor desconocido')}</div>
                <div class="libro-detalles">
                    ${libro.vchcategoria ? `<span class="libro-badge badge-categoria">${escapeHtml(libro.vchcategoria)}</span>` : ''}
                    <span class="libro-badge badge-disponible">✓ Disponible</span>
                    <span class="libro-badge badge-ejemplares">${libro.ejemplares_disponibles} ejemplar(es)</span>
                </div>
            </div>
        </div>
    `).join('');

    // Agregar eventos a los botones
    contenedor.querySelectorAll('.btn-seleccionar-ejemplar').forEach(btn => {
        btn.addEventListener('click', function() {
            const libro = JSON.parse(this.dataset.libro);
            mostrarEjemplares(libro);
        });
    });
}

// Mostrar modal con ejemplares disponibles
function mostrarEjemplares(libro) {
    const modal = document.getElementById('modalEjemplares');
    const titulo = document.getElementById('modalTitulo');
    const lista = document.getElementById('listaEjemplares');

    titulo.textContent = `Seleccionar Ejemplar - ${libro.vchtitulo}`;

    lista.innerHTML = libro.ejemplares.map(ejemplar => `
        <div class="ejemplar-card">
            <div class="ejemplar-info">
                <div class="ejemplar-dato">
                    <strong>📊 Código de Barras</strong>
                    <span>${escapeHtml(ejemplar.vchcodigobarras)}</span>
                </div>
                <div class="ejemplar-dato">
                    <strong>📕 Edición</strong>
                    <span>${escapeHtml(ejemplar.vchedicion || 'N/A')}</span>
                </div>
                <div class="ejemplar-dato">
                    <strong>📍 Ubicación</strong>
                    <span>${escapeHtml(ejemplar.vchubicacion || 'N/A')}</span>
                </div>
                <div class="ejemplar-dato">
                    <strong>✅ Estado</strong>
                    <span>${escapeHtml(ejemplar.vchestadolibro || 'N/A')}</span>
                </div>
            </div>
            <button type="button" class="btn-seleccionar-este" 
                    data-libro='${JSON.stringify(libro).replace(/'/g, "&#39;")}' 
                    data-ejemplar='${JSON.stringify(ejemplar).replace(/'/g, "&#39;")}'>
                ✓ Seleccionar este ejemplar
            </button>
        </div>
    `).join('');

    // Agregar eventos a los botones
    lista.querySelectorAll('.btn-seleccionar-este').forEach(btn => {
        btn.addEventListener('click', function() {
            const libroData = JSON.parse(this.dataset.libro);
            const ejemplarData = JSON.parse(this.dataset.ejemplar);
            seleccionarEjemplar(libroData, ejemplarData);
        });
    });

    modal.classList.add('activo');

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModalEjemplares();
        }
    });
}

// Cerrar modal de ejemplares
function cerrarModalEjemplares() {
    const modal = document.getElementById('modalEjemplares');
    modal.classList.remove('activo');
}
// Seleccionar ejemplar específico
function seleccionarEjemplar(libro, ejemplar) {
    // Confirmación del navegador
    const confirmar = confirm(
        `¿Confirmar selección de este ejemplar?\n\n` +
        `Libro: ${libro.vchtitulo}\n` +
        `Código de Barras: ${ejemplar.vchcodigobarras}\n` +
        `Edición: ${ejemplar.vchedicion || 'N/A'}\n` +
        `Ubicación: ${ejemplar.vchubicacion || 'N/A'}`
    );

    // Si el usuario cancela, no hacer nada
    if (!confirmar) {
        return;
    }

    // Guardar ID del ejemplar
    document.getElementById('intidejemplar').value = ejemplar.intidejemplar;

    // Mostrar información del libro seleccionado
    const contenedor = document.getElementById('libroSeleccionado');
    contenedor.style.display = 'block';

    // Actualizar información
    document.getElementById('tituloLibro').textContent = libro.vchtitulo;
    document.getElementById('autorLibro').textContent = libro.vchautor || 'Desconocido';
    document.getElementById('editorialLibro').textContent = libro.vcheditorial || 'N/A';
    document.getElementById('isbnLibro').textContent = libro.vchisbn || 'N/A';
    document.getElementById('ubicacionLibro').textContent = ejemplar.vchubicacion || 'N/A';

    // Actualizar imagen
    const imgPortada = document.getElementById('imagenPortada');
    if (libro.imagen) {
        imgPortada.src = libro.imagen;
        imgPortada.alt = libro.vchtitulo;
        imgPortada.style.display = 'block';
    } else {
        imgPortada.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="160"%3E%3Crect fill="%23A02142" width="120" height="160"/%3E%3Ctext x="50%25" y="50%25" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle"%3E📖%3C/text%3E%3C/svg%3E';
        imgPortada.alt = 'Sin portada';
        imgPortada.style.display = 'block';
    }

    // Limpiar búsqueda
    document.getElementById('buscarLibro').value = '';
    document.getElementById('resultadosLibros').innerHTML = '';

    // ✅ CERRAR MODAL AUTOMÁTICAMENTE
    cerrarModalEjemplares();

    // Scroll hacia el libro seleccionado
    contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Mostrar mensaje de éxito
    mostrarAlerta('✓ Ejemplar seleccionado correctamente', 'success');
}

// Cancelar selección de libro
function cancelarSeleccion() {
    document.getElementById('libroSeleccionado').style.display = 'none';
    document.getElementById('intidejemplar').value = '';
}

// Registrar préstamo
async function registrarPrestamo(e) {
    e.preventDefault();

    // Validar que se haya seleccionado un ejemplar
    const idEjemplar = document.getElementById('intidejemplar').value;
    if (!idEjemplar) {
        mostrarAlerta('Por favor seleccione un libro para prestar', 'warning');
        return;
    }

    // Validar que se haya buscado un usuario
    const matriculaUsuario = document.getElementById('intmatriculausuario').value;
    const infoUsuario = document.getElementById('infoUsuario').innerHTML;
    if (!infoUsuario.includes('info-usuario-encontrado')) {
        mostrarAlerta('Por favor busque y verifique el usuario', 'warning');
        return;
    }

    // Recopilar datos
    const datos = {
        vchticket: document.getElementById('vchticket').value,
        intmatriculausuario: matriculaUsuario,
        fechaprestamo: document.getElementById('fechaprestamo').value,
        fechadevolucion: document.getElementById('fechadevolucion').value,
        intidejemplar: idEjemplar,
        vchobservaciones: document.getElementById('vchobservaciones').value
    };

    // Deshabilitar botón
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>⏳</span> Registrando...';

    try {
        const response = await fetch(`${window.location.origin}/api/prestamos/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            mostrarAlerta(`✓ Préstamo registrado exitosamente\n\nTicket: ${data.ticket}`, 'success');

            setTimeout(() => {
                window.location.href = '/HTML/gestion_prestamos.html';
            }, 2000);
        } else {
            mostrarAlerta('Error: ' + data.mensaje, 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar el préstamo', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
    }
}

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = 'info') {
    const alerta = document.createElement('div');
    alerta.className = `alerta alerta-${tipo}`;
    alerta.textContent = mensaje;
    alerta.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#ff9800'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 400px;
        white-space: pre-line;
    `;

    document.body.appendChild(alerta);

    setTimeout(() => {
        alerta.style.transition = 'opacity 0.3s ease';
        alerta.style.opacity = '0';
        setTimeout(() => alerta.remove(), 300);
    }, tipo === 'success' ? 5000 : 3000);
}

// Utilidad
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
window.cerrarModalEjemplares = cerrarModalEjemplares;
window.cancelarSeleccion = cancelarSeleccion;