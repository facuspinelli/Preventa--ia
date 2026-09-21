const PREFIX = 'preventa_v2_';

function key(name) {
  return `${PREFIX}${name}`;
}

export function readCollection(name, fallback = []) {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    console.error(`[PREVENTA V2] No se pudo leer ${name}`, error);
    return fallback;
  }
}

export function writeCollection(name, value) {
  localStorage.setItem(key(name), JSON.stringify(value));
  return value;
}

export function clearCollection(name) {
  localStorage.removeItem(key(name));
}

export function storageInfo() {
  return {
    tipo: 'localStorage',
    prefijo: PREFIX,
    objetivo: 'capa temporal de persistencia de V2; reemplazable por backend sin cambiar el modelo de datos'
  };
}
