import os
import sys


def trainUDF(fileContents, filePath):

    sys.path.append("/home/jyang/tensorflow/tfInterface/")

    import trainTLTG
    
    LOGDIR = "/tmp/tensorflow/logs/imgRec/houseOrNot/trainLogs"
    #DATAPATH = "/datasets/imgRec/catsdogscars-renamed-preproc/test/splitSpec/split0"

    trainArgs = {}

    trainArgs.update({"logDir" : LOGDIR,
                      "dataFormat" : "ImgRecSameDim",
                      "resultFormat" : "csv",
                      "maxSteps" : 1000,
                      "learnRate" : 0.1,
                      "batchSize" : 124, # NO JERENE
                      "learnSize" : 24,  # BAD
                      "resizeSize" : None})
                      
    return(trainTLTG.trainFromUDFLoad(None,
                                      os.path.split(filePath)[0],
                                      trainArgs))


def testUDF(fileContents, filePath):

    sys.path.append("/home/jyang/tensorflow/tfInterface/")

    import testTLTG

    CHECKPOINTPATH = "/tmp/tensorflow/logs/imgRec/houseOrNot/trainLogs"
    LOGDIR = "/tmp/tensorflow/logs/imgRec/houseOrNot/testLogs"
    #DATAPATH = "/datasets/imgRec/catsdogscars-renamed-preproc/test/splitSpec/split0"
    

    testArgs = {}
    
    testArgs.update({"logDir" : LOGDIR,
                     "dataFormat" : "ImgRecSameDim",
                     "resultFormat" : "both",
                     "distribSplit" : True,
                     "learnRate" : 0.1,
                     "batchSize" : 10,
                     "learnSize" : 24,
                     "resizeSize" : None,
                     "checkpointPath": CHECKPOINTPATH})


    return(testTLTG.testFromUDFLoad(None,
                          filePath,
                          testArgs))
