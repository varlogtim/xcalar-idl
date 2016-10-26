import json
import os
import time
import numpy as np
import string

import tensorflow as tf

#Uncomment this when the script is no longer inline
#import modelSpecTLTG

##############################################
# These two functions exist currently in tf.ext.js,
# but will be rewritten along with tf.ext.js
# when the data loader is fixed
# and more dynamic arguments are supported.


def tftrain(fileContents, filePath):

    FILEPATH = "/home/disenberg/Documents/tensorflow-warmups" + \
               "/copied-tutorials/mnist-cnn-101-basic/data"

    LOGDIR = '/tmp/tensorflow/logs/MNIST/trainLogs'
    return trainFromUDFLoad(None,           # Filecontents, we don't use
                            "/tmp/tensorflow/data/MNIST", # Dataset location
                            "MNIST",        # Dataset used
                            "MNISTTFLoad",  # Format of data
                            LOGDIR,         # Logging directory
                            "both",         # Output format, also 'csv'
                            300,            # Number iterations
                            0.1))           # Learning rate (algo parameter)


def tftest(fileContents, filePath):

    FILEPATH = "/home/disenberg/Documents/tensorflow-warmups" + \
               "/copied-tutorials/mnist-cnn-101-basic/data"

    LOGDIR = '/tmp/tensorflow/logs/MNIST/testLogs'


    a = testFromUDFLoad(None,           # Filecontents, we don't use
                                        # Dataset location
                        FILEPATH,
                        "MNIST",        # Dataset used
                        "MNISTTFLoad",  # Format of data
                        # Logging directory
                        LOGDIR,
                        "both",         # Output format, also 'csv'
                                        # Statefile location
                        '/tmp/tensorflow/logs/MNIST/trainLogs'))

    fout = open("/tmp/test.csv", "wb")
    fout.write(a)
    fout.close()
    return a

##################################Begin modelSpec.py############################


# import tensorflow as tf
# import string

def modelSpecInference(data, inferenceParams):
    """
    Produces model predictions
    Design choices:
        -Choose the model you are using, its parameters etc.
    """
    """
    Model:
        Logistic regression
    Parameters:
        data: Input data (not labels) in a tf tensor
              of shape (samplesAmt, featuresAmt)
        inferenceParams:
              featuresAmt: number of features
              labelsAmt:   number of possible class labels
    Returns:
        inferredLabels: inferred labels as given by the model
        varDict: reference to the variables we want to save in the state
    """
    weights = tf.Variable(tf.zeros([inferenceParams["featuresAmt"],
                                    inferenceParams["labelsAmt"]],
                                   dtype=tf.float64),
                          name="weights")
    biases = tf.Variable(tf.zeros([inferenceParams["labelsAmt"]],
                                  dtype=tf.float64),
                         name="biases")

    inferredLabels = tf.matmul(data, weights) + biases

    # TODO: come up with better way of exposing state variables
    varDict = {"wkey" : weights, "bkey" : biases}

    # Note that, because of numerical stability concerns
    # we actually return the linear version
    # Tensorflow handles the logistic function
    return inferredLabels, varDict

def modelSpecLoss(inferredLabels, labels, lossParams):
    """
    Calculates loss based on predictions
    Design choices:
        -Choose a loss function, its parameters
    """
    # TODO: Cross validation?
    """
    Loss:
        Cross entropy (softmax is done here for numerical stability)
    Parameters:
        inferredLabels:
            Inferred labels from inference function as TF op or TF Tensor
        labels: True labels
        lossParams: None
    Returns:
        loss: TF op that calculates the (scalar) amount of penalty

    """

    labels = tf.to_int64(labels)
    crossEntropy = tf.nn.sparse_softmax_cross_entropy_with_logits(
                   inferredLabels, labels, name='xentropy')
    loss = tf.reduce_mean(crossEntropy, name='xentropyMean')

    return loss

