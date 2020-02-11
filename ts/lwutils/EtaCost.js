// ETA and cost vary as a function of EC2 region/zone and bucket region/zone, for now we fake it
// We assume that both are located in the same zone, not just region.
// All costs in dollars, time in secs
class EtaCost {

    constructor() {
        this.costPerGB = 0.01
        this.pcplCost1K = 0.0055  // PUT/COPY/POST/LIST (Deletes are free)
        this.gsCost1K = 0.00044  // GET/SELECT
        this.oneGig = Math.pow(2, 30) // a billion
        this.numIOs = 3 // number of round-trips (including temp file)
        this.numPcpl = 1
        this.numGs = 2
        this.bandwidthGBps = 10/8 // assuming AWS 10 gig network
    }

    // input {files : [{file : "/foo/bar/foo.csv", sizeInBytes : 423422}, {file : "/foo/bar/foo1.csv", sizeInBytes : 54333}]}
    discover_etacost(myfiles, sampleSize, numCores) {
        var totalCost = 0
        var totalEta = 0
        var totalSize = 0
        var newfiles = JSON.parse(JSON.stringify(myfiles))
        for (var file of newfiles.files) {
            file.costInDollars = (sampleSize*this.costPerGB*this.numIOs)/this.oneGig + (this.pcplCost1K*this.numPcpl)/1000 + (this.gsCost1K*this.numGs)/1000
            file.etaInSecs = sampleSize/(this.bandwidthGBps*this.oneGig*numCores)
            totalSize += file.sizeInBytes
            totalCost += file.costInDollars
            totalEta += file.etaInSecs
        }
        newfiles.totalCost = totalCost
        newfiles.totalEta = totalEta
        newfiles.totalSize = totalSize
        return newfiles
    }

    // input {files : [{file : "/foo/bar/foo.csv", sizeInBytes : 423422}, {file : "/foo/bar/foo1.csv", sizeInBytes : 54333}]}
    load_etacost(myfiles, numCores) {
        var totalCost = 0
        var totalEta = 0
        var totalSize = 0
        var newfiles = JSON.parse(JSON.stringify(myfiles))
        for (var file of newfiles.files) {
            file.costInDollars = (file.sizeInBytes*this.costPerGB)/this.oneGig + (this.pcplCost1K*this.numPcpl)/1000 + (this.gsCost1K*this.numGs)/1000
            file.etaInSecs = file.sizeInBytes/(this.bandwidthGBps*this.oneGig*numCores)
            totalSize += file.sizeInBytes
            totalCost += file.costInDollars
            totalEta += file.etaInSecs
        }
        newfiles.totalCost = totalCost
        newfiles.totalEta = totalEta
        newfiles.totalSize = totalSize
        return newfiles
    }
}
module.exports = EtaCost
