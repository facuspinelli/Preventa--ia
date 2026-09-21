export const ESTADOS_OPORTUNIDAD = [
  'NUEVA', 'EN_ANALISIS', 'COTIZANDO', 'PROPUESTA', 'GANADA', 'PERDIDA'
];

export const ESTADOS_REQUISITO = [
  'CUMPLE', 'PARCIAL', 'NO_IDENTIFICADO', 'NO_CUMPLE', 'POR_VALIDAR'
];

export const NIVELES_POTENCIAL = ['BAJO', 'MEDIO', 'ALTO', 'POR_VALIDAR'];

export function emptyOportunidad() {
  return {
    id: null,
    clienteId: null,
    nombre: '',
    origen: null,
    estado: 'NUEVA',
    responsable: null,
    fecha: new Date().toISOString(),
    fechaLimite: null,
    montoEstimado: null,
    productoIds: [],
    documentoIds: [],
    analisisId: null,
    cotizacionId: null,
    propuestaTecnicaId: null,
    propuestaEconomicaId: null,
    riesgos: [],
    actividades: [],
    resultado: null,
    motivoPerdida: null
  };
}
