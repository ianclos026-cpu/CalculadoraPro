// Variables globales adicionales
let logoBase64 = localStorage.getItem('logoEmpresa') || "";
let modoPared = false;
let mostrarPlacas = false;
let subTrabajos = [];
let ultimoResultado = null;

function cambiarModo() {
    modoPared = !modoPared;
    const btn = document.getElementById("btnModo");
    if (btn) {
        btn.innerText = modoPared ? "Ver como Cielorraso" : "Ver como Pared";
        btn.style.background = modoPared ? "#2c3e50" : "#e67e22";
    }
    calcular();
}

function togglePlacas() {
    mostrarPlacas = !mostrarPlacas;
    const btn = document.getElementById("btnPlacas");
    if (btn) {
        btn.innerText = mostrarPlacas ? "Ver solo Estructura" : "Ver con Placas";
        btn.style.background = mostrarPlacas ? "#2c3e50" : "#e67e22";
    }
    calcular(); // Esto hace que se refresquen los canvas
}

// Mantenemos esta para que no de error el HTML
function setVerPlacas(val) {
    togglePlacas();
}

function calcular() {
    let largoInput = document.getElementById("largo").value;
    let anchoInput = document.getElementById("ancho").value;
    const distVal = document.getElementById("distancia").value || 0;

    if (!largoInput || !anchoInput || largoInput <= 0 || anchoInput <= 0) {
        resetResultados();
        return;
    }

    // REGLA 1: El largo debe ser mayor que el ancho para optimizar
    let largo = parseFloat(largoInput);
    let ancho = parseFloat(anchoInput);

    let jLong = Math.floor(ancho / 1.2) * largo;
    let jTrans = Math.floor(largo / 2.4) * ancho;

    if (ancho > largo) {
        let temp = largo;
        largo = ancho;
        ancho = temp;
        document.getElementById("largo").value = largo;
        document.getElementById("ancho").value = ancho;
    }

    const h = parseFloat(distVal);

    // --- CÁLCULOS MÉTRICOS ---

    // 1. Superficie
    let m2Real = largo * ancho;
    let m2Final = m2Real * 1.1; // +10% desperdicio
    document.getElementById("m2").innerText = m2Final.toFixed(2) + " m²";
    document.getElementById("placas").innerText = Math.ceil(m2Final / 2.88);

    // 2. SOLERAS: Perímetro con solape LONGITUDINAL de 5cm (0.05m)
    let solapesAncho = Math.floor(ancho / 2.6);
    let solapesLargo = Math.floor(largo / 2.6);
    // Solape longitudinal (una a continuación de otra)
    let extraSoleras = ((solapesAncho * 2) + (solapesLargo * 2)) * 0.05;
    let metrosSoleraBase = (2 * (largo + ancho)) + extraSoleras;

    // 3. MONTANTES: Separación 0.40m, solape longitudinal de 0.60m
    // Restamos el inicio y final (largo - 0.01) para no duplicar con solera
    let lineasM = Math.floor((largo) / 0.4); 
    if (lineasM < 0) lineasM = 0;

    let solapesPorMontante = 0;
    if(ancho > 2.6){
        let montanteaux = ancho-2.6;
        let montante_1_6 = Math.floor(montanteaux/1.6);
        solapesPorMontante = 1 + montante_1_6;
    }else{
       solapesPorMontante = 0;
    }

    let metrosMontanteTotal = (lineasM * ancho) + (lineasM * solapesPorMontante * 0.80);
    
    // 4. MAESTRAS: Cada 1.20m (Simétricas si ancho < 2.4m)
    let maestras;
    let posicionesMaestras = [];

    if (ancho < 2.4) {
        maestras = 1;
        posicionesMaestras.push(ancho / 2);
    } else {
        maestras = Math.floor(ancho / 1.2);
        for(let i = 1; i <= maestras; i++) {
            posicionesMaestras.push(i * 1.2);
        }
    }

    // Uniones de maestras con refuerzo de solera de 40cm y 10 tornillos T1
    let unionesMaestras = maestras * Math.floor(largo / 2.6);
    let metrosRefuerzoSolera = unionesMaestras * 0.40;
    let tornillosT1Maestras = unionesMaestras * 10;
    let tornillosT1Montantes = solapesPorMontante * lineasM * 4;

    // Asignación de resultados de perfiles comerciales (2.6m)
    document.getElementById("soleras").innerText = Math.ceil((metrosSoleraBase + metrosRefuerzoSolera) / 2.6);
    document.getElementById("montantes").innerText = Math.ceil(metrosMontanteTotal / 2.6);
    document.getElementById("maestras").innerHTML = Math.ceil((maestras * largo) / 2.6);

    // 5. TORNILLERÍA Y FIJACIONES
    document.getElementById("tornillosT1").innerText = Math.ceil(tornillosT1Maestras + tornillosT1Montantes);
    document.getElementById("tornillosT2").innerText = Math.ceil(m2Final * 21);
    document.getElementById("tarugos").innerText = Math.ceil(metrosSoleraBase * 3.85);

    document.getElementById("masillaSR").innerText = (m2Real * 0.45).toFixed(1) + " kg";
    let kgLPU = m2Real * 0.9;
    let detalleLPU = calcularMasillaLPU(kgLPU);

    document.getElementById("masillaLPU").innerText = kgLPU.toFixed(1) + " kg";
    document.getElementById("masillaLPU").setAttribute("data-detalle", detalleLPU);

    // 6. CINTA Y ALAMBRE
    document.getElementById("cinta").innerText = ((jLong + jTrans) * 1.1).toFixed(1) + " m";

    // Alambre: Cruces * (altura + 0.40m de nudo)
    let cantidadCruces = lineasM * maestras;
    let metrosAlambre = cantidadCruces * (h + 0.40);
    document.getElementById("alambre").innerText = metrosAlambre.toFixed(1) + " m";

    // --- DIBUJOS ---
    dibujar2D(largo, ancho, lineasM, posicionesMaestras);
    dibujar3D(largo, ancho, lineasM, posicionesMaestras, h);
    
    ultimoResultado = {
    m2: m2Real, // 👈 REAL (correcto para presupuesto)
    placas: Math.ceil(m2Final / 2.88),
    soleras: Math.ceil((metrosSoleraBase + metrosRefuerzoSolera) / 2.6),
    montantes: Math.ceil(metrosMontanteTotal / 2.6),
    maestras: Math.ceil((maestras * largo) / 2.6),
    tornillosT1: Math.ceil(tornillosT1Maestras + tornillosT1Montantes),
    tornillosT2: Math.ceil(m2Final * 21),
    tarugos: Math.ceil(metrosSoleraBase * 3.85),
    masillaSR: m2Real * 0.45,
    masillaLPUkg: kgLPU,
    masillaLPUdetalle: detalleLPU,
    cinta: (jLong + jTrans) * 1.1,
    alambre: metrosAlambre
};
}
function calcularMasillaLPU(kgNecesarios) {
    const envases = [
        { tipo: "Balde 32 kg", kg: 32 },
        { tipo: "Bolsa 25 kg", kg: 25 },
        { tipo: "Caja 22 kg", kg: 22 },
        { tipo: "Balde 18 kg", kg: 18 },
        { tipo: "Balde 7 kg", kg: 7 },
        { tipo: "Bolsa 1.8 kg", kg: 1.8 }
    ];

    let mejorSolucion = null;
    let menorSobrante = Infinity;

    function buscar(index, kgActual, combinacion) {
        if (kgActual >= kgNecesarios) {
            let sobrante = kgActual - kgNecesarios;
            if (sobrante < menorSobrante) {
                menorSobrante = sobrante;
                mejorSolucion = { ...combinacion };
            }
            return;
        }

        if (index >= envases.length) return;

        let env = envases[index];

        // Probamos usar desde 0 hasta N unidades de este envase
        for (let i = 0; i <= Math.ceil(kgNecesarios / env.kg) + 2; i++) {
            combinacion[env.tipo] = i;
            buscar(index + 1, kgActual + i * env.kg, combinacion);
        }

        combinacion[env.tipo] = 0;
    }

    buscar(0, 0, {});

    // Generar texto final
    let detalle = [];
    for (let key in mejorSolucion) {
        if (mejorSolucion[key] > 0) {
            detalle.push(`${mejorSolucion[key]} x ${key}`);
        }
    }

    return detalle.join(" + ");
}

