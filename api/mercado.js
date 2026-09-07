const XLSX = require("xlsx");

// ============================================================
// PREVENTA IA
// MOTOR DE MERCADO 360
// VERSION 3.5
//
// Lee los archivos oficiales OEDE y consolida:
//
// - Empresas por actividad detallada
// - Empleo por actividad detallada
// - Todas las regiones
// - Categorías agrupadoras separadas
// - Ranking inicial de industrias
//
// CORRECCIÓN v3.5:
//
// OEDE contiene dos niveles:
//   A / B / C / G / etc. = categorías agrupadoras
//   1 / 2 / 45 / 51 / 52 / etc. = actividades detalladas
//
// Para evitar doble conteo:
// - Los códigos de letras NO se suman al total.
// - Los códigos numéricos SÍ se utilizan para el consolidado.
//
// También se excluye "Hoja1" del archivo de empresas,
// ya que el conjunto regional utilizado corresponde a
// las 25 regiones analizadas.
//
// TAM / SAM / SOM todavía no se modifica en esta versión.
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
// CONVERTIR VALORES DEL EXCEL A NÚMERO
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
        String(valor).trim();

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


    // 4,479
    if (
        /^\d{1,3}(,\d{3})+$/.test(texto)
    ) {

        return Number(
            texto.replace(/,/g, "")
        );

    }


    // 45.123
    if (
        /^\d{1,3}(\.\d{3})+$/.test(texto)
    ) {

        return Number(
            texto.replace(/\./g, "")
        );

    }


    // 1.234,56
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
            texto.replace(",", ".")
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
// LEER HOJA COMO MATRIZ
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
// DETECTAR PERIODO
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

        const columnasPeriodo = [];

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
// DETECTAR COLUMNAS DE PERIODO
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
// OBTENER ÚLTIMO PERIODO
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
// DETERMINAR NIVEL DE ACTIVIDAD
//
// "A", "B", "C" ... = agrupador
// "1", "2", "45", "51"... = detallada
// ============================================================

function obtenerTipoActividad(
    codigo
) {

    const valor =
        String(
            codigo || ""
        ).trim();


    if (
        /^[A-Z]$/i.test(valor)
    ) {

        return "agrupador";

    }


    if (
        /^\d+$/.test(valor)
    ) {

        return "detallada";

    }


    return "desconocida";
}


