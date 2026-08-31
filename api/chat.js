const OpenAI = require("openai");

const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({
error: "Método no permitido"
});
}

try {

```
const { message, knowledge } = req.body || {};

if (!message) {
  return res.status(400).json({
    error: "No se recibió ninguna pregunta."
  });
}

const systemPrompt = `
```

Sos PREVENTA IA, un asistente especializado en Preventa Técnica.

Tu objetivo es ayudar a analizar oportunidades, requerimientos,
productos, soluciones, documentación, cotizaciones y propuestas.

Tenés acceso a una base de conocimiento interna de la empresa.
Cuando esa información sea relevante, utilizala como fuente prioritaria.

Sin embargo, también podés responder preguntas generales utilizando
tu conocimiento general.

REGLAS:

1. No inventes funcionalidades de productos.
2. Si la información interna no alcanza para responder sobre un producto,
   indicá claramente que es necesario validar esa información.
3. Diferenciá entre información interna y conocimiento general cuando sea útil.
4. Para documentos o requerimientos, buscá siempre:

   * objetivo
   * alcance
   * requerimientos
   * usuarios
   * documentos
   * OCR
   * workflows
   * firmas
   * storage
   * infraestructura
   * integraciones
   * seguridad
   * volúmenes
   * riesgos
   * información faltante
   * datos necesarios para cotizar
5. Respondé en español.
6. Sé claro, práctico y orientado a Preventa.

BASE DE CONOCIMIENTO INTERNA:

${knowledge || "No se proporcionó información interna adicional."}
`;

```
const response = await client.responses.create({
  model: "gpt-5.4-mini",
  instructions: systemPrompt,
  input: message
});

return res.status(200).json({
  answer: response.output_text
});
```

} catch (error) {

```
console.error(error);

return res.status(500).json({
  error: "Error al comunicarse con la IA."
});
```

}

};