def modelSpecTraining(loss, globalStep, trainingParams):
    """
    Trains the data
    Design choices:
        -Choice of optimization algorithm
        -Level of per-iteration loss-related logging and summary info
    """
    """
    Training:
        Basic gradient descent
    Arguments:
        loss: Amount loss function incurs.  Should be TF op as scalar
        globalStep:
            Iterator, used for naming logs and checkpoints
            Automatically incremented when optimizer.minimize is run
    Returns:
        trainOp: TF op that updates model variables, increments step
    """

    # TODO: should this summary be here?
    # No: References values only derived in other function
    # Yes: -We only want to see the pre-minimizer loss.
    #      -What if we had multiple layer models
    #         -(e.g. barrier method, etc.)
    tf.scalar_summary(loss.op.name, loss)

    optimizer = tf.train.GradientDescentOptimizer(trainingParams["learnRate"])

    trainOp = optimizer.minimize(loss, global_step=globalStep)
    return trainOp


def modelSpecEvaluation(inferredLabels, labels):
    """
    Measures accuracy
    Design choices:
        -How do we want to evaluate "goodness" of model
        -This is largely moot, as the user sees "output" function instead
    """
    """
    Evaluation:
        Percentage correct
    Arguments:
        inferredLabels: result of inference function
        labels: true labels
    Returns:
        accuracyStatistic: percentage correct
    """
    correct = tf.nn.in_top_k(tf.cast(inferredLabels, dtype=tf.float32),
                             labels, 1)

    accuracyStatistic = tf.reduce_mean(tf.cast(correct, tf.float64),
                                       name="percentageCorrect")
    tf.scalar_summary(accuracyStatistic.op.name, accuracyStatistic)

    return accuracyStatistic

def modelSpecExposeTFResults(inferredLabels):
    """
    These are the results to be exposed to the user
    The idea is this is a default for the model, and
    the implementer can override it for training or testing
    Design choices:
        -What do you want the user to see?
        -This is a big question, and depends on what the user wants
            +Do they care about the fit or the parameters learned?
            +Give them accuracy statistics or the raw labels?
    """
    """
    Results: tuple in some plaintext format
    Arguments:
        inferredLabels: result of inference function
        labels: true labels
    """
    # This step is required as because inferredLabels not stored as raw labels
    _, inferredLabelsFormatted = tf.nn.top_k(
                                 tf.cast(inferredLabels, dtype=tf.float32), 1)
    return inferredLabelsFormatted

def modelSpecExposeResultsToCSV(inferredLabelsFormatted, labels):
    # Convert to pyarray from numpy for stringing
    inferredLabelsFormatted = inferredLabelsFormatted.tolist()
    labels = labels.tolist()
    inferredLabelsFlattened = [item for sublist in inferredLabelsFormatted for
                               item in sublist]

    inferredLabelsFlattened.insert(0, "Predicted Label")
    labels.insert(0, "Actual Label")
    return string.join(
        [str(i) + "," + str(j) + "\n" for i, j in
         zip(inferredLabelsFlattened, labels)])

def modelSpecExposeResultsEval(evaluated):
    return evaluated

def modelSpecExposeResults(inferredLabelsFormatted,
                  labels,
                  evaluated=None,
                  resultFormat="csv"):
    """
    Same as the previous function, these two exist
    together because there's no good way to inline
    run TF and non-TF operations at the same time
    """
    """
    Sample formats for other types of result:
    return json.JSONEncoder().encode([{"tf_finished":"1"}])
    return open(tf.train.latest_checkpoint(checkpointFile)).read()
    """
    if resultFormat == "csv":
        return modelSpecExposeResultsToCSV(inferredLabelsFormatted, labels)
    elif resultFormat == "evaluated":
        return modelSpecExposeResultsEval(evaluated)
    elif resultFormat == "both":
        return (str(modelSpecExposeResultsToCSV(inferredLabelsFormatted,
                                                labels)) + \
                    "\nAccuracy: " + str(modelSpecExposeResultsEval(evaluated)))
    else:
      # TODO: Make sure error format is consistent with codebase
      raise KeyError("Invalid result format.")



#######################################trainTLTG.py#############################

# import tensorflow as tf
# import json
# import os
# import time
# import numpy as np

# import modelSpecTLTG as modelSpec

