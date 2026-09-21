# PREVENTA IA — versión funcional integrada

## Principio
V1 es la base funcional preservada. La capa Core agrega relaciones sin reemplazar OCR, análisis, cotizador, biblioteca ni repositorio.

## Flujo
Documento/PDF → OCR/extracción → Análisis → Oportunidad → Relevamiento/solución → Cotizador → Propuesta → Repositorio.
Mercado 360 → oportunidad sectorial → pipeline.
Oportunidad activa → contexto del Asistente.

## Estados
`new` → `analysis` → `quote` → `proposal` → `won` / `lost`.

## Persistencia
Se mantienen las claves V1 (`preventa_opportunities`, `preventa_current_opportunity`, `preventa_document_analysis`) y se agrega actividad/historial.
