import React from 'react';
import { Rnd } from "react-rnd";
import getForensics from '../../services/Forensics';
import * as Path from 'path';
import SchemaChart from '../DiscoverSchemas/SchemaChart2'


/**
 * UI texts for this component
 */
const Texts = {
};

/**
 * Pure Component: forensics information
 * @param {*} props
 */
function ForensicsContent(props) {
    const {
        isShow = false,
        message = [],
        stats
    } = props || {};
    if (isShow) {
        return (
            <div className="forensicsContent">
                <div>{ message.map((m, i) => (<div key={i}>{m}</div>)) }</div>
                {stats == null ? null :
                    <div>
                        <div>Bucket Info</div>
                        <pre>{JSON.stringify(stats, null, '  ')}</pre>
                    </div>
                }
            </div>
        );
    } else {
        return null;
    }
}


export default class Details extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            schemaExpanded: true
        };
        this.onSchemaHeaderClick = this.onSchemaHeaderClick.bind(this);
    }

    onSchemaHeaderClick() {
        this.setState({
            schemaExpanded: !this.state.schemaExpanded
        });
    }

    render() {
        let rightPartClasses = "rightPart";
        if (this.props.currentSchema != null || this.props.showForensics) {
            rightPartClasses += " active";
        }
        let schemaClasses = "schemaPreview";
        if (this.state.schemaExpanded) {
            schemaClasses += " active";
        }
        return (
            <Rnd
                className={rightPartClasses}
                default={{width: 300}}
                minWidth={100}
                maxWidth={"70%"}
                bounds="parent"
                disableDragging={true}
                resizeHandleWrapperClass="resizeHandles"
                enableResizing={{ top:false, right:false, bottom:false, left:true, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
            >
                <div className="innerRightPart">
                    <ForensicsContent isShow={ this.props.showForensics } stats={ this.props.forensicsStats } message={ this.props.forensicsMessage } />
                    {this.props.currentSchema == null ? null :
                        <React.Fragment>
                            <div className={schemaClasses}>
                                <div className="schemaHeader" onClick={this.onSchemaHeaderClick}>
                                    <span>{this.props.currentSchema.name} - columns</span>
                                    <i className="icon xi-down"></i>
                                </div>
                                <pre className="schemaJson">{JSON.stringify(this.props.currentSchema.columns, null, ' ')}</pre>
                            </div>
                            <SchemaChart
                                selectedData={this.props.selectedFileDir}
                                schemasFileMap={this.props.discoverFileSchemas}
                            />
                        </React.Fragment>
                    }
                </div>
            </Rnd>
        )
    }
}