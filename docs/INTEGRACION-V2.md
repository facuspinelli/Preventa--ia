# PREVENTA IA V2 — Integración funcional

## Objetivo

Esta versión unifica el ciclo operativo de Preventa sin depender de una base externa ni de IA paga para la persistencia.

Flujo principal:

Mercado / Documento / carga manual → Oportunidad → Análisis → Solución → Cotizador → Propuesta → Repositorio → Estado final.

## Fuente única de verdad

La oportunidad se persiste en:

- `preventa_opportunities`
- `preventa_current_opportunity`

El archivo `preventa-core.js` centraliza la lectura, escritura y actualización de esos datos.

## Reglas

1. Una oportunidad conserva su mismo `id` durante todo el ciclo.
2. Guardar un análisis desde una oportunidad existente actualiza esa oportunidad; no crea otra.
3. Guardar una cotización actualiza la misma oportunidad y la pasa a `quote` / `Cotizando`.
4. Generar y guardar una propuesta actualiza la misma oportunidad y la pasa a `proposal` / `Propuesta`.
5. Se conservan `quote`, `analysis` y `finalProposal` al editar una oportunidad.
6. Se mantienen las claves de localStorage usadas por la versión anterior para evitar pérdida de datos.
7. La IA es una capa opcional; el flujo base funciona sin API paga.

## Compatibilidad

No se elimina `conocimiento.json`, la Biblioteca Técnica, los archivos de propuestas ni el cotizador existente: se integran mediante el núcleo común.
