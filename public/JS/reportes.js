// VARIABLES GLOBALES
var DATA = null;
var STATS = null;
var chartInstances = {};
var PALETTE = ['#A02142', '#BC955B', '#7A1832', '#D4AF72', '#C4345A', '#5C3D2E', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100'];

// ====================== UTILIDADES ======================

// x(t) = C · e^(k · (t - t0))
function proyectar(item, t) {
    var k = obtenerK(item);
    var C = obtenerC(item);
    var t0 = item.t0 || 0;
    return C * Math.exp(k * (t - t0));
}

function tasaAPorcentaje(k) {
    // Calculamos el cambio relativo porcentual: (e^k - 1) * 100
    return ((Math.exp(k) - 1) * 100).toFixed(1);
}

function colorAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function formatearMes(ym) {
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

function obtenerK(item) {
    return item.tasa_k !== undefined ? item.tasa_k : 0;
}

function obtenerC(item) {
    // El backend ahora envía el C adecuado (incluso si era 0, envía 1)
    return item.C !== undefined ? item.C : 1;
}

// ====================== CHART.JS DEFAULTS ======================
Chart.defaults.font.family = "'Source Sans 3', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B6B6B';

// ====================== CARGA DE DATOS ======================
function cargarDatos() {
    var urlPrestamos = '/api/reportes/prestamos-por-mes?meses=6';
    var urlStats = '/api/reportes/estadisticas';

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
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function (ctx) { return ctx.parsed.y + ' prestamos'; } } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
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
                borderWidth: 3,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: { callbacks: { label: function (ctx) { return ctx.label + ': ' + ctx.parsed + ' prestamos'; } } }
            }
        }
    });

    var catsConTasa = DATA.categorias.map(function (c) {
        return { nombre: c.nombre, k: obtenerK(c), prestamos: c.prestamos };
    });
    catsConTasa.sort(function (a, b) { return b.k - a.k; });

    var htmlCrec = catsConTasa.filter(function (c) { return c.k > 0; }).slice(0, 5).map(function (c) {
        var pct = tasaAPorcentaje(c.k);
        var ultimo = c.prestamos[c.prestamos.length - 1];
        return '<li><span class="reco-titulo">' + c.nombre + '<small>' + ultimo + ' prestamos el ultimo mes</small></span><span class="reco-cambio up">+' + pct + '% / mes</span></li>';
    }).join('') || '<li class="empty">No hay categorias en crecimiento por ahora</li>';
    document.getElementById('categoriasCrecimiento').innerHTML = htmlCrec;

    var htmlDec = catsConTasa.filter(function (c) { return c.k < 0; }).slice(0, 5).map(function (c) {
        var pct = tasaAPorcentaje(c.k);
        var ultimo = c.prestamos[c.prestamos.length - 1];
        return '<li><span class="reco-titulo">' + c.nombre + '<small>' + ultimo + ' prestamos el ultimo mes</small></span><span class="reco-cambio down">' + pct + '% / mes</span></li>';
    }).join('') || '<li class="empty">No hay categorias en descenso por ahora</li>';
    document.getElementById('categoriasDecrecimiento').innerHTML = htmlDec;
}

// ====================== LIBROS ======================
function renderLibros() {
    if (!DATA || DATA.libros.length === 0) return;

    var librosConTasa = DATA.libros.map(function (l) {
        var tFinal = l.prestamos.length - 1;
        var x0 = l.prestamos[tFinal] || 0;
        var anterior = l.prestamos.length >= 2 ? l.prestamos[tFinal - 1] : 0;
        
        // Calculamos proyección para el mes t+1
        var valProy = proyectar(l, tFinal + 1);
        var proy = Math.round(valProy + 0.00001);

        return { nombre: l.nombre, categoria: l.categoria || 'Sin categoria', anterior: anterior, actual: x0, k: obtenerK(l), proyeccion: proy, prestamos: l.prestamos };
    });
    librosConTasa.sort(function (a, b) { return b.k - a.k; });

    var htmlCrec = librosConTasa.filter(function (l) { return l.k > 0; }).slice(0, 6).map(function (l) {
        var pct = tasaAPorcentaje(l.k);
        return '<li><span class="reco-titulo">' + l.nombre + '<small>' + l.categoria + ' - ' + l.actual + ' prestamos el ultimo mes</small></span><span class="reco-cambio up">+' + pct + '% / mes</span></li>';
    }).join('') || '<li class="empty">No hay libros en crecimiento por ahora</li>';
    document.getElementById('librosCrecimiento').innerHTML = htmlCrec;

    var htmlDec = librosConTasa.filter(function (l) { return l.k < 0; }).slice(0, 6).map(function (l) {
        var pct = tasaAPorcentaje(l.k);
        return '<li><span class="reco-titulo">' + l.nombre + '<small>' + l.categoria + ' - ' + l.actual + ' prestamos el ultimo mes</small></span><span class="reco-cambio down">' + pct + '% / mes</span></li>';
    }).join('') || '<li class="empty">No hay libros en descenso por ahora</li>';
    document.getElementById('librosDecrecimiento').innerHTML = htmlDec;

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

    var top10 = librosConTasa.slice(0, 10);
    destruirChart('chartTopLibros');
    chartInstances['chartTopLibros'] = new Chart(document.getElementById('chartTopLibros'), {
        type: 'bar',
        data: {
            labels: top10.map(function (l) { return l.nombre; }),
            datasets: [
                { label: 'Mes anterior', data: top10.map(function (l) { return l.anterior; }), backgroundColor: colorAlpha('#BC955B', 0.7), borderRadius: 6, borderSkipped: false },
                { label: 'Mes actual', data: top10.map(function (l) { return l.actual; }), backgroundColor: colorAlpha('#A02142', 0.85), borderRadius: 6, borderSkipped: false }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } },
                y: { grid: { display: false } }
            }
        }
    });
}

