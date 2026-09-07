const XLSX = require("xlsx");

// ============================================================
// PREVENTA IA
// MOTOR DE MERCADO 360
// VERSIÓN 3.3
// Diagnóstico automático de estructura OEDE
// ============================================================

const OEDE_EMPRESAS_URL =
    "https://www.argentina.gob.ar/sites/default/files/provinciales_serie_empresas1_2.xlsx";

const OEDE_EMPLEO_URL =
    "https://www.argentina.gob.ar/sites/default/files/provinciales_serie_empleo_trimestral_2dig_6.xlsx";


// ============================================================
// NORMALIZAR TEXTO
// ============================================================

function normalizarTexto(valor) {

    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


// ============================================================
// DESCARGAR ARCHIVO
// ============================================================

async function descargarArchivo(url) {

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
        throw new Error(
            "No se pudo descargar OEDE. Estado HTTP: " +
            respuesta.status
        );
    }

    const buffer = await respuesta.arrayBuffer();

    if (!buffer || buffer.byteLength === 0) {
        throw new Error(
            "OEDE devolvió un archivo vacío."
        );
    }

    return Buffer.from(buffer);
}


// ============================================================
// LEER EXCEL COMO MATRIZ
// ============================================================

function leerHojaComoMatriz(hoja) {

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

    const valor = String(texto || "");

    const coincidencias =
        valor.match(/\b(19|20)\d{2}\b/g);

    if (!coincidencias || coincidencias.length === 0) {
        return null;
    }

    return Number(
        coincidencias[coincidencias.length - 1]
    );
}


// ============================================================
// DETECTAR SI UNA CELDA PARECE ACTIVIDAD
// ============================================================

function pareceActividad(texto) {

    const t = normalizarTexto(texto);

    if (!t) {
        return false;
    }

    const palabras = [
        "actividad",
        "actividades",
        "rama",
        "sector",
        "cnae",
        "claee",
        "clae",
        "agricultura",
        "ganaderia",
        "pesca",
        "mineria",
        "industria",
        "construccion",
        "comercio",
        "transporte",
        "alojamiento",
        "informacion",
        "comunicacion",
        "financiero",
        "seguros",
        "inmobiliario",
        "profesionales",
        "administrativos",
        "educacion",
        "salud",
        "artes",
        "servicios",
        "administracion publica"
    ];

    return palabras.some(
        palabra => t.includes(palabra)
    );
}


// ============================================================
// DETECTAR ENCABEZADOS
// ============================================================

function analizarFilas(matriz) {

    const candidatos = [];

    const maxFilas =
        Math.min(
            matriz.length,
            50
        );

    for (
        let fila = 0;
        fila < maxFilas;
        fila++
    ) {

        const valores =
            matriz[fila] || [];

        const textos =
            valores.map(
                valor => normalizarTexto(valor)
            );

        const cantidadNoVacia =
            textos.filter(
                valor => valor !== ""
            ).length;

        if (cantidadNoVacia === 0) {
            continue;
        }

        let puntaje = 0;

        const columnasAnio = [];

        const columnasActividad = [];

        const columnasEmpresa = [];

        const columnasEmpleo = [];

        textos.forEach(
            (texto, columna) => {

                if (!texto) {
                    return;
                }

                const anio =
                    detectarAnio(texto);

                if (anio) {
                    columnasAnio.push({
                        columna,
                        anio,
                        textoOriginal:
                            valores[columna]
                    });
                }

                if (
                    texto.includes("actividad") ||
                    texto.includes("rama") ||
                    texto.includes("sector") ||
                    texto.includes("cnae") ||
                    texto.includes("clae")
                ) {

                    columnasActividad.push({
                        columna,
                        textoOriginal:
                            valores[columna]
                    });

                    puntaje += 5;
                }

                if (
                    texto.includes("empresa") ||
                    texto.includes("empresas") ||
                    texto.includes("firma") ||
                    texto.includes("firmas")
                ) {

                    columnasEmpresa.push({
                        columna,
                        textoOriginal:
                            valores[columna]
                    });

                    puntaje += 5;
                }

                if (
                    texto.includes("empleo") ||
                    texto.includes("ocupados") ||
                    texto.includes("trabajadores") ||
                    texto.includes("puestos")
                ) {

                    columnasEmpleo.push({
                        columna,
                        textoOriginal:
                            valores[columna]
                    });

                    puntaje += 5;
                }

                if (
                    texto.includes("provincia") ||
                    texto.includes("departamento") ||
                    texto.includes("localidad") ||
                    texto.includes("periodo") ||
                    texto.includes("trimestre") ||
                    texto.includes("total")
                ) {

                    puntaje += 1;
                }

            }
        );

        // Una fila con varios años es muy probablemente
        // una fila de encabezado.
        if (columnasAnio.length >= 2) {
            puntaje += 4;
        }

        if (
            columnasActividad.length > 0 ||
            columnasEmpresa.length > 0 ||
            columnasEmpleo.length > 0 ||
            columnasAnio.length >= 2
        ) {

            candidatos.push({
                fila,
                puntaje,
                cantidadNoVacia,
                columnasAnio,
                columnasActividad,
                columnasEmpresa,
                columnasEmpleo,
                valores: valores.slice(0, 30)
            });

        }

    }

    candidatos.sort(
        (a, b) =>
            b.puntaje - a.puntaje
    );

    return candidatos.slice(0, 5);
}


