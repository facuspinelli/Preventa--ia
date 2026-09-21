# PREVENTA IA V3 - arquitectura integrada

La V3 convierte los módulos existentes en un flujo único, manteniendo funcionamiento local y sin depender de IA paga.

## Flujo principal

Mercado / Documento / Alta manual -> Oportunidad -> Análisis -> Solución -> Cotizador -> Propuesta -> Repositorio.

## Fuente única de verdad

`preventa-core.js` administra oportunidades, contexto actual, análisis, cotizaciones, propuestas, prospectos y actividad.

## Reglas

- Los estados se almacenan como `new`, `analysis`, `quote`, `proposal`, `won`, `lost`.
- Se conserva compatibilidad con oportunidades históricas que usaban nombres en español.
- El análisis de documentos conserva `evidence` y `sourceDocument`.
- La cotización se adjunta a la oportunidad y mantiene cliente/proyecto/solución.
- La propuesta final se adjunta a la oportunidad y se consulta desde el Repositorio.
- Mercado puede convertir el escenario seleccionado en una oportunidad de origen `market`.
- El asistente muestra el contexto de la oportunidad actual y mantiene búsqueda local de conocimiento/documentos.
- La IA externa queda como capa opcional; el sistema base funciona sin créditos de OpenAI.
