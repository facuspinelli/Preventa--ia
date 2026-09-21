# PREVENTA IA V2 — Qué cambia y qué no

| Archivo | Estado | Motivo |
|---|---|---|
| `preventa-core.js` | NUEVO | Núcleo común de integración y persistencia. |
| `oportunidades.html` | REEMPLAZADO | Pipeline y ficha central de oportunidad; conecta análisis y cotizador. |
| `analisis.html` | MODIFICADO | Si existe una oportunidad actual, actualiza esa oportunidad en lugar de duplicarla. |
| `cotizador.html` | MODIFICADO | Guarda cotización y propuesta sobre la misma oportunidad y sincroniza estados. |
| `documentos.html` | COMPATIBLE | Conserva OCR/extracción y entrega el análisis a la siguiente etapa. |
| `asistente.html` | COMPATIBLE | Conserva búsqueda interna/documental; queda preparado para usar contexto común. |
| `mercado.html` | COMPATIBLE | Conserva motor de Mercado 360 y comparte el núcleo. |
| `repositorio.html` | COMPATIBLE | Conserva propuestas y estados; comparte el núcleo. |
| `index.html` | COMPATIBLE | Mantiene tablero y métricas; comparte el núcleo. |
| `biblioteca.html` | COMPATIBLE | Mantiene Biblioteca Técnica; comparte el núcleo. |
| `conocimientoiaasistente.html` | COMPATIBLE | Mantiene carga/gestión de documentos de conocimiento. |
| `conocimiento.json` | NO CAMBIA | Base de conocimiento existente. |
| `data/productos.json` | NO CAMBIA | Catálogo V2 existente. |
| `data/knowledge-catalog.json` | NO CAMBIA | Catálogo de conocimiento existente. |
| `data/source-manifest.json` | NO CAMBIA | Manifiesto de fuentes existente. |
| `api/chat.js` | NO CAMBIA | No se fuerza una dependencia nueva de IA. |
| `api/mercado.js` | NO CAMBIA | Se conserva el motor de Mercado 360. |
| `package.json` | NO CAMBIA | No se agregan dependencias nuevas. |

## Instalación recomendada

No subir archivo por archivo manualmente.

La carpeta de este paquete debe reemplazar el contenido correspondiente del repositorio GitHub. Los archivos marcados como `NO CAMBIA` se pueden conservar exactamente como estaban.

Después de publicar, verificar primero:

1. Inicio.
2. Oportunidades.
3. Abrir/crear oportunidad.
4. Ir a Análisis.
5. Guardar análisis.
6. Volver a Oportunidades y comprobar que no se duplicó.
7. Ir a Cotizador.
8. Guardar cotización.
9. Comprobar estado `Cotizando` y cotización asociada.
10. Generar propuesta y comprobar estado `Propuesta`.
