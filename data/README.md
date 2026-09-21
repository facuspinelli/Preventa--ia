# Datos de PREVENTA IA V2

Esta carpeta contiene la base estructural de la V2.

## Archivos

- `productos.json`: catálogo normalizado generado desde `conocimiento.json` de V1.
- `knowledge-catalog.json`: inventario de las secciones de la base de conocimiento existente.
- `source-manifest.json`: fuentes que ya forman parte del material del proyecto y que se incorporarán al motor de conocimiento/RAG en una etapa posterior.
- `schemas/`: contratos de datos para las entidades principales.

## Regla

Durante la V2, `conocimiento.json` se conserva como fuente maestra histórica. No se elimina ni se reemplaza hasta terminar la migración al nuevo centro de conocimiento.