function resetResultados() {
    const ids = ["m2", "placas", "soleras", "montantes", "maestras", "tornillosT1", "tornillosT2", "tarugos", "masillaSR", "masillaLPU", "cinta", "alambre"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "-";
    });
}


// --- FUNCIONES DE DIBUJO ---

function dibujar2D(largo, ancho, lineas, posMaestras) {
    const canvas = document.getElementById("canvas2d");
    const ctx = canvas.getContext("2d");
    if (!canvas) return;
    canvas.width = 400; canvas.height = 400;

    const sc = Math.min(300 / largo, 300 / ancho);
    const L = largo * sc; const A = ancho * sc;
    const x0 = (400 - L) / 2; const y0 = (400 - A) / 2;

    ctx.clearRect(0, 0, 400, 400);

    // 1. DIBUJO DE PLACAS (1.20 x 2.40)
    ctx.fillStyle = "rgba(180, 180, 180, 0.4)"; // Gris transparente
    ctx.strokeStyle = "rgba(100, 100, 100, 0.8)"; // Borde más oscuro
    ctx.lineWidth = 1;

    for (let i = 0; i < Math.ceil(largo / 2.4); i++) {
        for (let j = 0; j < Math.ceil(ancho / 1.2); j++) {
            let px = x0 + (i * 2.4 * sc);
            let py = y0 + (j * 1.2 * sc);
            // Limitamos el ancho/alto de la placa al borde de la estructura
            let pw = Math.min(2.4 * sc, x0 + L - px);
            let ph = Math.min(1.2 * sc, y0 + A - py);
            
            if (pw > 0 && ph > 0) {
                ctx.fillRect(px, py, pw, ph);
                ctx.strokeRect(px, py, pw, ph);
            }
        }
    }

    // 2. SOLERAS con Solape (5cm)
    ctx.strokeStyle = "#333"; ctx.lineWidth = 3;
    ctx.strokeRect(x0, y0, L, A);

    ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 4;
    for (let k = 1; k * 2.6 < largo; k++) {
        let sx = x0 + (k * 2.6 * sc);
        let s5 = 0.05 * sc;
        ctx.beginPath(); ctx.moveTo(sx - s5, y0); ctx.lineTo(sx, y0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx - s5, y0 + A); ctx.lineTo(sx, y0 + A); ctx.stroke();
    }
    for (let k = 1; k * 2.6 < ancho; k++) {
        let sy = y0 + (k * 2.6 * sc);
        let s5 = 0.05 * sc;
        ctx.beginPath(); ctx.moveTo(x0, sy - s5); ctx.lineTo(x0, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0 + L, sy - s5); ctx.lineTo(x0 + L, sy); ctx.stroke();
    }

    // 3. MONTANTES con Solape (60cm)
    for (let i = 1; i <= lineas; i++) {
        let x = x0 + (i * 0.4 * sc);
        if (x < x0 + L - 1) {
            ctx.strokeStyle = "blue"; ctx.lineWidth = 1.5;
            if (ancho <= 2.6) {
                ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + A); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 2.6 * sc); ctx.stroke();
                ctx.strokeStyle = "cyan"; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(x, y0 + 2.0 * sc); ctx.lineTo(x, y0 + 2.6 * sc); ctx.stroke();
                ctx.strokeStyle = "blue"; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(x, y0 + 2.0 * sc); ctx.lineTo(x, y0 + A); ctx.stroke();
            }
        }
    }

    // 4. MAESTRAS y Refuerzos
    posMaestras.forEach(pos => {
        let y = y0 + (pos * sc);
        ctx.strokeStyle = "red"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + L, y); ctx.stroke();
        for (let k = 1; k * 2.6 < largo; k++) {
            let rx = x0 + (k * 2.6 * sc) - (0.2 * sc);
            ctx.strokeStyle = "orange"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + (0.4 * sc), y); ctx.stroke();
        }
    });
