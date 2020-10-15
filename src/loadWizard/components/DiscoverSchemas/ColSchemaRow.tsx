import * as React from "react";
import InputDropdown from '../../../components/widgets/InputDropdown'

type ColSchemaRowProps = {
    rowInfo: any,
    defaultSchema: any,
    onInputChange: Function,
    onRemoveRow: any,
    isMappingEditable?: boolean,
    isDuplicated?: boolean
}

function ColSchemaRow(props: ColSchemaRowProps) {
    return (
        <div className="row">
            <div className="mapping">
                {props.isDuplicated && <DupeColumnIcon />}
                {props.isMappingEditable ?
                    <input className="xc-input" value={props.rowInfo.mapping} spellCheck={false} onChange={(e) => {
                        props.onInputChange(e.target.value, "mapping");
                    }} />
                    :
                    <InputDropdown
                        val={props.rowInfo.mapping}
                        onSelect={(value) => {
                            props.onInputChange(value, "mapping");
                        }}
                        list={
                            props.defaultSchema.map((schemaRow, i) => {
                                return {text: schemaRow.mapping, value: schemaRow.mapping};
                            })
                        }
                        readOnly
                    />
                }
            </div>
            <InputDropdown
                val={props.rowInfo.type.slice(2)}
                onSelect={(value) => {
                    props.onInputChange("Df" + value, "type");
                }}
                list={
                    ["Int64", "String", "Float64", "Boolean"].map((type, i) => {
                        return {text: type, value: type};
                    })
                }
                readOnly
            />
            <InputDropdown
                val={props.rowInfo.name}
                onSelect={(value) => {
                    props.onInputChange(value, "name");
                }}
                onInputChange={(value) => {
                    props.onInputChange(value, "name");
                }}
                list={
                    props.defaultSchema.map((schemaRow, i) => {
                        return {text: schemaRow.name, value: schemaRow.name};
                    })
                }
                hintDropdown={true}
            />
            <i className="remove icon xi-load-delete xc-action-icon" onClick={props.onRemoveRow}></i>
        </div>
    );
}

function DupeColumnIcon() {
    return (<i
        className="icon xi-info-circle-outline inputIcon"
        data-toggle="tooltip"
        data-container="body"
        data-title="Multiple data types detected"
        data-placement="auto top"
    ></i>);
}

export default ColSchemaRow;