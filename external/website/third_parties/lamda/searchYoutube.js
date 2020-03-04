var https = require('https');
exports.handler = (event, context, callback) => {
    // TODO implement
    // callback(null, 'Hello from Lambda');
  let str = "";
  let keyword = event.keyword;
  https.get("https://www.googleapis.com/youtube/v3/search?part=snippet&key=AIzaSyA8DngNSHd_E8kEQ8Xq1nfvrA16jGg6nWw&channelId=UCS-x8wOBSeqJ2hg2HYNk70w&q=" + keyword, function (result) {
    result.on('data', function (chunk) {
        str += chunk;
    });
    result.on('end', function () {
        callback(null, JSON.parse(str));
    });
  }).on('error', function (err) {
    console.log('Error, with: ' + err.message);
    callback(err);
  });
};