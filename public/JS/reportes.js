// VARIABLES GLOBALES
var DATA = null;
var STATS = null;
var chartInstances = {};
var PALETTE = ['#A02142', '#BC955B', '#7A1832', '#D4AF72', '#C4345A', '#5C3D2E', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100'];

// ====================== CALCULOS INTERNOS ======================

function calcularTasa(x0, x1, deltaT) {
    if (x0 <= 0 || x1 <= 0 || deltaT <= 0) return 0;
    return Math.log(x1 / x0) / deltaT;
}

function proyectar(x0, k, t) {
    return x0 * Math.exp(k * t);
}

function calcularTasaPromedio(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    // Filtrar solo los valores con actividad real (> 0) manteniendo el índice para el Δt
    var puntosValidos = [];
    prestamos.forEach(function(v, i) {
        if (v > 0) puntosValidos.push({ valor: v, indice: i });
    });

    if (puntosValidos.length < 2) return 0;

    var suma = 0;
    var count = 0;

    for (var i = 1; i < puntosValidos.length; i++) {
        var x0 = puntosValidos[i - 1].valor;
        var x1 = puntosValidos[i].valor;
        var deltaT = puntosValidos[i].indice - puntosValidos[i - 1].indice; // meses reales entre ambos
        if (deltaT <= 0) continue;

        var k = Math.log(x1 / x0) / deltaT;  // ← k = ln(x₁/x₀) / Δt real
        if (isFinite(k) && Math.abs(k) < 5) {
            suma += k;
            count++;
        }
    }

    return count > 0 ? suma / count : 0;
}


function calcularDeltaMeses(mes1, mes2) {
    var p1 = mes1.split('-').map(Number);
    var p2 = mes2.split('-').map(Number);
    return (p2[0] - p1[0]) * 12 + (p2[1] - p1[1]);
}

// Convertir tasa a porcentaje aproximado de cambio mensual
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
    var partes = ym.split('-');
    var nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var idx = parseInt(partes[1], 10) - 1;
    return nombres[idx] + ' ' + partes[0].substring(2);
}

function destruirChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        chartInstances[id] = null;
    }
}

// Determinar nivel de recomendacion basado en tasa
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

// CHART.JS DEFAULTS
Chart.defaults.font.family = "'Source Sans 3', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B6B6B';

// CARGA DE DATOS
function cargarDatos() {
    var urlPrestamos = '/api/reportes/prestamos-por-mes?meses=6';
    var urlStats = '/api/reportes/estadisticas';

    return Promise.all([
        fetchConToken(urlPrestamos).then(function(r) { return r.json(); }),
        fetchConToken(urlStats).then(function(r) { return r.json(); })
    ])
    .then(function(resultados) {
        var resPrestamos = resultados[0];
        var resStats = resultados[1];

        if (!resPrestamos.success) {
            throw new Error(resPrestamos.message || 'Error al obtener datos');
        }

        DATA = resPrestamos.data;
        STATS = resStats.success ? resStats.data : null;
        return true;
    });
}

// TABS
function initTabs() {
    var tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
            document.getElementById('sec-' + tab.getAttribute('data-section')).classList.add('active');
        });
    });
}

