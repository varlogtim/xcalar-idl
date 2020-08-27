import * as React from "react";
import InputDropdown from '../../../components/widgets/InputDropdown'
import * as AdvOption from './AdvanceOption'
import LoadingText from '../../../components/widgets/LoadingText'
import { OptionSampleSize } from './OptionSampleSize'

class FilePreview extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const { fileSelectProps, fileContentProps } = this.props;
        const { files = [] } = fileSelectProps || {};

        if (files.length === 0) {
            return null;
        }

        return (<div className="schemaSection">
            <div className="header">
                <span>Schema Selection</span>
                <i className="qMark icon xi-unknown xc-action" style={{ position: "relative", top: "-1px", left: "4px" }} data-toggle="tooltip" data-container="body" data-title="Click here to learn more about how to verify your schema and create your table" data-placement="auto top" onClick={() => {
                    window.open("https://xcalar.com/documentation/Content/Content_QSG/qs_intro_build_datamart_2.htm");
                }}></i>
            </div>
            <AdvOption.Container>
                <AdvOption.OptionGroup>
                    <AdvOption.Option classNames={['fullRow']}>
                        <AdvOption.OptionLabel>File:</AdvOption.OptionLabel>
                        <AdvOption.OptionValue><FileDropdown {...fileSelectProps} /></AdvOption.OptionValue>
                    </AdvOption.Option>
                </AdvOption.OptionGroup>
            </AdvOption.Container>
            <div className="headerHelpText">
                <i className="icon xi-info-circle-outline"></i>Select records(max to 5) to discover your schema
            </div>
            <FileContentWrap {...fileContentProps} />
        </div>);
    }
}

function FileDropdown(props) {
    const { isLoading, files = [], fileSelected, onSelect } = props;

    if (isLoading) {
        return (<LoadingText className="clearfix" />);
    }

    return (
        <InputDropdown
            classNames={['fileDropdown']}
            val={fileSelected.fullPath}
            onSelect={ (file) => { onSelect(file); }}
            list={files.map((file) => ({
                value: file, text: file.fullPath
            }))}
            readOnly
        />
    );
}

class FileContentWrap extends React.PureComponent {

    render() {
        const {
            isLoading, error, content, isAutoDetect, linesSelected, lineOffset, sampleSize,
            onLineChange,
            onAutoDetectChange,
            onSampleSizeChange,
            onClickDiscover,
            onOffsetChange
        } = this.props;
        const pageSize = 10;

        if (isLoading) {
            return (<LoadingText className="clearfix" />);
        }

        if (error != null) {
            return (<pre className="preview-error">{error}</pre>);
        }

        const prevOffset = lineOffset - pageSize;
        const pagePrev = prevOffset >= 0
            ? () => { onOffsetChange(prevOffset); }
            : null;
        const nextOffset = lineOffset + pageSize;
        const pageNext = nextOffset < content.length
            ? () => { onOffsetChange(nextOffset); }
            : null;

        return (<div>
            {/* <AutoDetectOption checked={isAutoDetect} onChange={(checked) => { onAutoDetectChange(checked); }}></AutoDetectOption> */}
            {isAutoDetect || <FileContent
                data={content.map(({data, status}) => ({line: data, status: status}))}
                selected={linesSelected}
                onSelectChange={(indexList, isSelect) => { onLineChange(indexList, isSelect); }}
                offset={lineOffset}
                numRows={pageSize}
            >
                <Pagination onNext={pageNext} onPrev={pagePrev} />
            </FileContent>}
            { isAutoDetect &&
                <AutoDetectSection
                    sampleSize={sampleSize}
                    style={{paddingLeft: '12px'}}
                    onSampleSizeChange={onSampleSizeChange}
                    onDiscover={onClickDiscover}
                />}
        </div>);
    }
}

class AutoDetectSection extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const { sampleSize, onSampleSizeChange, onDiscover, style = {} } = this.props;

        return (<div style={style}>
            <AdvOption.Container><AdvOption.OptionGroup>
                <OptionSampleSize
                    sampleSize={sampleSize}
                    onChange={(size) => { onSampleSizeChange(size); }}
                >Sample Size:</OptionSampleSize>
            </AdvOption.OptionGroup></AdvOption.Container>
            <button className="btn btn-secondary" onClick={() => { onDiscover(); }}>Discover</button>
        </div>);
    }
}

function FileContent(props) {
    const { data = [], onSelectChange, selected = [], children, offset = 0, numRows = -1 } = props;

    if (data.length === 0) {
        return (<span>No Content</span>);
    }

    const startIndex = offset;
    const endIndex = startIndex + (numRows > 0 ? numRows : data.length) - 1;
    return (<div>
        <div className="scrollSection">
        {data.map(({line, status}, index) => {
            const { hasError =  false, errorMessage = null, unsupportedColumns = [] } = status;
            const lineCssClass = hasError ? 'fileLine-error': null;
            const hintProps = hasError ? {
                'data-toggle': "tooltip",
                'data-container': "body",
                'data-placement': "top auto",
                'data-original-title': JSON.stringify(unsupportedColumns, null, ' ')
            } : {};

            return (<FileLine key={`${index}`} lineNum={index + 1} checked={selected.indexOf(index) >= 0} onChange={(checked) => {
                onSelectChange([index], checked)
            }}>

                <span className={lineCssClass} {...hintProps}>
                    {line}
                </span>
            </FileLine>);
        }).filter((v, i) => (i >= startIndex && i <= endIndex))}
        </div>
        { children }
    </div>);
}

function Pagination(props) {
    const { onNext, onPrev } = props;
    return (<ul style={{listStyle: 'none'}}>
        <NavButton onClick={onPrev}>{'< Previous'}</NavButton>
        <NavButton onClick={onNext}>{'Next >'}</NavButton>
    </ul>);

    function NavButton({ onClick, children }) {
        const style = {
            padding: '4px',
            display: 'inline',
            cursor: 'pointer'
        };
        if (onClick == null) {
            style.opacity = '0.3';
            style.pointerEvents = 'none';
        }
        return (<li style={style} onClick={() => {onClick()}}>{children}</li>);
    }
}

function FileLine(props) {
    const { checked, onChange, children, lineNum } = props;
    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
    let rowClass = "csvArgs-chkbox";
    if (checked) {
        rowClass += " selected";
    }
    return (
        <div className={rowClass}>
            <i style={{fontSize: '14px'}} className={iconClasses.join(' ')}  onClick={() => { onChange(!checked) }} />
            <div className="lineNum">{lineNum}</div>
            <span className="preview-line">{children}</span>
        </div>
    );
}

function AutoDetectOption(props) {
    const { checked, onChange } = props;
    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];

    return (
        <div className="csvArgs-chkbox">
            <i className={iconClasses.join(' ')}  onClick={() => { onChange(!checked) }} />
            <span style={{paddingLeft: '4px'}} onClick={() => { onChange(!checked); }}>Auto Detect Schema</span>
        </div>
    );
}

export { FilePreview };