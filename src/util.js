// Handles bad requests - copied from https://www.tjvantoll.com/2015/09/13/fetch-and-errors/
function handleErrors(response) {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response;
}

// eslint-disable-next-line import/prefer-default-export
export { handleErrors };