// SECCION: RESUMEN GENERAL
function renderResumen() {
    if (!DATA || !DATA.meses || DATA.meses.length === 0) return;

    var mesesLabel = DATA.meses.map(formatearMes);

    var totalesMes = DATA.meses.map(function(mes, idx) {
        var total = 0;
        DATA.categorias.forEach(function(c) {
            total += (c.prestamos[idx] || 0);
        });
        return total;
    });

    var totalActual = totalesMes[totalesMes.length - 1] || 0;
    var totalAnterior = totalesMes.length >= 2 ? totalesMes[totalesMes.length - 2] : 0;
    var cambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : 0;

    // Corregido: pasar DATA.meses
    var librosCrec = DATA.libros.filter(function(l) { 
        return calcularTasaPromedio(l.prestamos, DATA.meses) > 0; 
    }).length;

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

    // Chart prestamos por mes
    destruirChart('chartPrestamosMes');
    chartInstances['chartPrestamosMes'] = new Chart(document.getElementById('chartPrestamosMes'), {
        type: 'bar',
        data: {
            labels: mesesLabel,
            datasets: [{
                label: 'Prestamos',
                data: totalesMes,
                backgroundColor: totalesMes.map(function(_, i) {
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
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ctx.parsed.y + ' prestamos'; }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });

    // Chart categorias donut
    var catActual = DATA.categorias.map(function(c) {
        return c.prestamos[c.prestamos.length - 1] || 0;
    });
    destruirChart('chartCategorias');
    chartInstances['chartCategorias'] = new Chart(document.getElementById('chartCategorias'), {
        type: 'doughnut',
        data: {
            labels: DATA.categorias.map(function(c) { return c.nombre; }),
            datasets: [{
                data: catActual,
                backgroundColor: DATA.categorias.map(function(_, i) { return PALETTE[i % PALETTE.length]; }),
                borderWidth: 3,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ctx.label + ': ' + ctx.parsed + ' prestamos'; }
                    }
                }
            }
        }
    });

    // Recomendaciones de categorias
    var catsConTasa = DATA.categorias.map(function(c) {
        return { 
            nombre: c.nombre, 
            k: calcularTasaPromedio(c.prestamos, DATA.meses),   // Corregido
            prestamos: c.prestamos 
        };
    });
    catsConTasa.sort(function(a, b) { return b.k - a.k; });

    var crecimiento = catsConTasa.filter(function(c) { return c.k > 0; }).slice(0, 5);
    var decrecimiento = catsConTasa.filter(function(c) { return c.k < 0; }).slice(0, 5);

    var htmlCrec = '';
    if (crecimiento.length === 0) {
        htmlCrec = '<li class="empty">No hay categorias en crecimiento por ahora</li>';
    } else {
        crecimiento.forEach(function(c) {
            var pct = tasaAPorcentaje(c.k);
            var ultimo = c.prestamos[c.prestamos.length - 1];
            htmlCrec += '<li><span class="reco-titulo">' + c.nombre + '<small>' + ultimo + ' prestamos el ultimo mes</small></span>';
            htmlCrec += '<span class="reco-cambio up">+' + pct + '% / mes</span></li>';
        });
    }
    document.getElementById('categoriasCrecimiento').innerHTML = htmlCrec;

    var htmlDec = '';
    if (decrecimiento.length === 0) {
        htmlDec = '<li class="empty">No hay categorias en descenso por ahora</li>';
    } else {
        decrecimiento.forEach(function(c) {
            var pct = tasaAPorcentaje(c.k);
            var ultimo = c.prestamos[c.prestamos.length - 1];
            htmlDec += '<li><span class="reco-titulo">' + c.nombre + '<small>' + ultimo + ' prestamos el ultimo mes</small></span>';
            htmlDec += '<span class="reco-cambio down">' + pct + '% / mes</span></li>';
        });
    }
    document.getElementById('categoriasDecrecimiento').innerHTML = htmlDec;
}

// SECCION: LIBROS
function renderLibros() {
    if (!DATA || DATA.libros.length === 0) return;

    var librosConTasa = DATA.libros.map(function(l) {
        var k = calcularTasaPromedio(l.prestamos, DATA.meses);   // Corregido
        var x0 = l.prestamos[l.prestamos.length - 1] || 0;
        var anterior = l.prestamos.length >= 2 ? l.prestamos[l.prestamos.length - 2] : 0;
        var proy = x0 > 0 ? Math.round(proyectar(x0, k, 1)) : 0;

        return {
            nombre: l.nombre,
            categoria: l.categoria || 'Sin categoria',
            anterior: anterior,
            actual: x0,
            k: k,
            proyeccion: proy,
            prestamos: l.prestamos
        };
    });

    librosConTasa.sort(function(a, b) { return b.k - a.k; });

    // Recomendaciones
    var crecimiento = librosConTasa.filter(function(l) { return l.k > 0; }).slice(0, 6);
    var decrecimiento = librosConTasa.filter(function(l) { return l.k < 0; }).slice(0, 6);

    var htmlCrec = '';
    if (crecimiento.length === 0) {
        htmlCrec = '<li class="empty">No hay libros en crecimiento por ahora</li>';
    } else {
        crecimiento.forEach(function(l) {
            var pct = tasaAPorcentaje(l.k);
            htmlCrec += '<li><span class="reco-titulo">' + l.nombre + '<small>' + l.categoria + ' - ' + l.actual + ' prestamos el ultimo mes</small></span>';
            htmlCrec += '<span class="reco-cambio up">+' + pct + '% / mes</span></li>';
        });
    }
    document.getElementById('librosCrecimiento').innerHTML = htmlCrec;

    var htmlDec = '';
    if (decrecimiento.length === 0) {
        htmlDec = '<li class="empty">No hay libros en descenso por ahora</li>';
    } else {
        decrecimiento.forEach(function(l) {
            var pct = tasaAPorcentaje(l.k);
            htmlDec += '<li><span class="reco-titulo">' + l.nombre + '<small>' + l.categoria + ' - ' + l.actual + ' prestamos el ultimo mes</small></span>';
            htmlDec += '<span class="reco-cambio down">' + pct + '% / mes</span></li>';
        });
    }
    document.getElementById('librosDecrecimiento').innerHTML = htmlDec;

    // Tabla
    var tbodyHTML = '';
    librosConTasa.forEach(function(libro) {
        var reco = obtenerRecomendacion(libro.k);
        tbodyHTML += '<tr>' +
            '<td><strong>' + libro.nombre + '</strong></td>' +
            '<td>' + libro.categoria + '</td>' +
            '<td style="text-align:center">' + libro.anterior + '</td>' +
            '<td style="text-align:center"><strong>' + libro.actual + '</strong></td>' +
            '<td style="text-align:center;color:' + (libro.k >= 0 ? '#2E7D32' : '#E65100') + ';font-weight:600">' + libro.proyeccion + '</td>' +
            '<td><span class="badge ' + reco.clase + '">' + reco.texto + '</span></td>' +
            '</tr>';
    });
    document.getElementById('tablaLibros').innerHTML = tbodyHTML;

    // Top 10
    var top10 = librosConTasa.slice(0, 10);
    destruirChart('chartTopLibros');
    chartInstances['chartTopLibros'] = new Chart(document.getElementById('chartTopLibros'), {
        type: 'bar',
        data: {
            labels: top10.map(function(l) { return l.nombre; }),
            datasets: [
                {
                    label: 'Mes anterior',
                    data: top10.map(function(l) { return l.anterior; }),
                    backgroundColor: colorAlpha('#BC955B', 0.7),
                    borderRadius: 6, borderSkipped: false
                },
                {
                    label: 'Mes actual',
                    data: top10.map(function(l) { return l.actual; }),
                    backgroundColor: colorAlpha('#A02142', 0.85),
                    borderRadius: 6, borderSkipped: false
                }
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

// SECCION: CATEGORIAS
function renderCategorias() {
    if (!DATA || DATA.categorias.length === 0) return;

    var mesesLabel = DATA.meses.map(formatearMes);

    destruirChart('chartCategoriasLinea');
    chartInstances['chartCategoriasLinea'] = new Chart(document.getElementById('chartCategoriasLinea'), {
        type: 'line',
        data: {
            labels: mesesLabel,
            datasets: DATA.categorias.map(function(c, i) {
                var color = PALETTE[i % PALETTE.length];
                return {
                    label: c.nombre,
                    data: c.prestamos,
                    borderColor: color,
                    backgroundColor: colorAlpha(color, 0.1),
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: color
                };
            })
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });

    // Tabla
    var catsConTasa = DATA.categorias.map(function(c) {
        var k = calcularTasaPromedio(c.prestamos, DATA.meses);   // Corregido
        var total = c.prestamos.reduce(function(s, v) { return s + v; }, 0);
        var prom = (total / c.prestamos.length).toFixed(1);
        var reco = obtenerRecomendacion(k);
        var tendencia = obtenerTendenciaTexto(k);
        return { nombre: c.nombre, total: total, promedio: prom, k: k, reco: reco, tendencia: tendencia, prestamos: c.prestamos };
    });

    catsConTasa.sort(function(a, b) { return b.k - a.k; });

    var tbHTML = '';
    catsConTasa.forEach(function(c) {
        var color = c.k >= 0 ? '#2E7D32' : '#E65100';
        tbHTML += '<tr>' +
            '<td><strong>' + c.nombre + '</strong></td>' +
            '<td style="text-align:center">' + c.total + '</td>' +
            '<td style="text-align:center">' + c.promedio + '</td>' +
            '<td style="color:' + color + ';font-weight:600">' + c.tendencia + '</td>' +
            '<td><span class="badge ' + c.reco.clase + '">' + c.reco.texto + '</span></td>' +
            '</tr>';
    });
    document.getElementById('tablaCategorias').innerHTML = tbHTML;

    // Radar y otros charts...
    destruirChart('chartRadar');
    chartInstances['chartRadar'] = new Chart(document.getElementById('chartRadar'), {
        type: 'radar',
        data: {
            labels: DATA.categorias.map(function(c) { return c.nombre; }),
            datasets: [{
                label: 'Mes actual',
                data: DATA.categorias.map(function(c) { return c.prestamos[c.prestamos.length - 1] || 0; }),
                borderColor: '#A02142',
                backgroundColor: colorAlpha('#A02142', 0.15),
                borderWidth: 2,
                pointBackgroundColor: '#A02142'
            }, {
                label: 'Estimacion proximo mes',
                data: DATA.categorias.map(function(c) {
                    var k = calcularTasaPromedio(c.prestamos, DATA.meses);  // Corregido
                    var x0 = c.prestamos[c.prestamos.length - 1] || 0;
                    return Math.round(proyectar(x0, k, 1));
                }),
                borderColor: '#BC955B',
                backgroundColor: colorAlpha('#BC955B', 0.1),
                borderWidth: 2,
                pointBackgroundColor: '#BC955B',
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle' } } },
            scales: { r: { beginAtZero: true, grid: { color: '#E0D8D0' }, angleLines: { color: '#E0D8D0' }, ticks: { precision: 0 } } }
        }
    });

    // Chart K categorías (cambio %)
    destruirChart('chartKCategorias');
    chartInstances['chartKCategorias'] = new Chart(document.getElementById('chartKCategorias'), {
        type: 'bar',
        data: {
            labels: catsConTasa.map(function(c) { return c.nombre; }),
            datasets: [{
                label: 'Cambio mensual %',
                data: catsConTasa.map(function(c) { return parseFloat(tasaAPorcentaje(c.k)); }),
                backgroundColor: catsConTasa.map(function(c) {
                    return c.k >= 0 ? colorAlpha('#2E7D32', 0.7) : colorAlpha('#E65100', 0.7);
                }),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            var v = ctx.parsed.x;
                            return (v >= 0 ? '+' : '') + v + '% por mes';
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: '#E0D8D0' }, ticks: { callback: function(v) { return (v >= 0 ? '+' : '') + v + '%'; }} },
                y: { grid: { display: false } }
            }
        }
    });
}

// SECCION: PROYECCION
function llenarSeleccion() {
    if (!DATA) return;
    var tipo = document.getElementById('projTipo').value;
    var sel = document.getElementById('projSeleccion');
    sel.innerHTML = '';

    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    items.forEach(function(item) {
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
    var item = items.find(function(i) { return i.nombre === seleccion; });
    if (!item) return;

    var prestamos = item.prestamos;
    var k = calcularTasaPromedio(prestamos, DATA.meses);   // Corregido
    var x0 = prestamos[prestamos.length - 1] || 0;

    // ... (el resto de la función se mantiene igual)
    var proyecciones = [];
    var mesesFuturos = [];
    var ultimoMes = DATA.meses[DATA.meses.length - 1];
    var partesUltimo = ultimoMes.split('-');
    var anio = parseInt(partesUltimo[0], 10);
    var mes = parseInt(partesUltimo[1], 10);

    for (var i = 1; i <= periodos; i++) {
        var valor = proyectar(x0, k, i);
        proyecciones.push(Math.round(valor));
        mes++;
        if (mes > 12) { mes = 1; anio++; }
        var mesStr = anio + '-' + (mes < 10 ? '0' + mes : '' + mes);
        mesesFuturos.push(mesStr);
    }

    // Resultado box (se mantiene igual)
    var box = document.getElementById('resultadoBox');
    box.classList.add('visible');
    document.getElementById('resultadoTitulo').textContent = 'Estimacion para: ' + item.nombre;

    var pctMensual = tasaAPorcentaje(k);
    var ultimaProy = proyecciones[proyecciones.length - 1];
    var diferencia = ultimaProy - x0;

    var textoCambio = '';
    if (k > 0.05) textoCambio = 'esta creciendo de manera notable';
    else if (k > 0) textoCambio = 'esta creciendo de forma moderada';
    else if (k > -0.05) textoCambio = 'esta disminuyendo levemente';
    else textoCambio = 'esta disminuyendo de manera marcada';

    document.getElementById('resultadoTexto').innerHTML =
        'Actualmente este ' + (tipo === 'libro' ? 'libro' : 'categoria') + ' tiene <strong>' + x0 + ' prestamos</strong> en el ultimo mes y ' + textoCambio + ' a un ritmo de aproximadamente ' +
        '<strong>' + (k >= 0 ? '+' : '') + pctMensual + '% mensual</strong>. ' +
        'Si esta tendencia continua, en <strong>' + periodos + ' mes(es)</strong> se esperan cerca de ' +
        '<strong>' + ultimaProy + ' prestamos</strong> (' + (diferencia >= 0 ? 'un aumento' : 'una reduccion') + ' de ' + Math.abs(diferencia) + ' prestamos respecto al mes actual).';

    var recomendacion = '';
    if (k > 0.1) recomendacion = 'Recomendacion: Conviene adquirir mas ejemplares lo antes posible para evitar listas de espera.';
    else if (k > 0.02) recomendacion = 'Recomendacion: La demanda es estable y creciente. Mantener el acervo actual es suficiente por ahora.';
    else if (k > -0.02) recomendacion = 'Recomendacion: La demanda esta estable. No se requiere accion inmediata.';
    else if (k > -0.1) recomendacion = 'Recomendacion: Vigilar la tendencia. Si continua bajando, evaluar si el material sigue siendo relevante.';
    else recomendacion = 'Recomendacion: Considerar dar de baja este material o reasignar el espacio a titulos con mayor demanda.';

    document.getElementById('resultadoReco').textContent = recomendacion;

    // Chart de proyección (se mantiene igual)
    var labelsHistoricos = DATA.meses.map(formatearMes);
    var labelsFuturos = mesesFuturos.map(formatearMes);
    var labelsAll = labelsHistoricos.concat(labelsFuturos);

    var datosHistCompleto = prestamos.slice().concat(new Array(periodos).fill(null));
    var datosProyectados = new Array(prestamos.length - 1).fill(null);
    datosProyectados.push(prestamos[prestamos.length - 1]);
    datosProyectados = datosProyectados.concat(proyecciones);

    destruirChart('chartProyeccion');
    chartInstances['chartProyeccion'] = new Chart(document.getElementById('chartProyeccion'), {
        type: 'line',
        data: {
            labels: labelsAll,
            datasets: [
                {
                    label: 'Prestamos reales',
                    data: datosHistCompleto,
                    borderColor: '#A02142',
                    backgroundColor: colorAlpha('#A02142', 0.1),
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#A02142'
                },
                {
                    label: 'Estimacion futura',
                    data: datosProyectados,
                    borderColor: '#BC955B',
                    backgroundColor: colorAlpha('#BC955B', 0.1),
                    borderWidth: 2.5,
                    borderDash: [8, 4],
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#BC955B',
                    pointStyle: 'triangle'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + ' prestamos'; }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 }, title: { display: true, text: 'Prestamos', font: { weight: 600 } } },
                x: { grid: { display: false }, title: { display: true, text: 'Mes', font: { weight: 600 } } }
            }
        }
    });
}

// INIT
(function() {
    initTabs();

    cargarDatos()
        .then(function() {
            renderResumen();
            renderLibros();
            renderCategorias();

            llenarSeleccion();
            document.getElementById('projTipo').addEventListener('change', llenarSeleccion);
            document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);

            setTimeout(function() {
                document.getElementById('loadingOverlay').classList.add('hidden');
            }, 400);
        })
        .catch(function(error) {
            console.error('Error cargando reportes:', error);
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('errorMsg').style.display = 'block';
            document.getElementById('errorText').textContent = error.message || 'No se pudieron obtener los datos.';
        });
})();