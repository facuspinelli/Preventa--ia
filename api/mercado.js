const XLSX = require("xlsx");

// ============================================================
// PREVENTA IA
// MOTOR DE MERCADO 360
// VERSION 3.7
//
// BASE:
// - OEDE Empresas
// - OEDE Empleo
// - Actividades detalladas
// - Industrias PREVENTA
// - Productos PREVENTA
//
// NUEVO 3.7:
// - Supuestos comerciales editables
// - Precio por producto
// - TAM
// - SAM
// - SOM
// - Mercado por producto
// - Mercado por industria
// - Empresas potenciales
// - Empleados potenciales
// - Unidad de mercado por producto
// - Criterios específicos por producto
// - Factores explicativos del potencial
// - Indicadores sectoriales por variable
// - Potencial dinámico
//
// IMPORTANTE:
// OEDE aporta datos reales de empresas y empleo.
//
// Las variables documentales y sus pesos son indicadores/modelos
// sectoriales. NO representan una identificación individual de
// empresas que necesariamente tengan esa necesidad.
//
// Los precios permanecen en 0 hasta ser definidos.
// El motor NO inventa precios.
// ============================================================


// ============================================================
// FUENTES OFICIALES OEDE
// ============================================================

const OEDE_EMPRESAS_URL =
    "https://www.argentina.gob.ar/sites/default/files/provinciales_serie_empresas1_2.xlsx";

const OEDE_EMPLEO_URL =
    "https://www.argentina.gob.ar/sites/default/files/provinciales_serie_empleo_trimestral_2dig_6.xlsx";


// ============================================================
// UTILIDADES
// ============================================================

