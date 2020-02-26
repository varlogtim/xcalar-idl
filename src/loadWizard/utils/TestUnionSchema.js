const UnionSchema = require('./UnionSchema.js')
var assert = require('assert');

schemas = []

var schema1 = {path : "/foo/bar/a.csv", success : true, status : "success", schema : {numColumns : 3, columns : [{name : "A", mapping : "$.A", type : "INTEGER"}, {name : "B", mapping : "$.B", type : "INTEGER"}, {name : "C", mapping : "$.C", type : "VARCHAR(64)"}]}}
var schema2 = {path : '/foo/bar/b.csv', success : true, status : 'success', schema : {numColumns : 4, columns : [{name : 'A', mapping : '$.A', type : 'INTEGER'}, {name : 'B', mapping : '$.B', type : 'INTEGER'}, {name : 'C', mapping : '$.C', type : 'VARCHAR(64)'}, {name : 'D', mapping : '$.D', type : 'INTEGER'}]}}
var schema3 = {path : '/foo/bar/c.csv', success : true, status : 'success', schema : {numColumns : 3, columns : [{name : 'A', mapping : '$.A', type : 'INTEGER'}, {name : 'B', mapping : '$.B', type : 'INTEGER'}, {name : 'M', mapping : '$.M', type : 'VARCHAR(64)'}]}}
var schema4 = {path : '/foo/bar/d.csv', success : true, status : 'success', schema : {numColumns : 3, columns : [{name : 'E', mapping : '$.E', type : 'INTEGER'}, {name : 'F', mapping : '$.F', type : 'INTEGER'}, {name : 'G', mapping : '$.G', type : 'VARCHAR(64)'}]}}
var schema5 = {path : '/foo/bar/e.csv', success : true, status : 'success', schema : {numColumns : 4, columns : [{name : 'E', mapping : '$.E', type : 'INTEGER'}, {name : 'F', mapping : '$.F', type : 'INTEGER'}, {name : 'G', mapping : '$.G', type : 'VARCHAR(64)'}, {name : 'K', mapping : '$.K', type : 'INTEGER'}]}}
var schema6 = {path : '/foo/bar/f.csv', success : true, status : 'success', schema : {numColumns : 2, columns : [{name : 'L', mapping : '$.L', type : 'INTEGER'}, {name : 'M', mapping : '$.M', type : 'INTEGER'}]}}

schemas = [schema1, schema2, schema3, schema4, schema5, schema6]

uschema = new UnionSchema()
observedResult = uschema.getSchema(schemas)

expectedResult = { "S1": { "path": [ "/foo/bar/a.csv", "/foo/bar/b.csv", "/foo/bar/c.csv", "/foo/bar/d.csv", "/foo/bar/e.csv", "/foo/bar/f.csv" ], "success": true, "status": "success", "schema": { "numColumns": 11, "columns": [ { "name": "A", "mapping": "$.A", "type": "INTEGER" }, { "name": "B", "mapping": "$.B", "type": "INTEGER" }, { "name": "C", "mapping": "$.C", "type": "VARCHAR" }, { "name": "D", "mapping": "$.D", "type": "INTEGER" }, { "name": "M", "mapping": "$.M", "type": "VARCHAR" }, { "name": "E", "mapping": "$.E", "type": "INTEGER" }, { "name": "F", "mapping": "$.F", "type": "INTEGER" }, { "name": "G", "mapping": "$.G", "type": "VARCHAR" }, { "name": "K", "mapping": "$.K", "type": "INTEGER" }, { "name": "L", "mapping": "$.L", "type": "INTEGER" }, { "name": "M", "mapping": "$.M", "type": "INTEGER" } ] } } }

console.log(JSON.stringify(observedResult, null, 2))

assert(JSON.stringify(observedResult) === JSON.stringify(expectedResult))