// 1. DIBUJO DE PLACAS (Paralelas a los montantes: 1.20 largo x 2.40 ancho)
    if (mostrarPlacas) {
        ctx.fillStyle = "rgba(210, 210, 210, 0.9)"; 
        ctx.strokeStyle = "rgba(100, 100, 100, 1)";
        ctx.lineWidth = 1;

        // Invertimos: i avanza cada 1.2m y j cada 2.4m
        for (let i = 0; i < Math.ceil(largo / 1.2); i++) {
            for (let j = 0; j < Math.ceil(ancho / 2.4); j++) {
                let px = x0 + (i * 1.2 * sc);
                let py = y0 + (j * 2.4 * sc);
                
                let pw = Math.min(1.2 * sc, x0 + L - px);
                let ph = Math.min(2.4 * sc, y0 + A - py);
                
                if (pw > 0 && ph > 0) {
                    ctx.fillRect(px, py, pw, ph);
                    ctx.strokeRect(px, py, pw, ph);
                }
            }
        }
    }
}

function dibujar3D(largo, ancho, lineas, posMaestras, h) {
    const canvas = document.getElementById("canvas3d");
    const ctx = canvas.getContext("2d");
    if (!canvas) return;
    canvas.width = 400; canvas.height = 400;

    const sc = Math.min(150 / largo, 150 / ancho);
    const L = largo * sc; const A = ancho * sc;

    const isoX = (x, y, z) => modoPared ? (x - z) * 0.8 : (x - y) * 0.8;
    const isoY = (x, y, z) => modoPared ? (x + z) * 0.4 - y : (x + y) * 0.4 - z;

    ctx.clearRect(0, 0, 400, 400);

    // --- CÁLCULO DE CENTRADO DINÁMICO ---
    const puntos = [
        {x: isoX(0, 0, 0), y: isoY(0, 0, 0)},
        {x: isoX(L, 0, 0), y: isoY(L, 0, 0)},
        {x: isoX(L, A, 0), y: isoY(L, A, 0)},
        {x: isoX(0, A, 0), y: isoY(0, A, 0)}
    ];
    const minX = Math.min(...puntos.map(p => p.x));
    const maxX = Math.max(...puntos.map(p => p.x));
    const minY = Math.min(...puntos.map(p => p.y));
    const maxY = Math.max(...puntos.map(p => p.y));

    const offsetX = (400 - (maxX - minX)) / 2 - minX;
    const offsetY = (400 - (maxY - minY)) / 2 - minY;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // 1. PLACAS 3D (Subdivididas)
    ctx.fillStyle = "rgba(180, 180, 180, 0.3)";
    ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
    for (let i = 0; i < Math.ceil(largo / 2.4); i++) {
        for (let j = 0; j < Math.ceil(ancho / 1.2); j++) {
            let x = i * 2.4 * sc;
            let y = j * 1.2 * sc;
            let w = Math.min(2.4 * sc, L - x);
            let a = Math.min(1.2 * sc, A - y);
            
            if (w > 0 && a > 0) {
                ctx.beginPath();
                ctx.moveTo(isoX(x, y, 0), isoY(x, y, 0));
                ctx.lineTo(isoX(x + w, y, 0), isoY(x + w, y, 0));
                ctx.lineTo(isoX(x + w, y + a, 0), isoY(x + w, y + a, 0));
                ctx.lineTo(isoX(x, y + a, 0), isoY(x, y + a, 0));
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    // 2. SOLERAS 3D
    ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(isoX(0,0,0), isoY(0,0,0)); ctx.lineTo(isoX(L,0,0), isoY(L,0,0));
    ctx.lineTo(isoX(L,A,0), isoY(L,A,0)); ctx.lineTo(isoX(0,A,0), isoY(0,A,0));
    ctx.closePath(); ctx.stroke();
    
    // Solape Amarillo Solera
    ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 3;
    for (let k = 1; k * 2.6 < largo; k++) {
        let sx = k * 2.6 * sc;
        let s5 = 0.05 * sc;
        ctx.beginPath(); 
        ctx.moveTo(isoX(sx-s5, 0, 0), isoY(sx-s5, 0, 0)); 
        ctx.lineTo(isoX(sx, 0, 0), isoY(sx, 0, 0)); 
        ctx.stroke();
    }

    // 3. MONTANTES 3D con Solape
    for (let i = 1; i <= lineas; i++) {
        let x = i * 0.4 * sc;
        ctx.strokeStyle = "blue"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(isoX(x, 0, 0), isoY(x, 0, 0)); ctx.lineTo(isoX(x, A, 0), isoY(x, A, 0)); ctx.stroke();
        if (ancho > 2.6) {
            ctx.strokeStyle = "cyan"; ctx.lineWidth = 2.5;
            ctx.beginPath(); 
            ctx.moveTo(isoX(x, 2.0*sc, 0), isoY(x, 2.0*sc, 0)); 
            ctx.lineTo(isoX(x, 2.6*sc, 0), isoY(x, 2.6*sc, 0)); 
            ctx.stroke();
        }
    }

    // 4. MAESTRAS 3D (Rojo)
    ctx.strokeStyle = "red"; ctx.lineWidth = 1.5;
    posMaestras.forEach(pos => {
        let y = pos * sc;
        ctx.beginPath(); ctx.moveTo(isoX(0, y, 0), isoY(0, y, 0)); ctx.lineTo(isoX(L, y, 0), isoY(L, y, 0)); ctx.stroke();
    });
    // 1. PLACAS 3D (Solo si el botón está activo)
// PLACAS 3D (Paralelas a los montantes: 1.20 largo x 2.40 ancho)
    if (mostrarPlacas) {
        ctx.fillStyle = "rgba(210, 210, 210, 0.9)";
        ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
        
        for (let i = 0; i < Math.ceil(largo / 1.2); i++) {
            for (let j = 0; j < Math.ceil(ancho / 2.4); j++) {
                let x = i * 1.2 * sc;
                let y = j * 2.4 * sc;
                let w = Math.min(1.2 * sc, L - x);
                let a = Math.min(2.4 * sc, A - y);
                
                if (w > 0 && a > 0) {
                    ctx.beginPath();
                    ctx.moveTo(isoX(x, y, 0), isoY(x, y, 0));
                    ctx.lineTo(isoX(x + w, y, 0), isoY(x + w, y, 0));
                    ctx.lineTo(isoX(x + w, y + a, 0), isoY(x + w, y + a, 0));
                    ctx.lineTo(isoX(x, y + a, 0), isoY(x, y + a, 0));
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }
    }

    ctx.restore();
}
// Función auxiliar para dibujar rectángulos isométricos
function drawIsoRect(ctx, isoX, isoY, w, a, z, fill = false) {
    ctx.beginPath();
    // Definimos los 4 puntos del plano (x, y, z)
    ctx.moveTo(isoX(0, 0, z), isoY(0, 0, z));
    ctx.lineTo(isoX(w, 0, z), isoY(w, 0, z));
    ctx.lineTo(isoX(w, a, z), isoY(w, a, z));
    ctx.lineTo(isoX(0, a, z), isoY(0, a, z));
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
}

// Evento para recalcular al cambiar el tamaño de ventana
window.addEventListener('resize', calcular);

// Cargar vista previa del logo si ya existe
window.onload = () => {
    // Logo
    if (logoBase64) {
        document.getElementById('previewLogo').innerHTML = `<img src="${logoBase64}">`;
    }

    // Empresa
    const empresaGuardada = localStorage.getItem('nombreEmpresa');
    if (empresaGuardada) {
        document.getElementById('nombreEmpresa').value = empresaGuardada;
    }

    // Precio
    const precioGuardado = localStorage.getItem('precioM2');
    if (precioGuardado) {
        document.getElementById('precioM2').value = precioGuardado;
    }
};

function procesarLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            logoBase64 = e.target.result;
            localStorage.setItem('logoEmpresa', logoBase64);
            document.getElementById('previewLogo').innerHTML = `<img src="${logoBase64}">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ... (Mantén tus funciones cambiarModo, togglePlacas, calcular y dibujos igual) ...

async function generarPDF(tipo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const empresa = document.getElementById('nombreEmpresa').value || "Empresa";
    const cliente = document.getElementById('nombreCliente').value || "Consumidor Final";
    const fecha = new Date().toLocaleDateString();
    const largo = parseFloat(document.getElementById("largo").value) || 0;
    const ancho = parseFloat(document.getElementById("ancho").value) || 0;
    const m2Valor = largo * ancho; // 👉 m2 REAL
    const precioM2 = parseFloat(document.getElementById('precioM2').value) || 0;
    const totalManoObra = m2Valor * precioM2;
    // Encabezado
if (logoBase64) {
    const img = new Image();
    img.src = logoBase64;

    const maxWidth = 30;
    const maxHeight = 30;

    let width = img.width;
    let height = img.height;

    const ratio = Math.min(maxWidth / width, maxHeight / height);

    width *= ratio;
    height *= ratio;

    doc.addImage(logoBase64, 'PNG', 15, 10, width, height);
}
    
    doc.setFontSize(18);
    doc.text(empresa, 50, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 50, 27);
    doc.text(`Cliente: ${cliente}`, 50, 34);
    
    doc.line(15, 45, 195, 45);

    if (tipo === 'presupuesto') {
        doc.setFontSize(14);
        doc.text("PRESUPUESTO DE MANO DE OBRA", 15, 55);
        
        let filas = [];

        subTrabajos.forEach(st => {

            const subtotal = st.materiales.m2 * precioM2;

            filas.push([
                st.nombre,
                st.materiales.m2.toFixed(2) + " m²",
                "$ " + precioM2,
                "$ " + subtotal.toFixed(2)
            ]);
        });

        // TOTAL
        let totalFinal = subTrabajos.reduce((acc, st) => {
            return acc + (st.materiales.m2 * precioM2);
        }, 0);

        filas.push([
            "TOTAL",
            "",
            "",
            "$ " + totalFinal.toFixed(2)
        ]);

        doc.autoTable({
            startY: 65,
            head: [["Descripción", "Cantidad", "Precio m²", "Subtotal"]],
            body: filas,
            theme: 'striped',
            headStyles: { fillColor: [230, 126, 34] }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL PRESUPUESTO: $ ${totalFinal.toFixed(2)}`, 195, finalY, { align: 'right' });

    } else {
        doc.setFontSize(14);
        doc.text("ORDEN DE COMPRA DE MATERIALES", 15, 55);
        
        let total = calcularTotales();

        const materiales = [
            ["Material", "Cantidad", "Detalle"],
            ["Placas de Yeso", total.placas, "Estandar, 1.20 x 2.40 m"],
            ["Soleras", total.soleras, "Perfiles 35mm x 2.60 m"],
            ["Montantes", total.montantes, "Perfiles 34mm x 2.60 m"],
            ["Maestras", total.maestras, "Perfiles 34mm x 2.60 m"],
            ["Tornillos T1", total.tornillosT1, "-"],
            ["Tornillos T2", total.tornillosT2, "-"],
            ["Tarugo Nylon c/tope + Tornillo.", total.tarugos, "N° 6"],
            ["Masilla Secado Rápido", total.masillaSR.toFixed(1) + " kg", "-"],
            ["Masilla LPU", total.masillaLPU.toFixed(1) + " kg", total.masillaLPUdetalle],
            ["Cinta Tramada", total.cinta.toFixed(1) + " m", "Metros lineales"],
            ["Alambre Galvanizado", total.alambre.toFixed(1) + " m", "Metros lineales"]
        ];

        doc.autoTable({
            startY: 65,
            head: [["Material", "Cantidad", "Observaciones"]],
            body: materiales.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });
        
    }

    doc.save(`${tipo}_${cliente.replace(/\s+/g, '_')}.pdf`);
}
function guardarDatos() {
    localStorage.setItem('nombreEmpresa', document.getElementById('nombreEmpresa').value);
    localStorage.setItem('precioM2', document.getElementById('precioM2').value);
}
function agregarSubTrabajo() {

    calcular(); // usa tu lógica actual

    if (!ultimoResultado) return;

    let nombre = document.getElementById("nombreSub").value || "Sin nombre";

    subTrabajos.push({
        nombre: nombre,
        materiales: { ...ultimoResultado }, // 👈 CLAVE
        detalles: {
            masillaLPU: ultimoResultado.masillaLPUdetalle
        },
        
    });

    renderSubTrabajos();
}
function renderSubTrabajos() {
    const contenedor = document.getElementById("listaSubtrabajos");
    contenedor.innerHTML = "";

    const precioM2 = parseFloat(document.getElementById("precioM2").value) || 0;

    subTrabajos.forEach((st, index) => {

        const costo = st.materiales.m2 * precioM2;

        contenedor.innerHTML += `
            <div class="subtrabajo">
                <button onclick="eliminarSubTrabajo(${index})">X</button>

                <h3>${st.nombre}</h3>

                <p><strong>${st.materiales.m2.toFixed(2)} m²</strong></p>
                <p><strong>$ ${costo.toFixed(0)}</strong></p>

                <div class="materiales-detalle">
                    <small>Materiales:</small>
                    <ul>
                        <li>Placas: ${st.materiales.placas}</li>
                        <li>Soleras: ${st.materiales.soleras}</li>
                        <li>Montantes: ${st.materiales.montantes}</li>
                        <li>Tornillos T1: ${st.materiales.tornillosT1}</li>
                        <li>Tornillos T2: ${st.materiales.tornillosT2}</li>
                        <li>Fijaciones: ${st.materiales.tarugos}</li>
                    </ul>
                </div>
            </div>
        `;
    });
}
function calcularTotales() {
    let total = {
        m2: 0,
        placas: 0,
        soleras: 0,
        montantes: 0,
        maestras: 0,
        tornillosT1: 0,
        tornillosT2: 0,
        tarugos: 0,
        masillaSR: 0,
        masillaLPU: 0,
        cinta: 0,
        alambre: 0
    };

    subTrabajos.forEach(st => {
        let m = st.materiales;

        total.m2 += m.m2;
        total.placas += m.placas;
        total.soleras += m.soleras;
        total.montantes += m.montantes;
        total.maestras += m.maestras;
        total.tornillosT1 += m.tornillosT1;
        total.tornillosT2 += m.tornillosT2;
        total.tarugos += m.tarugos;
        total.masillaSR += m.masillaSR;
        total.masillaLPU += m.masillaLPUkg;
        total.cinta += m.cinta;
        total.alambre += m.alambre;
    });

    // 👇 reutilizás TU lógica existente
    total.masillaLPUdetalle = calcularMasillaLPU(total.masillaLPU);

    return total;
}
function eliminarSubTrabajo(index) {
    subTrabajos.splice(index, 1);
    renderSubTrabajos();
}
