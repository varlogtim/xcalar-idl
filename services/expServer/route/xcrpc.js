var express = require('express');
var router = express.Router();
var net = require('net');
var serviceMgr = require('../serviceMgr')

function routeToXce(reqBuf, res) {
    var reqSizeBuf = Buffer.alloc(8);
    var respSizeBuf = Buffer.alloc(0);
    var respSize = undefined; // number of bytes currently in respBuf
    var respBuf = undefined;
    var response = {"error": "Unknown error occurred"};

    // XXX get these from a config file
    var udsPath = '/tmp/xcalar_sock/usrnode-0';
    var timeoutMs = 5 * 60 * 60 * 1000; // 5 hours

    reqSizeBuf.writeUInt32LE(reqBuf.length, 0);
    reqSizeBuf.writeUInt32LE(0, 4); // Assume that our message size fits in 4 bytes

    var socket = net.createConnection({ path: udsPath });
    socket.setTimeout(timeoutMs);
    socket.setKeepAlive(true);
    socket.on('connect', function() {
        socket.write(reqSizeBuf);
        socket.write(reqBuf);
    });
    socket.on('data', function(data) {
        // The response comes in 2 parts:
        //   1. 8 bytes for the size of the rest of the response
        //   2. The rest of the response
        // We're going to receive the response in some number of data events.
        // There is no guarantee about the size of the data events, so we have
        // to do extra work to make sure the first 8 bytes get processed as the
        // size, and that size is respected by the body of the response.
        //
        // If sizeBuf not full, fill it.
        // For remaining bytes, fill into response
        var sizeBytes = Math.min(8 - respSizeBuf.length, data.length);
        var respBytes = data.length - sizeBytes;
        if (sizeBytes > 0) {
            // We use Buffer.concat here for simplicity. Normally this will
            // come in a single message, bundled along with some data as well.
            var incrementalSizeBuf = data.slice(0, sizeBytes);
            respSizeBuf = Buffer.concat([respSizeBuf, incrementalSizeBuf]);
            if (respSizeBuf.length === 8) {
                // We now have the full length so we can deserialize it
                // Assume that our message size fits in 4 bytes
                var totalRespSize = respSizeBuf.readUInt32LE(0);
                // Now that we know our expected response size, we can allocate
                // the response buffer and start to fill it with the response
                respBuf = Buffer.alloc(totalRespSize);
                respSize = 0;
            }
        }
        if (respBytes > 0) {
            // We have bytes to read into our response
            // Check if this overflows our expected number of bytes
            if (respSize + respBytes > respBuf.length) {
                // The server sent us more data than it promised
                socket.destroy(new Error("Incorrect XCE response header"));
            } else {
                // Copy from `data` into the response buffer and increment
                // our current position within the response buffer
                respSize += data.copy(respBuf, respSize, sizeBytes);
                if (respBuf.length == respSize) {
                    response = {"data": respBuf.toString("base64")};
                    socket.destroy();
                }
            }
        }
    });
    socket.on('error', function(err) {
        response = {"error": err.name + ": " + err.message};
    });
    socket.on('timeout', function() {
        socket.destroy(new Error("XCE connection timed out"));
    });
    socket.on('close', function(hadError) {
        var errCode = hadError ? 500 : 200;
        res.status(errCode).json(response);
    });
}

router.post("/service/xce", function(req, res) {
    var reqBuf = Buffer.from(req.body.data, 'base64');

   serviceMgr.handleService(reqBuf)
   .then(function(reqHandled, resp) {
       if(!reqHandled) {
           return routeToXce(reqBuf, res);
       }
       res.status(200).json({"data": resp});
   })
   .fail(function(){
       res.status(500).json("Error occured!!");
   });
});
// Export router
exports.router = router;
