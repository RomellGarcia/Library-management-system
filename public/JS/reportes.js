// VARIABLES GLOBALES
var DATA = null;
var STATS = null;
var chartInstances = {};
var PALETTE = ['#A02142', '#BC955B', '#7A1832', '#D4AF72', '#C4345A', '#5C3D2E', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100'];

// ====================== UTILIDADES ======================

// x(t) = C · e^(kt)
function proyectar(C, k, t) {
    return C * Math.exp(k * t);
}

// Porcentaje mensual de cambio: (e^k - 1) * 100
function tasaAPorcentaje(k) {
    return ((Math.exp(k) - 1) * 100).toFixed(1);
}

function colorAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function formatearMes(ym) {
    if(!ym) return "";
    var partes = ym.split('-');
    var nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return nombres[parseInt(partes[1], 10) - 1] + ' ' + partes[0].substring(2);
}

function destruirChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        chartInstances[id] = null;
    }
}

function obtenerRecomendacion(k) {
    if (k > 0.1) return { texto: 'Adquirir mas ejemplares', clase: 'alta' };
    if (k > 0.02) return { texto: 'Mantener acervo', clase: 'media' };
    if (k > -0.02) return { texto: 'Sin cambios', clase: 'media' };
    if (k > -0.1) return { texto: 'Monitorear', clase: 'baja' };
    return { texto: 'Considerar baja', clase: 'critica' };
}

function obtenerTendenciaTexto(k) {
    if (k > 0.05) return 'Crecimiento alto';
    if (k > 0) return 'Crecimiento moderado';
    if (k > -0.05) return 'Decrecimiento leve';
    return 'Decrecimiento marcado';
}

// k y C siempre desde la API
function obtenerK(item) {
    return item.tasa_k !== undefined ? item.tasa_k : 0;
}

function obtenerC(item) {
    return item.C !== undefined ? item.C : 0;
}

// ====================== CHART.JS DEFAULTS ======================
Chart.defaults.font.family = "'Source Sans 3', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B6B6B';

// ====================== CARGA DE DATOS ======================
function cargarDatos() {
    var urlPrestamos = '/api/reportes/prestamos-por-mes?meses=6';
    var urlStats = '/api/reportes/estadisticas';

    // Usamos fetchConToken asumiendo que ya está definida globalmente
    return Promise.all([
        fetchConToken(urlPrestamos).then(function (r) { return r.json(); }),
        fetchConToken(urlStats).then(function (r) { return r.json(); })
    ])
    .then(function (resultados) {
        var resPrestamos = resultados[0];
        var resStats = resultados[1];
        
        if (!resPrestamos.success) throw new Error(resPrestamos.message || 'Error al obtener datos');
        
        DATA = resPrestamos.data;
        STATS = resStats.success ? resStats.data : null;
        return true;
    });
}

// ====================== TABS ======================
function initTabs() {
    var tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
            document.getElementById('sec-' + tab.getAttribute('data-section')).classList.add('active');
        });
    });
}

