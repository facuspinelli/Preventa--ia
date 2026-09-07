// api/mercado.js
// Motor de Inteligencia de Mercado - PREVENTA IA
// v3.2 - Diagnóstico estructura real OEDE

import XLSX from "xlsx";

const OEDE_EMPRESAS_URL =
    "https://www.argentina.gob.ar/sites/default/files/provinciales_serie_empresas1_2.xlsx";

const OEDE_EMPLEO_URL =
    "https://www.argentina.gob.ar/sites/default/files/provinciales_serie_empleo_trimestral_2dig_6.xlsx";


/* =========================================================
   DESCARGAR ARCHIVO
   ========================================================= */

async function descargarArchivo(url) {

    const respuesta = await fetch(url);

    if (!respuesta.ok) {

        throw new Error(
            `OEDE respondió ${respuesta.status} al descargar ${url}`
        );

    }

    const buffer =
        await respuesta.arrayBuffer();

    if (
        !buffer ||
        buffer.byteLength === 0
    ) {

        throw new Error(
            "El archivo descargado desde OEDE está vacío."
        );

    }

    return Buffer.from(buffer);
}


/* =========================================================
   LEER EXCEL + DIAGNÓSTICO
   ========================================================= */

function leerExcel(buffer) {

    const workbook =
        XLSX.read(buffer, {
            type: "buffer",
            cellDates: true
        });

    const hojas =
        workbook.SheetNames;

    if (!hojas.length) {

        throw new Error(
            "El Excel de OEDE no contiene hojas."
        );

    }

    const resultado = {};

    for (
        const nombreHoja of hojas
    ) {

        const hoja =
            workbook.Sheets[nombreHoja];

        const filas =
            XLSX.utils.sheet_to_json(
                hoja,
                {
                    defval: null,
                    raw: false
                }
            );

        resultado[nombreHoja] = {

            cantidadFilas:
                filas.length,

            columnas:
                filas.length
                    ? Object.keys(filas[0])
                    : [],

            primeraFila:
                filas.length
                    ? filas[0]
                    : null,

            filas:

                filas.slice(
                    0,
                    5
                )

        };

    }

    return resultado;
}


/* =========================================================
   DIAGNÓSTICO DE EXCEL
   ========================================================= */

function generarDiagnosticoExcel(
    excel
) {

    return Object.entries(excel)
        .map(
            ([
                nombreHoja,
                informacion
            ]) => ({

                hoja:
                    nombreHoja,

                cantidadFilas:
                    informacion.cantidadFilas,

                columnas:
                    informacion.columnas,

                primeraFila:
                    informacion.primeraFila

            })
        );

}


/* =========================================================
   DATOS BASE
   ========================================================= */

const datosBase = [

    {
        id:
            "bcra_entidades_2026",

        variable:
            "entidades_financieras",

        value:
            73,

        unit:
            "entidades",

        industry:
            "bancos_finanzas",

        product:
            "thuban",

        companySize:
            "enterprise",

        year:
            2026,

        type:
            "source",

        source:
            "BCRA",

        sourceUrl:
            "https://www.bcra.gob.ar/",

        sourceDate:
            "2026",

        confidence:
            "alta",

        notes:
            "Cantidad de entidades financieras."
    },


    {
        id:
            "bcra_bancos_2026",

        variable:
            "bancos",

        value:
            60,

        unit:
            "bancos",

        industry:
            "bancos_finanzas",

        product:
            "thuban",

        companySize:
            "enterprise",

        year:
            2026,

        type:
            "source",

        source:
            "BCRA",

        sourceUrl:
            "https://www.bcra.gob.ar/",

        sourceDate:
            "2026",

        confidence:
            "alta",

        notes:
            "Cantidad de bancos."
    },


    {
        id:
            "internet_2026",

        variable:
            "accesos_internet",

        value:
            51176541,

        unit:
            "accesos",

        industry:
            "telecom",

        product:
            "thuban",

        companySize:
            null,

        year:
            2026,

        type:
            "source",

        source:
            "INDEC",

        sourceUrl:
            "https://www.indec.gob.ar/",

        sourceDate:
            "2026",

        confidence:
            "alta",

        notes:
            "Accesos nacionales a internet."
    }

];


/* =========================================================
   FUENTES
   ========================================================= */