// ============================================================
// EXTRAER DATOS DE UNA HOJA
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

            agrupadores:
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

            agrupadores:
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

            agrupadores:
                [],

            periodo:
                null,

            filas:
                matriz.length

        };

    }


    const registros = [];

    const agrupadores = [];


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


        const nivel =
            obtenerTipoActividad(
                codigo
            );


        const registro = {

            codigo,

            actividad,

            valor,

            nivel,

            hoja:
                nombreHoja,

            anio:
                ultimoPeriodo.anio,

            trimestre:
                ultimoPeriodo.trimestre,

            periodo:
                ultimoPeriodo.texto

        };


        if (
            nivel === "detallada"
        ) {

            registros.push(
                registro
            );

        }


        if (
            nivel === "agrupador"
        ) {

            agrupadores.push(
                registro
            );

        }

    }


    return {

        hoja:
            nombreHoja,

        registros,

        agrupadores,

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
// CONSOLIDAR TODAS LAS HOJAS
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


        // ----------------------------------------------------
        // DOCUMENTACIÓN
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // HOJA AUXILIAR DEL ARCHIVO DE EMPRESAS
        //
        // El conjunto regional utilizado contiene 25 regiones.
        // Hoja1 aparece únicamente como hoja adicional.
        // ----------------------------------------------------

        if (
            tipo === "empresas" &&
            nombreNormalizado === "hoja1"
        ) {

            console.log(
                "OEDE empresas: ignorando hoja auxiliar Hoja1"
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


    // ========================================================
    // CONSOLIDACIÓN DE ACTIVIDADES DETALLADAS
    // ========================================================

    const mapa =
        new Map();


    // ========================================================
    // CONSOLIDACIÓN DE AGRUPADORES
    //
    // Los conservamos para referencia, pero NO entran
    // en el total.
    // ========================================================

    const mapaAgrupadores =
        new Map();


    let registrosTotales = 0;

    let agrupadoresTotales = 0;

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


        agrupadoresTotales +=
            resultado.agrupadores.length;


        // ----------------------------------------------------
        // ÚLTIMO PERIODO
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // ACTIVIDADES DETALLADAS
        // ----------------------------------------------------

        for (
            const registro of resultado.registros
        ) {

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

                        nivel:
                            "detallada",

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

        }


        // ----------------------------------------------------
        // AGRUPADORES
        // ----------------------------------------------------

        for (
            const registro of resultado.agrupadores
        ) {

            const clave =
                registro.codigo +
                "|" +
                normalizarTexto(
                    registro.actividad
                );


            if (
                !mapaAgrupadores.has(
                    clave
                )
            ) {

                mapaAgrupadores.set(
                    clave,
                    {

                        codigo:
                            registro.codigo,

                        actividad:
                            registro.actividad,

                        nivel:
                            "agrupador",

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
                mapaAgrupadores.get(
                    clave
                );


            acumulado.valor +=
                registro.valor;


            acumulado.regiones +=
                1;


            acumulado.fuentes.push(
                registro.hoja
            );

        }

    }


    const actividades =
        Array.from(
            mapa.values()
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


    // ========================================================
    // TOTAL CORRECTO
    //
    // SOLO actividades detalladas.
    // ========================================================

    const total =
        actividades.reduce(
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

        agrupadoresTotales,

        actividades,

        agrupadores,

        total,

        ultimoPeriodo:
            ultimoPeriodoGlobal

    };
}


// ============================================================
// MAPEO OEDE → INDUSTRIAS PREVENTA
// ============================================================

function mapearIndustria(
    actividad
) {

    const texto =
        normalizarTexto(
            actividad
        );


    // --------------------------------------------------------
    // AGRICULTURA
    // --------------------------------------------------------

    if (
        texto.includes("agricultura") ||
        texto.includes("ganaderia") ||
        texto.includes("silvicultura") ||
        texto.includes("pesca")
    ) {

        return "Agricultura";

    }


    // --------------------------------------------------------
    // MINERÍA
    // --------------------------------------------------------

    if (
        texto.includes("mineria") ||
        texto.includes("extraccion de petroleo") ||
        texto.includes("extraccion de gas") ||
        texto.includes("minas y canteras")
    ) {

        return "Minería";

    }


    // --------------------------------------------------------
    // INDUSTRIA
    // --------------------------------------------------------

    if (
        texto.includes("industria") ||
        texto.includes("manufactur") ||
        texto.includes("alimentos") ||
        texto.includes("productos quimicos") ||
        texto.includes("productos textiles") ||
        texto.includes("confecciones") ||
        texto.includes("madera") ||
        texto.includes("muebles") ||
        texto.includes("maquinaria")
    ) {

        return "Industria";

    }


    // --------------------------------------------------------
    // CONSTRUCCIÓN
    // --------------------------------------------------------

    if (
        texto.includes("construccion")
    ) {

        return "Construcción";

    }


    // --------------------------------------------------------
    // RETAIL / COMERCIO
    // --------------------------------------------------------

    if (
        texto.includes("comercio") ||
        texto.includes("venta") ||
        texto.includes("vta y reparacion") ||
        texto.includes("comercio al por menor") ||
        texto.includes("comercio al por mayor")
    ) {

        return "Retail";

    }


    // --------------------------------------------------------
    // LOGÍSTICA / TRANSPORTE
    // --------------------------------------------------------

    if (
        texto.includes("transporte") ||
        texto.includes("almacenamiento") ||
        texto.includes("deposito") ||
        texto.includes("manipulacion de carga")
    ) {

        return "Logística/Transporte";

    }


    // --------------------------------------------------------
    // TELECOM
    // --------------------------------------------------------

    if (
        texto.includes("telecomunicaciones") ||
        texto.includes("comunicaciones") ||
        texto.includes("correos") ||
        texto.includes("actividades de informatica")
    ) {

        return "Telecom";

    }


    // --------------------------------------------------------
    // SEGUROS
    //
    // IMPORTANTE:
    // Se evalúa ANTES de bancos/finanzas.
    // --------------------------------------------------------

    if (
        texto.includes("seguros") ||
        texto.includes("servicios de seguros")
    ) {

        return "Seguros";

    }


    // --------------------------------------------------------
    // BANCOS / FINANZAS
    // --------------------------------------------------------

    if (
        texto.includes("intermediacion financiera") ||
        texto.includes("actividad financiera") ||
        texto.includes("servicios financieros") ||
        texto.includes("bancos")
    ) {

        return "Bancos/Finanzas";

    }


    // --------------------------------------------------------
    // SALUD
    // --------------------------------------------------------

    if (
        texto.includes("salud") ||
        texto.includes("sanidad") ||
        texto.includes("servicios sociales")
    ) {

        return "Salud";

    }


    // --------------------------------------------------------
    // EDUCACIÓN
    // --------------------------------------------------------

    if (
        texto.includes("educacion") ||
        texto.includes("ensenanza")
    ) {

        return "Educación";

    }


    // --------------------------------------------------------
    // GOBIERNO
    // --------------------------------------------------------

    if (
        texto.includes("administracion publica") ||
        texto.includes("administracion del estado") ||
        texto.includes("servicios generales de la administracion")
    ) {

        return "Gobierno";

    }


    // --------------------------------------------------------
    // SERVICIOS PROFESIONALES
    // --------------------------------------------------------

    if (
        texto.includes("servicios juridicos") ||
        texto.includes("servicios contables") ||
        texto.includes("servicios profesionales") ||
        texto.includes("servicios empresariales") ||
        texto.includes("organizaciones empresariales")
    ) {

        return "Servicios profesionales";

    }


    // --------------------------------------------------------
    // ENERGÍA
    // --------------------------------------------------------

    if (
        texto.includes("electricidad") ||
        texto.includes("energia") ||
        texto.includes("gas") ||
        texto.includes("agua")
    ) {

        return "Energía";

    }


    return "Otros";
}


// ============================================================
// GENERAR RANKING INICIAL
// ============================================================

function generarRanking(
    empresas,
    empleo
) {

    const mapa =
        new Map();


    // ========================================================
    // EMPRESAS
    // ========================================================

    for (
        const item of empresas.actividades
    ) {

        const industria =
            mapearIndustria(
                item.actividad
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


    // ========================================================
    // EMPLEO
    // ========================================================

    for (
        const item of empleo.actividades
    ) {

        const industria =
            mapearIndustria(
                item.actividad
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


    // ========================================================
    // SCORE
    //
    // 40% empresas
    // 60% empleo
    //
    // Usamos logaritmo para evitar que una industria
    // enorme destruya el resto del ranking.
    // ========================================================

    const ranking =
        Array.from(
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
                        ) +
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


    return ranking;
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
                "VERSION 3.5"
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

                ultimoPeriodo: null,

                hojasAnalizadas: 0,

                hojasConDatos: 0,

                registrosTotales: 0,

                agrupadoresTotales: 0,

                cantidadHojas: 0

            };


            let empleo = {

                actividades: [],

                agrupadores: [],

                total: 0,

                ultimoPeriodo: null,

                hojasAnalizadas: 0,

                hojasConDatos: 0,

                registrosTotales: 0,

                agrupadoresTotales: 0,

                cantidadHojas: 0

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
                    "Empresas detalladas:",
                    empresas.actividades.length
                );


                console.log(
                    "Empresas agrupadoras:",
                    empresas.agrupadores.length
                );


                console.log(
                    "Total empresas detalladas:",
                    empresas.total
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
                    "Empleo detallado:",
                    empleo.actividades.length
                );


                console.log(
                    "Empleo agrupador:",
                    empleo.agrupadores.length
                );


                console.log(
                    "Total empleo detallado:",
                    empleo.total
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
            // RESPUESTA
            // =================================================

            const respuesta = {

                ok: true,

                version:
                    "3.5",

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
                            estadoOEDE ===
                            "descargado"
                                ? 0
                                : 2,

                        oede:
                            estadoOEDE,

                        metodologia:
                            "Se utilizan actividades OEDE detalladas con códigos numéricos para evitar doble conteo de categorías agrupadoras."

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
                            empresas.agrupadoresTotales

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
                            empleo.agrupadoresTotales

                    },


                    estado:
                        "datos OEDE detallados procesados sin sumar categorías agrupadoras"

                },


                // ------------------------------------------------
                // ACTIVIDADES REALES
                // ------------------------------------------------

                actividades: {

                    empresas:
                        empresas.actividades,

                    empleo:
                        empleo.actividades

                },


                // ------------------------------------------------
                // AGRUPADORES OEDE
                //
                // Se entregan para análisis y referencia,
                // pero no participan de los totales.
                // ------------------------------------------------

                agrupadores: {

                    empresas:
                        empresas.agrupadores,

                    empleo:
                        empleo.agrupadores

                },


                // ------------------------------------------------
                // RANKING
                // ------------------------------------------------

                ranking,


                // ------------------------------------------------
                // SUPUESTOS
                // ------------------------------------------------

                supuestos: {

                    porcentajeDigitalizacion:
                        43.48,

                    porcentajeClientes:
                        6.76,

                    tasaCaptura:
                        3.5

                },


                // ------------------------------------------------
                // FALTANTES
                // ------------------------------------------------

                faltantes: [

                    "Validación final del mapeo OEDE → industrias PREVENTA",

                    "Variables específicas por producto",

                    "Necesidad documental por industria",

                    "Precio por producto",

                    "Cálculo TAM",

                    "Cálculo SAM",

                    "Cálculo SOM"

                ],


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
                            empresas.agrupadoresTotales,

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
                            empleo.agrupadoresTotales,

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
                            "Hoja1"

                    }

                },


                // ------------------------------------------------
                // SIGUIENTE PASO
                // ------------------------------------------------

                siguientePaso:
                    "Conectar industrias, productos, variables documentales y posteriormente calcular TAM/SAM/SOM."

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

                    ok: false,

                    error:
                        error.message ||
                        String(error)

                });

        }

    };
