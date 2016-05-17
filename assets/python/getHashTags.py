import os, json
from pyquery import PyQuery as pq

class xcalarTags:
    def __init__(self):
        self.hashTagsDict = dict()
        self.globalTags = dict()

    def getTagsInFile(self, filepath):
        f = open(filepath, "rb")
        fileString = f.read()
        d = pq(fileString)
        hashTags = d(".hashtag")
        hashTags = hashTags.text().split(" ")
        pageTags = dict()
        title = d("h1").text()
        inPageSummary = d(".InPageSummary").text()
        pageTags["pageTitle"] = title
        pageTags["InPageSummary"] = inPageSummary
        for tag in hashTags:
            if tag == "":
                continue
            if tag in pageTags:
                pageTags[tag] += 1
            else:
                pageTags[tag] = 1

        self.hashTagsDict[filepath] = pageTags

    def getTagsFromFolder(self, rootDir, ext):
        for f in os.listdir(rootDir):
            if os.path.isfile(rootDir+f):
                if f.split(".")[-1] == ext:
                    self.getTagsInFile(rootDir+f)
            elif os.path.isdir(rootDir+f):
                self.getTagsFromFolder(rootDir+f+"/", ext)
        return

    def invertTags(self):
        globalHashTag = dict()
        for page in self.hashTagsDict:
            pageDict = self.hashTagsDict[page]
            for htag in pageDict:
                if htag == "pageTitle":
                    continue
                if htag not in globalHashTag:
                    globalHashTag[htag] = set()
                globalHashTag[htag].add((page, pageDict["pageTitle"]))
        finalHashTag = dict()
        for tag in globalHashTag:
            listOfLinks = list()
            for link, title in globalHashTag[tag]:
                struct = {"link": link, "title": title}
                listOfLinks.append(struct)
            finalHashTag[tag] = listOfLinks
        self.globalTags = finalHashTag

    def convertHashTagsDict(self):
        tagsList = list()
        for key in self.hashTagsDict:
            d = dict()
            d["url"] = key
            d["tags"] = "" # all entries must have the tags key
            for tag in self.hashTagsDict[key]:
                if tag == "pageTitle":
                    d["title"] = self.hashTagsDict[key][tag]
                elif tag == "InPageSummary":
                    d["text"] = self.hashTagsDict[key][tag]
                else:
                    d["tags"] += tag + " "

            tagsList.append(d)
        return tagsList

    def prettyPrint(self):
        print "HashTagsDict: "
        for key in self.hashTagsDict:
            print "Page Name: "+key
            print self.hashTagsDict[key]
        print "\n\n"
        print "GlobalTags"
        for key in self.globalTags:
            print "Tag Name: "+key
            print self.globalTags[key]

if __name__ == "__main__":
    hashTagTree = xcalarTags()

    hashTagTree.getTagsFromFolder("../help/", "htm")
    hashTagTree.invertTags()
    #hashTagTree.prettyPrint()
    array = hashTagTree.convertHashTagsDict()
    fout = open("../js/tutorial/tags.js", "wb")
    fout.write("var helpHashTags = {\"pages\":")
    fout.write(json.dumps(array))
    fout.write("};")

