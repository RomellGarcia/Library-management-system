// CONFIGURACIÓN DE EMAILJS
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'UHffvLlNQFxlN_wz4',
    SERVICE_ID: 'service_3w2yit9',
    TEMPLATE_ID: 'template_t6yejr8',
    DOMINIO_PERMITIDO: '@uthh.edu.mx'
};

// Inicializar EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

// Referencias al DOM
let messageTextarea;
let charCount;
let formMessage;
let notification;
let contactForm;

document.addEventListener('DOMContentLoaded', function() {
    // Obtener referencias
    messageTextarea = document.getElementById('message');
    charCount = document.querySelector('.uthh-char-count');
    formMessage = document.getElementById('formMessage');
    notification = document.getElementById('notification');
    contactForm = document.getElementById('contactForm');

    // Configurar contador de caracteres
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function() {
            charCount.textContent = `${this.value.length}/500`;
        });
    }

    // Configurar manejo del formulario
    if (contactForm) {
        contactForm.addEventListener('submit', manejarEnvioFormulario);
    }

    console.log('Formulario de contacto inicializado');
});

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo) {
    if (!notification) return;
    
    notification.textContent = mensaje;
    notification.className = 'notification ' + tipo + ' show';
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Función para validar correo institucional
function validarCorreoInstitucional(email) {
    const emailLower = email.trim().toLowerCase();
    return emailLower.endsWith(EMAILJS_CONFIG.DOMINIO_PERMITIDO);
}

// Función principal para manejar el envío del formulario
async function manejarEnvioFormulario(e) {
    e.preventDefault();

    // Obtener valores del formulario
    const nombre = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const mensaje = document.getElementById('message').value.trim();

    // Validar que no estén vacíos
    if (!nombre || !email || !mensaje) {
        mostrarNotificacion('Por favor complete todos los campos', 'error');
        return;
    }

    // Validar correo institucional
    if (!validarCorreoInstitucional(email)) {
        mostrarNotificacion(
            `Solo se aceptan correos institucionales (${EMAILJS_CONFIG.DOMINIO_PERMITIDO})`, 
            'error'
        );
        formMessage.style.color = '#dc3545';
        formMessage.innerHTML = 'Correo no válido (use su cuenta UTHH)';
        return;
    }

    // Deshabilitar botón de envío
    const submitBtn = document.querySelector('.uthh-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'ENVIANDO...';
    formMessage.textContent = '';

    // Preparar parámetros para EmailJS
    const templateParams = {
        from_name: nombre,
        from_email: email,
        message: mensaje
    };

    try {
        // Enviar email usando EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams
        );

        console.log('Email enviado exitosamente:', response);

        // Mostrar mensaje de éxito
        mostrarNotificacion('¡Mensaje enviado correctamente a la biblioteca!', 'success');
        formMessage.style.color = '#28a745';
        formMessage.innerHTML = 'Enviado con éxito';

        // Limpiar formulario
        contactForm.reset();
        charCount.textContent = '0/500';

    } catch (error) {
        console.error('Error al enviar email:', error);

        // Mostrar mensaje de error
        mostrarNotificacion('Error al enviar. Verifica tu conexión.', 'error');
        formMessage.style.color = '#dc3545';
        formMessage.innerHTML = '✗ Error al enviar';

    } finally {
        // Rehabilitar botón
        submitBtn.disabled = false;
        submitBtn.textContent = 'ENVIAR';
    }
}

// Exportar funciones (opcional, para testing)
window.contactoModule = {
    mostrarNotificacion,
    validarCorreoInstitucional
};