const EtaCost = require('./EtaCost.js')
var assert = require('assert');

ec = new EtaCost()

//files = {files : [ {file : "/foo/bar/foo.csv", sizeInBytes : 423422}, {file : "/foo/bar/foo2.csv", sizeInBytes : 54333}, {file : "/foo/bar/foo3.csv", sizeInBytes : 54333}, {file : "/foo/bar/foo4.csv", sizeInBytes : 54333}, {file : "/foo/bar/foo5.csv", sizeInBytes : 54333}, {file : "/foo/bar/foo6.csv", sizeInBytes : 54333}, {file : "/foo/bar/foo7.csv", sizeInBytes : 54333} ]}

function randomInt(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

numFiles = randomInt(10000, 50000)
myfiles = []
for (fileno = 0; fileno < numFiles; fileno++) {
    sizeInBytes = randomInt(1000000, 10000000)
    file = {file : "/foo/bar/foo" + fileno + ".csv", sizeInBytes : sizeInBytes}
    myfiles.push(file)
}
fileMeta = {files : myfiles}
numCores = 32
sampleSize = 1000

discover_files = ec.discover_etacost(fileMeta, sampleSize, numCores)
console.log("Discover Size: " + discover_files.totalSize + " bytes")
console.log("Discover Cost: $" + discover_files.totalCost)
console.log("Discover Time: " + discover_files.totalEta + " secs")

load_files = ec.load_etacost(fileMeta, numCores)
console.log("Load Size: " + load_files.totalSize + " bytes")
console.log("Load Cost: $" + load_files.totalCost)
console.log("Load Time: " + load_files.totalEta + " secs")
