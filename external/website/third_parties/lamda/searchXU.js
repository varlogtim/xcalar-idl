var https = require('https');
exports.handler = (event, context, callback) => {
    // TODO implement
    // callback(null, 'Hello from Lambda');
  let str = "";
  let keyword = event.keyword;
  let startNum = event.startNum;
  https.get("https://www.googleapis.com/customsearch/v1?key=AIzaSyA8DngNSHd_E8kEQ8Xq1nfvrA16jGg6nWw&cx=015836563590686073005:qfjb34dajvo&q=" + keyword + "&start=" + startNum, function (result) {
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
