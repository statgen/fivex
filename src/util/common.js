const PORTALDEV_URL = 'https://portaldev.sph.umich.edu/api/v1/';


/**
 * Handles bad requests - copied from https://www.tjvantoll.com/2015/09/13/fetch-and-errors/
 * @param response
 * @return {{ok}|*}
 */
function handleErrors(response) {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response;
}

/**
 * Remove the `sourcename:` prefix from field names in the data returned by an LZ datasource
 *
 * This is a convenience method for writing external widgets (like tables) that subscribe to the
 *   plot; typically we don't want to have to redefine the table layout every time someone selects
 *   a different association study.
 * As with all convenience methods, it has limits: don't use it if the same field name is requested
 *   from two different sources!
 * @param {Object} data An object representing the fields for one row of data
 * @param {String} [prefer] Sometimes, two sources provide a field with same name. Specify which
 *  source will take precedence in the event of a conflict.
 */
export function deNamespace(data, prefer) {
  return Object.keys(data).reduce((acc, key) => {
    const new_key = key.replace(/.*?:/, '');
    if (!Object.prototype.hasOwnProperty.call(acc, new_key)
        || (!prefer || key.startsWith(prefer))) {
      acc[new_key] = data[key];
    }
    return acc;
  }, {});
}

// eslint-disable-next-line import/prefer-default-export
export { handleErrors, PORTALDEV_URL };
