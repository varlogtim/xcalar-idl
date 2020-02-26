// Import global functions. This should be modulized in the future
const XcalarListFiles = window['XcalarListFiles'];

function getFileExt(fileName) {
    return fileName.includes('.')
        ? fileName.split('.').pop()
        : 'none';
}

async function listFiles(path) {
    const fileInfos = new Map();

    try {
        const s3Files = await XcalarListFiles({
            "recursive": false,
            "targetName": "AWS Target",
            "path": path,
            "fileNamePattern": "*"
        });

        // XXX TODO: add comment about why slice(1)?
        for (const file of s3Files.files.slice(1)) {
            const fullFilePath = path + file.name;
            const isDirectory = file.attr.isDirectory ? true : false;

            fileInfos.set(fullFilePath, {
                fileId: fullFilePath,
                directory: isDirectory,
                path: file.name,
                sizeInBytes: file.attr.size,
                type: isDirectory
                    ? 'directory'
                    : getFileExt(file.name)
            });
        }
    } catch(e) {
        console.error(e);
    }

    return fileInfos;
}

// XXX TODO: it's something related to the state hook
// Need to split it from service code
import prettyBytes from 'pretty-bytes';
function populateFiles(fileInfos, setData, fileIdToFile, setFileIdToFile) {
    const fileList = [];
    for (const [ fileFullPath, fileInfo] of fileInfos.entries()) {
        const fileObj = {
            size: prettyBytes(fileInfo.sizeInBytes),
            ...fileInfo
        };
        fileIdToFile[fileFullPath] = fileObj;
        fileList.push(fileObj);
    }

    setFileIdToFile(fileIdToFile);
    setData(fileList);
}

export { listFiles, populateFiles };