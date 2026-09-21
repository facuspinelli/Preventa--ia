import { createId } from './id.js';
import { readCollection, writeCollection } from './storage.js';

export function createRepository(collectionName) {
  return {
    list() {
      return readCollection(collectionName, []);
    },
    get(id) {
      return this.list().find(item => item.id === id) || null;
    },
    save(entity) {
      const items = this.list();
      const value = { ...entity, id: entity.id || createId(collectionName) };
      const index = items.findIndex(item => item.id === value.id);
      if (index >= 0) items[index] = value;
      else items.push(value);
      writeCollection(collectionName, items);
      return value;
    },
    remove(id) {
      const next = this.list().filter(item => item.id !== id);
      writeCollection(collectionName, next);
      return next;
    }
  };
}
