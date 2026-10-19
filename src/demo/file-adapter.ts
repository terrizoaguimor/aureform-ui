/** Replace this local IndexedDB adapter with your object storage provider. */
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("aureform-demo-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Local file storage unavailable"));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode),
      request = operation(tx.objectStore("files"));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Local storage transaction failed"));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Local storage transaction aborted"));
    };
  });
}
export const localFileAdapter = {
  put: (id: string, file: Blob) =>
    transaction<IDBValidKey>("readwrite", (store) => store.put(file, id)),
  get: (id: string) =>
    transaction<Blob | undefined>("readonly", (store) => store.get(id)),
  remove: (id: string) =>
    transaction<undefined>("readwrite", (store) => store.delete(id)),
};
