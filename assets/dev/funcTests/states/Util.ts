class Util {
    // Generate a random integer with range [0, max)
    public static getRandomInt(max: number): number {
        return Math.floor(Util.random() * Math.floor(max));
    }

    // Pick a random elements from the collection
    public static pickRandom(collection: any, n = 1): any {
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
            result.add(arr[Math.floor(Util.random() * arr.length)]);
        }
        if (n == 1) {
            return result.entries().next().value[0];
        }
        return Array.from(result.entries()).map((res) => res[0]);
    }

    // Customized random function
    public static random(): number {
        let seed = xcSessionStorage.getItem('xdFuncTestSeed');
        Math.seedrandom(seed);
        let rand = Math.random();
        seed++;
        xcSessionStorage.setItem('xdFuncTestSeed', seed.toString());
        return rand;
    }

    // Generate a unique random name
    public static uniqueRandName(name: string, validFunc: Function, maxTry: number):string {
        const initialName: string = Util.randName(name);
        const nameGenFunc: Function = () => Util.randName(name);
        return Util.uniqueName(initialName, validFunc, nameGenFunc, maxTry);
    }

    public static padZero(num: number, numDigits: number): string {
        const numInStr: string = num.toString();
        return (numInStr.length < numDigits) ?
            new Array(numDigits - numInStr.length + 1).join('0') + numInStr :
            numInStr;
    }

    public static randName(name: string, digits: number = 5): string {
        const max: number = Math.pow(10, digits);
        let rand: number = Math.floor(Util.random() * max);

        if (rand === 0) {
            rand = 1;
        }

        const randAfiix = Util.padZero(rand, digits);
        return (name + randAfiix);
    }

    public static uniqueName(name: string, validFunc: Function, nameGenFunc: Function | null, maxTry: number = 10): string {
        let validName: string = name;
        if (!(validFunc instanceof Function)) {
            return validName;
        }

        if (!(nameGenFunc instanceof Function)) {
            nameGenFunc = function(cnt) {
                // start from 1
                return name + '_' + cnt;
            };
        }

        let tryCnt: number = 0;
        while (!validFunc(validName) && tryCnt < maxTry) {
            tryCnt++;
            validName = nameGenFunc(tryCnt);
        }

        if (tryCnt === maxTry) {
            console.error('Too much try, name Conflict!');
            return Util.randName(name);
        } else {
            return validName;
        }
    }
}