// ====================== CATEGORIAS ======================
function renderCategorias() {
    if (!DATA || DATA.categorias.length === 0) return;

    var mesesLabel = DATA.meses.map(formatearMes);

    destruirChart('chartCategoriasLinea');
    chartInstances['chartCategoriasLinea'] = new Chart(document.getElementById('chartCategoriasLinea'), {
        type: 'line',
        data: {
            labels: mesesLabel,
            datasets: DATA.categorias.map(function (c, i) {
                var color = PALETTE[i % PALETTE.length];
                return { label: c.nombre, data: c.prestamos, borderColor: color, backgroundColor: colorAlpha(color, 0.1), borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: color };
            })
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } },
            scales: { y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } }, x: { grid: { display: false } } }
        }
    });

    var catsConTasa = DATA.categorias.map(function (c) {
        var k = obtenerK(c);
        var total = c.prestamos.reduce(function (s, v) { return s + v; }, 0);
        return { nombre: c.nombre, total: total, promedio: (total / c.prestamos.length).toFixed(1), k: k, reco: obtenerRecomendacion(k), tendencia: obtenerTendenciaTexto(k), prestamos: c.prestamos };
    });
    catsConTasa.sort(function (a, b) { return b.k - a.k; });

    document.getElementById('tablaCategorias').innerHTML = catsConTasa.map(function (c) {
        var color = c.k >= 0 ? '#2E7D32' : '#E65100';
        return '<tr><td><strong>' + c.nombre + '</strong></td><td style="text-align:center">' + c.total + '</td><td style="text-align:center">' + c.promedio + '</td><td style="color:' + color + ';font-weight:600">' + c.tendencia + '</td><td><span class="badge ' + c.reco.clase + '">' + c.reco.texto + '</span></td></tr>';
    }).join('');

    destruirChart('chartRadar');
    chartInstances['chartRadar'] = new Chart(document.getElementById('chartRadar'), {
        type: 'radar',
        data: {
            labels: DATA.categorias.map(function (c) { return c.nombre; }),
            datasets: [
                {
                    label: 'Mes actual',
                    data: DATA.categorias.map(function (c) { return c.prestamos[c.prestamos.length - 1] || 0; }),
                    borderColor: '#A02142', backgroundColor: colorAlpha('#A02142', 0.15), borderWidth: 2, pointBackgroundColor: '#A02142'
                },
                {
                    label: 'Estimacion proximo mes',
                    data: DATA.categorias.map(function (c) {
                        return Math.round(proyectar(c, c.prestamos.length) + 0.00001);
                    }),
                    borderColor: '#BC955B', backgroundColor: colorAlpha('#BC955B', 0.1), borderWidth: 2, pointBackgroundColor: '#BC955B', borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle' } } },
            scales: { r: { beginAtZero: true, grid: { color: '#E0D8D0' }, angleLines: { color: '#E0D8D0' }, ticks: { precision: 0 } } }
        }
    });

    destruirChart('chartKCategorias');
    chartInstances['chartKCategorias'] = new Chart(document.getElementById('chartKCategorias'), {
        type: 'bar',
        data: {
            labels: catsConTasa.map(function (c) { return c.nombre; }),
            datasets: [{
                label: 'Cambio mensual %',
                data: catsConTasa.map(function (c) { return parseFloat(tasaAPorcentaje(c.k)); }),
                backgroundColor: catsConTasa.map(function (c) { return c.k >= 0 ? colorAlpha('#2E7D32', 0.7) : colorAlpha('#E65100', 0.7); }),
                borderRadius: 8, borderSkipped: false
            }]
        },
        options: {
            responsive: true, indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { var v = ctx.parsed.x; return (v >= 0 ? '+' : '') + v + '% por mes'; } } } },
            scales: {
                x: { grid: { color: '#E0D8D0' }, ticks: { callback: function (v) { return (v >= 0 ? '+' : '') + v + '%'; } } },
                y: { grid: { display: false } }
            }
        }
    });
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
    var tFinal = prestamos.length - 1;
    var x0 = prestamos[tFinal] || 0; 
    var k = obtenerK(item); 

    if (item.datos_suficientes === false) {
        var box = document.getElementById('resultadoBox');
        box.classList.add('visible');
        document.getElementById('resultadoTitulo').textContent = 'Estimación para: ' + item.nombre;
        document.getElementById('resultadoTexto').innerHTML = 'No hay historial suficiente para calcular una tendencia confiable.';
        return;
    }

    var proyeccionesTexto = [];      
    var proyeccionesGrafica = [];    
    var mesesFuturos = [];
    
    var partes = DATA.meses[DATA.meses.length - 1].split('-');
    var anio = parseInt(partes[0], 10);
    var mes = parseInt(partes[1], 10);

    for (var i = 1; i <= periodos; i++) {
        var tProyectado = tFinal + i;
        var valorExacto = proyectar(item, tProyectado);
        var valorRedondeado = Math.round(valorExacto + 0.00001);

        proyeccionesTexto.push(valorRedondeado);
        proyeccionesGrafica.push(Number(valorExacto.toFixed(2))); 

        mes++;
        if (mes > 12) { mes = 1; anio++; }
        mesesFuturos.push(anio + '-' + (mes < 10 ? '0' + mes : '' + mes));
    }

    var box = document.getElementById('resultadoBox');
    box.classList.add('visible');
    document.getElementById('resultadoTitulo').textContent = 'Estimación para: ' + item.nombre;

    var pctMensual = (parseFloat(tasaAPorcentaje(k)) || 0).toFixed(1);

    var ultimaProy = proyeccionesTexto[proyeccionesTexto.length - 1];
    var tendenciaTexto = k > 0 ? 'creciendo' : 'disminuyendo';

    document.getElementById('resultadoTexto').innerHTML = 
        'Basado en el historial de todos los meses, este elemento está <strong>' + tendenciaTexto + '</strong> ' +
        'a un ritmo de <strong>' + (k >= 0 ? '+' : '') + pctMensual + '% mensual</strong>. ' +
        'En <strong>' + periodos + ' meses</strong> se estiman <strong>' + ultimaProy + ' préstamos</strong>.';

    var labelsAll = DATA.meses.map(formatearMes).concat(mesesFuturos.map(formatearMes));
    var datosReal = prestamos.slice().concat(new Array(periodos).fill(null));

    var datosProyeccion = new Array(tFinal).fill(null);
    datosProyeccion.push(x0); 
    proyeccionesGrafica.forEach(function (v) { datosProyeccion.push(v); });

    destruirChart('chartProyeccion');
    chartInstances['chartProyeccion'] = new Chart(document.getElementById('chartProyeccion'), {
        type: 'line',
        data: {
            labels: labelsAll,
            datasets: [
                {
                    label: 'Préstamos reales',
                    data: datosReal,
                    borderColor: '#A02142', 
                    backgroundColor: 'rgba(160, 33, 66, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3, 
                    pointRadius: 5
                },
                {
                    label: 'Tendencia Matemática (Modelo Exponencial)',
                    data: datosProyeccion,
                    borderColor: '#BC955B', 
                    borderDash: [5, 5],      
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,            
                    pointStyle: 'triangle',
                    pointRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { precision: 0 }, 
                    title: { display: true, text: 'Cantidad de Préstamos' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var label = context.dataset.label || '';
                            var value = context.parsed.y;
                            return label + ': ~' + Math.round(value) + ' libros';
                        }
                    }
                }
            }
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
            setTimeout(function () { document.getElementById('loadingOverlay').classList.add('hidden'); }, 400);
        })
        .catch(function (error) {
            console.error('Error cargando reportes:', error);
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('errorMsg').style.display = 'block';
            document.getElementById('errorText').textContent = error.message || 'No se pudieron obtener los datos.';
        });
})();