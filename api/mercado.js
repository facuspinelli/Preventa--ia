// api/mercado.js
// Motor de Inteligencia de Mercado - PREVENTA IA

export default async function handler(req, res) {
  try {
    const ahora = new Date().toISOString();

    const fuentes = [
      {
        id: "oede",
        nombre: "OEDE - Ministerio de Trabajo",
        organismo: "Ministerio de Trabajo, Empleo y Seguridad Social",
        tipo: "oficial",
        url: "https://www.argentina.gob.ar/trabajo/estadisticas/oede-estadisticas-provinciales",
        fechaConsulta: ahora,
        estado: "disponible",
        variables: [
          "empresas",
          "empleo",
          "remuneraciones",
          "actividad",
          "sector",
          "evolución"
        ]
      },
      {
        id: "bcra",
        nombre: "BCRA - Entidades Financieras",
        organismo: "Banco Central de la República Argentina",
        tipo: "oficial",
        url: "https://www.bcra.gob.ar/",
        fechaConsulta: ahora,
        estado: "disponible",
        variables: [
          "entidades financieras",
          "bancos",
          "personal",
          "sucursales"
        ]
      },
      {
        id: "ssn",
        nombre: "SSN - Mercado de Seguros",
        organismo: "Superintendencia de Seguros de la Nación",
        tipo: "oficial",
        url: "https://www.argentina.gob.ar/superintendencia-de-seguros",
        fechaConsulta: ahora,
        estado: "disponible",
        variables: [
          "aseguradoras",
          "mercado",
          "primas",
          "entidades"
        ]
      },
      {
        id: "enacom",
        nombre: "ENACOM - Indicadores TIC",
        organismo: "Ente Nacional de Comunicaciones",
        tipo: "oficial",
        url: "https://www.enacom.gob.ar/",
        fechaConsulta: ahora,
        estado: "disponible",
        variables: [
          "telecomunicaciones",
          "internet",
          "telefonía",
          "conectividad"
        ]
      },
      {
        id: "indec",
        nombre: "INDEC",
        organismo: "Instituto Nacional de Estadística y Censos",
        tipo: "oficial",
        url: "https://www.indec.gob.ar/",
        fechaConsulta: ahora,
        estado: "disponible",
        variables: [
          "empresas",
          "empleo",
          "internet",
          "actividad económica",
          "sectores"
        ]
      },
      {
        id: "educacion",
        nombre: "Padrón Oficial de Establecimientos Educativos",
        organismo: "Secretaría de Educación",
        tipo: "oficial",
        url: "https://www.argentina.gob.ar/educacion",
        fechaConsulta: ahora,
        estado: "disponible",
        variables: [
          "establecimientos educativos",
          "educación"
        ]
      }
    ];

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

    const productos = [
      {
        id: "guarda",
        nombre: "Guarda / Almacenamiento",
        necesidades: [
          "almacenamiento",
          "archivo digital",
          "consulta documental",
          "retención"
        ]
      },
      {
        id: "digitalizacion",
        nombre: "Digitalización",
        necesidades: [
          "digitalización",
          "OCR",
          "captura",
          "archivo físico",
          "indexación"
        ]
      },
      {
        id: "recibos",
        nombre: "Firma de recibos de sueldo",
        necesidades: [
          "RRHH",
          "recibos",
          "firma",
          "empleados",
          "legajos"
        ]
      },
      {
        id: "firma",
        nombre: "Firma electrónica",
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
        nombre: "Thuban",
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

    /*
     * DATOS REALES
     *
     * Importante:
     * Estos valores no deben confundirse con cálculos del modelo.
     * Los datos que todavía no tenemos cargados desde una fuente
     * oficial quedan identificados como "missing".
     */

    const datos = [
      {
        id: "bcra_entidades_2026",
        variable: "entidades_financieras",
        value: 73,
        unit: "entidades",
        industry: "bancos_finanzas",
        product: "thuban",
        companySize: "enterprise",
        year: 2026,
        type: "source",
        source: "BCRA",
        sourceUrl: "https://www.bcra.gob.ar/",
        consultedAt: ahora,
        sourceDate: "2026",
        confidence: "alta",
        notes: "Estructura de entidades financieras informada por BCRA."
      },

      {
        id: "bcra_bancos_2026",
        variable: "bancos",
        value: 60,
        unit: "bancos",
        industry: "bancos_finanzas",
        product: "thuban",
        companySize: "enterprise",
        year: 2026,
        type: "source",
        source: "BCRA",
        sourceUrl: "https://www.bcra.gob.ar/",
        consultedAt: ahora,
        sourceDate: "2026",
        confidence: "alta",
        notes: "Cantidad de bancos informada por BCRA."
      },

      {
        id: "enacom_internet_2026",
        variable: "accesos_internet",
        value: 51176541,
        unit: "accesos",
        industry: "telecom",
        product: "thuban",
        companySize: "enterprise",
        year: 2026,
        type: "source",
        source: "INDEC",
        sourceUrl: "https://www.indec.gob.ar/",
        consultedAt: ahora,
        sourceDate: "2026",
        confidence: "alta",
        notes: "Indicador nacional de accesos a internet."
      }
    ];

    /*
     * DATOS QUE EL MOTOR NECESITA PERO TODAVÍA NO TIENE
     *
     * Esto es intencional.
     * NO inventamos valores.
     */

    const faltantes = [
      {
        variable: "empresas_por_industria",
        descripcion: "Cantidad de empresas por industria y tamaño",
        fuenteEsperada: "OEDE",
        estado: "pendiente"
      },
      {
        variable: "empleados_por_industria",
        descripcion: "Cantidad de empleados por industria",
        fuenteEsperada: "OEDE",
        estado: "pendiente"
      },
      {
        variable: "empresas_por_tamano",
        descripcion: "Cantidad de empresas por tamaño",
        fuenteEsperada: "OEDE / INDEC",
        estado: "pendiente"
      },
      {
        variable: "establecimientos_salud",
        descripcion: "Cantidad actualizada de establecimientos de salud",
        fuenteEsperada: "REFES",
        estado: "pendiente"
      },
      {
        variable: "establecimientos_educativos",
        descripcion: "Cantidad actualizada de establecimientos educativos",
        fuenteEsperada: "Secretaría de Educación",
        estado: "pendiente"
      },
      {
        variable: "aseguradoras",
        descripcion: "Cantidad de entidades aseguradoras activas",
        fuenteEsperada: "SSN",
        estado: "pendiente"
      }
    ];

    /*
     * RESUMEN GENERAL DEL MOTOR
     */

    const mercado = {
      pais: "Argentina",
      fechaActualizacion: ahora,

      estado: {
        fuentesOficiales: fuentes.length,
        datosReales: datos.filter(d => d.type === "source").length,
        calculos: datos.filter(d => d.type === "calculation").length,
        supuestos: datos.filter(d => d.type === "assumption").length,
        faltantes: faltantes.length
      },

      clasificacion: {
        encontrados: datos.filter(d => d.type === "source").length,
        calculados: datos.filter(d => d.type === "calculation").length,
        supuestos: datos.filter(d => d.type === "assumption").length,
        faltantes: faltantes.length
      }
    };

    /*
     * RANKING INICIAL
     *
     * Todavía no asignamos puntajes inventados.
     * Cuando tengamos los datos de empresas, empleados,
     * necesidad y tamaño, calcularemos el ranking real.
     */

    const ranking = industrias.map((industria, index) => {
      const datosIndustria = datos.filter(
        d => d.industry === industria.id
      );

      return {
        posicion: index + 1,
        industria: industria.id,
        nombre: industria.nombre,
        datosDisponibles: datosIndustria.length,
        score: null,
        estado: datosIndustria.length > 0
          ? "parcial"
          : "sin datos suficientes"
      };
    });

    /*
     * RESPUESTA
     */

    res.status(200).json({
      ok: true,
      motor: "PREVENTA IA - Inteligencia de Mercado 360",
      version: "1.0",
      mercado,
      fuentes,
      industrias,
      tamanios,
      productos,
      datos,
      faltantes,
      ranking
    });

  } catch (error) {
    console.error("Error en /api/mercado:", error);

    res.status(500).json({
      ok: false,
      error: "No se pudo cargar el motor de mercado.",
      detalle: error.message
    });
  }
}
