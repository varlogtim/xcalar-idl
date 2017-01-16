import json
import os

from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

# Iris dataset for testing only
from sklearn.datasets import load_iris

thisPath = "/var/www/xcalar-gui/assets/js/suggest/"

def exportDT(dtModel):
    skTree = dtModel.tree_
    skExportObj = {
        "children_left" :skTree.children_left.tolist(),
        "children_right":skTree.children_right.tolist(),
        "feature"       :skTree.feature.tolist(),
        "threshold"     :skTree.threshold.tolist(),
        "value"         :skTree.value.tolist(),
        "node_count"    :skTree.node_count
    }
    return skExportObj

def exportRF(rfModel):
    skEstimators = []
    for estimator in rfModel.estimators_:
        skEstimators.append(exportDT(estimator))
    skExportObj = {
        "estimators_": skEstimators
    }
    return skExportObj

def hardcodeJSONStr(strIn, strOut, jsFileIn, jsFileOut):
    with open(jsFileIn, 'r') as fileI, open(jsFileOut, 'w') as fileO:
        for line in fileI:
            if line.strip().startswith(strIn):
                amtWhiteSpaceBef = len(strIn) - len(strIn.lstrip())
                amtWhiteSpaceAft = len(strIn) - len(strIn.rstrip())
                fileO.write(strIn[:amtWhiteSpaceBef])
                fileO.write(strOut)
                if (-amtWhiteSpaceAft > 0):
                    fileO.write(strIn[-amtWhiteSpaceAft:])
            else:
                fileO.write(line)

def makeDTStr(X,y):
    skModel = DecisionTreeClassifier(random_state=0).fit(X,y)
    exportObj = exportDT(skModel)
    return json.dumps(exportObj)

def makeRFStr(X,y):
    skModel = RandomForestClassifier(random_state=0).fit(X,y)
    exportObj = exportRF(skModel)
    return json.dumps(exportObj)

def makeAndAppendModelsTemplate(X,y):
    rfStr = makeRFStr(X,y)
    strIn = "joinModelStr:"
    strOut = "joinModelStr: '" + \
             rfStr + "';"
    jsFileIn = thisPath + "skRFModels.js"
    jsFileOut = thisPath + "skRFModelsTmp.js"
    hardcodeJSONStr(strIn, strOut, jsFileIn, jsFileOut)
    os.rename(jsFileOut, jsFileIn)

def IrisTest():
    iris = load_iris()
    makeAndAppendModelsTemplate(iris.data, iris.target)

if __name__ == "__main__":
    IrisTest()