// ====================== RESUMEN ======================
function renderResumen() {
    if (!DATA || !DATA.meses || DATA.meses.length === 0) return;

    var mesesLabel = DATA.meses.map(formatearMes);

    var totalesMes = DATA.meses.map(function (mes, idx) {
        var total = 0;
        DATA.categorias.forEach(function (c) { total += (c.prestamos[idx] || 0); });
        return total;
    });

    var totalActual = totalesMes[totalesMes.length - 1] || 0;
    var totalAnterior = totalesMes.length >= 2 ? totalesMes[totalesMes.length - 2] : 0;
    var cambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : 0;

    var librosCrec = DATA.libros.filter(function (l) { return obtenerK(l) > 0; }).length;
    var totalLibros = STATS ? STATS.total_libros : DATA.libros.length;
    var prestamosActivos = STATS ? STATS.prestamos_activos : 0;

    var html = '';
    html += '<div class="stat-card"><div class="stat-label">Prestamos Este Mes</div><div class="stat-value">' + totalActual + '</div>';
    html += '<div class="stat-change ' + (cambio >= 0 ? 'up' : 'down') + '">' + (cambio >= 0 ? 'Sube' : 'Baja') + ' ' + Math.abs(cambio) + '% vs mes anterior</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Libros en el Acervo</div><div class="stat-value">' + totalLibros + '</div>';
    html += '<div class="stat-desc">Titulos disponibles para prestamo</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Prestamos Activos</div><div class="stat-value">' + prestamosActivos + '</div>';
    html += '<div class="stat-desc">Libros actualmente prestados</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Libros con Movimiento</div><div class="stat-value">' + librosCrec + '</div>';
    html += '<div class="stat-desc">Titulos con demanda creciente</div></div>';
    document.getElementById('statsGrid').innerHTML = html;

    destruirChart('chartPrestamosMes');
    chartInstances['chartPrestamosMes'] = new Chart(document.getElementById('chartPrestamosMes'), {
        type: 'bar',
        data: {
            labels: mesesLabel,
            datasets: [{
                label: 'Prestamos',
                data: totalesMes,
                backgroundColor: totalesMes.map(function (_, i) {
                    return i === totalesMes.length - 1 ? '#A02142' : colorAlpha('#A02142', 0.55);
                }),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    var catActual = DATA.categorias.map(function (c) { return c.prestamos[c.prestamos.length - 1] || 0; });
    destruirChart('chartCategorias');
    chartInstances['chartCategorias'] = new Chart(document.getElementById('chartCategorias'), {
        type: 'doughnut',
        data: {
            labels: DATA.categorias.map(function (c) { return c.nombre; }),
            datasets: [{
                data: catActual,
                backgroundColor: DATA.categorias.map(function (_, i) { return PALETTE[i % PALETTE.length]; }),
                borderWidth: 2
            }]
        },
        options: { responsive: true, cutout: '65%' }
    });
}

// ====================== LIBROS ======================
function renderLibros() {
    if (!DATA || DATA.libros.length === 0) return;

    var tFinal = DATA.meses.length - 1;
    var librosConTasa = DATA.libros.map(function (l) {
        var k = obtenerK(l);
        var C = obtenerC(l);
        var x0 = l.prestamos[l.prestamos.length - 1] || 0;
        var anterior = l.prestamos.length >= 2 ? l.prestamos[l.prestamos.length - 2] : 0;
        
        // Usamos Math.floor para no inflar expectativas si k es baja
        var proy = C > 0 ? Math.floor(proyectar(C, k, tFinal + 1)) : x0;

        return { nombre: l.nombre, categoria: l.categoria || 'Sin categoria', anterior: anterior, actual: x0, k: k, proyeccion: proy, prestamos: l.prestamos };
    });
    
    librosConTasa.sort(function (a, b) { return b.k - a.k; });

    document.getElementById('tablaLibros').innerHTML = librosConTasa.map(function (libro) {
        var reco = obtenerRecomendacion(libro.k);
        return '<tr>' +
            '<td><strong>' + libro.nombre + '</strong></td>' +
            '<td>' + libro.categoria + '</td>' +
            '<td style="text-align:center">' + libro.anterior + '</td>' +
            '<td style="text-align:center"><strong>' + libro.actual + '</strong></td>' +
            '<td style="text-align:center;color:' + (libro.k >= 0 ? '#2E7D32' : '#E65100') + ';font-weight:600">' + libro.proyeccion + '</td>' +
            '<td><span class="badge ' + reco.clase + '">' + reco.texto + '</span></td>' +
            '</tr>';
    }).join('');
}

// ====================== CATEGORIAS ======================
function renderCategorias() {
    if (!DATA || DATA.categorias.length === 0) return;

    var catsConTasa = DATA.categorias.map(function (c) {
        var k = obtenerK(c);
        var total = c.prestamos.reduce(function (s, v) { return s + v; }, 0);
        return { nombre: c.nombre, total: total, promedio: (total / c.prestamos.length).toFixed(1), k: k, reco: obtenerRecomendacion(k), tendencia: obtenerTendenciaTexto(k) };
    });

    document.getElementById('tablaCategorias').innerHTML = catsConTasa.map(function (c) {
        var color = c.k >= 0 ? '#2E7D32' : '#E65100';
        return '<tr><td><strong>' + c.nombre + '</strong></td><td style="text-align:center">' + c.total + '</td><td style="text-align:center">' + c.promedio + '</td><td style="color:' + color + ';font-weight:600">' + c.tendencia + '</td><td><span class="badge ' + c.reco.clase + '">' + c.reco.texto + '</span></td></tr>';
    }).join('');
}

// ====================== PROYECCION ======================
function llenarSeleccion() {
    if (!DATA) return;
    var tipo = document.getElementById('projTipo').value;
    var sel = document.getElementById('projSeleccion');
    sel.innerHTML = '';
    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    items.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item.nombre;
        opt.textContent = item.nombre;
        sel.appendChild(opt);
    });
}

function calcularProyeccion() {
    if (!DATA) return;
    var tipo = document.getElementById('projTipo').value;
    var seleccion = document.getElementById('projSeleccion').value;
    var periodos = parseInt(document.getElementById('projPeriodos').value) || 3;

    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    var item = items.find(function (i) { return i.nombre === seleccion; });
    if (!item) return;

    var prestamos = item.prestamos;
    var k = obtenerK(item);
    var C = obtenerC(item);
    var t0 = item.t0 || 0;
    var tFinal = DATA.meses.length - 1;
    var x0 = prestamos[tFinal] || 0;

    // Caja de resultado visible
    var box = document.getElementById('resultadoBox');
    box.classList.add('visible');
    document.getElementById('resultadoTitulo').textContent = 'Estimacion para: ' + item.nombre;

    if (item.datos_suficientes === false) {
        document.getElementById('resultadoTexto').innerHTML = 'Actividad insuficiente para calcular tendencia.';
        return;
    }

    var proyecciones = [];
    var mesesFuturos = [];
    var partes = DATA.meses[DATA.meses.length - 1].split('-');
    var anio = parseInt(partes[0], 10);
    var mes = parseInt(partes[1], 10);

    for (var i = 1; i <= periodos; i++) {
        var valorReal = proyectar(C, k, tFinal + i);
        // Usamos floor para ser conservadores en la proyección
        var valorRedondeado = Math.floor(valorReal); 
        proyecciones.push(valorRedondeado);

        mes++;
        if (mes > 12) { mes = 1; anio++; }
        mesesFuturos.push(anio + '-' + (mes < 10 ? '0' + mes : '' + mes));
    }

    var ultimaProy = proyecciones[proyecciones.length - 1];
    document.getElementById('resultadoTexto').innerHTML = 
        'Tendencia de <strong>' + (k >= 0 ? '+' : '') + tasaAPorcentaje(k) + '% mensual</strong>. ' +
        'En ' + periodos + ' meses se esperan <strong>' + ultimaProy + ' prestamos</strong>.';

    // Tabla de parámetros CI y K
    if (document.getElementById('tablaModelo')) {
        document.getElementById('tablaModelo').innerHTML =
            '<table class="tabla-modelo">' +
            '<thead><tr><th>Parámetro</th><th>Valor (X)</th><th>Tiempo (T)</th></tr></thead>' +
            '<tbody>' +
            '<tr><td><strong>Condición Inicial (CI)</strong></td><td>' + C + '</td><td>' + t0 + '</td></tr>' +
            '<tr><td><strong>Tasa (K)</strong></td><td>' + k.toFixed(4) + '</td><td>' + tFinal + '</td></tr>' +
            '</tbody></table>';
    }

    // Gráfica de Proyección
    var labelsAll = DATA.meses.map(formatearMes).concat(mesesFuturos.map(formatearMes));
    var datosReal = prestamos.slice().concat(new Array(periodos).fill(null));
    var datosProyeccion = new Array(tFinal).fill(null);
    datosProyeccion.push(x0);
    proyecciones.forEach(function (v) { datosProyeccion.push(v); });

    destruirChart('chartProyeccion');
    chartInstances['chartProyeccion'] = new Chart(document.getElementById('chartProyeccion'), {
        type: 'line',
        data: {
            labels: labelsAll,
            datasets: [
                { label: 'Real', data: datosReal, borderColor: '#A02142', fill: false, tension: 0.3 },
                { label: 'Proyeccion', data: datosProyeccion, borderColor: '#BC955B', borderDash: [5, 5], fill: false, tension: 0.3 }
            ]
        }
    });
}

// ====================== INIT ======================
(function () {
    initTabs();
    cargarDatos()
    .then(function () {
        renderResumen();
        renderLibros();
        renderCategorias();
        llenarSeleccion();
        document.getElementById('projTipo').addEventListener('change', llenarSeleccion);
        document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);
        document.getElementById('loadingOverlay').classList.add('hidden');
    })
    .catch(function (error) {
        console.error('Error:', error);
        document.getElementById('loadingOverlay').classList.add('hidden');
    });
})();