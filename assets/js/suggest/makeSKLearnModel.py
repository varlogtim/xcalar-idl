import json
import os

from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

# Iris dataset for testing only
from sklearn.datasets import load_iris

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
            if line.strip() == strIn:
                whitespaceBef = line.rstrip()[:-len(strIn)]
                whitespaceAft = line.lstrip()[len(strIn):]
                fileO.write(whitespaceBef)
                fileO.write(strOut)
                fileO.write(whitespaceAft)
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


def makeAndAppendModels(X,y):
    rfStr = makeRFStr(X,y)
    strIn = "var JoinModelStr;"
    strOut = "var JoinModelStr = String.raw`" + \
             rfStr + "`;"
    jsFileIn = "skRFPredictorNoMod.js"
    jsFileOut = "skRFPredictor.js"
    hardcodeJSONStr(strIn, strOut, jsFileIn, jsFileOut)

def IrisTest():
    iris = load_iris()
    makeAndAppendModels(iris.data, iris.target)

if __name__ == "__main__":
    IrisTest()

