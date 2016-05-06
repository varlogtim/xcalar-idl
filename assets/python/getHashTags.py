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
        pageTags["pageTitle"] = title
        pageTags["inPageSummary"] = d(".InPageSummary").text()
        for tag in hashTags:
            if tag == "":
                continue
            if tag in pageTags:
                pageTags[tag] += 1
            else:
                pageTags[tag] = 1
        filepath = "assets"+filepath[2:]
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
                globalHashTag[htag].add((page, pageDict["pageTitle"],
                                         pageDict["inPageSummary"]))
        finalHashTag = dict()
        for tag in globalHashTag:
            listOfLinks = list()
            for link, title, summary in globalHashTag[tag]:
                struct = {"link": link, "title": title, 
                          "summary": summary}
                listOfLinks.append(struct)
            finalHashTag[tag] = listOfLinks
        self.globalTags = finalHashTag

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
    hashTagTree.getTagsFromFolder(
            "../help/", "htm")
    hashTagTree.invertTags()
    #hashTagTree.prettyPrint()
    fout = open("../js/tutorial/tags.js", "wb")
    fout.write("var helpHashTags = ")
    fout.write(json.dumps(hashTagTree.globalTags))
    fout.write(";")

