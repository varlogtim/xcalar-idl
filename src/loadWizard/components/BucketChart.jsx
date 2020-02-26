import React from 'react';
import {
    PieChart, Pie, Cell
} from 'recharts';
import prettyBytes from 'pretty-bytes'


export default function BucketChart({data}) {
    const typeList = {
        "JSON": "#00cf18",
        "CSV": "#4287f5",
        "PARQUE": "#002483",
        "DIRECTORY": "#888",
        "UNSUPPORTED": "#333",
    }
    const typeCount = {}
    const typeSize = {}
    data.forEach(file => {
        let fileType = file.type.toUpperCase()
        if (!(fileType in typeList)) {
            fileType = "UNSUPPORTED"
        } 
        if (fileType in typeCount) {
            typeCount[fileType]++;
            typeSize[fileType] += file.sizeInBytes
        } else {
            typeCount[fileType] = 1;
            typeSize[fileType] = file.sizeInBytes
        }
    })

    const chartData = []
    let totalCountOfFiles = 0
    Object.keys(typeCount).forEach(type => {
        chartData.push({
            name: type,
            value: typeCount[type]
        })
        totalCountOfFiles += typeCount[type]
    })

    const totalCountOfDirectories = typeCount['DIRECTORY'] || 0
    totalCountOfFiles -= totalCountOfDirectories

    const chartData2 = []
    Object.keys(typeSize).forEach(type => {
        if (type !== 'DIRECTORY') {
            chartData2.push({
                name: type,
                value: typeSize[type]
            })
        }
    })


    return (
        <div className="chartArea">
            <div className="chartInfo">
                <div>Total number of files: {totalCountOfFiles}</div>
                <div>Total number of directories: {totalCountOfDirectories}</div>
            </div>
            <div id="BucketChart">
                <PieChart width={400} height={250}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={chartData}
                        cx={200}
                        cy={120}
                        outerRadius={50}
                        fill="#8884d8"
                        label={({name, value}) => name + ': ' + value}
                    >
                        {
                            chartData.map((entry, index) =>
                                <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                            )
                        }
                    </Pie>
                </PieChart>

                <PieChart width={400} height={250}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={chartData2}
                        cx={200}
                        cy={120}
                        outerRadius={50}
                        fill="#8884d8"
                        label={({name, value}) => {
                            return name + ': ' + prettyBytes(typeSize[name])
                        }}
                    >
                        {
                            chartData2.map((entry, index) =>
                                <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                            )
                        }
                    </Pie>
                </PieChart>
            </div>
        </div>
    );
}