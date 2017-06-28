import json

# for all partfiles, this function yields all json objects that constitute the
# original data, and adds an extra row which has all fields in the partfile.
# The value of field xcMeta is used to distinguish the original data from the
# extra field in the main extension.
def getAllKeysFromPartfile(filePath, inStream):
    # the extra row which contains all keys
    allKeys = {}
    with open(filePath) as inFile:
        data = json.load(inFile)
    for obj in data:
        # give diff xcMeta value to original data
        obj["xcMeta"] = 0
        for key in obj:
            # add each key to allKeys, which is eventually yielded after
            # visiting each row in the file
            allKeys[key] = True
        yield obj
    # give diff xcMeta value to row with all keys
    allKeys["xcMeta"] = 1
    yield allKeys
