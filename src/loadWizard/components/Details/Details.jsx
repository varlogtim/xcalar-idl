import React from 'react';
import { Rnd } from "react-rnd";

import SchemaChart from '../DiscoverSchemas/SchemaChart2'
import Collapsible from '../../../components/widgets/Collapsible'
import CopyableText from '../../../components/widgets/CopyableText'
import {
    PieChart, Pie, Cell, Label, ResponsiveContainer
} from 'recharts';
import prettyBytes from 'pretty-bytes';
/**
 * UI texts for this component
 */
const Texts = {
};

const typeList = {
    "JSON": "#00cf18",
    "CSV": "#42b9f5",
    "PARQUET": "#697db2",
    "DIRECTORY": "#888",
    "UNSUPPORTED": "#BBB",
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
                    <Collapsible className="bucketInfo">
                        <Collapsible.Header>Bucket Info</Collapsible.Header>
                        <Collapsible.List>
                            <Collapsible.Item>
                                <div className="label">Count:</div>
                                <div className="text">{stats.file.count.toLocaleString()} files</div>
                            </Collapsible.Item>
                            <Collapsible.Item>
                                <div className="label">Max Size:</div>
                                <div className="text">{prettyBytes(parseInt(stats.file.maxSize))}</div>
                            </Collapsible.Item>
                            <Collapsible.Item>
                                <div className="label">Min Size:</div>
                                <div className="text">{prettyBytes(parseInt(stats.file.minSize))}</div>
                            </Collapsible.Item>
                            <Collapsible.Item>
                                <div className="label">Largest File:</div>
                                <CopyableText value={stats.file.largestFile} rtl></CopyableText>
                            </Collapsible.Item>
                            <Collapsible.Item>
                                <div className="label">Smallest File:</div>
                                <CopyableText value={stats.file.smallestFile} rtl></CopyableText>
                            </Collapsible.Item>
                            <Collapsible.Item>
                                <div className="label">Depth:</div>
                                <div className="text">{stats.structure.depth}</div>
                            </Collapsible.Item>
                            <Collapsible.Item>
                                <BucketChart stats={stats} />
                            </Collapsible.Item>
                        </Collapsible.List>
                    </Collapsible>
                }
            </div>
        );
    } else {
        return null;
    }
}

function BucketChart({stats}) {
    const typeCount = {};
    const typeSize = {};
    const chartData = [];
    for (const file in stats.type) {
        let fileType = file.toUpperCase();
        if (!(fileType in typeList)) {
            fileType = "UNSUPPORTED";
        }
        if (fileType in typeCount) {
            typeCount[fileType] += stats.type[file];
        } else {
            typeCount[fileType] = stats.type[file];
        }

    }

    for (const [type, count] of Object.entries(typeCount)) {
        chartData.push({
            name: type,
            value: count
        });
    }

    return (
        <div className="chartArea">
            <ResponsiveContainer width={"100%"} height={200} >
                <PieChart width={300} height={200}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius="50%"
                        fill="#8884d8"
                        label={({name, value}) => name + ': ' + value.toLocaleString()}
                    >
                        <Label position="top">Count</Label>
                        {
                            chartData.map((entry, index) =>
                                <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                            )
                        }
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export default class Details extends React.Component {
    render() {
        let rightPartClasses = "rightPart";
        if (this.props.currentSchema != null || this.props.showForensics ||
            this.props.discoverFileSchemas.size > 0) {
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
                        <Collapsible className="schemaPreview">
                            <Collapsible.Header>{this.props.currentSchema.name} - columns</Collapsible.Header>
                            <Collapsible.List>
                                <Collapsible.Item>
                                    <pre className="schemaJson">{JSON.stringify(this.props.currentSchema.columns, null, ' ')}</pre>
                                </Collapsible.Item>
                            </Collapsible.List>
                        </Collapsible>
                    }
                    {this.props.discoverFileSchemas.size > 0 &&
                        <SchemaChart
                            selectedData={this.props.selectedFileDir}
                            schemasFileMap={this.props.discoverFileSchemas}
                        />
                     }
                </div>
            </Rnd>
        )
    }
}