# Uncomment once data loader is fixed
# import pythonifyTLTG as dataLoader

from tensorflow.examples.tutorials.mnist import input_data

def makeAndTrainModel(trainingData, trainingLabels, modelParams,
                      inferenceParams, trainParams):

    print("Constructing graph.")

    with tf.Graph().as_default() as graph:

        # Debugging only
        sess = tf.InteractiveSession(graph = graph)

        # TODO: This will need to be re-examined, e.g. shape will need
        # to be well defined possibly with the help of numpy arrays.
        # Also dtype, so shape=trainingData.shape, dtype = tdata.dtype etc.
        dataInitializer = tf.placeholder(dtype=tf.float64,
                                         shape=[modelParams["samplesAmt"],
                                                modelParams["featuresAmt"]],
                                         name="data")
        labelInitializer = tf.placeholder(dtype=tf.int32,
                                          shape=[modelParams["samplesAmt"]],
                                          name="labels")
        #Do we need these variables?
        #A: Probably, for -speed and -convention
        inputData = tf.Variable(dataInitializer, trainable=False,
                                collections=[])
        inputLabels = tf.Variable(labelInitializer, trainable=False,
                                  collections=[])

        # TODO: globalstep var necessary for trainOp, but step used for loop
        globalStep = tf.Variable(0, name='global_step', trainable=False)
        inferredLabels, varDict = modelSpecInference(inputData,
                                                     inferenceParams)
        loss = modelSpecLoss(inferredLabels, inputLabels, [])
        trainOp = modelSpecTraining(loss, globalStep, trainParams)
        exposeResultsOp = modelSpecExposeTFResults(inferredLabels)

        #Strictly optional, only needed for exposing accuracy statistics
        evalCorrect = modelSpecEvaluation(inferredLabels, inputLabels)

        summary = tf.merge_all_summaries()
        init = tf.initialize_all_variables()
        saver = tf.train.Saver()

        #Uncomment this and comment above interactive session if not debugging.
        #sess = tf.Session()

        summaryWriter = tf.train.SummaryWriter(modelParams["logDir"],
                                               sess.graph)
        print("Graph constructed.")
        print("Initializing variables.")
        sess.run(inputData.initializer,
                 feed_dict={dataInitializer: trainingData})
        sess.run(inputLabels.initializer,
                 feed_dict={labelInitializer: trainingLabels})
        sess.run(init)
        print("Variables initialized.")
        print("Beginning training.")
        startTime = time.time()
        for step in xrange(modelParams["maxSteps"]):
            if (step % 200 == 0 or
                (step + 1) == modelParams["maxSteps"]):
                # TODO: Fix this: accuracy always 100% first step,
                #       this is because inferred labels will all be 0,
                #       and equality guarantees every label is
                #       "most likely", e.g. our selection condition
                # TODO: No need for a checkpoint at step 0
                # TODO: Incorporate global step
                (_,
                 inferredLabelsFormatted,
                 labelsTrue,
                 evaluated,
                 summaryStr) = sess.run([trainOp, exposeResultsOp,
                                         inputLabels, evalCorrect,
                                         summary])
                checkpointFile = os.path.join(modelParams["logDir"],
                                              'checkpoint')
                saver.save(sess, checkpointFile, global_step = step)
                summaryWriter.add_summary(summaryStr, global_step=step)
                summaryWriter.flush()
                print("Step {} complete.".format(step))
                print("Summary writer flushed.")
                print("Checkpoint saved.")
                print("Time taken: {}".format(time.time() - startTime))
                print("Accuracy: {}".format(evaluated))
            elif step % 100 == 0:
                _, evaluated, summaryStr = sess.run([trainOp, evalCorrect,
                                                     summary])
                summaryWriter.add_summary(summaryStr, global_step=step)
                summaryWriter.flush()
                print("Step {} complete".format(step))
                print("Summary writer flushed.")
                print("Time taken: {}".format(time.time() - startTime))
                print("Accuracy: {}".format(evaluated))
            else:
                _, _ = sess.run([trainOp, loss])

        print("Model learned.")

        return modelSpecExposeResults(inferredLabelsFormatted, labelsTrue,
                                      evaluated, modelParams["resultFormat"])

