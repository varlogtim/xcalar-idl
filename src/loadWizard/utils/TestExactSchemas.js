const ExactSchemas = require('./ExactSchemas.js')
var assert = require('assert');

trie = new ExactSchemas()
schemas = []

var schema1 = {path : '/foo/bar/b.csv', success : true, status : 'success', schema : {numColumns : 4, columnsList : [{name : 'A', mapping : '$.A', type : 'INTEGER'}, {name : 'B', mapping : '$.B', type : 'INTEGER'}, {name : 'C', mapping : '$.C', type : 'VARCHAR(64)'}, {name : 'D', mapping : '$.D', type : 'INTEGER'}]}}
var schema2 = {path : '/foo/bar/b.csv', success : true, status : 'success', schema : {numColumns : 3, columnsList : [{name : 'A', mapping : '$.A', type : 'INTEGER'}, {name : 'B', mapping : '$.B', type : 'INTEGER'}, {name : 'M', mapping : '$.M', type : 'VARCHAR(64)'}]}}
var schema3 = {path : '/foo/bar/c.csv', success : true, status : 'success', schema : {numColumns : 3, columnsList : [{name : 'E', mapping : '$.E', type : 'INTEGER'}, {name : 'F', mapping : '$.F', type : 'INTEGER'}, {name : 'G', mapping : '$.G', type : 'VARCHAR(64)'}]}}
var schema4 = {path : '/foo/bar/d.csv', success : true, status : 'success', schema : {numColumns : 4, columnsList : [{name : 'E', mapping : '$.E', type : 'INTEGER'}, {name : 'F', mapping : '$.F', type : 'INTEGER'}, {name : 'G', mapping : '$.G', type : 'VARCHAR(64)'}, {name : 'K', mapping : '$.K', type : 'INTEGER'}]}}
var schema5 = {path : '/foo/bar/e.csv', success : true, status : 'success', schema : {numColumns : 2, columnsList : [{name : 'L', mapping : '$.L', type : 'INTEGER'}, {name : 'M', mapping : '$.M', type : 'INTEGER'}]}}
var schema6 = {path : '/foo/bar/f.csv', success : true, status : 'success', schema : {numColumns : 3, columnsList : [{name : 'A', mapping : '$.A', type : 'INTEGER'}, {name : 'B', mapping : '$.B', type : 'INTEGER'}, {name : 'M', mapping : '$.M', type : 'VARCHAR(64)'}]}}
var schema7 = {path : '/foo/bar/g.csv', success : true, status : 'success', schema : {numColumns : 4, columnsList : [{name : 'A', mapping : '$.A', type : 'INTEGER'}, {name : 'B', mapping : '$.B', type : 'INTEGER'}, {name : 'C', mapping : '$.C', type : 'VARCHAR(64)'}, {name : 'D', mapping : '$.D', type : 'INTEGER'}]}}

schemas = [schema1, schema2, schema3, schema4, schema5, schema6, schema7]

observedResult = trie.getSchemas(schemas)

//console.info("observedResult = " + JSON.stringify(observedResult, null, 2));

expectedResult = { "S1": { "path": [ "/foo/bar/b.csv", "/foo/bar/g.csv" ], "schema": { "numColumns": 4, "columnsList": [ { "name": "A", "mapping": "$.A", "type": "INTEGER" }, { "name": "B", "mapping": "$.B", "type": "INTEGER" }, { "name": "C", "mapping": "$.C", "type": "VARCHAR(64)" }, { "name": "D", "mapping": "$.D", "type": "INTEGER" } ] } }, "S2": { "path": [ "/foo/bar/b.csv", "/foo/bar/f.csv" ], "schema": { "numColumns": 3, "columnsList": [ { "name": "A", "mapping": "$.A", "type": "INTEGER" }, { "name": "B", "mapping": "$.B", "type": "INTEGER" }, { "name": "M", "mapping": "$.M", "type": "VARCHAR(64)" } ] } }, "S3": { "path": [ "/foo/bar/c.csv" ], "schema": { "numColumns": 3, "columnsList": [ { "name": "E", "mapping": "$.E", "type": "INTEGER" }, { "name": "F", "mapping": "$.F", "type": "INTEGER" }, { "name": "G", "mapping": "$.G", "type": "VARCHAR(64)" } ] } }, "S4": { "path": [ "/foo/bar/d.csv" ], "schema": { "numColumns": 4, "columnsList": [ { "name": "E", "mapping": "$.E", "type": "INTEGER" }, { "name": "F", "mapping": "$.F", "type": "INTEGER" }, { "name": "G", "mapping": "$.G", "type": "VARCHAR(64)" }, { "name": "K", "mapping": "$.K", "type": "INTEGER" } ] } }, "S5": { "path": [ "/foo/bar/e.csv" ], "schema": { "numColumns": 2, "columnsList": [ { "name": "L", "mapping": "$.L", "type": "INTEGER" }, { "name": "M", "mapping": "$.M", "type": "INTEGER" } ] } } }


assert(JSON.stringify(observedResult) === JSON.stringify(expectedResult))
