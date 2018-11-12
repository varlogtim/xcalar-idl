
/* Corrector */
class Corrector {
    // traing texts
    // words = ["pull", "sort", "join", "filter", "aggreagte", "map"];

    private model: {[key: string]: number};
    private modelMap: {[key: string]: string};

    public constructor(words: string[]) {
        const self = this;
        self.modelMap = {};
        self.model = transformAndTrain(words);
         // convert words to lowercase and train the word
        function transformAndTrain(features): {[key: string]: number} {
            const res: {[key: string]: number} = {};
            let word: string;

            for (let i = 0, len = features.length; i < len; i++) {
                word = features[i].toLowerCase();
                if (word in res) {
                    res[word] += 1;
                } else {
                    res[word] = 2; // start with 2
                    self.modelMap[word] = features[i];
                }
            }
            return (res);
        }
    }

    public correct(word: string, isEdits2: boolean): string {
        word = word.toLowerCase();
        const model: object = this.model;

        const edits1Res = edits1(word);
        let candidate: object;

        if (isEdits2) {
            candidate = known({word: true}) || known(edits1Res) ||
                        knownEdits2(edits1Res) || {word: true};
        } else {
            candidate = known({word: true}) || known(edits1Res) || {word: true};
        }

        let max: number = 0;
        let result: string;

        for (const key in candidate) {
            const count: number = getWordCount(key);

            if (count > max) {
                max = count;
                result = key;
            }
        }

        return (result);

        function getWordCount(w): number {
            // smooth for no-exist word, model[word_not_here] = 1
            return (model[w] || 1);
        }

        function known(words: object): object {
            const res: object = {};

            for (const w in words) {
                if (w in model) {
                    res[w] = true;
                }
            }

            return ($.isEmptyObject(res) ? null : res);
        }

        // edit distabnce of word;
        function edits1(w: string): object {
            const splits: object = {};
            let part1: string;
            let part2: string;
            let wrongWord: string;

            for (let i = 0, len = w.length; i <= len; i++) {
                part1 = w.slice(0, i);
                part2 = w.slice(i, len);
                splits[part1] = part2;
            }

            const deletes: object    = {};
            const transposes: object = {};
            const replaces: object   = {};
            const inserts: object    = {};
            const alphabets: string[]  = "abcdefghijklmnopqrstuvwxyz".split("");

            for (part1 in splits) {
                part2 = splits[part1];

                if (part2) {
                    wrongWord = part1 + part2.substring(1);
                    deletes[wrongWord] = true;
                }

                if (part2.length > 1) {
                    wrongWord = part1 + part2.charAt(1) + part2.charAt(0) +
                                part2.substring(2);
                    transposes[wrongWord] = true;
                }

                for (let i = 0, len = alphabets.length; i < len; i++) {
                    if (part2) {
                        wrongWord = part1 + alphabets[i] + part2.substring(1);
                        replaces[wrongWord] = true;
                    }

                    wrongWord = part1 + alphabets[i] + part2;
                    inserts[wrongWord] = true;
                }
            }

            return $.extend({}, splits, deletes,
                            transposes, replaces, inserts);
        }

        function knownEdits2(e1Sets: object): object {
            const res: object = {};

            for (const e1 in e1Sets) {
                const e2Sets: object = edits1(e1);
                for (let e2 in e2Sets) {
                    if (e2 in model) {
                        res[e2] = true;
                    }
                }
            }

            return ($.isEmptyObject(res) ? null : res);
        }
    }

    // returns only 1 value
    public suggest(word: string, isEdits2: boolean) {
        word = word.toLowerCase();

        let startStrCandidate: string[] = [];
        let subStrCandidate: string[]   = [];

        for (const w in this.model) {
            if (w.startsWith(word)) {
                startStrCandidate.push(w);
            } else if (w.indexOf(word) > -1) {
                subStrCandidate.push(w);
            }
        }

        if (startStrCandidate.length >= 1) {
            // suggest the only candidate that start with word
            if (startStrCandidate.length === 1) {
                return (this.modelMap[startStrCandidate[0]]);
            }
        } else if (subStrCandidate.length === 1) {
            // no candidate start with word
            // but has only one substring with word
            return (this.modelMap[subStrCandidate[0]]);
        }

        const res = this.correct(word, isEdits2);
        return (this.modelMap[res]);
    }
}