def trainFromUDFLoad(fileContents, filePath, dataset, dataFormat, logDir,
                     resultFormat, maxSteps, learnRate):
    # This is what should be called from the UDF-on-load

    # TODO: Make all argument passing cleaner so that this file is
    #       agnostic to model specifics and result formats.

    print("Loading data and labels.")
    if dataFormat == "JSON":
        raise KeyError("Invalid input format.")
        # TODO: Uncomment once data loader is fixed.
        #trainingData, trainingLabels = dataLoader.pythonifyJSON(fileContents,
        #                                                        dataset)
    elif dataFormat == "MNISTRawTar":
        raise KeyError("Invalid input format.")
        # TODO: Uncomment once data loader is fixed
        #trainingData, trainingLabels = dataLoader.pythonifyMNIST(fileContents,
        #                                                         dataset,
        #                                                         filePath)
    elif dataFormat == "MNISTTFLoad":
        # TODO: This all needs to be reworked, vis a vis the data loader.
        mnist = input_data.read_data_sets(filePath)
        trainingData = mnist.train._images
        trainingLabels = mnist.train._labels
    else:
        raise KeyError("Invalid input format.")

    print("Data and labels successfully loaded.")

    # TODO: Generate these more intelligently.
    #       This can only be done when smart data loading is achieved.
    featuresAmt = len(trainingData[0])
    labelsAmt = max(trainingLabels) + 1 #Should be 2
    samplesAmt =  len(trainingData)

    ###Susceptible to race in sharded test case.  Problem?  No but not clean.
    if not os.path.isdir(logDir):
        os.makedirs(logDir)

    modelParams = {"featuresAmt"  : featuresAmt,
                   "samplesAmt"   : samplesAmt,
                   "logDir"       : logDir,
                   "resultFormat" : resultFormat,
                   "maxSteps"     : maxSteps}
    inferenceParams = {"featuresAmt" : featuresAmt,
                       "labelsAmt"   : labelsAmt}
    trainParams = {"learnRate" : learnRate}

    print("Parameters set, beginning model run.")
    text = makeAndTrainModel(trainingData, trainingLabels, modelParams,
                           inferenceParams, trainParams)
    return text


if __name__ == "__main__":
    try:
        LOGDIR = '/tmp/tensorflow/logs/MNIST/trainLogs'
        print(trainFromUDFLoad(None,           # Filecontents, we don't use
                               "/tmp/tensorflow/data/MNIST", # Dataset location
                               "MNIST",        # Dataset used
                               "MNISTTFLoad",  # Format of data
                               LOGDIR,         # Logging directory
                               "both",         # Output format, also 'csv'
                               300,            # Number iterations
                               0.1))           # Learning rate (algo parameter)
    except (IOError, KeyError) as inst:
        print(inst.args[0])


#######################################Begin testTLTG.py######################
# import os
# import tensorflow as tf
# import numpy as np
# import json
# import string

# import modelSpecTLTG as modelSpec

# Uncomment once data loader is fixed
#import pythonifyTLTG as pythonifyTLTG


from tensorflow.examples.tutorials.mnist import input_data

