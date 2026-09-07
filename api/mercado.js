// api/mercado.js
// Motor de Inteligencia de Mercado - PREVENTA IA
// Versión 2.0
//
// Objetivo:
// - Centralizar fuentes oficiales.
// - Separar DATOS ENCONTRADOS, CÁLCULOS, SUPUESTOS y FALTANTES.
// - No inventar información.
// - Preparar la estructura para alimentar TAM / SAM / SOM.
//
// IMPORTANTE:
// En esta etapa el motor devuelve datos oficiales identificados
// y deja claramente separados los datos que todavía necesitamos.
// El cálculo económico del modelo histórico NO se modifica todavía.

export default async function handler(req, res) {

    try {

        const ahora = new Date().toISOString();

        /* =====================================================
           1. FUENTES OFICIALES
           ===================================================== */

        const fuentes = [

            {
                id: "oede",
                nombre: "OEDE - Ministerio de Trabajo",
                organismo:
                    "Ministerio de Trabajo, Empleo y Seguridad Social",
                tipo: "oficial",
                url:
                    "https://www.argentina.gob.ar/trabajo/estadisticas/oede-estadisticas-provinciales",
                estado: "disponible",
                prioridad: "alta",
                variables: [
                    "empresas",
                    "empleo",
                    "remuneraciones",
                    "actividad",
                    "sector",
                    "rama de actividad",
                    "evolución",
                    "aperturas",
                    "cierres"
                ],
                utilidad:
                    "Principal fuente para empresas y empleo por actividad."
            },

            {
                id: "bcra",
                nombre: "BCRA - Entidades Financieras",
                organismo:
                    "Banco Central de la República Argentina",
                tipo: "oficial",
                url:
                    "https://www.bcra.gob.ar/",
                estado: "disponible",
                prioridad: "alta",
                variables: [
                    "entidades financieras",
                    "bancos",
                    "personal",
                    "sucursales",
                    "cajeros",
                    "entidades públicas",
                    "entidades privadas"
                ],
                utilidad:
                    "Principal fuente para dimensionar el sector financiero."
            },

            {
                id: "ssn",
                nombre: "SSN - Mercado de Seguros",
                organismo:
                    "Superintendencia de Seguros de la Nación",
                tipo: "oficial",
                url:
                    "https://www.argentina.gob.ar/superintendencia-de-seguros",
                estado: "disponible",
                prioridad: "alta",
                variables: [
                    "aseguradoras",
                    "entidades",
                    "primas",
                    "mercado",
                    "reaseguradoras"
                ],
                utilidad:
                    "Principal fuente para dimensionar seguros."
            },

            {
                id: "enacom",
                nombre: "ENACOM - Indicadores TIC",
                organismo:
                    "Ente Nacional de Comunicaciones",
                tipo: "oficial",
                url:
                    "https://www.enacom.gob.ar/",
                estado: "disponible",
                prioridad: "alta",
                variables: [
                    "internet",
                    "telefonía",
                    "telecomunicaciones",
                    "conectividad",
                    "accesos"
                ],
                utilidad:
                    "Principal fuente para indicadores de telecomunicaciones."
            },

            {
                id: "indec",
                nombre: "INDEC",
                organismo:
                    "Instituto Nacional de Estadística y Censos",
                tipo: "oficial",
                url:
                    "https://www.indec.gob.ar/",
                estado: "disponible",
                prioridad: "alta",
                variables: [
                    "empresas",
                    "empleo",
                    "actividad económica",
                    "internet",
                    "sectores"
                ],
                utilidad:
                    "Fuente transversal para indicadores económicos."
            },

            {
                id: "educacion",
                nombre:
                    "Padrón Oficial de Establecimientos Educativos",
                organismo:
                    "Secretaría de Educación",
                tipo: "oficial",
                url:
                    "https://www.argentina.gob.ar/educacion",
                estado: "disponible",
                prioridad: "media",
                variables: [
                    "establecimientos educativos",
                    "educación",
                    "instituciones"
                ],
                utilidad:
                    "Permite dimensionar el universo educativo."
            },

            {
                id: "refes",
                nombre:
                    "REFES - Registro Federal de Establecimientos de Salud",
                organismo:
                    "Ministerio de Salud",
                tipo: "oficial",
                url:
                    "https://www.argentina.gob.ar/salud",
                estado: "disponible",
                prioridad: "media",
                variables: [
                    "establecimientos de salud",
                    "hospitales",
                    "clínicas",
                    "centros de salud"
                ],
                utilidad:
                    "Fuente de referencia para establecimientos sanitarios."
            },

            {
                id: "firma_digital",
                nombre:
                    "Firma Digital - Argentina",
                organismo:
                    "Estado Nacional",
                tipo: "oficial",
                url:
                    "https://www.argentina.gob.ar/firmadigital",
                estado: "disponible",
                prioridad: "media",
                variables: [
                    "firma digital",
                    "certificadores",
                    "normativa",
                    "documentos digitales"
                ],
                utilidad:
                    "Fuente normativa y de infraestructura de firma."
            }

        ];


        /* =====================================================
           2. INDUSTRIAS
           ===================================================== */

        const industrias = [

            {
                id: "bancos_finanzas",
                nombre: "Bancos / Finanzas"
            },

            {
                id: "salud",
                nombre: "Salud"
            },

            {
                id: "rrhh",
                nombre: "RRHH"
            },

            {
                id: "seguros",
                nombre: "Seguros"
            },

            {
                id: "industria",
                nombre: "Industria"
            },

            {
                id: "retail",
                nombre: "Retail"
            },

            {
                id: "logistica",
                nombre: "Logística / Transporte"
            },

            {
                id: "energia",
                nombre: "Energía"
            },

            {
                id: "telecom",
                nombre: "Telecomunicaciones"
            },

            {
                id: "gobierno",
                nombre: "Gobierno"
            },

            {
                id: "educacion",
                nombre: "Educación"
            },

            {
                id: "agricultura",
                nombre: "Agricultura"
            },

            {
                id: "construccion",
                nombre: "Construcción"
            },

            {
                id: "legal",
                nombre: "Legal"
            },

            {
                id: "servicios_profesionales",
                nombre: "Servicios profesionales"
            },

            {
                id: "mineria",
                nombre: "Minería"
            },

            {
                id: "otros",
                nombre: "Otros"
            }

        ];


        /* =====================================================
           3. TAMAÑOS
           ===================================================== */

        const tamanios = [

            {
                id: "micro",
                nombre: "Micro"
            },

            {
                id: "pequena",
                nombre: "Pequeña"
            },

            {
                id: "mediana",
                nombre: "Mediana"
            },

            {
                id: "grande",
                nombre: "Grande"
            },

            {
                id: "enterprise",
                nombre: "Enterprise"
            }

        ];


        /* =====================================================
           4. PRODUCTOS
           ===================================================== */

        const productos = [

            {
                id: "guarda",
                nombre:
                    "Guarda / Almacenamiento",

                necesidades: [
                    "almacenamiento",
                    "archivo digital",
                    "consulta documental",
                    "retención",
                    "conservación"
                ]
            },

            {
                id: "digitalizacion",
                nombre:
                    "Digitalización",

                necesidades: [
                    "digitalización",
                    "OCR",
                    "captura",
                    "archivo físico",
                    "indexación",
                    "documentos"
                ]
            },

            {
                id: "recibos",
                nombre:
                    "Firma de recibos de sueldo",

                necesidades: [
                    "RRHH",
                    "recibos",
                    "firma",
                    "empleados",
                    "legajos",
                    "liquidación"
                ]
            },

            {
                id: "firma",
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
                id: "thuban",
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
                    "búsqueda",
                    "seguridad",
                    "trazabilidad"
                ]
            }

        ];


        /* =====================================================
           5. DATOS REALES ENCONTRADOS
           
           Estos datos NO son estimaciones.
           Se identifican como "source".
           ===================================================== */

        const datos = [

            /* -------------------------------------------------
               BCRA
               ------------------------------------------------- */

            {
                id:
                    "bcra_entidades_financieras_2026",

                variable:
                    "entidades_financieras",

                value: 73,

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
                    "Cantidad de entidades financieras informada por BCRA."
            },


            {
                id:
                    "bcra_bancos_2026",

                variable:
                    "bancos",

                value: 60,

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
                    "Cantidad de bancos informada por BCRA."
            },


            /* -------------------------------------------------
               ENACOM / INDEC
               ------------------------------------------------- */

            {
                id:
                    "internet_accesos_2026",

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
                    "Promedio nacional de accesos a internet."
            }

        ];


        /* =====================================================
           6. DATOS QUE TODAVÍA FALTAN
           ===================================================== */

        const faltantes = [

            {
                variable:
                    "empresas_por_industria",

                descripcion:
                    "Cantidad actual de empresas por industria.",

                fuenteEsperada:
                    "OEDE",

                prioridad:
                    "critica",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "empleados_por_industria",

                descripcion:
                    "Cantidad actual de empleados por industria.",

                fuenteEsperada:
                    "OEDE",

                prioridad:
                    "critica",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "empresas_por_tamano",

                descripcion:
                    "Cantidad de empresas según tamaño.",

                fuenteEsperada:
                    "OEDE / INDEC",

                prioridad:
                    "alta",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "empleados_por_tamano",

                descripcion:
                    "Cantidad de empleados según tamaño de empresa.",

                fuenteEsperada:
                    "OEDE",

                prioridad:
                    "alta",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "establecimientos_salud",

                descripcion:
                    "Cantidad actualizada de establecimientos de salud.",

                fuenteEsperada:
                    "REFES",

                prioridad:
                    "alta",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "establecimientos_educativos",

                descripcion:
                    "Cantidad actualizada de establecimientos educativos.",

                fuenteEsperada:
                    "Secretaría de Educación",

                prioridad:
                    "alta",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "aseguradoras",

                descripcion:
                    "Cantidad actualizada de entidades aseguradoras.",

                fuenteEsperada:
                    "SSN",

                prioridad:
                    "alta",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "documentos_por_empleado",

                descripcion:
                    "Volumen documental promedio por empleado.",

                fuenteEsperada:
                    "Investigación de mercado / supuesto",

                prioridad:
                    "critica",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "precio_documental",

                descripcion:
                    "Precio actualizado por hoja/documento/servicio.",

                fuenteEsperada:
                    "Modelo comercial PREVENTA IA",

                prioridad:
                    "critica",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "tasa_digitalizacion",

                descripcion:
                    "Porcentaje actual de documentos digitalizables.",

                fuenteEsperada:
                    "Investigación de mercado",

                prioridad:
                    "alta",

                estado:
                    "pendiente"
            },


            {
                variable:
                    "tasa_adopcion",

                descripcion:
                    "Porcentaje de empresas potencialmente compradoras.",

                fuenteEsperada:
                    "Investigación de mercado",

                prioridad:
                    "alta",

                estado:
                    "pendiente"
            }

        ];


        /* =====================================================
           7. SUPUESTOS
           ===================================================== */

        const supuestos = [

            {
                id:
                    "captura",

                variable:
                    "tasa_captura",

                value:
                    null,

                unit:
                    "%",

                type:
                    "assumption",

                editable:
                    true,

                notes:
                    "La tasa de captura será definida por el usuario."
            },


            {
                id:
                    "digitalizacion",

                variable:
                    "porcentaje_digitalizado",

                value:
                    null,

                unit:
                    "%",

                type:
                    "assumption",

                editable:
                    true,

                notes:
                    "Debe reemplazarse por un valor validado."
            },


            {
                id:
                    "clientes",

                variable:
                    "porcentaje_clientes",

                value:
                    null,

                unit:
                    "%",

                type:
                    "assumption",

                editable:
                    true,

                notes:
                    "Debe validarse con investigación de mercado."
            },


            {
                id:
                    "precio",

                variable:
                    "precio_promedio",

                value:
                    null,

                unit:
                    "ARS",

                type:
                    "assumption",

                editable:
                    true,

                notes:
                    "Debe configurarse según producto y segmento."
            }

        ];


        /* =====================================================
           8. ESTADO DEL MERCADO
           ===================================================== */

        const datosReales =
            datos.filter(
                d => d.type === "source"
            );


        const datosCalculados =
            datos.filter(
                d => d.type === "calculation"
            );


        const datosSupuestos =
            datos.filter(
                d => d.type === "assumption"
            );


        const mercado = {

            pais:
                "Argentina",

            fechaActualizacion:
                ahora,

            versionMotor:
                "2.0",

            estado: {

                fuentesOficiales:
                    fuentes.length,

                datosReales:
                    datosReales.length,

                calculos:
                    datosCalculados.length,

                supuestos:
                    supuestos.length,

                faltantes:
                    faltantes.length

            },

            clasificacion: {

                encontrados:
                    datosReales.length,

                calculados:
                    datosCalculados.length,

                supuestos:
                    supuestos.length,

                faltantes:
                    faltantes.length

            }

        };


        /* =====================================================
           9. RANKING PRELIMINAR
           
           IMPORTANTE:
           No asignamos score inventado.
           ===================================================== */

        const ranking =
            industrias.map(
                (industria, index) => {

                    const datosIndustria =
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
                            datosIndustria.length,

                        score:
                            null,

                        estado:
                            datosIndustria.length > 0
                                ? "parcial"
                                : "sin datos suficientes",

                        motivo:
                            datosIndustria.length > 0
                                ? "Existe información oficial parcial."
                                : "Se necesitan datos de empresas, empleo y/o volumen documental."

                    };

                }
            );


        /* =====================================================
           10. RESPUESTA
           ===================================================== */

        res.status(200).json({

            ok:
                true,

            motor:
                "PREVENTA IA - Inteligencia de Mercado 360",

            version:
                "2.0",

            mercado,

            fuentes,

            industrias,

            tamanios,

            productos,

            datos,

            supuestos,

            faltantes,

            ranking,

            siguientePaso: {

                objetivo:
                    "Conectar datos oficiales con el modelo TAM/SAM/SOM.",

                prioridad: [
                    "OEDE - empresas por actividad",
                    "OEDE - empleo por actividad",
                    "Empresas por tamaño",
                    "Datos sectoriales",
                    "Volumen documental",
                    "Precios",
                    "Tasas de digitalización",
                    "Tasas de adopción"
                ]

            }

        });

    } catch (error) {

        console.error(
            "Error en /api/mercado:",
            error
        );


        res.status(500).json({

            ok:
                false,

            error:
                "No se pudo cargar el motor de mercado.",

            detalle:
                error.message

        });

    }

}