// ============================================================
// ANALIZAR HOJA
// ============================================================

function analizarHoja(nombre, hoja) {

    const matriz =
        leerHojaComoMatriz(hoja);

    const cantidadFilas =
        matriz.length;

    if (cantidadFilas === 0) {

        return {
            hoja: nombre,
            tipo: "vacia",
            cantidadFilas: 0,
            diagnostico: []
        };

    }

    const primerasFilas =
        matriz
            .slice(0, 10)
            .map(
                (fila, indice) => ({
                    fila: indice,
                    valores:
                        (fila || [])
                            .slice(0, 25)
                })
            );

    const candidatos =
        analizarFilas(matriz);

    let tipo =
        "desconocida";

    const nombreNormalizado =
        normalizarTexto(nombre);

    if (
        nombreNormalizado.includes("caratula") ||
        nombreNormalizado.includes("indice") ||
        nombreNormalizado.includes("metodologia") ||
        nombreNormalizado.includes("fuentes")
    ) {

        tipo = "documentacion";

    } else if (candidatos.length > 0) {

        const mejor =
            candidatos[0];

        if (
            mejor.columnasEmpresa.length > 0
        ) {

            tipo = "datos_empresas";

        } else if (
            mejor.columnasEmpleo.length > 0
        ) {

            tipo = "datos_empleo";

        } else if (
            mejor.columnasAnio.length >= 2
        ) {

            tipo = "posibles_datos";

        } else {

            tipo = "datos_indeterminados";

        }

    }

    return {

        hoja: nombre,

        tipo,

        cantidadFilas,

        cantidadColumnas:
            matriz.reduce(
                (maximo, fila) =>
                    Math.max(
                        maximo,
                        Array.isArray(fila)
                            ? fila.length
                            : 0
                    ),
                0
            ),

        primerasFilas,

        candidatos

    };
}


// ============================================================
// ANALIZAR LIBRO COMPLETO
// ============================================================

function analizarLibro(buffer) {

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

    const diagnostico =
        hojas.map(
            nombre => {

                const hoja =
                    libro.Sheets[nombre];

                return analizarHoja(
                    nombre,
                    hoja
                );

            }
        );

    return {

        cantidadHojas:
            hojas.length,

        hojas,

        diagnostico

    };
}


// ============================================================
// RESUMEN DEL LIBRO
// ============================================================

function resumirLibro(resultado) {

    const resumen = {

        cantidadHojas:
            resultado.cantidadHojas,

        documentacion: [],

        posiblesDatosEmpresas: [],

        posiblesDatosEmpleo: [],

        posiblesDatos: [],

        desconocidas: []

    };

    for (
        const hoja of resultado.diagnostico
    ) {

        if (
            hoja.tipo === "documentacion"
        ) {

            resumen.documentacion.push(
                hoja.hoja
            );

        } else if (
            hoja.tipo === "datos_empresas"
        ) {

            resumen.posiblesDatosEmpresas.push(
                hoja.hoja
            );

        } else if (
            hoja.tipo === "datos_empleo"
        ) {

            resumen.posiblesDatosEmpleo.push(
                hoja.hoja
            );

        } else if (
            hoja.tipo === "posibles_datos" ||
            hoja.tipo === "datos_indeterminados"
        ) {

            resumen.posiblesDatos.push(
                hoja.hoja
            );

        } else {

            resumen.desconocidas.push(
                hoja.hoja
            );

        }

    }

    return resumen;
}


