# Remember to squash all subfolders
# Remember to change include paths in all .html files

import os, shutil, fnmatch, re, tempfile

def catFilesTogether():
    jsRoot = "prod/assets/js/"
    for f in os.listdir(jsRoot):
        if os.path.isdir(jsRoot+f):
            subFolder = jsRoot + f
            if f == "thrift" or f == "unused":
                continue
            print "Squashing all js files in: "+subFolder
            outFile = open(jsRoot+"/"+f+".js", "w")
            for file in os.listdir(subFolder):
                partialJsFile = subFolder+"/"+file
                extension = file.split(".")[-1]

                if os.path.isfile(partialJsFile) and extension == "js":
                    inFile = open(partialJsFile, "r")
                    for line in inFile:
                        outFile.write(line+"\n")
            shutil.rmtree(subFolder)
            outFile.close()

def replacePathsInHtml():
    root = "prod/"
    filesToReplace = []
    for rt, subdirs, files in os.walk(root):
        for f in fnmatch.filter(files, "*.html"):
            if rt[-1] == "/":
                htmlCandidate = rt + f
            else:
                htmlCandidate = rt+"/"+f
            if htmlCandidate.find("prod/3rd/") == 0:
                continue
            filesToReplace.append(htmlCandidate)

    for f in filesToReplace:
        print "Replacing includes in: " + f
        original = open(f, "r")
        fh, abs_path = tempfile.mkstemp()
        newFile = open(abs_path, "w")
        seenBefore = dict()
        for line in original:
            matches = re.match('(.*\/js)(\/[^\/]+)(\/.*)(\.js".*)', line)
            if matches and not matches.group(2) == "/thrift":
                if matches.group(2) in seenBefore:
                    # This file has already been included before.
                    # Just skip this line
                    continue
                else :
                    #replace with new string
                    newString = matches.group(1) + matches.group(2) + \
                                matches.group(4)
                    newFile.write(newString+"\n")
                    seenBefore[matches.group(2)] = True
            else:
                #leave line as is and write
                newFile.write(line)

        os.close(fh)
        original.close()
        os.remove(f)
        newFile.close()
        shutil.move(abs_path, f)

def genSearchInsight():
    print "Generating SearchInsight.htm"
    searchLocation = "prod/assets/help/Content/Search.htm"
    newFile = searchLocation.split(".")[0]+"Insight.htm"
    insertions = "prod/site/partials/mcf.html"
    code = open(searchLocation, "rb").read()
    insert = open(insertions, "rb").read()
    fout = open(newFile, "wb")
    
    # Read the file and write it out line by line until we see the style tag
    # That's where we insert our stuff
    
    found = False
    for line in code.split("\r\n"):
        if not found and (line).find("<style>") > -1:
            fout.write(insert+"\n")
            found = True
        fout.write(line+"\n")
    fout.close()

if __name__ == "__main__":
    catFilesTogether()
    replacePathsInHtml()
    genSearchInsight()
