function parseFile(file) {
    var fileSize = file.size;
    var chunkSize = 1 * 1024 * 1024; // 1 MB
    // var chunkSize = 40 * 1024; // 40 KB
    var offset = 0;

    makeChunk(offset, file);
   
    function makeChunk(offset, file) {
        var blob = file.slice(offset, chunkSize + offset);

        var reader = new FileReader();
        // reader.readAsArrayBuffer(blob);
        reader.readAsBinaryString(blob);
        reader.onload = onLoad;
    }

    function onLoad(event) {
        if (!event.target.error) {
            offset += event.loaded;
            var content = event.target.result;
            // content = new Uint8Array(content);
            // console.log(offset);
            // content = btoa(content);
            postMessage({status: "loading",
                        sizeCompleted: offset,
                        chunkSize: event.loaded,
                        content: content});
        } else {
            postMessage({status: "error",
                        error: event.target.error,
                        sizeCompleted: offset});
            return;
        }
        
        if (offset >= fileSize) {
            postMessage({status: "done"});
            return;
        }

        makeChunk(offset, file);
    }
}

this.onmessage = function(e) {
    parseFile(e.data);
};