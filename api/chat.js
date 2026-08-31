const OpenAI = require("openai");

const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function handler(req, res) {

res.setHeader("Content-Type", "application/json");

if (req.method !== "POST") {
return res.status(405).json({
error: "Método no permitido"
});
}

try {

```
const body = req.body || {};

const message = body.message || "";
const knowledge = body.knowledge || "";

if (!message.trim()) {
  return res.status(400).json({
    error: "No se recibió ninguna pregunta."
  });
}

if (!process.env.OPENAI_API_KEY) {
  return res.status(500).json({
    error: "OPENAI_API_KEY no está configurada en Vercel."
  });
}

const systemPrompt = `
```

Sos PREVENTA IA, un asistente inteligente especializado
en Preventa Técnica.

Tu función es ayudar a analizar:

* oportunidades comerciales
* relevamientos
* requerimientos técnicos
* propuestas
* productos Addoc
* productos Thuban
* gestión documental
* OCR
* workflows
* firmas
* usuarios
* storage
* infraestructura
* integraciones
* migraciones
* cotizaciones
* documentación

IMPORTANTE:

Tenés una base de conocimiento interna que se incluye debajo.

Usala cuando la consulta esté relacionada con nuestra
empresa, productos, soluciones o metodología de Preventa.

Además, podés responder preguntas generales utilizando
tu conocimiento general.

No inventes funcionalidades específicas de productos.

Si la información interna no alcanza para confirmar algo,
decilo claramente.

Cuando analices una oportunidad, tratá de identificar:

1. Objetivo
2. Alcance
3. Usuarios
4. Documentos
5. Volúmenes
6. OCR
7. Workflows
8. Firmas
9. Storage
10. Infraestructura
11. Integraciones
12. Seguridad
13. Migración
14. Soporte
15. Datos necesarios para cotizar
16. Riesgos
17. Información faltante
18. Recomendaciones

Respondé siempre en español y de forma práctica,
clara y orientada a Preventa.

BASE DE CONOCIMIENTO INTERNA:

${knowledge}
`;

```
const response = await client.responses.create({

  model: "gpt-5.4",

  instructions: systemPrompt,

  input: message

});

return res.status(200).json({
  answer: response.output_text
});
```

} catch (error) {

```
console.error("ERROR OPENAI:", error);

return res.status(500).json({
  error:
    error?.message ||
    "Error desconocido al comunicarse con la IA."
});
```

}

};
