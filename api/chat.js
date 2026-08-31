const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {

    const message = req.body?.message || "";
    const knowledge = req.body?.knowledge || "";

    if (!message.trim()) {
      return res.status(400).json({
        error: "No se recibió ninguna pregunta."
      });
    }

    const prompt = `
Sos PREVENTA IA, un asistente especializado en Preventa Técnica.

Ayudás con:

- relevamientos
- oportunidades
- propuestas
- Addoc
- Thuban
- gestión documental
- OCR
- workflows
- firmas
- usuarios
- storage
- infraestructura
- integraciones
- migraciones
- cotizaciones
- análisis de documentos

Podés responder también preguntas generales.

No inventes funcionalidades específicas de productos.
Si no existe información suficiente, indicá que hay que validarla.

Cuando analices una oportunidad buscá:
objetivo, alcance, usuarios, documentos, volúmenes, OCR,
workflows, firmas, storage, infraestructura, integraciones,
seguridad, migración, soporte, costos, riesgos y datos faltantes.

Respondé en español, de forma clara y práctica.

CONOCIMIENTO INTERNO:

${knowledge}
`;

    const response = await client.responses.create({
      model: "gpt-5.4",
      instructions: prompt,
      input: message
    });

    return res.status(200).json({
      answer: response.output_text
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message || "Error de OpenAI"
    });

  }

};
