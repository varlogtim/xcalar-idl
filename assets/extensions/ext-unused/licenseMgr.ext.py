import json
import urllib.request

# Production endpoint
licenseServerApiEndpoint = "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/secure/list"

# Development endpoint
#licenseServerApiEndpoint = "https://vktozna5ke.execute-api.us-west-2.amazonaws.com/dev/license/api/v1.0/secure/list"

def getTable(filePath, inStream, tableName = "license"):
    inObj = json.loads(inStream.read())
    startRow = inObj["startRow"]
    if startRow != 0:
        # Only load on 1 node for now
        return

    data = {"secret": "xcalarS3cret"}

    req = urllib.request.Request("%s%s" % (licenseServerApiEndpoint, tableName))
    req.add_header('Content-Type', 'application/json')
    rsp = urllib.request.urlopen(req, json.dumps(data).encode())
    parsedData = json.loads(rsp.read())
    for row in parsedData:
        yield row

