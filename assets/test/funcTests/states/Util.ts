class Util {
    // Generate a random integer with range [0, max)
    public static getRandomInt(max: number) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    // Pick a random elements from the collection
    public static pickRandom(collection: any, n = 1) {
        let arr = [], result = new Set();
        if (collection instanceof Array) {
            arr = collection;
        } else if (collection instanceof Map || collection instanceof Set){
            arr = Array.from(collection.keys());
        } else {
            return;
        }
        if (arr.length == 0 || n > arr.length) {
            return;
        }
        while (result.size < n) {
            result.add(arr[Math.floor(Math.random() * arr.length)]);
        }
        if (n == 1) {
            return result.entries().next().value[0];
        }
        return Array.from(result.entries()).map((res) => res[0]);
    }

}