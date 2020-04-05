import { getColumnsSignature } from './SchemaCommon'

class TrieNode {
    constructor(coldef) {
        this.coldef = coldef
    }

    equals(node) {
        return this.coldef === node.coldef
    }
}

class ArmHead {
    constructor(arm) {
        this.schema = null
        // list of TrieNode
        this.arm = arm
    }

    add(schema) {
        if (this.schema == null) {
            this.schema = schema
            this.schema.path = [schema.path]
        } else {
            if (!schema.path.includes(schema.path)) {
                this.schema.path.push(schema.path)
            }
            if (this.schema.schema.numColumns <= schema.schema.numColumns) {
                this.schema.schema.columnsList = schema.schema.columnsList
                this.schema.schema.numColumns = schema.schema.numColumns
            }
        }
    }

    equals(armhead) {
        return this.arm === armhead.arm
    }
}

// Use an Octopus Trie :-)
export class TrailingSchemas {
    constructor() {
        //list of ArmHead
        this.armheads = []
        this.errSchemas = []
    }

    add_arm(newarmheads, newarm, schema) {
         var newarmhead = new ArmHead(newarm)
         newarmhead.add(schema)
         newarmheads.push(newarmhead)
    }

    normalize(schemaDetail) {
        const newcol = getColumnsSignature(schemaDetail.schema.columnsList);
        return {path : schemaDetail.path, schema : {numColumns : schemaDetail.schema.numColumns, columnsList : newcol}}
    }

    //schemaDetail is tuple (schema, detail)
    add(inschemaDetail) {
        const schemaDetail = JSON.parse(JSON.stringify(inschemaDetail))
        if (!schemaDetail.success) {
            this.errSchemas.push(schemaDetail)
            return
        }
        const schema = this.normalize(schemaDetail)
        var newarm = []
        for (var coldef of schema.schema.columnsList) {
            newarm.push(new TrieNode(coldef))
        }
        var newarmheads = []
        if (this.armheads.length === 0) {
            this.add_arm(this.armheads, newarm, schema)
            return
        }

        var found = false
        for (var armhead of this.armheads) {
            if (armhead.arm.length === newarm.length) {
                // new schema is a duplicate of existing schema
                if (armhead.arm === newarm) {
                    break
                } else {
                    // Found new schema, add an arm
                    this.add_arm(newarmheads, newarm, schema)
                    found = true
                    break
                }
            } else {
                if (armhead.arm.length > newarm.length) {
                    // Existing schema is a trailing superset of new schema
                    if (JSON.stringify(armhead.arm.slice(0,newarm.length)) === JSON.stringify(newarm)) {
                        armhead.add(schema)
                        found = true
                        break
                    }
                } else {
                    // new schema is trailing superset of existing schema
                    if (JSON.stringify(armhead.arm) === JSON.stringify(newarm.slice(0,armhead.arm.length))) {
                        var lg = newarm.length
                        for (var node of newarm.slice(lg - armhead.arm.length, lg)) {
                            armhead.arm.push(node)
                        }
                        armhead.add(schema)
                        found = true
                    }
                }
            }
        }
        if (!found) {
            this.add_arm(newarmheads, newarm, schema)
        }
        for (armhead of newarmheads)
            this.armheads.push(armhead)
    }

    process(schema) {
        var cols = []
        for (var column of schema.schema.columnsList) {
            var defs = column.split("-")
            var col = {name: defs[0], mapping: defs[1], type: defs[2]}
            cols.push(col)
        }
        schema.schema.columnsList = cols
    }

    index(schemas) {
        var indexedSchemas = {}
        var ind = 0
        for (var schema of schemas) {
            var sind = "Schema " + ++ind
            indexedSchemas[sind] = schema
        }
        return indexedSchemas
    }

    getSchemas() {
        const schemas = [];
        for (var armhead of this.armheads)
            schemas.push(armhead.schema)
        for (var schema of schemas) {
            this.process(schema)
        }
        var indexedSchemas = this.index(schemas)
        // if (this.errSchemas.length > 0) {
        //     indexedSchemas["error"] = this.errSchemas
        // }
        return [indexedSchemas, [...this.errSchemas]];
    }
}
/*
if (typeof module !== 'undefined') {
    module.exports = TrailingSchemas
}
*/
