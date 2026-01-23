

// database settings
const DB_NAME = "infinite-horizons-db";
const DB_VERSION = 1;

// database structure
export const STORES = {
    AUTH: "auth",
    SETTINGS: "settings",
    GAME: "game_data"
};


// internal helper to open the database
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // clear DB if it doesn't exist or version number changes
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // create stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.AUTH)) {
                db.createObjectStore(STORES.AUTH);
            }
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS);
            }
            if (!db.objectStoreNames.contains(STORES.GAME)) {
                db.createObjectStore(STORES.GAME);
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(`DB Error: ${event.target.error}`);
    });
}




// save a value to a specific store in the databse
export async function setItem(storeName, key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key); // updates if exists, adds if new

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}





// get a value from a specific store in the databse
export async function getItem(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result); // return undefined if not found
        request.onerror = () => reject(request.error);
    });
}




// delete a value from a specific store in the databse
export async function removeItem(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}