
// Functions for testing on sklearn decision trees
// Reference implementation:
// https://github.com/scikit-learn/scikit-learn/blob/master/sklearn/tree/_tree.pyx

// TODO: -replace all maps and reduces with for loops for speed
//          See http://jsben.ch/#/BQhED
//       -initialize all arrays explicitly

// All predictors must implement:
// setup()
// predict(input)
window.skRFPredictor = (function(skRFPredictor) {

    // README: skRFPredictorNoMod.js is the a "blank slate" of skRFPredictor.js.
    // NoMod is the file that will be edited with code changes.
    // skRFPredictor.js is the file that contains the learned ML model.
    // Both are checked into git repo, but the only one that is deployed is
    // skRFPredictor.js.  NoMod is not linked in to the GUI.
    // running makeSKLearnModel.py will delete the current skRFPredictor and
    // replace it with a copy of NoMod, with a string representing the current
    // model injected into the text file.

    // Inject string instead of raw js object so syntax errors in model cause
    // failure during json parsing instead of loading this file.
    // Python adds MODELSTR
    var JoinModelStr;

    var predictors = {};

    // This structure is in line with the decision tree implementation in sklearn
    var skTreeStates = {
        TREE_LEAF: -1,
        TREE_UNDEFINED: -2,
    };

    var skNodeState = {
        Leaf: 1,
        Node: 2,
        Invalid: 0
    };

    skRFPredictor.setup = function() {
        predictors[MLSetting.SuggestJoinKey] = new RFModel(JoinModelStr);
    };

    skRFPredictor.predict = function(setting, input) {
        return predictors[setting].predict(input);
    };

    function DTModel(modelInput) {
        // Decision tree model.  This parses and tests (but does not train)
        // strings representing sklearn decision tree models.  sklearn docs:
        // http://scikit-learn.org/stable/modules/generated/sklearn.tree.DecisionTreeClassifier.html
        var self = this;
        var modelParsed;
        if (typeof modelInput === 'string' || modelInput instanceof String) {
            modelParsed = self.parseModel(modelInput);
        } else {
            modelParsed = modelInput;
        }

        self.children_left = modelParsed.children_left;
        self.children_right = modelParsed.children_right;
        self.feature = modelParsed.feature;
        self.threshold = modelParsed.threshold;
        self.value = modelParsed.value;
        self.node_count = modelParsed.node_count;
        // May also consider: impurity, n_node_samples, weighted_n_node_samples
        return self;
    }

    DTModel.prototype = {
        parseModel: function(modelJSON) {
            // If anything in this library throws an error we should catch and swap
            // to heuristic
            var modelParsed = JSON.parse(modelJSON);
            modelParsed.children_left = modelParsed.children_left.map(function(entry, idx) {
                return parseInt(entry, 10);
            });
            modelParsed.children_right = modelParsed.children_right.map(function(entry, idx) {
                return parseInt(entry, 10);
            });
            return modelParsed;
        },

        isValidTree: function() {
            // There may be gaps in nodes numbering
            function isValidNodeState(nodeState) {
                if ((nodeState == skNodeState.Leaf) ||
                    (nodeState == skNodeState.Node)) {
                    return true;
                }
                return false;
            }
            var nodeStates = [];
            for (var i = 0; i < self.node_count; i++) {
                nodeStates.push(self.getNodeState(i));
            }
            var allGood = nodeStates.every(isValidNodeState);
            // Additional checks:
            // -ensure node 0 is root
            // -traverse tree and make sure all nodes touched (solves prev)
            return allGood;
        },

        getNodeState: function(nodeIdx) {
            // Debugging only
            if (self.isLeaf(nodeIdx)) {
                return skNodeState.Leaf;
            } else if (self.children_left[nodeIdx] >= 0 &&
                      self.children_right[nodeIdx] >= 0 ) {
                // TODO: What's a good style for else if with large conditionals?
                return skNodeState.Node;
            } else {
                return skNodeState.Invalid;
            }
        },

        isLeaf: function(nodeIdx) {
            var self = this;
            if (self.children_left[nodeIdx] == skTreeStates.TREE_LEAF &&
                self.children_right[nodeIdx] == skTreeStates.TREE_LEAF &&
                self.feature[nodeIdx] == skTreeStates.TREE_UNDEFINED &&
                self.threshold[nodeIdx] == skTreeStates.TREE_UNDEFINED) {
                return true;
            } else {
                return false;
            }
        },

        apply_: function(X) {
            // Takes input data X and runs DT prediction on it.
            // Returns the index of the node the prediction ends up on
            var self = this;
            var curNode = 0;
            var curFeature;
            var curThresh;
            while (!self.isLeaf(curNode)) {
                curFeature = self.feature[curNode];
                curThresh = self.threshold[curNode];
                if (X[curFeature] <= curThresh) {
                    curNode = self.children_left[curNode];
                } else {
                    curNode = self.children_right[curNode];
                }
            }
            return curNode;
        },

        getClassByClassIdx: function(classIdx){
            return classIdx;
        },

        getScores: function(nodeIdx){
            var self = this;
            var nodeCntPerClass = self.value[nodeIdx][0];
            var nodeNormalizer = nodeCntPerClass.reduce(function(a,b) {
                return a + b;
            }, 0);
            if (nodeNormalizer === 0) {
                // I'm not sure if this will happen.  For now raise error
                // to kick prediction back to heuristic.
                throw "UnpopulatedNode";
            }
            var scores = nodeCntPerClass.map(function(value) {
                return value / nodeNormalizer;
            });
            return scores;
        },

        predict_proba: function(X) {
            var self = this;
            var destNode = self.apply_(X);
            return self.getScores(destNode);
        },

        predict: function(X) {
            var self = this;
            var scores = self.predict_proba(X);
            var bestClass = scores.reduce(function(iMax, x, i, arr) {
                if(x > arr[iMax]) {
                    return i;
                } else {
                    return iMax;
                }
            }, 0);
            return {'classIdx': bestClass, 'score': scores[bestClass]};
        }
    };

    function RFModel(modelInput) {
        // Random forest model.  This parses and tests (but does not train)
        // strings representing sklearn random forest models.  sklearn docs:
        // http://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html

        var self = this;
        var modelParsed;
        if (typeof modelInput === 'string' || modelInput instanceof String) {
            modelParsed = self.parseModel(modelInput);
        } else {
            modelParsed = modelInput;
        }
        self.estimators_ = modelParsed.estimators_.map(function(tree, idx) {
            return new DTModel(tree);
        });
        return self;
    }

    RFModel.prototype = {
        getNumTrees: function() {
            var self = this;
            return self.estimators_.length;
        },

        parseModel: function(modelJSON) {
            // If anything in this library throws an error we should catch and swap
            // to heuristic
            var modelParsed = JSON.parse(modelJSON);
            return modelParsed;
        },

        predict_proba: function(X) {
            var self = this;
            var numTrees = self.getNumTrees();
            if (numTrees === 0) {
                throw "EmptyForest";
            }
            // Allscores shape is [nTrees, nClasses]
            var allScores = self.estimators_.map(function(dtModel, idx) {
                return dtModel.predict_proba(X);
            });
            var baseArray = [];
            var numClasses = 3;
            while(numClasses--) baseArray[numClasses] = 0;
            var sumScores = allScores.reduce(function(a,b) {
                // Declaring array for speed
                var tmpArr = new Array(a.length);
                for (i = 0; i < a.length; i++) {
                    tmpArr[i] = a[i] + b[i];
                }
                return tmpArr;
            }, baseArray);
            var avgScores = [];
            for (i = 0; i < sumScores.length; i++) {
                // avgScores
                avgScores[i] = sumScores[i] / numTrees;
            }
            return avgScores;
        },

        predict: function(X) {
            var self = this;
            var scores = self.predict_proba(X);
            var bestClass = scores.reduce(function(iMax, x, i, arr) {
                if(x > arr[iMax]) {
                    return i;
                } else {
                    return iMax;
                }
            }, 0);
            return {'classIdx': bestClass, 'score': scores[bestClass]};
        },
    };

    /* Unit Test Only */
    if (window.unitTestMode) {
        skRFPredictor.__testOnly__ = {};
        skRFPredictor.__testOnly__.DTModel = DTModel;
        skRFPredictor.__testOnly__.RFModel = RFModel;
    }
    /* End Of Unit Test Only */


    return (skRFPredictor);
}({}));
