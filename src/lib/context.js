import { Bundle } from './bundle';
import { L10nError } from './errors';

export class Context {
  constructor(langs, resIds) {
    this.langs = langs;
    this.resIds = resIds;
  }

  formatValues() {
    throw new L10nError('Not implemented');
  }

  formatEntities() {
    throw new L10nError('Not implemented');
  }
}

export class SimpleContext extends Context {
  constructor(langs, resIds, resources) {
    super(langs, resIds);
    this.bundle = new Bundle(langs[0].code);

    const goodResources = resources
      .filter(res => !(res instanceof Error))
      .forEach(res => this.bundle.addMessages(res));
  }

  _formatKeys(keys, method) {
    return keys.map((key, i) => {
      const [id, args] = Array.isArray(key) ?
        key : [key, undefined];

      // XXX Context should handle errors somehow; emit/return?
      const [result] = method.call(this, id, args);
      return result;
    });
  }

  formatValue(id, args) {
    const entity = this.bundle.get(id);

    if (!entity) {
      return [id, [new L10nError(`Unknown entity: ${id}`)]];
    }

    return this.bundle.format(entity, args);
  }

  formatEntity(id, args) {
    const entity = this.bundle.get(id);

    if (!entity)  {
      return [
        { value: id, attrs: null },
        [new L10nError(`Unknown entity: ${id}`)]
      ];
    }

    const [value] = this.bundle.format(entity, args);

    const formatted = {
      value,
      attrs: null,
    };

    if (entity.traits) {
      formatted.attrs = Object.create(null);
      for (let trait of entity.traits) {
        const [attrValue] = this.bundle.format(trait, args);
        formatted.attrs[trait.key.name] = attrValue;
      }
    }

    // XXX return errors
    return [formatted, []];
  }


  formatValues(...keys) {
    return this._formatKeys(keys, SimpleContext.prototype.formatValue);
  }

  formatEntities(...keys) {
    return this._formatKeys(keys, SimpleContext.prototype.formatEntity);
  }
}

SimpleContext.create = function(fetchResource, langs, resIds) {
  const [first] = langs;

  return Promise.all(
    resIds.map(resId => fetchResource(resId, first))
  ).then(
    resources => new SimpleContext(langs, resIds, resources)
  );
}
