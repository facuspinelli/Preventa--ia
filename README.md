# PREVENTA IA V2 — Etapa 1

Fundación de la nueva arquitectura de PREVENTA IA.

## Esta versión NO reemplaza todavía la lógica funcional de V1

El objetivo de esta etapa es preparar un modelo de datos común sin romper el cotizador ni las funcionalidades actuales.

### Incluye

- V1 preservada en la raíz.
- Eliminación de archivos obsoletos identificados.
- Catálogo normalizado de productos desde `conocimiento.json`.
- Inventario de conocimiento y fuentes.
- Contratos JSON para Empresa, Documento, Requisito, Oportunidad y Prospecto.
- Capa común de persistencia local en `lib/core/`.
- Pantalla de diagnóstico `v2-foundation.html`.
- Documentación de arquitectura y migración.

## Prueba rápida

Abrir `v2-foundation.html` después del deploy. Debe mostrar los productos, secciones de conocimiento y fuentes planificadas.

## Siguiente etapa

Etapa 2: Centro de Conocimiento + ingesta documental + índice de búsqueda/RAG, manteniendo una estrategia que funcione sin depender de IA paga.