def makeAndTestModel(testingData, testingLabels, modelParams,
                     inferenceParams):

    with tf.Graph().as_default() as g:
        dataInitializer = tf.placeholder(dtype=tf.float64,
                                         shape=[modelParams["samplesAmt"],
                                                modelParams["featuresAmt"]],
                                         name="data")
        labelInitializer = tf.placeholder(dtype=tf.int32,
                                          shape=[modelParams["samplesAmt"]],
                                          name="labels")
        #Do we need these variables?
        #A: Probably, for -speed and -convention
        inputData = tf.Variable(dataInitializer, trainable=False,
                                collections=[])
        inputLabels = tf.Variable(labelInitializer, trainable=False,
                                  collections=[])


        inferredLabels, varDict = modelSpecInference(inputData,
                                                     inferenceParams)
        exposeResultsOp = modelSpecExposeTFResults(inferredLabels)
        evalCorrect = modelSpecEvaluation(inferredLabels, inputLabels)

        # TODO: This is absolutely not generalizable
        # to arbitrary inference functions.
        # Come up with a better way of restoring the variables.
        saver = tf.train.Saver({"weights" : varDict["wkey"],
                                "biases"  : varDict["bkey"]})

        summaryOp = tf.merge_all_summaries()

        summaryWriter = tf.train.SummaryWriter(modelParams["logDir"], g)

        with tf.Session() as sess:

            sess.run(inputData.initializer,
                     feed_dict={dataInitializer: testingData})
            sess.run(inputLabels.initializer,
                     feed_dict={labelInitializer: testingLabels})

            ckpt = tf.train.get_checkpoint_state(modelParams["checkpointPath"])
            if not (ckpt and ckpt.model_checkpoint_path):
                raise IOError("Checkpoint not found " + \
                              "or invalid checkpoint path.")
            else:
                saver.restore(sess, ckpt.model_checkpoint_path)
                (evaluated,
                 summary,
                 inferredLabelsFormatted,
                 labelsTrue) = sess.run([evalCorrect, summaryOp,
                                         exposeResultsOp,
                                         inputLabels])
                summaryWriter.add_summary(summary)
                summaryWriter.flush()

                return modelSpecExposeResults(inferredLabelsFormatted,
                                              labelsTrue, evaluated,
                                              modelParams["resultFormat"])

def testFromUDFLoad(fileContents, filePath, dataset, dataFormat, logDir,
                    resultFormat, checkpointPath):
    # This is what should be called from the UDF-on-load

    # TODO: Make all argument passing cleaner so that this file is
    #       agnostic to model specifics and result formats.

    if dataFormat == "JSON":
        raise KeyError("Invalid input format.")
        # TODO: Uncomment once data loader is fixed
        # data, labels = pythonifyTLTG.pythonifyJSON(fileContents,
        # dataset)
    elif dataFormat == "MNISTRawTar":
        raise KeyError("Invalid input format.")
        # TODO: Uncomment once data loader is fixed
        # data, labels = pythonifyTLTG.pythonifyMNIST(fileContents,
        # dataset,
        # filePath)
    elif dataFormat == "MNISTTFLoad":
        mnist = input_data.read_data_sets(filePath)
        data = mnist.test._images
        labels = mnist.test._labels
    else:
        raise KeyError("Invalid input format.")

    # TODO: Generate these more intelligently.
    #       This can only be done when smart data loading is achieved.
    featuresAmt = len(data[0])
    labelsAmt = max(labels) + 1 #Should be 2 for Yelp and 10 for MNIST
    samplesAmt =  len(data)

    # TODO: Make logdir split directory by shard/file
    LOGDIR = os.path.join("/tmp/tensorflow/logs/yelpUserTest", "")

    if not os.path.isdir(LOGDIR):
        os.makedirs(LOGDIR)

    modelParams = {"featuresAmt"    : featuresAmt,
                   "samplesAmt"     : samplesAmt,
                   "logDir"         : logDir,
                   "resultFormat"   : resultFormat,
                   "checkpointPath" : checkpointPath}
    inferenceParams = {"featuresAmt" : featuresAmt,
                       "labelsAmt"   : labelsAmt}

    return makeAndTestModel(data, labels, modelParams, inferenceParams)

if __name__ == "__main__":
# Sample test function
    try:
        CHECKPOINTPATH = "/tmp/tensorflow/logs/MNIST/trainLogs"
        LOGDIR = "/tmp/tensorflow/logs/MNIST/testLogs"
        print(testFromUDFLoad(None,           # Filecontents, we don't use
                              "/tmp/tensorflow/data/MNIST", # Dataset location
                              "MNIST",        # Dataset used
                              "MNISTTFLoad",  # Format of data
                              LOGDIR,         # Logging directory
                              "both",         # Output format, also 'csv'
                              CHECKPOINTPATH))
    except (IOError, KeyError) as inst:
        print(inst.args[0])

