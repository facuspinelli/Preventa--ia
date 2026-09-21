# Migración — PREVENTA IA V2 Etapa 1

## Qué reemplazar

Se puede reemplazar el contenido completo del repositorio V1 por este ZIP.

## Qué conservar

- `cotizador.html`
- `conocimiento.json`
- todas las páginas actuales de V1 que siguen en la raíz
- `api/chat.js` y `api/mercado.js` como código histórico de transición

## Qué se elimina

- `.github/asistente.html`: era una copia fuera de lugar.
- `api1`: archivo vacío/obsoleto.

## Qué se agrega

- `data/`: contratos y datos base de V2.
- `lib/core/`: primera capa común de persistencia/modelos.
- `docs/`: arquitectura e instrucciones.
- `v2-foundation.html`: pantalla de diagnóstico de la nueva base.

## Importante

No hay que borrar ni modificar manualmente archivos después de subir el ZIP. Primero verificar el despliegue y luego seguir con la Etapa 2.