function construirFuentes(
    ahora
) {

    return [

        {
            id:
                "oede",

            nombre:
                "OEDE - Ministerio de Trabajo",

            organismo:
                "Ministerio de Trabajo, Empleo y Seguridad Social",

            tipo:
                "oficial",

            url:
                "https://www.argentina.gob.ar/trabajo/estadisticas/oede-estadisticas-provinciales",

            estado:
                "disponible",

            actualizacion:
                "Junio 2026",

            variables: [
                "empresas",
                "empleo",
                "actividad",
                "remuneraciones"
            ],

            archivos: [

                {
                    nombre:
                        "Empresas por rama de actividad - 2 dígitos",

                    url:
                        OEDE_EMPRESAS_URL
                },

                {
                    nombre:
                        "Empleo - serie trimestral - 2 dígitos",

                    url:
                        OEDE_EMPLEO_URL
                }

            ],

            consultado:
                ahora
        },


        {
            id:
                "bcra",

            nombre:
                "BCRA - Entidades Financieras",

            organismo:
                "Banco Central de la República Argentina",

            tipo:
                "oficial",

            url:
                "https://www.bcra.gob.ar/",

            estado:
                "disponible",

            actualizacion:
                "2026",

            variables: [
                "entidades financieras",
                "bancos",
                "personal",
                "sucursales"
            ],

            consultado:
                ahora
        },


        {
            id:
                "ssn",

            nombre:
                "SSN - Mercado de Seguros",

            organismo:
                "Superintendencia de Seguros de la Nación",

            tipo:
                "oficial",

            url:
                "https://www.argentina.gob.ar/superintendencia-de-seguros",

            estado:
                "disponible",

            actualizacion:
                "2026",

            variables: [
                "aseguradoras",
                "primas",
                "entidades"
            ],

            consultado:
                ahora
        },


        {
            id:
                "enacom",

            nombre:
                "ENACOM - Indicadores TIC",

            organismo:
                "Ente Nacional de Comunicaciones",

            tipo:
                "oficial",

            url:
                "https://www.enacom.gob.ar/",

            estado:
                "disponible",

            actualizacion:
                "2026",

            variables: [
                "internet",
                "telefonía",
                "telecomunicaciones"
            ],

            consultado:
                ahora
        },


        {
            id:
                "indec",

            nombre:
                "INDEC",

            organismo:
                "Instituto Nacional de Estadística y Censos",

            tipo:
                "oficial",

            url:
                "https://www.indec.gob.ar/",

            estado:
                "disponible",

            actualizacion:
                "2026",

            variables: [
                "actividad económica",
                "internet",
                "empresas"
            ],

            consultado:
                ahora
        }

    ];

}


/* =========================================================
   INDUSTRIAS
   ========================================================= */

const industrias = [

    ["bancos_finanzas", "Bancos / Finanzas"],
    ["salud", "Salud"],
    ["rrhh", "RRHH"],
    ["seguros", "Seguros"],
    ["industria", "Industria"],
    ["retail", "Retail"],
    ["logistica", "Logística / Transporte"],
    ["energia", "Energía"],
    ["telecom", "Telecomunicaciones"],
    ["gobierno", "Gobierno"],
    ["educacion", "Educación"],
    ["agricultura", "Agricultura"],
    ["construccion", "Construcción"],
    ["legal", "Legal"],
    ["servicios_profesionales", "Servicios profesionales"],
    ["mineria", "Minería"],
    ["otros", "Otros"]

].map(
    ([id, nombre]) => ({
        id,
        nombre
    })
);


/* =========================================================
   PRODUCTOS
   ========================================================= */

const productos = [

    {
        id:
            "guarda",

        nombre:
            "Guarda / Almacenamiento",

        necesidades: [
            "almacenamiento",
            "archivo digital",
            "consulta documental",
            "retención"
        ]
    },


    {
        id:
            "digitalizacion",

        nombre:
            "Digitalización",

        necesidades: [
            "digitalización",
            "OCR",
            "captura",
            "archivo físico",
            "indexación"
        ]
    },


    {
        id:
            "recibos",

        nombre:
            "Firma de recibos de sueldo",

        necesidades: [
            "RRHH",
            "recibos",
            "firma",
            "empleados",
            "legajos"
        ]
    },


    {
        id:
            "firma",

        nombre:
            "Firma electrónica",

        necesidades: [
            "firma",
            "documentos",
            "contratos",
            "aprobaciones",
            "compliance"
        ]
    },


    {
        id:
            "thuban",

        nombre:
            "Thuban",

        necesidades: [
            "gestión documental",
            "workflows",
            "OCR",
            "firma",
            "integraciones",
            "migración",
            "archivo",
            "búsqueda"
        ]
    }

];


/* =========================================================
   HANDLER
   ========================================================= */

