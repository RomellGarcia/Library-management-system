// CONFIGURACIÓN DE EMAILJS
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'UHffvLlNQFxlN_wz4',
    SERVICE_ID: 'service_3w2yit9',
    TEMPLATE_ID: 'template_t6yejr8',
    DOMINIO_PERMITIDO: '@uthh.edu.mx'
};


// Referencias al DOM
let messageTextarea;
let charCount;
let formMessage;
let notification;
let contactForm;

document.addEventListener('DOMContentLoaded', function () {
    // Inicializar EmailJS
    emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
    messageTextarea = document.getElementById('message');
    charCount = document.querySelector('.uthh-char-count');
    formMessage = document.getElementById('formMessage');
    notification = document.getElementById('notification');
    contactForm = document.getElementById('contactForm');

    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function () {
            charCount.textContent = `${this.value.length}/500`;
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', manejarEnvioFormulario);
    }
});

function mostrarNotificacion(mensaje, tipo) {
    if (!notification) return;
    notification.textContent = mensaje;
    notification.className = 'notification ' + tipo + ' show';
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

function validarCorreoInstitucional(email) {
    const emailLower = email.trim().toLowerCase();
    return emailLower.endsWith(EMAILJS_CONFIG.DOMINIO_PERMITIDO);
}

async function manejarEnvioFormulario(e) {
    e.preventDefault();

    const nombre = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const mensaje = document.getElementById('message').value.trim();

    if (!nombre || !email || !mensaje) {
        mostrarNotificacion('Por favor complete todos los campos', 'error');
        return;
    }

    if (!validarCorreoInstitucional(email)) {
        mostrarNotificacion(
            `Solo se aceptan correos institucionales (${EMAILJS_CONFIG.DOMINIO_PERMITIDO})`,
            'error'
        );
        formMessage.style.color = '#dc3545';
        formMessage.innerHTML = 'Correo no válido (use su cuenta UTHH)';
        return;
    }

    const submitBtn = document.querySelector('.uthh-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'ENVIANDO...';
    formMessage.textContent = '';

    const templateParams = {
        from_name: nombre,
        from_email: email,
        message: mensaje
    };

    try {
        await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams,
            { publicKey: EMAILJS_CONFIG.PUBLIC_KEY }
        );

        mostrarNotificacion('¡Mensaje enviado correctamente a la biblioteca!', 'success');
        formMessage.style.color = '#28a745';
        formMessage.innerHTML = 'Enviado con éxito';

        contactForm.reset();
        charCount.textContent = '0/500';

    } catch (error) {
        console.error('Error al enviar email:', error);
        mostrarNotificacion('Error al enviar. Verifica tu conexión.', 'error');
        formMessage.style.color = '#dc3545';
        formMessage.innerHTML = 'Error al enviar';

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ENVIAR';
    }
}

window.contactoModule = {
    mostrarNotificacion,
    validarCorreoInstitucional
};