function parseFile(file) {
    var fileSize = file.size;
    var chunkSize = 1 * 1024 * 1024; // 1 MB
    // var chunkSize = 40 * 1024; // 40 KB
    var offset = 0;

    makeChunk(offset, file);

    function makeChunk(offset) {
        var blob = file.slice(offset, chunkSize + offset);
        var reader = new FileReader();

        reader.readAsBinaryString(blob);
        reader.onload = onLoad;
    }

    function onLoad(event) {
        var error;
        if (event && event.target.error) {
            error = event.target.error;
        }
        var sizeCompleted;
        if (!error) {
            offset += chunkSize;

            var currentChunkSize = chunkSize;
            if (offset > fileSize) {
                currentChunkSize -= (offset - fileSize);
            }

            sizeCompleted = Math.min(offset, fileSize);

            var content;
            if (event) {
                content = event.target.result;
            } else {
                content = this.content;
            }

            postMessage({status: "loading",
                        sizeCompleted: sizeCompleted,
                        chunkSize: currentChunkSize,
                        content: content});
        } else {
            sizeCompleted = Math.min(offset, fileSize);
            postMessage({status: "error",
                        error: error,
                        sizeCompleted: sizeCompleted});
            return;
        }

        if (offset >= fileSize) {
            postMessage({status: "done"});
            return;
        }

        makeChunk(offset);
    }
}

if (FileReader.prototype.readAsBinaryString === undefined) {
    FileReader.prototype.readAsBinaryString = function (fileData) {
        var binary = "";
        var pt = this;
        var reader = new FileReader();
        reader.onload = function () {
            var bytes = new Uint8Array(reader.result);
            var length = bytes.byteLength;
            for (var i = 0; i < length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            //pt.result  - readonly so assign content to another property
            pt.content = binary;
            pt.onload();
        };
        reader.readAsArrayBuffer(fileData);
    };
}

this.onmessage = function(e) {
    if (e.data === "xcInitForIE") {
        postMessage({});
        return;
    }
    parseFile(e.data);
};
