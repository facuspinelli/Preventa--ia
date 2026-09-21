# PREVENTA IA V2 — Arquitectura base

## Objetivo

Convertir PREVENTA IA de un conjunto de páginas independientes en un sistema integrado de preventa técnica.

## Motores

1. Conocimiento
2. Análisis documental
3. Oportunidades
4. Cotizador
5. Mercado 360
6. IA / Agente

## Flujo principal

Mercado / Pliego / ingreso manual → Oportunidad → Análisis → Solución → Cotizador → Propuesta → Repositorio.

El Asistente/Agente podrá consultar transversalmente conocimiento, documentos, análisis, oportunidades y mercado.

## Principios

- El sistema debe funcionar sin depender de una API de IA paga.
- La IA es una capa de interpretación, no la base de los cálculos.
- Todo dato importante derivado de un documento debe conservar fuente y página cuando exista.
- No se debe presentar una inferencia comercial como un hecho.
- El cotizador de V1 se mantiene estable durante esta etapa.
- `conocimiento.json` se conserva como fuente maestra de transición.

## Entidades principales

Empresa, Producto, Documento, Requisito, Análisis, Oportunidad, Prospecto, Conocimiento, Cotización y Propuesta.

## Estado de esta etapa

Esta etapa prepara el contrato de datos y la capa de persistencia local. Todavía no reemplaza el RAG, el análisis de pliegos ni Mercado 360.
