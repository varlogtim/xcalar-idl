def tftest(fileContents, filePath):
  import sys
  sys.path.insert(0, '/home/disenberg/Documents/tensorflow-xcalar/train-local-test-global/second-pass')

  import testTLTG

  #filePath = filePath[:-1]
  filePath = "/home/disenberg/Documents/tensorflow-warmups/copied-tutorials/mnist-cnn-101-basic/data"

  checkpointPath = '/tmp/tensorflow/logs/MNIST/trainLogs'
  a = testTLTG.evaluateFromUDFLoad(None, filePath, "MNIST", "MNISTTFLoad", checkpointPath)

  fout = open("/tmp/test.csv", "wb")
  fout.write(a)
  fout.close()
  return a





def tftrain(fileContents, filePath):
  import sys
  sys.path.insert(0, '/home/disenberg/Documents/tensorflow-xcalar/train-local-test-global/second-pass')

  import trainTLTG

  #filePath = filePath[:-1]

  filePath = "/home/disenberg/Documents/tensorflow-warmups/copied-tutorials/mnist-cnn-101-basic/data"

  LOG_DIR = '/tmp/tensorflow/logs/MNIST/trainLogs'
  return trainTLTG.trainFromUDFLoad(None, filePath, "MNIST", "MNISTTFLoad", LOG_DIR, 300, 0.1)