// ============================================================
// MOTOR DE MERCADO
// ============================================================

module.exports = async function handler(
    req,
    res
) {

    try {

        console.log(
            "======================================"
        );

        console.log(
            "MOTOR DE MERCADO 360 - OEDE"
        );

        console.log(
            "======================================"
        );


        // ----------------------------------------------------
        // DESCARGAR OEDE
        // ----------------------------------------------------

        let empresasBuffer;
        let empleoBuffer;

        let estadoOEDE =
            "pendiente";

        let errorOEDE =
            null;

        let diagnosticoEmpresas =
            null;

        let diagnosticoEmpleo =
            null;


        try {

            console.log(
                "Descargando OEDE empresas..."
            );

            empresasBuffer =
                await descargarArchivo(
                    OEDE_EMPRESAS_URL
                );

            console.log(
                "Empresas descargado:",
                empresasBuffer.length,
                "bytes"
            );


            console.log(
                "Descargando OEDE empleo..."
            );

            empleoBuffer =
                await descargarArchivo(
                    OEDE_EMPLEO_URL
                );

            console.log(
                "Empleo descargado:",
                empleoBuffer.length,
                "bytes"
            );


            // ------------------------------------------------
            // ANALIZAR LIBROS
            // ------------------------------------------------

            console.log(
                "Analizando estructura del Excel de empresas..."
            );

            diagnosticoEmpresas =
                analizarLibro(
                    empresasBuffer
                );


            console.log(
                "Hojas empresas:",
                diagnosticoEmpresas.cantidadHojas
            );


            console.log(
                "Analizando estructura del Excel de empleo..."
            );

            diagnosticoEmpleo =
                analizarLibro(
                    empleoBuffer
                );


            console.log(
                "Hojas empleo:",
                diagnosticoEmpleo.cantidadHojas
            );


            estadoOEDE =
                "descargado";

        } catch (error) {

            console.error(
                "ERROR OEDE:",
                error
            );

            estadoOEDE =
                "error";

            errorOEDE =
                error.message ||
                String(error);

        }


        // ====================================================
        // RESUMEN
        // ====================================================

        const resumenEmpresas =
            diagnosticoEmpresas
                ? resumirLibro(
                    diagnosticoEmpresas
                )
                : null;

        const resumenEmpleo =
            diagnosticoEmpleo
                ? resumirLibro(
                    diagnosticoEmpleo
                )
                : null;


        // ====================================================
        // RESPUESTA
        // ====================================================

        const respuesta = {

            ok: true,

            version:
                "3.3",

            motor:
                "Mercado 360",

            fecha:
                new Date().toISOString(),

            mercado: {

                estado: {

                    fuentesOficiales:
                        2,

                    datosReales:
                        estadoOEDE ===
                        "descargado"
                            ? 2
                            : 0,

                    faltantes:
                        estadoOEDE ===
                        "descargado"
                            ? 0
                            : 2,

                    oede:
                        estadoOEDE

                }

            },


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


            diagnostico: {

                oede:
                    estadoOEDE,

                oedeError:
                    errorOEDE,

                empresas:
                    diagnosticoEmpresas,

                empleo:
                    diagnosticoEmpleo,

                resumenEmpresas,

                resumenEmpleo

            },


            datosReales: {

                empresasOEDE: 0,

                empleoOEDE: 0,

                estado:
                    "pendiente de interpretar estructura"

            },


            supuestos: {

                empresasObjetivo:
                    "pendiente",

                empleadosPromedio:
                    "pendiente",

                porcentajeDigitalizacion:
                    43.48,

                porcentajeClientes:
                    6.76,

                tasaCaptura:
                    3.5

            },


            faltantes: [

                "Interpretación de las tablas OEDE",

                "Agregación de empresas por actividad",

                "Agregación de empleo por actividad",

                "Mapeo actividad OEDE → industrias PREVENTA",

                "Cálculo TAM",

                "Cálculo SAM",

                "Cálculo SOM"

            ],


            ranking: [],


            siguientePaso:
                "Detectar automáticamente la estructura de las hojas OEDE y luego convertir sus datos en empresas y empleo por actividad."

        };


        return res
            .status(200)
            .json(respuesta);


    } catch (error) {

        console.error(
            "ERROR GENERAL MERCADO 360:",
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
