
describe("PTblManager Test", function() {
    it("checkActivateDependency should work", function() {
        let tests = [
            {
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {}}
            },
            expected: ["A"]
        }, {
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true}},
                "B": {"parents": {}}
            },
            expected: ["B", "A"]
        }, {
            // Related Dependency like a tree
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true, "C": true}},
                "B": {"parents": {"C": true}},
                "C": {"parents": {}}
            },
            expected: ["C", "B", "A"]
        }, {
            // Related Dependency like a tree,
            // reverse the dependcy order of the previous test
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true, "C": true}},
                "B": {"parents": {}},
                "C": {"parents": {"B": true}}
            },
            expected: ["B", "C", "A"]
        }, {
            // cyclic case 1
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true}},
                "B": {"parents": {"C": true}},
                "C": {"parents": {"B": true}}
            },
            expected: ["A"]
        }, {
            // cyclic case 2
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true}},
                "B": {"parents": {"A": true}},
            },
            expected: ["A"]
        }];

        tests.forEach(function(test) {
            let res = PTblManager.Instance._checkActivateDependency(test.tableName, test.imdDenendencies);
            expect(res).to.deep.equal(test.expected);
        });
    });
});