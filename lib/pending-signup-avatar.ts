const DATABASE_NAME = "sona-signup";
const STORE_NAME = "pending";
const AVATAR_KEY = "avatar";

type PendingAvatar = {
  email: string;
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function savePendingSignupAvatar(email: string, file: File) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put(
    {
      email,
      blob: file,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
    } satisfies PendingAvatar,
    AVATAR_KEY,
  );
  await waitForTransaction(transaction);
  database.close();
}

export async function getPendingSignupAvatar(email: string) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const transactionDone = waitForTransaction(transaction);
  const request = transaction.objectStore(STORE_NAME).get(AVATAR_KEY);
  const record = await new Promise<PendingAvatar | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as PendingAvatar | undefined);
    request.onerror = () => reject(request.error);
  });
  await transactionDone;
  database.close();

  if (!record || record.email !== email) return null;
  return new File([record.blob], record.name, {
    type: record.type,
    lastModified: record.lastModified,
  });
}

export async function clearPendingSignupAvatar(email: string) {
  const pending = await getPendingSignupAvatar(email);
  if (!pending) return;

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(AVATAR_KEY);
  await waitForTransaction(transaction);
  database.close();
}
