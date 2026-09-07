const XLSX = require("xlsx");

// ============================================================
// PREVENTA IA
// MOTOR DE MERCADO 360
// VERSION 3.4
//
// Lee los archivos oficiales OEDE y consolida:
// - Empresas por actividad
// - Empleo por actividad
// - Todas las provincias / regiones
//
// IMPORTANTE:
// Esta versión NO modifica todavía TAM / SAM / SOM.
// Primero hacemos funcionar correctamente los datos reales.
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


// ------------------------------------------------------------
// Convertir valores del Excel a número
//
// Ejemplos:
// "4,479" -> 4479
// "45.123" -> 45123
// "1.234,56" -> 1234.56
// "s.d." -> null
// ------------------------------------------------------------

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

    // El Excel de OEDE suele usar coma como separador
    // de miles: 4,479
    if (
        /^\d{1,3}(,\d{3})+$/.test(texto)
    ) {

        return Number(
            texto.replace(/,/g, "")
        );

    }

    // Formato argentino: 1.234
    if (
        /^\d{1,3}(\.\d{3})+$/.test(texto)
    ) {

        return Number(
            texto.replace(/\./g, "")
        );

    }

    // Formato 1.234,56
    if (
        /^\d{1,3}(\.\d{3})+,\d+$/.test(texto)
    ) {

        return Number(
            texto
                .replace(/\./g, "")
                .replace(",", ".")
        );

    }

    // Número decimal simple
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
// DETECTAR AÑO EN TEXTO
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
//
// Reconoce:
// 4º Trim 2025
// 4° Trim 2025
// 2025
// Año 2025
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
            texto: valor
        };

    }

    return {
        anio,
        trimestre: null,
        texto: valor
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

    // Código tipo:
    // A
    // B
    // C
    // 1
    // 2
    // 10
    // 45
    // etc.

    if (
        /^[A-Z]$/i.test(codigo) ||
        /^\d+$/.test(codigo)
    ) {
        return true;
    }

    return false;
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
            hoja: nombreHoja,
            registros: [],
            periodo: null,
            filas: 0
        };

    }

    const encabezado =
        detectarFilaEncabezado(
            matriz,
            tipo
        );

    if (!encabezado) {

        return {
            hoja: nombreHoja,
            registros: [],
            periodo: null,
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
            hoja: nombreHoja,
            registros: [],
            periodo: null,
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

        // Ignoramos documentación
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

    // --------------------------------------------------------
    // Consolidación
    // --------------------------------------------------------

    const mapa =
        new Map();

    let registrosTotales = 0;

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

                        regiones: 0,

                        fuentes: [],

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

        actividades,

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

    if (
        texto.includes("agricultura") ||
        texto.includes("ganaderia") ||
        texto.includes("silvicultura") ||
        texto.includes("pesca")
    ) {
        return "Agricultura";
    }

    if (
        texto.includes("mineria") ||
        texto.includes("extraccion de petroleo") ||
        texto.includes("extraccion de gas")
    ) {
        return "Minería";
    }

    if (
        texto.includes("industria") ||
        texto.includes("manufactur")
    ) {
        return "Industria";
    }

    if (
        texto.includes("construccion")
    ) {
        return "Construcción";
    }

    if (
        texto.includes("comercio")
    ) {
        return "Retail";
    }

    if (
        texto.includes("transporte") ||
        texto.includes("almacenamiento")
    ) {
        return "Logística/Transporte";
    }

    if (
        texto.includes("informacion") ||
        texto.includes("comunicacion") ||
        texto.includes("telecom")
    ) {
        return "Telecom";
    }

    if (
        texto.includes("financiero") ||
        texto.includes("bancos") ||
        texto.includes("seguros")
    ) {
        return "Bancos/Finanzas";
    }

    if (
        texto.includes("salud") ||
        texto.includes("sanidad")
    ) {
        return "Salud";
    }

    if (
        texto.includes("educacion")
    ) {
        return "Educación";
    }

    if (
        texto.includes("administracion publica") ||
        texto.includes("administracion del estado")
    ) {
        return "Gobierno";
    }

    if (
        texto.includes("profesionales") ||
        texto.includes("servicios empresariales")
    ) {
        return "Servicios profesionales";
    }

    if (
        texto.includes("electricidad") ||
        texto.includes("gas") ||
        texto.includes("agua") ||
        texto.includes("energia")
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
                    empresas: 0,
                    empleo: 0
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
                    empresas: 0,
                    empleo: 0
                }
            );

        }

        mapa.get(
            industria
        ).empleo +=
            item.valor;

    }


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
                "VERSION 3.4"
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

                total: 0

            };

            let empleo = {

                actividades: [],

                total: 0

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
            // RESPUESTA
            // =================================================

            const respuesta = {

                ok: true,

                version:
                    "3.4",

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
                            estadoOEDE

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

                        hojasAnalizadas:
                            empresas.hojasAnalizadas,

                        hojasConDatos:
                            empresas.hojasConDatos,

                        registros:
                            empresas.registrosTotales
                    },

                    empleo: {
                        cantidadActividades:
                            empleo.actividades.length,

                        hojasAnalizadas:
                            empleo.hojasAnalizadas,

                        hojasConDatos:
                            empleo.hojasConDatos,

                        registros:
                            empleo.registrosTotales
                    },

                    estado:
                        "datos OEDE procesados"

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
                            empresas.registrosTotales

                    },

                    empleo: {

                        hojas:
                            empleo.cantidadHojas,

                        hojasAnalizadas:
                            empleo.hojasAnalizadas,

                        hojasConDatos:
                            empleo.hojasConDatos,

                        registros:
                            empleo.registrosTotales

                    }

                },


                siguientePaso:
                    "Validar datos consolidados OEDE y luego conectar industrias, productos y TAM/SAM/SOM."

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
