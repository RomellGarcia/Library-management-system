// footer.js - Sin cambios
document.addEventListener('DOMContentLoaded', function() {
    const footerHTML = `
        <footer>
            <div class="footer-content">
                <h3>Universidad Tecnológica de la Huasteca Hidalguense</h3>
                <p>© 2025 UTHH - Todos los derechos reservados</p>
                <div class="footer-info">
                    <div class="footer-item">
                        <strong>Teléfono:</strong>
                        <p>(789) 123-4567</p>
                    </div>
                    <div class="footer-item">
                        <strong>Dirección:</strong>
                        <p>Carretera Huejutla - Chalahuiyapa S/N,<br>Tezonapa, Huejutla, Hidalgo, México</p>
                    </div>
                    <div class="footer-item">
                        <strong>Email:</strong>
                        <p>biblioteca@uthh.edu.mx</p>
                    </div>
                </div>
            </div>
        </footer>
    `;
    
    document.body.insertAdjacentHTML('beforeend', footerHTML);
});