
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
    var JoinModelStr = '{"estimators_": [{"children_right": [2, -1, 8, 5, -1, 7, -1, -1, 10, -1, 12, -1, -1], "feature": [3, -2, 2, 3, -2, 1, -2, -2, 0, -2, 2, -2, -2], "value": [[[47.0, 44.0, 59.0]], [[47.0, 0.0, 0.0]], [[0.0, 44.0, 59.0]], [[0.0, 43.0, 3.0]], [[0.0, 42.0, 0.0]], [[0.0, 1.0, 3.0]], [[0.0, 0.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 56.0]], [[0.0, 0.0, 27.0]], [[0.0, 1.0, 29.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 29.0]]], "children_left": [1, -1, 3, 4, -1, 6, -1, -1, 9, -1, 11, -1, -1], "threshold": [0.75, -2.0, 4.850000381469727, 1.6500000953674316, -2.0, 3.0, -2.0, -2.0, 6.599999904632568, -2.0, 5.199999809265137, -2.0, -2.0], "node_count": 13}, {"children_right": [2, -1, 10, 5, -1, 9, 8, -1, -1, -1, 14, 13, -1, -1, -1], "feature": [3, -2, 3, 2, -2, 2, 1, -2, -2, -2, 2, 1, -2, -2, -2], "value": [[[46.0, 62.0, 42.0]], [[46.0, 0.0, 0.0]], [[0.0, 62.0, 42.0]], [[0.0, 61.0, 5.0]], [[0.0, 58.0, 0.0]], [[0.0, 3.0, 5.0]], [[0.0, 3.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 3.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 1.0, 37.0]], [[0.0, 1.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 35.0]]], "children_left": [1, -1, 3, 4, -1, 6, 7, -1, -1, -1, 11, 12, -1, -1, -1], "threshold": [0.800000011920929, -2.0, 1.75, 4.949999809265137, -2.0, 5.449999809265137, 2.450000047683716, -2.0, -2.0, -2.0, 4.850000381469727, 3.0999999046325684, -2.0, -2.0, -2.0], "node_count": 15}, {"children_right": [6, 3, -1, 5, -1, -1, 12, 9, -1, 11, -1, -1, 14, -1, 18, 17, -1, -1, -1], "feature": [0, 3, -2, 3, -2, -2, 3, 3, -2, 2, -2, -2, 2, -2, 3, 2, -2, -2, -2], "value": [[[51.0, 46.0, 53.0]], [[49.0, 12.0, 1.0]], [[49.0, 0.0, 0.0]], [[0.0, 12.0, 1.0]], [[0.0, 12.0, 0.0]], [[0.0, 0.0, 1.0]], [[2.0, 34.0, 52.0]], [[2.0, 32.0, 1.0]], [[2.0, 0.0, 0.0]], [[0.0, 32.0, 1.0]], [[0.0, 32.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 2.0, 51.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 51.0]], [[0.0, 1.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 0.0, 48.0]]], "children_left": [1, 2, -1, 4, -1, -1, 7, 8, -1, 10, -1, -1, 13, -1, 15, 16, -1, -1, -1], "threshold": [5.550000190734863, 0.800000011920929, -2.0, 1.600000023841858, -2.0, -2.0, 1.5499999523162842, 0.75, -2.0, 5.0, -2.0, -2.0, 4.650000095367432, -2.0, 1.7000000476837158, 5.449999809265137, -2.0, -2.0, -2.0], "node_count": 19}, {"children_right": [8, 7, 4, -1, 6, -1, -1, -1, 20, 19, 12, -1, 18, 15, -1, 17, -1, -1, -1, -1, 22, -1, -1], "feature": [0, 1, 1, -2, 0, -2, -2, -2, 0, 3, 3, -2, 1, 3, -2, 2, -2, -2, -2, -2, 2, -2, -2], "value": [[[44.0, 59.0, 47.0]], [[41.0, 8.0, 3.0]], [[0.0, 8.0, 3.0]], [[0.0, 5.0, 0.0]], [[0.0, 3.0, 3.0]], [[0.0, 0.0, 3.0]], [[0.0, 3.0, 0.0]], [[41.0, 0.0, 0.0]], [[3.0, 51.0, 44.0]], [[3.0, 41.0, 9.0]], [[3.0, 41.0, 1.0]], [[3.0, 0.0, 0.0]], [[0.0, 41.0, 1.0]], [[0.0, 4.0, 1.0]], [[0.0, 1.0, 0.0]], [[0.0, 3.0, 1.0]], [[0.0, 3.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 37.0, 0.0]], [[0.0, 0.0, 8.0]], [[0.0, 10.0, 35.0]], [[0.0, 10.0, 0.0]], [[0.0, 0.0, 35.0]]], "children_left": [1, 2, 3, -1, 5, -1, -1, -1, 9, 10, 11, -1, 13, 14, -1, 16, -1, -1, -1, -1, 21, -1, -1], "threshold": [5.449999809265137, 2.8000001907348633, 2.450000047683716, -2.0, 5.0, -2.0, -2.0, -2.0, 6.25, 1.7000000476837158, 0.6000000238418579, -2.0, 2.25, 1.25, -2.0, 4.75, -2.0, -2.0, -2.0, -2.0, 4.949999809265137, -2.0, -2.0], "node_count": 23}, {"children_right": [2, -1, 12, 9, 6, -1, 8, -1, -1, 11, -1, -1, -1], "feature": [3, -2, 3, 2, 2, -2, 3, -2, -2, 0, -2, -2, -2], "value": [[[50.0, 61.0, 39.0]], [[50.0, 0.0, 0.0]], [[0.0, 61.0, 39.0]], [[0.0, 61.0, 6.0]], [[0.0, 59.0, 1.0]], [[0.0, 56.0, 0.0]], [[0.0, 3.0, 1.0]], [[0.0, 0.0, 1.0]], [[0.0, 3.0, 0.0]], [[0.0, 2.0, 5.0]], [[0.0, 2.0, 0.0]], [[0.0, 0.0, 5.0]], [[0.0, 0.0, 33.0]]], "children_left": [1, -1, 3, 4, 5, -1, 7, -1, -1, 10, -1, -1, -1], "threshold": [0.699999988079071, -2.0, 1.75, 5.050000190734863, 4.949999809265137, -2.0, 1.600000023841858, -2.0, -2.0, 6.050000190734863, -2.0, -2.0, -2.0], "node_count": 13}, {"children_right": [2, -1, 16, 7, 6, -1, -1, 9, -1, 11, -1, 13, -1, 15, -1, -1, -1], "feature": [3, -2, 2, 0, 3, -2, -2, 2, -2, 1, -2, 0, -2, 3, -2, -2, -2], "value": [[[49.0, 53.0, 48.0]], [[49.0, 0.0, 0.0]], [[0.0, 53.0, 48.0]], [[0.0, 53.0, 4.0]], [[0.0, 1.0, 1.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 52.0, 3.0]], [[0.0, 49.0, 0.0]], [[0.0, 3.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 2.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 0.0, 44.0]]], "children_left": [1, -1, 3, 4, 5, -1, -1, 8, -1, 10, -1, 12, -1, 14, -1, -1, -1], "threshold": [0.800000011920929, -2.0, 4.949999809265137, 4.949999809265137, 1.350000023841858, -2.0, -2.0, 4.75, -2.0, 2.5999999046325684, -2.0, 6.050000190734863, -2.0, 1.5999999046325684, -2.0, -2.0, -2.0], "node_count": 17}, {"children_right": [2, -1, 6, 5, -1, -1, 14, 13, 12, 11, -1, -1, -1, -1, -1], "feature": [3, -2, 2, 0, -2, -2, 2, 0, 3, 3, -2, -2, -2, -2, -2], "value": [[[46.0, 43.0, 61.0]], [[46.0, 0.0, 0.0]], [[0.0, 43.0, 61.0]], [[0.0, 39.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 39.0, 0.0]], [[0.0, 4.0, 59.0]], [[0.0, 4.0, 21.0]], [[0.0, 1.0, 21.0]], [[0.0, 1.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 19.0]], [[0.0, 3.0, 0.0]], [[0.0, 0.0, 38.0]]], "children_left": [1, -1, 3, 4, -1, -1, 7, 8, 9, 10, -1, -1, -1, -1, -1], "threshold": [0.699999988079071, -2.0, 4.75, 4.949999809265137, -2.0, -2.0, 5.149999618530273, 6.599999904632568, 1.7000000476837158, 1.5499999523162842, -2.0, -2.0, -2.0, -2.0, -2.0], "node_count": 15}, {"children_right": [2, -1, 4, -1, 16, 15, 14, 9, -1, 13, 12, -1, -1, -1, -1, -1, -1], "feature": [2, -2, 2, -2, 2, 3, 0, 2, -2, 0, 3, -2, -2, -2, -2, -2, -2], "value": [[[58.0, 41.0, 51.0]], [[58.0, 0.0, 0.0]], [[0.0, 41.0, 51.0]], [[0.0, 37.0, 0.0]], [[0.0, 4.0, 51.0]], [[0.0, 4.0, 17.0]], [[0.0, 4.0, 4.0]], [[0.0, 2.0, 4.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 4.0]], [[0.0, 1.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 2.0]], [[0.0, 2.0, 0.0]], [[0.0, 0.0, 13.0]], [[0.0, 0.0, 34.0]]], "children_left": [1, -1, 3, -1, 5, 6, 7, 8, -1, 10, 11, -1, -1, -1, -1, -1, -1], "threshold": [2.5999999046325684, -2.0, 4.75, -2.0, 5.149999618530273, 1.75, 6.5, 4.949999809265137, -2.0, 6.150000095367432, 1.5499999523162842, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0], "node_count": 17}, {"children_right": [2, -1, 14, 9, 8, 7, -1, -1, -1, 11, -1, 13, -1, -1, 18, 17, -1, -1, -1], "feature": [3, -2, 0, 2, 0, 1, -2, -2, -2, 3, -2, 3, -2, -2, 3, 2, -2, -2, -2], "value": [[[42.0, 54.0, 54.0]], [[42.0, 0.0, 0.0]], [[0.0, 54.0, 54.0]], [[0.0, 39.0, 11.0]], [[0.0, 37.0, 3.0]], [[0.0, 1.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 36.0, 0.0]], [[0.0, 2.0, 8.0]], [[0.0, 0.0, 4.0]], [[0.0, 2.0, 4.0]], [[0.0, 2.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 15.0, 43.0]], [[0.0, 15.0, 4.0]], [[0.0, 15.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 0.0, 39.0]]], "children_left": [1, -1, 3, 4, 5, 6, -1, -1, -1, 10, -1, 12, -1, -1, 15, 16, -1, -1, -1], "threshold": [0.699999988079071, -2.0, 6.25, 4.800000190734863, 4.949999809265137, 2.450000047683716, -2.0, -2.0, -2.0, 1.5499999523162842, -2.0, 1.7000000476837158, -2.0, -2.0, 1.75, 5.050000190734863, -2.0, -2.0, -2.0], "node_count": 19}, {"children_right": [2, -1, 8, 5, -1, 7, -1, -1, 10, -1, 14, 13, -1, -1, -1], "feature": [2, -2, 2, 0, -2, 3, -2, -2, 0, -2, 0, 3, -2, -2, -2], "value": [[[55.0, 40.0, 55.0]], [[55.0, 0.0, 0.0]], [[0.0, 40.0, 55.0]], [[0.0, 39.0, 4.0]], [[0.0, 23.0, 0.0]], [[0.0, 16.0, 4.0]], [[0.0, 16.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 1.0, 51.0]], [[0.0, 0.0, 33.0]], [[0.0, 1.0, 18.0]], [[0.0, 1.0, 4.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 0.0, 14.0]]], "children_left": [1, -1, 3, 4, -1, 6, -1, -1, 9, -1, 11, 12, -1, -1, -1], "threshold": [2.5999999046325684, -2.0, 4.949999809265137, 5.949999809265137, -2.0, 1.649999976158142, -2.0, -2.0, 6.599999904632568, -2.0, 6.75, 2.0, -2.0, -2.0, -2.0], "node_count": 15}]}';

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