function normalizarTexto(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


// ============================================================
// CONVERTIR VALORES DEL EXCEL
// ============================================================

function convertirNumero(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const texto =
        String(valor)
            .trim();

    const normalizado =
        normalizarTexto(texto);

    if (
        normalizado === "s.d." ||
        normalizado === "s/d" ||
        normalizado === "sd" ||
        normalizado === "-" ||
        normalizado === "n.d." ||
        normalizado === "nd"
    ) {
        return null;
    }

    if (
        /^\d{1,3}(,\d{3})+$/.test(texto)
    ) {

        return Number(
            texto.replace(/,/g, "")
        );

    }

    if (
        /^\d{1,3}(\.\d{3})+$/.test(texto)
    ) {

        return Number(
            texto.replace(/\./g, "")
        );

    }

    if (
        /^\d{1,3}(\.\d{3})+,\d+$/.test(texto)
    ) {

        return Number(
            texto
                .replace(/\./g, "")
                .replace(",", ".")
        );

    }

    const numero =
        Number(
            texto
                .replace(",", ".")
        );

    if (
        Number.isFinite(numero)
    ) {
        return numero;
    }

    return null;
}


// ============================================================
// DESCARGAR EXCEL
// ============================================================

async function descargarArchivo(url) {

    const respuesta =
        await fetch(url);

    if (!respuesta.ok) {

        throw new Error(
            "No se pudo descargar OEDE. HTTP " +
            respuesta.status
        );

    }

    const buffer =
        await respuesta.arrayBuffer();

    if (
        !buffer ||
        buffer.byteLength === 0
    ) {

        throw new Error(
            "OEDE devolvió un archivo vacío."
        );

    }

    return Buffer.from(buffer);
}


// ============================================================
// LEER HOJA
// ============================================================

function leerMatriz(hoja) {

    return XLSX.utils.sheet_to_json(
        hoja,
        {
            header: 1,
            defval: null,
            raw: false
        }
    );

}


// ============================================================
// DETECTAR AÑO
// ============================================================

function detectarAnio(texto) {

    const coincidencias =
        String(texto || "")
            .match(/\b(19|20)\d{2}\b/g);

    if (
        !coincidencias ||
        coincidencias.length === 0
    ) {
        return null;
    }

    return Number(
        coincidencias[
            coincidencias.length - 1
        ]
    );

}


// ============================================================
// DETECTAR PERÍODO
// ============================================================

function detectarPeriodo(texto) {

    const valor =
        String(texto || "");

    const anio =
        detectarAnio(valor);

    if (!anio) {
        return null;
    }

    const trimestre =
        valor.match(
            /([1-4])\s*[º°o]?\s*trim/i
        );

    if (trimestre) {

        return {

            anio,

            trimestre:
                Number(
                    trimestre[1]
                ),

            texto:
                valor

        };

    }

    return {

        anio,

        trimestre:
            null,

        texto:
            valor

    };

}


// ============================================================
// IDENTIFICAR FILA DE ENCABEZADOS
// ============================================================

function detectarFilaEncabezado(
    matriz,
    tipo
) {

    let mejor = null;

    const limite =
        Math.min(
            matriz.length,
            40
        );

    for (
        let fila = 0;
        fila < limite;
        fila++
    ) {

        const valores =
            matriz[fila] || [];

        let puntaje = 0;

        let columnasPeriodo = [];

        let columnaActividad = null;

        for (
            let columna = 0;
            columna < valores.length;
            columna++
        ) {

            const texto =
                normalizarTexto(
                    valores[columna]
                );

            if (!texto) {
                continue;
            }

            const periodo =
                detectarPeriodo(
                    valores[columna]
                );

            if (periodo) {

                columnasPeriodo.push({

                    columna,

                    ...periodo

                });

            }

            if (
                texto.includes("rama de actividad") ||
                texto.includes("ramas de actividad") ||
                texto === "actividad" ||
                texto.includes("actividades") ||
                texto.includes("sector de actividad")
            ) {

                columnaActividad =
                    columna;

                puntaje += 10;

            }

            if (
                texto.includes("empresa") ||
                texto.includes("empresas")
            ) {

                puntaje += 5;

            }

            if (
                texto.includes("empleo") ||
                texto.includes("ocupados") ||
                texto.includes("trabajadores")
            ) {

                puntaje += 5;

            }

        }

        if (
            columnasPeriodo.length >= 2
        ) {

            puntaje +=
                Math.min(
                    columnasPeriodo.length,
                    10
                );

        }

        if (
            puntaje > 0
        ) {

            const candidato = {

                fila,

                puntaje,

                columnaActividad,

                columnasPeriodo

            };

            if (
                !mejor ||
                candidato.puntaje >
                mejor.puntaje
            ) {

                mejor =
                    candidato;

            }

        }

    }

    return mejor;
}


// ============================================================
// DETECTAR COLUMNAS DE PERÍODO
// ============================================================

function detectarColumnasPeriodo(
    matriz,
    filaInicio
) {

    const columnas = [];

    const maxFilas =
        Math.min(
            matriz.length,
            filaInicio + 8
        );

    const maxColumnas =
        matriz.reduce(
            (maximo, fila) =>
                Math.max(
                    maximo,
                    Array.isArray(fila)
                        ? fila.length
                        : 0
                ),
            0
        );

    for (
        let columna = 0;
        columna < maxColumnas;
        columna++
    ) {

        let mejorPeriodo = null;

        for (
            let fila = filaInicio;
            fila < maxFilas;
            fila++
        ) {

            const valor =
                matriz[fila] &&
                matriz[fila][columna];

            const periodo =
                detectarPeriodo(
                    valor
                );

            if (periodo) {

                if (
                    !mejorPeriodo ||
                    periodo.anio >
                    mejorPeriodo.anio ||
                    (
                        periodo.anio ===
                        mejorPeriodo.anio &&
                        (
                            periodo.trimestre ||
                            0
                        ) >
                        (
                            mejorPeriodo.trimestre ||
                            0
                        )
                    )
                ) {

                    mejorPeriodo = {

                        columna,

                        ...periodo

                    };

                }

            }

        }

        if (mejorPeriodo) {

            columnas.push(
                mejorPeriodo
            );

        }

    }

    return columnas;
}


// ============================================================
// OBTENER ÚLTIMO PERÍODO
// ============================================================

function obtenerUltimoPeriodo(
    columnas
) {

    if (
        !columnas ||
        columnas.length === 0
    ) {
        return null;
    }

    return columnas.reduce(
        (ultimo, actual) => {

            if (!ultimo) {
                return actual;
            }

            if (
                actual.anio >
                ultimo.anio
            ) {
                return actual;
            }

            if (
                actual.anio ===
                ultimo.anio
            ) {

                if (
                    (
                        actual.trimestre ||
                        0
                    ) >
                    (
                        ultimo.trimestre ||
                        0
                    )
                ) {

                    return actual;

                }

            }

            return ultimo;

        },
        null
    );
}


// ============================================================
// IDENTIFICAR FILAS DE ACTIVIDADES
// ============================================================

function pareceFilaActividad(
    fila
) {

    if (
        !Array.isArray(fila) ||
        fila.length < 2
    ) {
        return false;
    }

    const codigo =
        fila[0] !== null &&
        fila[0] !== undefined
            ? String(
                fila[0]
            ).trim()
            : "";

    const nombre =
        fila[1] !== null &&
        fila[1] !== undefined
            ? String(
                fila[1]
            ).trim()
            : "";

    if (!nombre) {
        return false;
    }

    if (
        /^[A-Z]$/i.test(codigo) ||
        /^\d+$/.test(codigo)
    ) {
        return true;
    }

    return false;
}


// ============================================================
// EXTRAER DATOS DE HOJA
// ============================================================

function extraerDatosHoja(
    nombreHoja,
    hoja,
    tipo
) {

    const matriz =
        leerMatriz(
            hoja
        );

    if (
        matriz.length === 0
    ) {

        return {

            hoja:
                nombreHoja,

            registros:
                [],

            periodo:
                null,

            filas:
                0

        };

    }

    const encabezado =
        detectarFilaEncabezado(
            matriz,
            tipo
        );

    if (!encabezado) {

        return {

            hoja:
                nombreHoja,

            registros:
                [],

            periodo:
                null,

            filas:
                matriz.length

        };

    }

    const columnasPeriodo =
        detectarColumnasPeriodo(
            matriz,
            encabezado.fila
        );

    const ultimoPeriodo =
        obtenerUltimoPeriodo(
            columnasPeriodo
        );

    if (!ultimoPeriodo) {

        return {

            hoja:
                nombreHoja,

            registros:
                [],

            periodo:
                null,

            filas:
                matriz.length

        };

    }

    const registros = [];

    for (
        let fila =
            encabezado.fila + 1;

        fila < matriz.length;

        fila++
    ) {

        const valores =
            matriz[fila] || [];

        if (
            !pareceFilaActividad(
                valores
            )
        ) {
            continue;
        }

        const codigo =
            String(
                valores[0] ?? ""
            ).trim();

        const actividad =
            String(
                valores[1] ?? ""
            ).trim();

        const valor =
            convertirNumero(
                valores[
                    ultimoPeriodo.columna
                ]
            );

        if (
            valor === null
        ) {
            continue;
        }

        registros.push({

            codigo,

            actividad,

            valor,

            hoja:
                nombreHoja,

            anio:
                ultimoPeriodo.anio,

            trimestre:
                ultimoPeriodo.trimestre,

            periodo:
                ultimoPeriodo.texto

        });

    }

    return {

        hoja:
            nombreHoja,

        registros,

        periodo:
            ultimoPeriodo,

        filaEncabezado:
            encabezado.fila,

        columnaPeriodo:
            ultimoPeriodo.columna,

        filas:
            matriz.length

    };

}


// ============================================================
// CONSOLIDAR LIBRO
// ============================================================

function consolidarLibro(
    buffer,
    tipo
) {

    const libro =
        XLSX.read(
            buffer,
            {
                type: "buffer",
                cellDates: false
            }
        );

    const hojas =
        libro.SheetNames || [];

    const resultados = [];


    for (
        const nombreHoja of hojas
    ) {

        const nombreNormalizado =
            normalizarTexto(
                nombreHoja
            );


        if (
            nombreNormalizado.includes(
                "caratula"
            ) ||
            nombreNormalizado.includes(
                "indice"
            ) ||
            nombreNormalizado.includes(
                "metodologia"
            ) ||
            nombreNormalizado.includes(
                "fuentes"
            ) ||
            nombreNormalizado.includes(
                "descriptores"
            )
        ) {
            continue;
        }


        if (
            tipo === "empresas" &&
            nombreNormalizado === "hoja1"
        ) {

            console.log(
                "Ignorando hoja auxiliar:",
                nombreHoja
            );

            continue;

        }


        const hoja =
            libro.Sheets[
                nombreHoja
            ];


        const resultado =
            extraerDatosHoja(
                nombreHoja,
                hoja,
                tipo
            );


        resultados.push(
            resultado
        );

    }


    const mapaDetalle =
        new Map();

    const mapaAgrupadores =
        new Map();

    let registrosTotales = 0;

    let registrosAgrupadores = 0;

    let hojasConDatos = 0;

    let ultimoPeriodoGlobal = null;


    for (
        const resultado of resultados
    ) {

        if (
            resultado.registros.length > 0
        ) {

            hojasConDatos++;

        }


        registrosTotales +=
            resultado.registros.length;


        if (
            resultado.periodo
        ) {

            if (
                !ultimoPeriodoGlobal ||
                resultado.periodo.anio >
                ultimoPeriodoGlobal.anio ||
                (
                    resultado.periodo.anio ===
                    ultimoPeriodoGlobal.anio &&
                    (
                        resultado.periodo.trimestre ||
                        0
                    ) >
                    (
                        ultimoPeriodoGlobal.trimestre ||
                        0
                    )
                )
            ) {

                ultimoPeriodoGlobal =
                    resultado.periodo;

            }

        }


        for (
            const registro of resultado.registros
        ) {

            const esAgrupador =
                /^[A-Z]$/i.test(
                    registro.codigo
                );


            const mapa =
                esAgrupador
                    ? mapaAgrupadores
                    : mapaDetalle;


            const clave =
                registro.codigo +
                "|" +
                normalizarTexto(
                    registro.actividad
                );


            if (
                !mapa.has(clave)
            ) {

                mapa.set(
                    clave,
                    {

                        codigo:
                            registro.codigo,

                        actividad:
                            registro.actividad,

                        valor:
                            0,

                        regiones:
                            0,

                        fuentes:
                            [],

                        anio:
                            registro.anio,

                        trimestre:
                            registro.trimestre,

                        periodo:
                            registro.periodo

                    }
                );

            }


            const acumulado =
                mapa.get(
                    clave
                );


            acumulado.valor +=
                registro.valor;


            acumulado.regiones +=
                1;


            acumulado.fuentes.push(
                registro.hoja
            );


            if (
                esAgrupador
            ) {

                registrosAgrupadores++;

            }

        }

    }


    const actividades =
        Array.from(
            mapaDetalle.values()
        )
        .sort(
            (a, b) =>
                b.valor -
                a.valor
        );


    const agrupadores =
        Array.from(
            mapaAgrupadores.values()
        )
        .sort(
            (a, b) =>
                b.valor -
                a.valor
        );


    const total =
        actividades.reduce(
            (suma, item) =>
                suma + item.valor,
            0
        );


    const totalAgrupadores =
        agrupadores.reduce(
            (suma, item) =>
                suma + item.valor,
            0
        );


    return {

        tipo,

        cantidadHojas:
            hojas.length,

        hojasAnalizadas:
            resultados.length,

        hojasConDatos,

        registrosTotales,

        registrosAgrupadores,

        actividades,

        agrupadores,

        total,

        totalAgrupadores,

        ultimoPeriodo:
            ultimoPeriodoGlobal

    };

}


// ============================================================
// MAPEO OEDE → INDUSTRIAS PREVENTA
// ============================================================

function mapearIndustria(
    actividad,
    codigo
) {

    const texto =
        normalizarTexto(
            actividad
        );

    const codigoNumero =
        Number(
            String(
                codigo || ""
            ).trim()
        );


    // Agricultura

    if (
        [1, 2, 5].includes(
            codigoNumero
        ) ||
        texto.includes("agricultura") ||
        texto.includes("ganaderia") ||
        texto.includes("silvicultura") ||
        texto.includes("pesca")
    ) {

        return "Agricultura";

    }


    // Minería

    if (
        (
            codigoNumero >= 10 &&
            codigoNumero <= 14
        ) ||
        texto.includes("mineria") ||
        texto.includes("extraccion de petroleo") ||
        texto.includes("extraccion de gas")
    ) {

        return "Minería";

    }


    // Industria

    if (
        (
            codigoNumero >= 15 &&
            codigoNumero <= 37
        ) ||
        texto.includes("industria") ||
        texto.includes("manufactur")
    ) {

        return "Industria";

    }


    // Energía

    if (
        codigoNumero === 40 ||
        codigoNumero === 41 ||
        texto.includes("electricidad") ||
        texto.includes("energia")
    ) {

        return "Energía";

    }


    // Construcción

    if (
        codigoNumero === 45 ||
        texto.includes("construccion")
    ) {

        return "Construcción";

    }


    // Retail

    if (
        (
            codigoNumero >= 50 &&
            codigoNumero <= 52
        ) ||
        texto.includes("comercio")
    ) {

        return "Retail";

    }


    // Logística

    if (
        (
            codigoNumero >= 60 &&
            codigoNumero <= 63
        ) ||
        texto.includes("transporte") ||
        texto.includes("almacenamiento")
    ) {

        return "Logística/Transporte";

    }


    // Telecom

    if (
        codigoNumero === 64 ||
        texto.includes("telecom") ||
        texto.includes("comunicacion")
    ) {

        return "Telecom";

    }


    // Bancos / Finanzas

    if (
        codigoNumero === 65 ||
        codigoNumero === 67 ||
        texto.includes("financiero") ||
        texto.includes("bancos") ||
        texto.includes("banco")
    ) {

        return "Bancos/Finanzas";

    }


    // Seguros

    if (
        codigoNumero === 66 ||
        texto.includes("seguro")
    ) {

        return "Seguros";

    }


    // Salud

    if (
        codigoNumero === 85 ||
        texto.includes("salud") ||
        texto.includes("sanidad")
    ) {

        return "Salud";

    }


    // Educación

    if (
        codigoNumero === 80 ||
        texto.includes("educacion")
    ) {

        return "Educación";

    }


    // Gobierno

    if (
        codigoNumero === 75 ||
        texto.includes("administracion publica") ||
        texto.includes("administracion del estado")
    ) {

        return "Gobierno";

    }


    // Servicios profesionales

    if (
        codigoNumero === 72 ||
        codigoNumero === 74 ||
        texto.includes("profesionales") ||
        texto.includes("servicios empresariales") ||
        texto.includes("servicios a empresas") ||
        texto.includes("contable")
    ) {

        return "Servicios profesionales";

    }


    return "Otros";

}


// ============================================================
// PRODUCTOS PREVENTA
// ============================================================

const productosPREVENTA = [

    {

        id:
            "guarda",

        nombre:
            "Guarda / Almacenamiento",

        descripcion:
            "Almacenamiento y gestión de documentos digitales.",

        unidad:
            "empresa"

    },

    {

        id:
            "digitalizacion",

        nombre:
            "Digitalización",

        descripcion:
            "Digitalización y conversión de documentación física.",

        unidad:
            "empresa"

    },

    {

        id:
            "firma_recibos",

        nombre:
            "Firma de recibos de sueldo",

        descripcion:
            "Firma electrónica de recibos y documentación laboral.",

        unidad:
            "empleado"

    },

    {

        id:
            "firma_electronica",

        nombre:
            "Firma electrónica",

        descripcion:
            "Firma electrónica de documentos y contratos.",

        unidad:
            "empresa"

    },

    {

        id:
            "thuban",

        nombre:
            "Thuban",

        descripcion:
            "Gestión documental, búsqueda, almacenamiento y procesos documentales.",

        unidad:
            "empresa"

    }

];


// ============================================================
// POTENCIAL PRODUCTO × INDUSTRIA
// ============================================================

const potencialProductosIndustria = {

    "Bancos/Finanzas": {

        guarda: 0.90,
        digitalizacion: 0.85,
        firma_recibos: 0.60,
        firma_electronica: 1.00,
        thuban: 1.00

    },

    "Seguros": {

        guarda: 0.90,
        digitalizacion: 0.85,
        firma_recibos: 0.65,
        firma_electronica: 1.00,
        thuban: 1.00

    },

    "Salud": {

        guarda: 0.95,
        digitalizacion: 1.00,
        firma_recibos: 0.60,
        firma_electronica: 0.85,
        thuban: 1.00

    },

    "Retail": {

        guarda: 0.80,
        digitalizacion: 0.80,
        firma_recibos: 0.75,
        firma_electronica: 0.85,
        thuban: 0.85

    },

    "Industria": {

        guarda: 0.85,
        digitalizacion: 0.85,
        firma_recibos: 0.80,
        firma_electronica: 0.85,
        thuban: 0.90

    },

    "Logística/Transporte": {

        guarda: 0.85,
        digitalizacion: 0.85,
        firma_recibos: 0.85,
        firma_electronica: 0.85,
        thuban: 0.90

    },

    "Agricultura": {

        guarda: 0.65,
        digitalizacion: 0.70,
        firma_recibos: 0.75,
        firma_electronica: 0.70,
        thuban: 0.70

    },

    "Construcción": {

        guarda: 0.75,
        digitalizacion: 0.75,
        firma_recibos: 0.80,
        firma_electronica: 0.80,
        thuban: 0.80

    },

    "Educación": {

        guarda: 0.85,
        digitalizacion: 0.85,
        firma_recibos: 0.70,
        firma_electronica: 0.80,
        thuban: 0.90

    },

    "Telecom": {

        guarda: 0.85,
        digitalizacion: 0.80,
        firma_recibos: 0.70,
        firma_electronica: 0.95,
        thuban: 0.90

    },

    "Minería": {

        guarda: 0.80,
        digitalizacion: 0.75,
        firma_recibos: 0.80,
        firma_electronica: 0.80,
        thuban: 0.85

    },

    "Energía": {

        guarda: 0.85,
        digitalizacion: 0.85,
        firma_recibos: 0.80,
        firma_electronica: 0.90,
        thuban: 0.90

    },

    "Servicios profesionales": {

        guarda: 0.75,
        digitalizacion: 0.70,
        firma_recibos: 0.70,
        firma_electronica: 0.90,
        thuban: 0.85

    },

    "Gobierno": {

        guarda: 1.00,
        digitalizacion: 1.00,
        firma_recibos: 0.80,
        firma_electronica: 0.95,
        thuban: 1.00

    },

    "Otros": {

        guarda: 0.50,
        digitalizacion: 0.50,
        firma_recibos: 0.50,
        firma_electronica: 0.50,
        thuban: 0.50

    }

};


// ============================================================
// VARIABLES DOCUMENTALES
// ============================================================

const variablesDocumentales = {

    "Bancos/Finanzas": {

        necesidadDocumental: 0.95,
        archivoFisico: 0.80,
        digitalizacion: 0.90,
        ocr: 0.90,
        busqueda: 0.95,
        firmas: 0.95,
        workflows: 0.95,
        compliance: 1.00,
        contratos: 0.90,
        migracion: 0.80,
        integraciones: 0.95,
        almacenamiento: 0.95

    },

    "Seguros": {

        necesidadDocumental: 0.95,
        archivoFisico: 0.80,
        digitalizacion: 0.85,
        ocr: 0.90,
        busqueda: 0.95,
        firmas: 0.95,
        workflows: 0.90,
        compliance: 1.00,
        contratos: 0.95,
        migracion: 0.80,
        integraciones: 0.90,
        almacenamiento: 0.95

    },

    "Salud": {

        necesidadDocumental: 0.95,
        archivoFisico: 0.95,
        digitalizacion: 1.00,
        ocr: 0.95,
        busqueda: 0.95,
        firmas: 0.85,
        workflows: 0.90,
        compliance: 0.95,
        contratos: 0.75,
        migracion: 0.70,
        integraciones: 0.85,
        almacenamiento: 1.00

    },

    "Retail": {

        necesidadDocumental: 0.75,
        archivoFisico: 0.70,
        digitalizacion: 0.75,
        ocr: 0.70,
        busqueda: 0.75,
        firmas: 0.80,
        workflows: 0.75,
        compliance: 0.70,
        contratos: 0.80,
        migracion: 0.60,
        integraciones: 0.75,
        almacenamiento: 0.80

    },

    "Industria": {

        necesidadDocumental: 0.80,
        archivoFisico: 0.80,
        digitalizacion: 0.80,
        ocr: 0.75,
        busqueda: 0.80,
        firmas: 0.80,
        workflows: 0.85,
        compliance: 0.80,
        contratos: 0.85,
        migracion: 0.70,
        integraciones: 0.80,
        almacenamiento: 0.85

    },

    "Logística/Transporte": {

        necesidadDocumental: 0.80,
        archivoFisico: 0.80,
        digitalizacion: 0.80,
        ocr: 0.75,
        busqueda: 0.80,
        firmas: 0.85,
        workflows: 0.85,
        compliance: 0.80,
        contratos: 0.80,
        migracion: 0.65,
        integraciones: 0.85,
        almacenamiento: 0.85

    },

    "Agricultura": {

        necesidadDocumental: 0.65,
        archivoFisico: 0.65,
        digitalizacion: 0.65,
        ocr: 0.60,
        busqueda: 0.65,
        firmas: 0.70,
        workflows: 0.60,
        compliance: 0.65,
        contratos: 0.70,
        migracion: 0.50,
        integraciones: 0.60,
        almacenamiento: 0.65

    },

    "Construcción": {

        necesidadDocumental: 0.75,
        archivoFisico: 0.80,
        digitalizacion: 0.75,
        ocr: 0.70,
        busqueda: 0.75,
        firmas: 0.80,
        workflows: 0.75,
        compliance: 0.75,
        contratos: 0.90,
        migracion: 0.60,
        integraciones: 0.70,
        almacenamiento: 0.80

    },

    "Educación": {

        necesidadDocumental: 0.85,
        archivoFisico: 0.90,
        digitalizacion: 0.85,
        ocr: 0.80,
        busqueda: 0.85,
        firmas: 0.80,
        workflows: 0.75,
        compliance: 0.85,
        contratos: 0.65,
        migracion: 0.70,
        integraciones: 0.80,
        almacenamiento: 0.90

    },

    "Telecom": {

        necesidadDocumental: 0.85,
        archivoFisico: 0.65,
        digitalizacion: 0.75,
        ocr: 0.70,
        busqueda: 0.85,
        firmas: 0.90,
        workflows: 0.90,
        compliance: 0.90,
        contratos: 0.90,
        migracion: 0.75,
        integraciones: 0.95,
        almacenamiento: 0.90

    },

    "Minería": {

        necesidadDocumental: 0.80,
        archivoFisico: 0.75,
        digitalizacion: 0.75,
        ocr: 0.70,
        busqueda: 0.75,
        firmas: 0.80,
        workflows: 0.80,
        compliance: 0.90,
        contratos: 0.80,
        migracion: 0.60,
        integraciones: 0.75,
        almacenamiento: 0.80

    },

    "Energía": {

        necesidadDocumental: 0.85,
        archivoFisico: 0.80,
        digitalizacion: 0.85,
        ocr: 0.75,
        busqueda: 0.80,
        firmas: 0.85,
        workflows: 0.90,
        compliance: 0.95,
        contratos: 0.90,
        migracion: 0.70,
        integraciones: 0.90,
        almacenamiento: 0.90

    },

    "Servicios profesionales": {

        necesidadDocumental: 0.75,
        archivoFisico: 0.65,
        digitalizacion: 0.70,
        ocr: 0.65,
        busqueda: 0.80,
        firmas: 0.90,
        workflows: 0.75,
        compliance: 0.75,
        contratos: 0.90,
        migracion: 0.60,
        integraciones: 0.75,
        almacenamiento: 0.75

    },

    "Gobierno": {

        necesidadDocumental: 1.00,
        archivoFisico: 1.00,
        digitalizacion: 1.00,
        ocr: 0.95,
        busqueda: 1.00,
        firmas: 0.95,
        workflows: 0.95,
        compliance: 1.00,
        contratos: 0.90,
        migracion: 0.90,
        integraciones: 0.95,
        almacenamiento: 1.00

    },

    "Otros": {

        necesidadDocumental: 0.50,
        archivoFisico: 0.50,
        digitalizacion: 0.50,
        ocr: 0.50,
        busqueda: 0.50,
        firmas: 0.50,
        workflows: 0.50,
        compliance: 0.50,
        contratos: 0.50,
        migracion: 0.50,
        integraciones: 0.50,
        almacenamiento: 0.50

    }

};


// ============================================================
// CRITERIOS ESPECÍFICOS POR PRODUCTO
//
// Cada producto utiliza diferentes variables para determinar
// su potencial.
//
// Los pesos de cada producto deben sumar aproximadamente 1.
//
// IMPORTANTE:
// Estos pesos son parte del modelo comercial y son editables.
// No representan datos observados directamente en OEDE.
// ============================================================

const criteriosProducto = {

    // --------------------------------------------------------
    // GUARDA / ALMACENAMIENTO
    // --------------------------------------------------------

    guarda: {

        descripcion:
            "Potencial de empresas con necesidad de conservar, almacenar, buscar y gestionar documentación digital.",

        pesoAfinidad:
            0.30,

        pesoVariables:
            0.70,

        factores: {

            necesidadDocumental:
                0.20,

            almacenamiento:
                0.30,

            busqueda:
                0.15,

            archivoFisico:
                0.15,

            migracion:
                0.10,

            integraciones:
                0.10

        }

    },


    // --------------------------------------------------------
    // DIGITALIZACIÓN
    // --------------------------------------------------------

    digitalizacion: {

        descripcion:
            "Potencial de empresas con documentación física y necesidad de convertirla a formato digital.",

        pesoAfinidad:
            0.30,

        pesoVariables:
            0.70,

        factores: {

            archivoFisico:
                0.25,

            digitalizacion:
                0.30,

            ocr:
                0.15,

            necesidadDocumental:
                0.15,

            almacenamiento:
                0.10,

            busqueda:
                0.05

        }

    },


    // --------------------------------------------------------
    // FIRMA DE RECIBOS
    // --------------------------------------------------------

    firma_recibos: {

        descripcion:
            "Potencial de trabajadores alcanzables mediante procesos de firma de recibos y documentación laboral.",

        pesoAfinidad:
            0.20,

        pesoVariables:
            0.80,

        factores: {

            firmas:
                0.50,

            necesidadDocumental:
                0.15,

            workflows:
                0.15,

            compliance:
                0.10,

            almacenamiento:
                0.10

        }

    },


    // --------------------------------------------------------
    // FIRMA ELECTRÓNICA
    // --------------------------------------------------------

    firma_electronica: {

        descripcion:
            "Potencial de empresas con necesidades de firma de documentos, contratos, workflows y cumplimiento.",

        pesoAfinidad:
            0.30,

        pesoVariables:
            0.70,

        factores: {

            firmas:
                0.30,

            contratos:
                0.20,

            workflows:
                0.20,

            compliance:
                0.15,

            integraciones:
                0.10,

            necesidadDocumental:
                0.05

        }

    },


    // --------------------------------------------------------
    // THUBAN
    // --------------------------------------------------------

    thuban: {

        descripcion:
            "Potencial de empresas con necesidades de gestión documental integral, búsqueda, workflows, almacenamiento, OCR, integraciones y migración.",

        pesoAfinidad:
            0.30,

        pesoVariables:
            0.70,

        factores: {

            necesidadDocumental:
                0.15,

            busqueda:
                0.15,

            workflows:
                0.15,

            almacenamiento:
                0.15,

            integraciones:
                0.10,

            ocr:
                0.10,

            migracion:
                0.10,

            contratos:
                0.05,

            archivoFisico:
                0.05

        }

    }

};


// ============================================================
// SUPUESTOS DE MERCADO
//
// IMPORTANTE:
// Los precios están en 0 porque todavía NO fueron definidos.
//
// Esto evita presentar números inventados como datos reales.
// ============================================================

const supuestosMercado = {

    porcentajeDigitalizacion:
        43.48,

    porcentajeClientes:
        6.76,

    porcentajeEmpresasObjetivo:
        20,

    porcentajeSAM:
        30,

    porcentajeSOM:
        3.5,

    preciosPorProducto: {

        guarda:
            0,

        digitalizacion:
            0,

        firma_recibos:
            0,

        firma_electronica:
            0,

        thuban:
            0

    }

};


// ============================================================
// CALCULAR RANKING INICIAL
// ============================================================

function generarRanking(
    empresas,
    empleo
) {

    const mapa =
        new Map();


    for (
        const item of empresas.actividades
    ) {

        const industria =
            mapearIndustria(
                item.actividad,
                item.codigo
            );


        if (
            !mapa.has(
                industria
            )
        ) {

            mapa.set(
                industria,
                {

                    industria,

                    empresas:
                        0,

                    empleo:
                        0

                }
            );

        }


        mapa.get(
            industria
        ).empresas +=
            item.valor;

    }


    for (
        const item of empleo.actividades
    ) {

        const industria =
            mapearIndustria(
                item.actividad,
                item.codigo
            );


        if (
            !mapa.has(
                industria
            )
        ) {

            mapa.set(
                industria,
                {

                    industria,

                    empresas:
                        0,

                    empleo:
                        0

                }
            );

        }


        mapa.get(
            industria
        ).empleo +=
            item.valor;

    }


    return Array.from(
        mapa.values()
    )
    .map(
        item => {

            const score =
                Math.round(

                    (
                        Math.log10(
                            item.empresas + 1
                        ) * 40
                    )

                    +

                    (
                        Math.log10(
                            item.empleo + 1
                        ) * 60
                    )

                );


            return {

                ...item,

                score

            };

        }
    )
    .sort(
        (a, b) =>
            b.score -
            a.score
    );

}


// ============================================================
// CALCULAR POTENCIAL DE UN PRODUCTO PARA UNA INDUSTRIA
//
// Fórmula:
//
// potencial =
//     afinidad × pesoAfinidad
//     +
//     scoreVariables × pesoVariables
//
// scoreVariables:
//
//     promedio ponderado de los indicadores específicos
//     del producto.
//
// IMPORTANTE:
// Las estimaciones por factor NO se suman entre sí porque
// diferentes factores pueden afectar a las mismas empresas.
// ============================================================

function calcularPotencialProducto(
    industriaData,
    producto
) {

    const industria =
        industriaData.industria;


    const matriz =
        potencialProductosIndustria[
            industria
        ] ||
        potencialProductosIndustria[
            "Otros"
        ];


    const variables =
        variablesDocumentales[
            industria
        ] ||
        variablesDocumentales[
            "Otros"
        ];


    const criterios =
        criteriosProducto[
            producto.id
        ] ||
        {

            descripcion:
                producto.descripcion,

            pesoAfinidad:
                0.30,

            pesoVariables:
                0.70,

            factores:
                {}

        };


    const afinidad =
        Number(
            matriz[
                producto.id
            ] ?? 0.5
        );


    const factores = [];

    let sumaFactores = 0;

    let pesoTotal = 0;


    // ========================================================
    // CALCULAR INDICADORES ESPECÍFICOS
    // ========================================================

    for (
        const [variable, peso] of
        Object.entries(
            criterios.factores
        )
    ) {

        const indicador =
            Number(
                variables[
                    variable
                ] ?? 0.5
            );


        const aporte =
            indicador *
            peso;


        sumaFactores +=
            aporte;


        pesoTotal +=
            peso;


        const empresasBase =
            industriaData.empresas *
            (
                supuestosMercado
                    .porcentajeEmpresasObjetivo /
                100
            );


        const empleoBase =
            industriaData.empleo *
            (
                supuestosMercado
                    .porcentajeEmpresasObjetivo /
                100
            );


        const empresasEstimadas =
            Math.round(
                empresasBase *
                indicador
            );


        const empleadosEstimados =
            Math.round(
                empleoBase *
                indicador
            );


        factores.push({

            variable,

            indicadorSectorial:
                Number(
                    indicador.toFixed(3)
                ),

            indicadorSectorialPorcentaje:
                Number(
                    (
                        indicador *
                        100
                    ).toFixed(1)
                ),

            peso:
                Number(
                    peso.toFixed(3)
                ),

            pesoPorcentaje:
                Number(
                    (
                        peso *
                        100
                    ).toFixed(1)
                ),

            aporte:
                Number(
                    aporte.toFixed(3)
                ),

            aportePorcentaje:
                Number(
                    (
                        aporte *
                        100
                    ).toFixed(1)
                ),

            empresasEstimadas,

            empleadosEstimados

        });

    }


    // ========================================================
    // SCORE DE VARIABLES
    // ========================================================

    const scoreVariables =
        pesoTotal > 0
            ? sumaFactores / pesoTotal
            : 0.5;


    // ========================================================
    // PESOS DEL MODELO
    // ========================================================

    const pesoAfinidad =
        Number(
            criterios.pesoAfinidad ??
            0.30
        );


    const pesoVariables =
        Number(
            criterios.pesoVariables ??
            0.70
        );


    const pesoModeloTotal =
        pesoAfinidad +
        pesoVariables;


    const pesoAfinidadNormalizado =
        pesoModeloTotal > 0
            ? pesoAfinidad /
              pesoModeloTotal
            : 0.30;


    const pesoVariablesNormalizado =
        pesoModeloTotal > 0
            ? pesoVariables /
              pesoModeloTotal
            : 0.70;


    // ========================================================
    // POTENCIAL FINAL
    // ========================================================

    const potencial =
        Math.min(

            1,

            (
                afinidad *
                pesoAfinidadNormalizado
            )

            +

            (
                scoreVariables *
                pesoVariablesNormalizado
            )

        );


    // ========================================================
    // EMPRESAS POTENCIALES
    // ========================================================

    const empresasPotenciales =
        Math.round(

            industriaData.empresas *

            (
                supuestosMercado
                    .porcentajeEmpresasObjetivo /
                100
            )

            *

            potencial

        );


    // ========================================================
    // EMPLEADOS POTENCIALES
    // ========================================================

    const empleadosPotenciales =
        Math.round(

            industriaData.empleo *

            (
                supuestosMercado
                    .porcentajeEmpresasObjetivo /
                100
            )

            *

            potencial

        );


    // ========================================================
    // UNIDAD DE MERCADO
    // ========================================================

    const unidadMercado =
        producto.unidad === "empleado"
            ? "empleado"
            : "empresa";


    const unidadesPotenciales =
        unidadMercado === "empleado"
            ? empleadosPotenciales
            : empresasPotenciales;


    // ========================================================
    // NIVEL DE POTENCIAL
    // ========================================================

    let nivel =
        "Bajo";


    if (
        potencial >= 0.80
    ) {

        nivel =
            "Muy alto";

    } else if (
        potencial >= 0.60
    ) {

        nivel =
            "Alto";

    } else if (
        potencial >= 0.40
    ) {

        nivel =
            "Medio";

    }


    // ========================================================
    // ORDENAR FACTORES POR APORTE
    // ========================================================

    factores.sort(
        (a, b) =>
            b.aporte -
            a.aporte
    );


    // ========================================================
    // FACTORES PRINCIPALES
    // ========================================================

    const factoresPrincipales =
        factores
            .slice(
                0,
                3
            )
            .map(
                factor =>
                    factor.variable
            );


    // ========================================================
    // EXPLICACIÓN
    // ========================================================

    let explicacion =
        criterios.descripcion ||
        producto.descripcion;


    if (
        factoresPrincipales.length > 0
    ) {

        explicacion +=
            " Los principales factores del modelo son: " +
            factoresPrincipales.join(
                ", "
            ) +
            ".";

    }


    // ========================================================
    // RESULTADO
    // ========================================================

    return {

        industria,

        producto:
            producto.id,

        productoNombre:
            producto.nombre,

        unidad:
            producto.unidad,

        unidadMercado,

        descripcion:
            producto.descripcion,

        empresas:
            industriaData.empresas,

        empleo:
            industriaData.empleo,

        afinidad:
            Number(
                afinidad.toFixed(3)
            ),

        afinidadPorcentaje:
            Number(
                (
                    afinidad *
                    100
                ).toFixed(1)
            ),

        pesoAfinidad:
            Number(
                pesoAfinidadNormalizado.toFixed(3)
            ),

        pesoVariables:
            Number(
                pesoVariablesNormalizado.toFixed(3)
            ),

        scoreVariables:
            Number(
                scoreVariables.toFixed(3)
            ),

        scoreVariablesPorcentaje:
            Number(
                (
                    scoreVariables *
                    100
                ).toFixed(1)
            ),

        potencial:
            Number(
                potencial.toFixed(3)
            ),

        potencialPorcentaje:
            Number(
                (
                    potencial *
                    100
                ).toFixed(1)
            ),

        nivel,

        empresasPotenciales,

        empleadosPotenciales,

        unidadesPotenciales,

        factores,

        factoresPrincipales,

        factorPrincipal:
            factores.length > 0
                ? factores[0].variable
                : null,

        explicacion,

        metodologia:
            "Potencial = afinidad sectorial ponderada + promedio ponderado de indicadores documentales específicos del producto. Las estimaciones por factor no se suman entre sí porque pueden referirse a las mismas empresas. OEDE aporta empresas y empleo; los indicadores documentales son variables sectoriales modeladas."

    };

}


// ============================================================
// CALCULAR POTENCIAL POR PRODUCTO
// ============================================================

function calcularPotencialProductos(
    ranking
) {

    const resultado = [];


    for (
        const industriaData of ranking
    ) {

        for (
            const producto of productosPREVENTA
        ) {

            const potencial =
                calcularPotencialProducto(
                    industriaData,
                    producto
                );


            resultado.push(
                potencial
            );

        }

    }


    return resultado
        .sort(
            (a, b) =>
                b.unidadesPotenciales -
                a.unidadesPotenciales
        );

}


// ============================================================
// CALCULAR TAM / SAM / SOM
//
// UNIDAD DE MERCADO:
//
// - Productos por empresa:
//   empresas potenciales
//
// - Productos por empleado:
//   empleados potenciales
//
// TAM:
// unidades potenciales × precio anual
//
// SAM:
// TAM × % SAM
//
// SOM:
// SAM × % SOM
//
// Si precio = 0:
// no se inventa valor.
// ============================================================

function calcularTAMSAMSOM(
    ranking
) {

    const resultado = [];

    const faltantesPrecio = [];


    for (
        const industriaData of ranking
    ) {

        for (
            const producto of productosPREVENTA
        ) {

            // =================================================
            // IMPORTANTE:
            // Utilizamos exactamente el mismo motor de
            // potencial utilizado en potencialProductos.
            // =================================================

            const potencial =
                calcularPotencialProducto(
                    industriaData,
                    producto
                );


            const precio =
                Number(
                    supuestosMercado
                        .preciosPorProducto[
                            producto.id
                        ] || 0
                );


            const unidadesPotenciales =
                potencial.unidadesPotenciales;


            let tam = null;

            let sam = null;

            let som = null;


            if (
                precio > 0
            ) {

                tam =
                    unidadesPotenciales *
                    precio;


                sam =
                    tam *
                    (
                        supuestosMercado
                            .porcentajeSAM /
                        100
                    );


                som =
                    sam *
                    (
                        supuestosMercado
                            .porcentajeSOM /
                        100
                    );

            } else {

                if (
                    !faltantesPrecio.includes(
                        producto.id
                    )
                ) {

                    faltantesPrecio.push(
                        producto.id
                    );

                }

            }


            resultado.push({

                industria:
                    potencial.industria,

                producto:
                    producto.id,

                productoNombre:
                    producto.nombre,

                unidad:
                    producto.unidad,

                unidadMercado:
                    potencial.unidadMercado,

                empresas:
                    potencial.empresas,

                empleo:
                    potencial.empleo,

                afinidad:
                    potencial.afinidad,

                scoreVariables:
                    potencial.scoreVariables,

                potencial:
                    potencial.potencial,

                potencialPorcentaje:
                    potencial.potencialPorcentaje,

                nivel:
                    potencial.nivel,

                empresasPotenciales:
                    potencial.empresasPotenciales,

                empleadosPotenciales:
                    potencial.empleadosPotenciales,

                unidadesPotenciales,

                factores:
                    potencial.factores,

                factoresPrincipales:
                    potencial.factoresPrincipales,

                factorPrincipal:
                    potencial.factorPrincipal,

                explicacion:
                    potencial.explicacion,

                precioAnual:
                    precio,

                tam,

                sam,

                som,

                estadoPrecio:
                    precio > 0
                        ? "definido"
                        : "faltante"

            });

        }

    }


    return {

        detalle:
            resultado,

        faltantesPrecio

    };

}


// ============================================================
// RESUMEN DE MERCADO POR PRODUCTO
// ============================================================

function resumirMercadoPorProducto(
    tamSamSom
) {

    const mapa =
        new Map();


    for (
        const item of tamSamSom.detalle
    ) {

        if (
            !mapa.has(
                item.producto
            )
        ) {

            mapa.set(
                item.producto,
                {

                    producto:
                        item.producto,

                    productoNombre:
                        item.productoNombre,

                    unidad:
                        item.unidad,

                    unidadMercado:
                        item.unidadMercado,

                    empresasPotenciales:
                        0,

                    empleadosPotenciales:
                        0,

                    unidadesPotenciales:
                        0,

                    tam:
                        0,

                    sam:
                        0,

                    som:
                        0,

                    precioDefinido:
                        false

                }
            );

        }


        const acumulado =
            mapa.get(
                item.producto
            );


        acumulado.empresasPotenciales +=
            item.empresasPotenciales;


        acumulado.empleadosPotenciales +=
            item.empleadosPotenciales;


        acumulado.unidadesPotenciales +=
            item.unidadesPotenciales;


        if (
            item.tam !== null
        ) {

            acumulado.tam +=
                item.tam;

            acumulado.sam +=
                item.sam;

            acumulado.som +=
                item.som;

            acumulado.precioDefinido =
                true;

        }

    }


    return Array.from(
        mapa.values()
    )
    .map(
        item => ({

            ...item,

            tam:
                item.precioDefinido
                    ? item.tam
                    : null,

            sam:
                item.precioDefinido
                    ? item.sam
                    : null,

            som:
                item.precioDefinido
                    ? item.som
                    : null

        })
    );

}


// ============================================================
// RESUMEN DE MERCADO POR INDUSTRIA
// ============================================================

function resumirMercadoPorIndustria(
    tamSamSom
) {

    const mapa =
        new Map();


    for (
        const item of tamSamSom.detalle
    ) {

        if (
            !mapa.has(
                item.industria
            )
        ) {

            mapa.set(
                item.industria,
                {

                    industria:
                        item.industria,

                    empresasPotenciales:
                        0,

                    empleadosPotenciales:
                        0,

                    unidadesPotenciales:
                        0,

                    tam:
                        0,

                    sam:
                        0,

                    som:
                        0,

                    preciosDefinidos:
                        0,

                    productos:
                        0

                }
            );

        }


        const acumulado =
            mapa.get(
                item.industria
            );


        acumulado.empresasPotenciales +=
            item.empresasPotenciales;


        acumulado.empleadosPotenciales +=
            item.empleadosPotenciales;


        acumulado.unidadesPotenciales +=
            item.unidadesPotenciales;


        acumulado.productos++;


        if (
            item.tam !== null
        ) {

            acumulado.tam +=
                item.tam;

            acumulado.sam +=
                item.sam;

            acumulado.som +=
                item.som;

            acumulado.preciosDefinidos++;

        }

    }


    return Array.from(
        mapa.values()
    )
    .map(
        item => ({

            ...item,

            tam:
                item.preciosDefinidos > 0
                    ? item.tam
                    : null,

            sam:
                item.preciosDefinidos > 0
                    ? item.sam
                    : null,

            som:
                item.preciosDefinidos > 0
                    ? item.som
                    : null

        })
    )
    .sort(
        (a, b) =>
            b.unidadesPotenciales -
            a.unidadesPotenciales
    );

}


// ============================================================
// HANDLER
// ============================================================

module.exports =
    async function handler(
        req,
        res
    ) {

        try {

            console.log(
                "======================================"
            );

            console.log(
                "PREVENTA IA - MOTOR MERCADO 360"
            );

            console.log(
                "VERSION 3.7"
            );

            console.log(
                "======================================"
            );


            // =================================================
            // DESCARGAR
            // =================================================

            let empresasBuffer;

            let empleoBuffer;

            let errorOEDE = null;

            let estadoOEDE =
                "pendiente";


            try {

                console.log(
                    "Descargando empresas OEDE..."
                );


                empresasBuffer =
                    await descargarArchivo(
                        OEDE_EMPRESAS_URL
                    );


                console.log(
                    "Empresas:",
                    empresasBuffer.length,
                    "bytes"
                );


                console.log(
                    "Descargando empleo OEDE..."
                );


                empleoBuffer =
                    await descargarArchivo(
                        OEDE_EMPLEO_URL
                    );


                console.log(
                    "Empleo:",
                    empleoBuffer.length,
                    "bytes"
                );


                estadoOEDE =
                    "descargado";


            } catch (error) {

                console.error(
                    "ERROR descargando OEDE:",
                    error
                );


                errorOEDE =
                    error.message ||
                    String(error);


                estadoOEDE =
                    "error";

            }


            // =================================================
            // PROCESAR
            // =================================================

            let empresas = {

                actividades: [],

                agrupadores: [],

                total: 0,

                totalAgrupadores: 0

            };


            let empleo = {

                actividades: [],

                agrupadores: [],

                total: 0,

                totalAgrupadores: 0

            };


            if (
                empresasBuffer &&
                empleoBuffer
            ) {

                console.log(
                    "Procesando empresas..."
                );


                empresas =
                    consolidarLibro(
                        empresasBuffer,
                        "empresas"
                    );


                console.log(
                    "Empresas procesadas:",
                    empresas.actividades.length
                );


                console.log(
                    "Procesando empleo..."
                );


                empleo =
                    consolidarLibro(
                        empleoBuffer,
                        "empleo"
                    );


                console.log(
                    "Empleo procesado:",
                    empleo.actividades.length
                );

            }


            // =================================================
            // RANKING
            // =================================================

            const ranking =
                generarRanking(
                    empresas,
                    empleo
                );


            // =================================================
            // POTENCIAL
            // =================================================

            const potencialProductos =
                calcularPotencialProductos(
                    ranking
                );


            // =================================================
            // TAM / SAM / SOM
            // =================================================

            const tamSamSom =
                calcularTAMSAMSOM(
                    ranking
                );


            const mercadoPorProducto =
                resumirMercadoPorProducto(
                    tamSamSom
                );


            const mercadoPorIndustria =
                resumirMercadoPorIndustria(
                    tamSamSom
                );


            // =================================================
            // FALTANTES
            // =================================================

            const faltantes = [];


            if (
                tamSamSom
                    .faltantesPrecio
                    .length > 0
            ) {

                faltantes.push(
                    "Precio anual por producto"
                );

            }


            faltantes.push(
                "Validación final del mapeo OEDE → industrias PREVENTA"
            );


            faltantes.push(
                "Validación de indicadores documentales por industria"
            );


            faltantes.push(
                "Los indicadores documentales son estimaciones sectoriales y no identifican empresas individuales."
            );


            // =================================================
            // RESPUESTA
            // =================================================

            const respuesta = {

                ok:
                    true,

                version:
                    "3.7",

                motor:
                    "Mercado 360",

                fecha:
                    new Date().toISOString(),


                // ------------------------------------------------
                // MERCADO
                // ------------------------------------------------

                mercado: {

                    estado: {

                        fuentesOficiales:
                            2,

                        datosReales:
                            (
                                empresas.actividades.length +
                                empleo.actividades.length
                            ),

                        faltantes:
                            faltantes.length,

                        oede:
                            estadoOEDE,

                        metodologia:
                            "OEDE utiliza actividades detalladas con códigos numéricos para evitar doble conteo de categorías agrupadoras. Las empresas y el empleo provienen de OEDE; los indicadores documentales son variables sectoriales modeladas."

                    }

                },


                // ------------------------------------------------
                // FUENTES
                // ------------------------------------------------

                fuentes: {

                    empresas: {

                        nombre:
                            "OEDE - Empresas por provincias",

                        url:
                            OEDE_EMPRESAS_URL,

                        actualizacion:
                            "Junio 2026",

                        estado:
                            estadoOEDE

                    },

                    empleo: {

                        nombre:
                            "OEDE - Empleo trimestral",

                        url:
                            OEDE_EMPLEO_URL,

                        actualizacion:
                            "Junio 2026",

                        estado:
                            estadoOEDE

                    }

                },


                // ------------------------------------------------
                // DATOS REALES
                // ------------------------------------------------

                datosReales: {

                    empresasOEDE:
                        empresas.total,

                    empleoOEDE:
                        empleo.total,

                    ultimoDatoEmpresas:
                        empresas.ultimoPeriodo,

                    ultimoDatoEmpleo:
                        empleo.ultimoPeriodo,


                    empresas: {

                        cantidadActividades:
                            empresas.actividades.length,

                        cantidadAgrupadores:
                            empresas.agrupadores.length,

                        hojasAnalizadas:
                            empresas.hojasAnalizadas,

                        hojasConDatos:
                            empresas.hojasConDatos,

                        registros:
                            empresas.registrosTotales,

                        registrosAgrupadores:
                            empresas.registrosAgrupadores

                    },


                    empleo: {

                        cantidadActividades:
                            empleo.actividades.length,

                        cantidadAgrupadores:
                            empleo.agrupadores.length,

                        hojasAnalizadas:
                            empleo.hojasAnalizadas,

                        hojasConDatos:
                            empleo.hojasConDatos,

                        registros:
                            empleo.registrosTotales,

                        registrosAgrupadores:
                            empleo.registrosAgrupadores

                    },


                    estado:
                        "datos OEDE detallados procesados sin sumar categorías agrupadoras"

                },


                // ------------------------------------------------
                // ACTIVIDADES
                // ------------------------------------------------

                actividades: {

                    empresas:
                        empresas.actividades,

                    empleo:
                        empleo.actividades,

                    agrupadoresEmpresas:
                        empresas.agrupadores,

                    agrupadoresEmpleo:
                        empleo.agrupadores

                },


                // ------------------------------------------------
                // RANKING
                // ------------------------------------------------

                ranking,


                // ------------------------------------------------
                // PRODUCTOS
                // ------------------------------------------------

                productos:
                    productosPREVENTA,


                // ------------------------------------------------
                // MATRIZ PRODUCTOS × INDUSTRIAS
                // ------------------------------------------------

                potencialProductosIndustria:
                    potencialProductosIndustria,


                // ------------------------------------------------
                // VARIABLES DOCUMENTALES
                // ------------------------------------------------

                variablesDocumentales:
                    variablesDocumentales,


                // ------------------------------------------------
                // CRITERIOS ESPECÍFICOS POR PRODUCTO
                // ------------------------------------------------

                criteriosProducto:
                    criteriosProducto,


                // ------------------------------------------------
                // METODOLOGÍA DEL POTENCIAL
                // ------------------------------------------------

                metodologiaPotencial: {

                    descripcion:
                        "El potencial de cada producto se calcula combinando afinidad sectorial e indicadores documentales específicos del producto.",

                    formula:
                        "Potencial = afinidad sectorial × peso de afinidad + score de variables × peso de variables.",

                    pesoAfinidad:
                        "Configurado individualmente por producto.",

                    pesoVariables:
                        "Configurado individualmente por producto.",

                    datosOEDE:
                        [
                            "Empresas",
                            "Empleo",
                            "Actividad económica",
                            "Código de actividad"
                        ],

                    indicadoresModelados:
                        [
                            "necesidadDocumental",
                            "archivoFisico",
                            "digitalizacion",
                            "ocr",
                            "busqueda",
                            "firmas",
                            "workflows",
                            "compliance",
                            "contratos",
                            "migracion",
                            "integraciones",
                            "almacenamiento"
                        ],

                    aclaracion:
                        "Los indicadores documentales son estimaciones sectoriales utilizadas por el modelo. No significan que un porcentaje determinado de empresas individuales haya sido identificado con esa necesidad.",

                    estimaciones:
                        "Las estimaciones de empresas o empleados potenciales no deben sumarse entre factores porque los factores pueden corresponder a las mismas organizaciones o personas."

                },


                // ------------------------------------------------
                // POTENCIAL
                // ------------------------------------------------

                potencialProductos:
                    potencialProductos,


                // ------------------------------------------------
                // SUPUESTOS
                // ------------------------------------------------

                supuestos:
                    supuestosMercado,


                // ------------------------------------------------
                // TAM / SAM / SOM
                // ------------------------------------------------

                tamSamSom: {

                    metodologia:
                        "TAM = unidades potenciales × precio anual. Para productos por empresa se utilizan empresas potenciales. Para productos por empleado se utilizan empleados potenciales. SAM = TAM × porcentaje SAM. SOM = SAM × porcentaje SOM.",

                    unidadMercado:
                        "La unidad de mercado se determina por producto: empresa o empleado.",

                    detalle:
                        tamSamSom.detalle,

                    faltantesPrecio:
                        tamSamSom.faltantesPrecio,

                    porProducto:
                        mercadoPorProducto,

                    porIndustria:
                        mercadoPorIndustria

                },


                // ------------------------------------------------
                // FALTANTES
                // ------------------------------------------------

                faltantes,


                // ------------------------------------------------
                // DIAGNÓSTICO
                // ------------------------------------------------

                diagnostico: {

                    oede:
                        estadoOEDE,

                    oedeError:
                        errorOEDE,


                    empresas: {

                        hojas:
                            empresas.cantidadHojas,

                        hojasAnalizadas:
                            empresas.hojasAnalizadas,

                        hojasConDatos:
                            empresas.hojasConDatos,

                        registros:
                            empresas.registrosTotales,

                        agrupadores:
                            empresas.registrosAgrupadores,

                        actividadesDetalladas:
                            empresas.actividades.length

                    },


                    empleo: {

                        hojas:
                            empleo.cantidadHojas,

                        hojasAnalizadas:
                            empleo.hojasAnalizadas,

                        hojasConDatos:
                            empleo.hojasConDatos,

                        registros:
                            empleo.registrosTotales,

                        agrupadores:
                            empleo.registrosAgrupadores,

                        actividadesDetalladas:
                            empleo.actividades.length

                    },


                    metodologia: {

                        dobleConteo:
                            false,

                        categoriasAgrupadorasExcluidas:
                            true,

                        codigosNumericosUtilizados:
                            true,

                        hojaAuxiliarEmpresasExcluida:
                            "Hoja1",

                        potencialPorProducto:
                            true,

                        factoresEspecificosPorProducto:
                            true,

                        unidadDeMercado:
                            true,

                        tamSamSomMismaLogica:
                            true

                    }

                },


                // ------------------------------------------------
                // SIGUIENTE PASO
                // ------------------------------------------------

                siguientePaso:
                    "Definir precios por producto, validar los indicadores sectoriales y luego conectar Mercado 360 con prospectos empresa por empresa."

            };


            return res
                .status(200)
                .json(
                    respuesta
                );


        } catch (error) {

            console.error(
                "ERROR GENERAL MOTOR 360:",
                error
            );


            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        error.message ||
                        String(error)

                });

        }

    };
