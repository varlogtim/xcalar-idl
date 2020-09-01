import * as React from "react";
import ColSchemaRow from "./ColSchemaRow";

type ColSchemaSectionProps = {
    defaultSchema: {"name": string, "mapping":string, "type": string}[],
    editedSchema: {"name": string, "mapping":string, "type": string}[],
    updateSchema: Function,
    canAdd?: boolean
}
class ColSchemaSection extends React.Component<ColSchemaSectionProps, {}> {

    render() {
        let addColClass = "addCol xc-action";
        let addColTip = ""
        if (!this.props.canAdd) {
            addColClass += " xc-unavailable";
            addColTip = "Columns cannot be added to CSV schemas.";
        }
        return (
            <div className="colSchemaSection">
                <div className="schemaOptions">
                    <div className="xc-action" onClick={() => {
                        this.props.updateSchema([]);
                    }}>
                        Clear All
                    </div>
                    <div className="xc-action" onClick={() => {
                        this.props.updateSchema(this.props.defaultSchema);
                    }}>
                        Reset
                    </div>
                </div>
                <div className="row schemaHeader">
                    <div>Source Field</div>
                    <div>New Column Name</div>
                    <div>Data Type</div>
                    <i></i>
                </div>
                {this.props.editedSchema.map((row, i) => {
                    return (
                        <ColSchemaRow key={i}
                            rowInfo={row}
                            defaultSchema={this.props.defaultSchema}
                            onInputChange={(newVal, category) => {
                                let schema = this.props.editedSchema;
                                schema[i][category] = newVal;
                                this.props.updateSchema(schema);
                            }}
                            onRemoveRow={() => {
                                let schema = this.props.editedSchema;
                                schema.splice(i, 1);
                                this.props.updateSchema(schema);
                            }}
                        />);
                })}
                <div className={addColClass} data-toggle="tooltip" data-container="body"
                                 data-placement="auto top" data-title={addColTip}
                                 onClick={() => {
                    if (!this.props.canAdd) return;
                    let schema = this.props.editedSchema;
                    schema.push({"name": "", "mapping": "", "type": ""});
                    this.props.updateSchema(schema);
                }}>
                    <i className="icon xi-plus"></i>Add Field
                </div>
            </div>
        );
    }
}


export default ColSchemaSection