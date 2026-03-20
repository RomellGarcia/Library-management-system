const cargarJsPDF = () => {
    return new Promise((resolve, reject) => {
        if (window.jspdf) return resolve(window.jspdf.jsPDF);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve(window.jspdf.jsPDF);
        script.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
        document.head.appendChild(script);
    });
};

//COLORES UTHH
const COLORES = {
    guinda:     [160, 33, 66],   // #A02142
    dorado:     [188, 149, 91],  // #BC955B
    grisClaro:  [245, 245, 245],
    grisMedio:  [180, 180, 180],
    texto:      [40, 40, 40],
    blanco:     [255, 255, 255]
};

//FUNCIÓN PRINCIPAL
/**
 * Genera y descarga el comprobante PDF de un préstamo
 * @param {Object} datos - Datos del préstamo
 * @param {string} datos.ticket         - Número de ticket (ej. TK-2026-005)
 * @param {string} datos.nombreAlumno   - Nombre completo del alumno
 * @param {string} datos.matricula      - Matrícula del alumno
 * @param {string} datos.nombreLibro    - Título del libro
 * @param {string} datos.autor          - Autor del libro
 * @param {string} datos.fechaPrestamo  - Fecha de préstamo (ej. 2026-03-20)
 * @param {string} datos.fechaDevolucion- Fecha de devolución (ej. 2026-03-23)
 * @param {string} datos.nombreEmpleado - Nombre del empleado que registró
 * @param {string} [datos.logoBase64]   - Logo UTHH en base64 (opcional)
 */

const generarComprobantePDF = async (datos) => {
    const jsPDF = await cargarJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const ancho  = doc.internal.pageSize.getWidth();  // 210mm
    const alto   = doc.internal.pageSize.getHeight(); // 297mm
    const margen = 20;
    let y = 0; // cursor vertical

    //ENCABEZADO guinda
    doc.setFillColor(...COLORES.guinda);
    doc.rect(0, 0, ancho, 45, 'F');

    // Logo si existe
    if (datos.logoBase64) {
        doc.addImage(datos.logoBase64, 'PNG', margen, 8, 28, 28);
    }

    // Título en encabezado
    doc.setTextColor(...COLORES.blanco);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BIBLIOTECA UTHH', datos.logoBase64 ? 55 : margen, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Universidad Tecnológica de la Huasteca Hidalguense', datos.logoBase64 ? 55 : margen, 28);

    doc.setFontSize(9);
    doc.setTextColor(...COLORES.dorado);
    doc.text('COMPROBANTE DE PRÉSTAMO', datos.logoBase64 ? 55 : margen, 36);

    y = 55;

    //TICKET BADGE
    doc.setFillColor(...COLORES.dorado);
    doc.roundedRect(margen, y, ancho - margen * 2, 14, 3, 3, 'F');
    doc.setTextColor(...COLORES.blanco);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ticket: ${datos.ticket}`, ancho / 2, y + 9.5, { align: 'center' });

    y += 22;

    //SECCIÓN: DATOS DEL ALUMNO
    y = dibujarSeccion(doc, 'DATOS DEL ALUMNO', y, margen, ancho);

    y = dibujarFila(doc, 'Nombre completo', datos.nombreAlumno, y, margen, ancho);
    y = dibujarFila(doc, 'Matrícula', datos.matricula, y, margen, ancho, true);

    y += 6;

    //SECCIÓN: DATOS DEL LIBRO
    y = dibujarSeccion(doc, 'DATOS DEL LIBRO', y, margen, ancho);

    y = dibujarFila(doc, 'Título', datos.nombreLibro, y, margen, ancho);
    y = dibujarFila(doc, 'Autor', datos.autor || '—', y, margen, ancho, true);

    y += 6;

    //SECCIÓN: DATOS DEL PRÉSTAMO
    y = dibujarSeccion(doc, 'DATOS DEL PRÉSTAMO', y, margen, ancho);

    y = dibujarFila(doc, 'Fecha de préstamo',   formatearFecha(datos.fechaPrestamo),   y, margen, ancho);
    y = dibujarFila(doc, 'Fecha de devolución', formatearFecha(datos.fechaDevolucion), y, margen, ancho, true);
    y = dibujarFila(doc, 'Registrado por',      datos.nombreEmpleado,                  y, margen, ancho);

    y += 6;

    //AVISO
    doc.setFillColor(...COLORES.grisClaro);
    doc.roundedRect(margen, y, ancho - margen * 2, 18, 2, 2, 'F');
    doc.setTextColor(...COLORES.texto);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const aviso = 'Por favor devuelva el material en la fecha indicada. La entrega tardía\ngenerará una multa de $10 MXN por día de retraso.';
    doc.text(aviso, ancho / 2, y + 6, { align: 'center' });

    y += 26;

    //FIRMA
    const centroFirma = ancho / 2;
    doc.setDrawColor(...COLORES.grisMedio);
    doc.setLineWidth(0.4);
    doc.line(centroFirma - 35, y, centroFirma + 35, y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORES.texto);
    doc.text('Firma del responsable de biblioteca', centroFirma, y + 5, { align: 'center' });

    // PIE DE PÁGINA 
    doc.setFillColor(...COLORES.guinda);
    doc.rect(0, alto - 14, ancho, 14, 'F');
    doc.setTextColor(...COLORES.blanco);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Biblioteca UTHH — Sistema de Préstamos', ancho / 2, alto - 7, { align: 'center' });
    doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')}`, ancho / 2, alto - 3, { align: 'center' });

    //DESCARGAR
    doc.save(`Comprobante_${datos.ticket}.pdf`);
    console.log(`[PDF] Comprobante generado: Comprobante_${datos.ticket}.pdf`);
};

//HELPERS

const dibujarSeccion = (doc, titulo, y, margen, ancho) => {
    doc.setFillColor(...COLORES.guinda);
    doc.rect(margen, y, ancho - margen * 2, 7, 'F');
    doc.setTextColor(...COLORES.blanco);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, margen + 3, y + 5);
    return y + 9;
};

const dibujarFila = (doc, etiqueta, valor, y, margen, ancho, sombreado = false) => {
    const altoFila = 9;
    if (sombreado) {
        doc.setFillColor(...COLORES.grisClaro);
        doc.rect(margen, y, ancho - margen * 2, altoFila, 'F');
    }
    doc.setTextColor(...COLORES.guinda);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(etiqueta, margen + 3, y + 6);

    doc.setTextColor(...COLORES.texto);
    doc.setFont('helvetica', 'normal');
    doc.text(String(valor), margen + 65, y + 6);

    return y + altoFila;
};

const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
};

window.generarComprobantePDF = generarComprobantePDF;