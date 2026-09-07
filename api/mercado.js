// api/mercado.js
// Motor de Inteligencia de Mercado - PREVENTA IA
// v3.0
//
// OEDE:
// - Empresas por rama de actividad
// - Empleo por rama de actividad
//
// IMPORTANTE:
// Los datos provenientes de OEDE se clasifican como "source".
// No se mezclan con supuestos ni con el modelo histórico 2022.

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

    const buffer = await respuesta.arrayBuffer();

    if (!buffer || buffer.byteLength === 0) {
        throw new Error(
            "El archivo descargado desde OEDE está vacío."
        );
    }

    return Buffer.from(buffer);
}


/* =========================================================
   LEER EXCEL
   ========================================================= */

function leerExcel(buffer) {

    const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: true
    });

    const hojas = workbook.SheetNames;

    if (!hojas.length) {
        throw new Error(
            "El Excel de OEDE no contiene hojas."
        );
    }

    const resultado = {};

    for (const nombreHoja of hojas) {

        const hoja =
            workbook.Sheets[nombreHoja];

        resultado[nombreHoja] =
            XLSX.utils.sheet_to_json(
                hoja,
                {
                    defval: null,
                    raw: false
                }
            );
    }

    return resultado;
}


/* =========================================================
   NORMALIZAR TEXTO
   ========================================================= */