export default async function handler(
    req,
    res
) {

    const ahora =
        new Date().toISOString();


    let estadoOEDE =
        "pendiente";

    let errorOEDE =
        null;

    let diagnosticoEmpresas =
        null;

    let diagnosticoEmpleo =
        null;


    /* =====================================================
       LEER OEDE
       ===================================================== */

    try {

        const [
            empresasBuffer,
            empleoBuffer
        ] = await Promise.all([

            descargarArchivo(
                OEDE_EMPRESAS_URL
            ),

            descargarArchivo(
                OEDE_EMPLEO_URL
            )

        ]);


        const empresasExcel =
            leerExcel(
                empresasBuffer
            );

        const empleoExcel =
            leerExcel(
                empleoBuffer
            );


        diagnosticoEmpresas =
            generarDiagnosticoExcel(
                empresasExcel
            );

        diagnosticoEmpleo =
            generarDiagnosticoExcel(
                empleoExcel
            );


        estadoOEDE =
            "descargado";


    } catch (error) {

        console.error(
            "OEDE:",
            error
        );

        estadoOEDE =
            "error";

        errorOEDE = {

            nombre:
                error?.name ||
                "Error",

            mensaje:
                error?.message ||
                String(error),

            stack:
                error?.stack ||
                null

        };

    }


    /* =====================================================
       RESPUESTA
       ===================================================== */

    const datos =
        [...datosBase];


    const datosReales =
        datos.filter(
            d =>
                d.type === "source"
        );


    return res.status(200).json({

        ok:
            true,

        motor:
            "PREVENTA IA - Inteligencia de Mercado 360",

        version:
            "3.2",

        mercado: {

            pais:
                "Argentina",

            fechaActualizacion:
                ahora,

            versionMotor:
                "3.2",

            oede: {

                estado:
                    estadoOEDE,

                empresas:
                    0,

                empleo:
                    0,

                fuente:
                    "OEDE",

                actualizacion:
                    "Junio 2026"

            },

            estado: {

                fuentesOficiales:
                    construirFuentes(
                        ahora
                    ).length,

                datosReales:
                    datosReales.length,

                calculos:
                    0,

                supuestos:
                    3,

                faltantes:
                    5

            }

        },


        fuentes:
            construirFuentes(
                ahora
            ),


        industrias,


        tamanios: [

            {
                id:
                    "micro",

                nombre:
                    "Micro"
            },

            {
                id:
                    "pequena",

                nombre:
                    "Pequeña"
            },

            {
                id:
                    "mediana",

                nombre:
                    "Mediana"
            },

            {
                id:
                    "grande",

                nombre:
                    "Grande"
            },

            {
                id:
                    "enterprise",

                nombre:
                    "Enterprise"
            }

        ],


        productos,


        datos,


        supuestos: [

            {
                variable:
                    "tasa_captura",

                value:
                    null,

                unit:
                    "%",

                type:
                    "assumption",

                editable:
                    true
            },

            {
                variable:
                    "porcentaje_digitalizado",

                value:
                    null,

                unit:
                    "%",

                type:
                    "assumption",

                editable:
                    true
            },

            {
                variable:
                    "porcentaje_clientes",

                value:
                    null,

                unit:
                    "%",

                type:
                    "assumption",

                editable:
                    true
            }

        ],


        faltantes: [

            {
                variable:
                    "empresas_por_industria",

                descripcion:
                    "Cantidad de empresas por rama de actividad.",

                fuenteEsperada:
                    "OEDE",

                estado:
                    "pendiente"
            },

            {
                variable:
                    "empleados_por_industria",

                descripcion:
                    "Cantidad de empleados por rama de actividad.",

                fuenteEsperada:
                    "OEDE",

                estado:
                    "pendiente"
            },

            {
                variable:
                    "documentos_por_empleado",

                descripcion:
                    "Volumen documental promedio por empleado.",

                fuenteEsperada:
                    "Investigación de mercado",

                estado:
                    "pendiente"
            },

            {
                variable:
                    "tasa_digitalizacion",

                descripcion:
                    "Porcentaje de documentos potencialmente digitalizables.",

                fuenteEsperada:
                    "Investigación de mercado",

                estado:
                    "pendiente"
            },

            {
                variable:
                    "precio_documental",

                descripcion:
                    "Precio actualizado del servicio.",

                fuenteEsperada:
                    "Modelo comercial PREVENTA IA",

                estado:
                    "pendiente"
            }

        ],


        ranking:
            industrias.map(
                (industria, index) => ({

                    posicion:
                        index + 1,

                    industria:
                        industria.id,

                    nombre:
                        industria.nombre,

                    datosDisponibles:
                        datos.filter(
                            d =>
                                d.industry ===
                                industria.id
                        ).length,

                    score:
                        null,

                    estado:
                        datos.some(
                            d =>
                                d.industry ===
                                industria.id
                        )
                            ? "parcial"
                            : "sin datos suficientes"

                })
            ),


        diagnostico: {

            oede:
                estadoOEDE,

            oedeError:
                errorOEDE,

            empresas:

                diagnosticoEmpresas,

            empleo:

                diagnosticoEmpleo,

            mensaje:

                estadoOEDE === "descargado"

                    ? "Los Excel de OEDE fueron descargados y leídos. Revisar la estructura mostrada en empresas y empleo."

                    : "No se pudieron leer los archivos de OEDE."

        }

    });

}
