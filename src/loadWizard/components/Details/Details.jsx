import React from 'react';
import { Rnd } from "react-rnd";
import getForensics from '../../services/Forensics';
import * as Path from 'path';
import SchemaChart from '../DiscoverSchemas/SchemaChart2'
import Collapsible from '../../../components/widgets/Collapsible'

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
    render() {
        let rightPartClasses = "rightPart";
        if (this.props.currentSchema != null || this.props.showForensics) {
            rightPartClasses += " active";
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
                            <Collapsible className="schemaPreview">
                                <Collapsible.Header>{this.props.currentSchema.name} - columns</Collapsible.Header>
                                <Collapsible.List>
                                    <Collapsible.Item>
                                        <pre className="schemaJson">{JSON.stringify(this.props.currentSchema.columns, null, ' ')}</pre>
                                    </Collapsible.Item>
                                </Collapsible.List>
                            </Collapsible>
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