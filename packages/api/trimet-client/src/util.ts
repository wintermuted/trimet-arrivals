export async function getTrimetData<T>(requestURI: string, signal?: AbortSignal): Promise<T> {
  return fetch(requestURI, signal ? { signal } : undefined)
    .then(res => res.json())
    .then(json => json.resultSet);
}