function normalizarTexto(valor) {

    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


/* =========================================================
   BUSCAR COLUMNAS
   ========================================================= */

function buscarColumna(columnas, posiblesNombres) {

    const normalizadas =
        columnas.map(col => ({
            original: col,
            normalizado:
                normalizarTexto(col)
        }));

    for (const nombre of posiblesNombres) {

        const buscada =
            normalizarTexto(nombre);

        const encontrada =
            normalizadas.find(
                col =>
                    col.normalizado === buscada
            );

        if (encontrada) {
            return encontrada.original;
        }
    }

    return null;
}


/* =========================================================
   DETECTAR FILA MÁS RECIENTE
   ========================================================= */

function obtenerUltimaFila(rows) {

    if (!rows || !rows.length) {
        return null;
    }

    /*
     * Buscamos columnas que puedan representar
     * fecha / año / período.
     */

    const columnas =
        Object.keys(rows[0] || {});

    const columnaFecha =
        buscarColumna(
            columnas,
            [
                "fecha",
                "periodo",
                "período",
                "year",
                "anio",
                "año",
                "trimestre"
            ]
        );

    if (!columnaFecha) {

        return rows[
            rows.length - 1
        ];
    }

    const ordenadas =
        [...rows].sort(
            (a, b) => {

                const da =
                    new Date(a[columnaFecha]);

                const db =
                    new Date(b[columnaFecha]);

                if (
                    !isNaN(da.getTime()) &&
                    !isNaN(db.getTime())
                ) {
                    return da - db;
                }

                return String(
                    a[columnaFecha] || ""
                ).localeCompare(
                    String(
                        b[columnaFecha] || ""
                    )
                );
            }
        );

    return ordenadas[
        ordenadas.length - 1
    ];
}


/* =========================================================
   CONVERTIR NÚMERO
   ========================================================= */

function convertirNumero(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    if (typeof valor === "number") {
        return valor;
    }

    let texto =
        String(valor)
            .trim()
            .replace(/\s/g, "");

    /*
     * Manejo de formatos:
     *
     * 51.234
     * 51,234
     * 51.234,56
     * 51,234.56
     */

    if (
        texto.includes(".") &&
        texto.includes(",")
    ) {

        if (
            texto.lastIndexOf(",") >
            texto.lastIndexOf(".")
        ) {
            texto =
                texto
                    .replace(/\./g, "")
                    .replace(",", ".");
        } else {
            texto =
                texto.replace(/,/g, "");
        }

    } else if (
        texto.includes(",")
    ) {

        texto =
            texto.replace(",", ".");

    } else {

        /*
         * Si tiene puntos y parece
         * separador de miles.
         */

        const partes =
            texto.split(".");

        if (
            partes.length > 1 &&
            partes[
                partes.length - 1
            ].length === 3
        ) {
            texto =
                partes.join("");
        }
    }

    const numero =
        Number(texto);

    return Number.isFinite(numero)
        ? numero
        : null;
}


/* =========================================================
   CLASIFICAR INDUSTRIA
   ========================================================= */

function clasificarIndustria(texto) {

    const valor =
        normalizarTexto(texto);

    if (
        valor.includes("financ") ||
        valor.includes("banco") ||
        valor.includes("seguros")
    ) {
        return valor.includes("seguro")
            ? "seguros"
            : "bancos_finanzas";
    }

    if (
        valor.includes("salud") ||
        valor.includes("medic") ||
        valor.includes("hospital")
    ) {
        return "salud";
    }

    if (
        valor.includes("telecom") ||
        valor.includes("comunic")
    ) {
        return "telecom";
    }

    if (
        valor.includes("constru")
    ) {
        return "construccion";
    }

    if (
        valor.includes("agric") ||
        valor.includes("ganader") ||
        valor.includes("silvic") ||
        valor.includes("pesca")
    ) {
        return "agricultura";
    }

    if (
        valor.includes("min")
    ) {
        return "mineria";
    }

    if (
        valor.includes("transporte") ||
        valor.includes("logistic")
    ) {
        return "logistica";
    }

    if (
        valor.includes("energia") ||
        valor.includes("electric") ||
        valor.includes("gas")
    ) {
        return "energia";
    }

    if (
        valor.includes("comerc") ||
        valor.includes("retail")
    ) {
        return "retail";
    }

    if (
        valor.includes("industria") ||
        valor.includes("manufact")
    ) {
        return "industria";
    }

    if (
        valor.includes("educ")
    ) {
        return "educacion";
    }

    if (
        valor.includes("administracion publica") ||
        valor.includes("gobierno")
    ) {
        return "gobierno";
    }

    if (
        valor.includes("profesional") ||
        valor.includes("cientifica") ||
        valor.includes("tecnica")
    ) {
        return "servicios_profesionales";
    }

    if (
        valor.includes("legal") ||
        valor.includes("juridic")
    ) {
        return "legal";
    }

    return "otros";
}


/* =========================================================
   EXTRAER EMPRESAS OEDE
   ========================================================= */

function procesarEmpresasOEDE(
    hojas,
    ahora
) {

    const datos = [];

    for (
        const nombreHoja of Object.keys(hojas)
    ) {

        const filas =
            hojas[nombreHoja];

        if (
            !Array.isArray(filas) ||
            !filas.length
        ) {
            continue;
        }

        const columnas =
            Object.keys(
                filas[0]
            );

        const columnaActividad =
            buscarColumna(
                columnas,
                [
                    "actividad",
                    "rama de actividad",
                    "rama actividad",
                    "sector",
                    "descripcion"
                ]
            );

        const columnaValor =
            buscarColumna(
                columnas,
                [
                    "empresas",
                    "cantidad de empresas",
                    "cantidad empresas",
                    "firmas"
                ]
            );

        if (
            !columnaActividad ||
            !columnaValor
        ) {
            continue;
        }

        for (
            const fila of filas
        ) {

            const actividad =
                fila[
                    columnaActividad
                ];

            const valor =
                convertirNumero(
                    fila[
                        columnaValor
                    ]
                );

            if (
                !actividad ||
                valor === null
            ) {
                continue;
            }

            datos.push({

                id:
                    `oede_empresas_${datos.length + 1}`,

                variable:
                    "empresas_por_actividad",

                value:
                    valor,

                unit:
                    "empresas",

                industry:
                    clasificarIndustria(
                        actividad
                    ),

                product:
                    "digitalizacion",

                companySize:
                    null,

                year:
                    2025,

                type:
                    "source",

                source:
                    "OEDE",

                sourceUrl:
                    OEDE_EMPRESAS_URL,

                sourceDate:
                    "Junio 2026",

                consultedAt:
                    ahora,

                confidence:
                    "alta",

                actividadOriginal:
                    String(actividad),

                hoja:
                    nombreHoja,

                notes:
                    "Cantidad de empresas por rama de actividad según OEDE."
            });
        }
    }

    return datos;
}


/* =========================================================
   EXTRAER EMPLEO OEDE
   ========================================================= */

function procesarEmpleoOEDE(
    hojas,
    ahora
) {

    const datos = [];

    for (
        const nombreHoja of Object.keys(hojas)
    ) {

        const filas =
            hojas[nombreHoja];

        if (
            !Array.isArray(filas) ||
            !filas.length
        ) {
            continue;
        }

        const columnas =
            Object.keys(
                filas[0]
            );

        const columnaActividad =
            buscarColumna(
                columnas,
                [
                    "actividad",
                    "rama de actividad",
                    "rama actividad",
                    "sector",
                    "descripcion"
                ]
            );

        const columnaValor =
            buscarColumna(
                columnas,
                [
                    "empleo",
                    "puestos",
                    "trabajadores",
                    "asalariados",
                    "empleo registrado"
                ]
            );

        if (
            !columnaActividad ||
            !columnaValor
        ) {
            continue;
        }

        for (
            const fila of filas
        ) {

            const actividad =
                fila[
                    columnaActividad
                ];

            const valor =
                convertirNumero(
                    fila[
                        columnaValor
                    ]
                );

            if (
                !actividad ||
                valor === null
            ) {
                continue;
            }

            datos.push({

                id:
                    `oede_empleo_${datos.length + 1}`,

                variable:
                    "empleados_por_actividad",

                value:
                    valor,

                unit:
                    "empleados",

                industry:
                    clasificarIndustria(
                        actividad
                    ),

                product:
                    "digitalizacion",

                companySize:
                    null,

                year:
                    2026,

                type:
                    "source",

                source:
                    "OEDE",

                sourceUrl:
                    OEDE_EMPLEO_URL,

                sourceDate:
                    "Junio 2026",

                consultedAt:
                    ahora,

                confidence:
                    "alta",

                actividadOriginal:
                    String(actividad),

                hoja:
                    nombreHoja,

                notes:
                    "Empleo registrado por rama de actividad según OEDE."
            });
        }
    }

    return datos;
}


/* =========================================================
   FUENTES
   ========================================================= */

function construirFuentes(ahora) {

    return [

        {
            id: "oede",
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
            id: "bcra",
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
            id: "ssn",
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
            variables: [
                "aseguradoras",
                "primas",
                "entidades"
            ],
            consultado:
                ahora
        },

        {
            id: "enacom",
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
            variables: [
                "internet",
                "telefonía",
                "telecomunicaciones"
            ],
            consultado:
                ahora
        },

        {
            id: "indec",
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

    try {

        const ahora =
            new Date().toISOString();


        /* ---------------------------------------------
           DESCARGAR OEDE
           --------------------------------------------- */

        let empresasOEDE = [];
        let empleoOEDE = [];

        let estadoOEDE =
            "pendiente";


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


            empresasOEDE =
                procesarEmpresasOEDE(
                    empresasExcel,
                    ahora
                );


            empleoOEDE =
                procesarEmpleoOEDE(
                    empleoExcel,
                    ahora
                );


            if (
                empresasOEDE.length ||
                empleoOEDE.length
            ) {
                estadoOEDE =
                    "conectado";
            }

        } catch (error) {

            console.error(
                "OEDE:",
                error
            );

            estadoOEDE =
                "error";

        }


        /* ---------------------------------------------
           DATOS FIJOS OFICIALES YA DISPONIBLES
           --------------------------------------------- */

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

                consultedAt:
                    ahora,

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

                consultedAt:
                    ahora,

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

                consultedAt:
                    ahora,

                confidence:
                    "alta",

                notes:
                    "Accesos nacionales a internet."
            }

        ];


        /* ---------------------------------------------
           UNIR DATOS
           --------------------------------------------- */

        const datos = [

            ...datosBase,

            ...empresasOEDE,

            ...empleoOEDE

        ];


        /* ---------------------------------------------
           FALTANTES
           --------------------------------------------- */

        const faltantes = [];


        if (!empresasOEDE.length) {

            faltantes.push({

                variable:
                    "empresas_por_industria",

                descripcion:
                    "Cantidad de empresas por rama de actividad.",

                fuenteEsperada:
                    "OEDE",

                estado:
                    "pendiente",

                motivo:
                    estadoOEDE === "error"
                        ? "No se pudo leer automáticamente el Excel de OEDE."
                        : "OEDE todavía no devolvió registros."

            });

        }


        if (!empleoOEDE.length) {

            faltantes.push({

                variable:
                    "empleados_por_industria",

                descripcion:
                    "Cantidad de empleados por rama de actividad.",

                fuenteEsperada:
                    "OEDE",

                estado:
                    "pendiente",

                motivo:
                    estadoOEDE === "error"
                        ? "No se pudo leer automáticamente el Excel de OEDE."
                        : "OEDE todavía no devolvió registros."

            });

        }


        faltantes.push({

            variable:
                "documentos_por_empleado",

            descripcion:
                "Volumen documental promedio por empleado.",

            fuenteEsperada:
                "Investigación de mercado",

            estado:
                "pendiente"

        });


        faltantes.push({

            variable:
                "tasa_digitalizacion",

            descripcion:
                "Porcentaje de documentos potencialmente digitalizables.",

            fuenteEsperada:
                "Investigación de mercado",

            estado:
                "pendiente"

        });


        faltantes.push({

            variable:
                "precio_documental",

            descripcion:
                "Precio actualizado del servicio.",

            fuenteEsperada:
                "Modelo comercial PREVENTA IA",

            estado:
                "pendiente"

        });


        /* ---------------------------------------------
           SUPUESTOS
           --------------------------------------------- */

        const supuestos = [

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

        ];


        /* ---------------------------------------------
           ESTADO
           --------------------------------------------- */

        const datosReales =
            datos.filter(
                d =>
                    d.type === "source"
            );


        const mercado = {

            pais:
                "Argentina",

            fechaActualizacion:
                ahora,

            versionMotor:
                "3.0",

            oede: {

                estado:
                    estadoOEDE,

                empresas:
                    empresasOEDE.length,

                empleo:
                    empleoOEDE.length,

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
                    supuestos.length,

                faltantes:
                    faltantes.length

            }

        };


        /* ---------------------------------------------
           RANKING
           --------------------------------------------- */

        const ranking =
            industrias.map(
                (industria, index) => {

                    const disponibles =
                        datos.filter(
                            d =>
                                d.industry ===
                                industria.id
                        );

                    return {

                        posicion:
                            index + 1,

                        industria:
                            industria.id,

                        nombre:
                            industria.nombre,

                        datosDisponibles:
                            disponibles.length,

                        score:
                            null,

                        estado:
                            disponibles.length
                                ? "parcial"
                                : "sin datos suficientes"

                    };

                }
            );


        /* ---------------------------------------------
           RESPUESTA
           --------------------------------------------- */

        return res.status(200).json({

            ok:
                true,

            motor:
                "PREVENTA IA - Inteligencia de Mercado 360",

            version:
                "3.0",

            mercado,

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

            supuestos,

            faltantes,

            ranking,

            diagnostico: {

                oede:
                    estadoOEDE,

                empresasOEDE:
                    empresasOEDE.length,

                empleoOEDE:
                    empleoOEDE.length,

                mensaje:
                    estadoOEDE === "conectado"
                        ? "OEDE conectado correctamente."
                        : "OEDE no pudo ser leído automáticamente."

            }

        });

    } catch (error) {

        console.error(
            "Error en Motor de Mercado 360:",
            error
        );

        return res.status(500).json({

            ok:
                false,

            error:
                "No se pudo ejecutar el Motor de Mercado 360.",

            detalle:
                error.message

        });

    }

}
