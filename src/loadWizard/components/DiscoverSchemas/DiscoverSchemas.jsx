import React from "react";
import DiscoverTable from './DiscoverTable'
import SourceCSVArgSection from './SourceCSVArgSection';
import * as AdvOption from './AdvanceOption'
import InputDropdown from '../../../components/widgets/InputDropdown'
import EC from '../../utils/EtaCost'
import * as SchemaService from '../../services/SchemaService';

const Texts = {
    Loading: 'Loading ...',
    discoverTitle: 'Discover Schema',
    discoverAll: 'Discover All',
    cancelDiscoverAll: 'Stop',
    stoppingDiscoverAll: 'Stopping',
    advancedOptions: 'Configuration',
    optionSchema: 'Schema Comparison Algorithm:',
    optionErrorRetry: 'Retry Discovery On Error:',
    navButtonLeft: 'Browse',
    navButtonRight: 'Create Table',
    CreateTableHint: 'Please discover schema first',
    totalCost: 'Total Cost: $',
    totalTime: 'Total Time:',
    seconds: 'seconds',
    fileCost: 'Cost per file: $',
    fileTime: 'Time per file:'
};

const EtaCost = new EC();

/**
 * Component: Discover All button
 * @param {*} param0
 */
function DiscoverAllButton({ onClick, children }) {
    return (
        <button
            className="btn btn-secondary"
            onClick={() => { onClick(); }}
        >{Texts.discoverAll}</button>
    );
}

/**
 * Component: Cancel Discover All button
 * @param {*} param0
 */
class CancelDiscoverAllButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isStopping: false
        };
    }

    render() {
        const { onClick, children } = this.props;
        const { isStopping } = this.state;

        const btnClasses = ['btn', 'btn-secondary'];
        if (isStopping) {
            btnClasses.push('btn-disabled');
        }
        const btnText = isStopping
            ? Texts.stoppingDiscoverAll
            : Texts.cancelDiscoverAll;

        return (
            <button
                className={btnClasses.join(' ')}
                onClick={() => {
                    this.setState({
                        isStopping: true
                    });
                    onClick();
                }}
            >{btnText}...{children}</button>
        );
    }
}

/**
 * Component: Discover All section, which consists of DiscoverAll & CancelAll button
 * @param {*} param0
 */
function DiscoverAllSection({ onClickDiscoverAll, onClickCancelAll, doneCount, totalCount }) {
    if (onClickDiscoverAll != null) {
        return (<DiscoverAllButton onClick={() => { onClickDiscoverAll(); }} />);
    }
    if (onClickCancelAll != null && doneCount != null && totalCount != null) {
        const donePercentage = totalCount === 0
            ? 100
            : Math.ceil(doneCount / totalCount * 1000)/10;
        return (
            <CancelDiscoverAllButton onClick={() => { onClickCancelAll(); }}>
                {donePercentage}%
            </CancelDiscoverAllButton>
        );
    }
    return null;
}

/**
 * Component: Cost Estimation for discovering
 * @param {*} param0
 */
function CostEstimation({ files }) {
    const {
        singleFileCost,
        singleFileEta,
        totalCost,
        totalEta,
    } = EtaCost.discover_etacost(files, 1000, 32);

    return (
        <div>
            <div>
                <span>{Texts.totalCost}<b>{totalCost.toFixed(8)}</b></span>
                <span>{Texts.totalTime} <b>{totalEta.toFixed(8)}</b> {Texts.seconds}</span>
            </div>
            <div>
                <span>{Texts.fileCost}<b>{singleFileCost.toFixed(8)}</b></span>
                <span>{Texts.fileTime} <b>{singleFileEta.toFixed(8)}</b> {Texts.seconds}</span>
            </div>
        </div>
    );
}

class DiscoverSchemas extends React.Component {
    render() {
        const {
            inputSerialization,
            schemaPolicy,
            errorRetry,
            isLoading,
            progress,
            discoverFilesProps,
            onClickDiscoverAll,
            onCancelDiscoverAll,
            onInputSerialChange,
            onSchemaPolicyChange,
            onErrorRetryChange,
            onShowSchema,
        } = this.props;

        const needConfig = SchemaService.InputSerializationFactory.getFileType(inputSerialization).has(SchemaService.FileType.CSV);

        const SchemaPolicy = SchemaService.MergePolicy;
        const SchemaPolicyHint = SchemaService.MergePolicyHint;
        const isDiscoverInProgress = isLoading;

        return (
            <React.Fragment>
                {/* <CostEstimation files={discoverFiles} /> */}
                {
                needConfig ?
                <AdvOption.Container>
                    <AdvOption.Title>{Texts.advancedOptions}</AdvOption.Title>
                    <SourceCSVArgSection
                        config={inputSerialization}
                        onConfigChange={(newConfig) => {
                            onShowSchema(null);
                            onInputSerialChange(newConfig);
                        }}
                    />
                </AdvOption.Container> : null
                }
            <div className="filesSelected">
                <div className="header">{Texts.discoverTitle}</div>
                    <AdvOption.Container>
                        <AdvOption.OptionGroup>
                            <AdvOptionCheckbox classNames={['fullRow']} checked={errorRetry} onChange={onErrorRetryChange}>
                                {Texts.optionErrorRetry}
                            </AdvOptionCheckbox>
                            <AdvOption.Option classNames={['fullRow']}>
                                <AdvOption.OptionLabel>{Texts.optionSchema}</AdvOption.OptionLabel>
                                <AdvOption.OptionValue>
                                    <InputDropdown
                                    val={schemaPolicy}
                                    onInputChange={(policy) => {
                                        onSchemaPolicyChange(policy);
                                    }}
                                    onSelect={(policy) => {
                                        onSchemaPolicyChange(policy);
                                    }}
                                    list={
                                        [
                                            // {
                                            //     policy: SchemaPolicy.SUPERSET,
                                            //     hint: SchemaPolicyHint.SUPERSET
                                            // },
                                            {
                                                policy: SchemaPolicy.EXACT,
                                                hint: SchemaPolicyHint.EXACT
                                            },
                                            // union is not available for now
                                            // {
                                            //     policy: SchemaPolicy.UNION,
                                            //     hint: SchemaPolicyHint.UNION
                                            // },
                                            // {
                                            //     policy: SchemaPolicy.TRAILING,
                                            //     hint: SchemaPolicyHint.TRAILING
                                            // }
                                        ]
                                        .map((schema) => {
                                            return {
                                                text: (
                                                    <span>
                                                        <span>{schema.policy}</span>
                                                        <i className="qMark icon xi-unknown" data-toggle="tooltip" data-container="body" data-title={schema.hint} data-placement="top"></i>
                                                    </span>
                                                ),
                                                value: schema.policy
                                            };
                                        })
                                    }
                                    readOnly
                                    disabled={isDiscoverInProgress}/>
                                </AdvOption.OptionValue>
                            </AdvOption.Option>
                        </AdvOption.OptionGroup>
                        <AdvOption.OptionGroup>
                            <AdvOption.Option classNames={['option-discover-all']}>
                                <AdvOption.OptionValue>
                                    <DiscoverAllSection
                                        onClickDiscoverAll={onClickDiscoverAll}
                                        onClickCancelAll={onCancelDiscoverAll}
                                        doneCount={progress}
                                        totalCount={100}
                                    />
                                </AdvOption.OptionValue>
                            </AdvOption.Option>
                        </AdvOption.OptionGroup>
                    </AdvOption.Container>
                <DiscoverTable {...discoverFilesProps}
                    onClickSchema={({name, columns, errorColumns, errorStack}) => {
                        onShowSchema({hash: name,columns: columns,errorColumns: errorColumns,errorStack: errorStack})
                    }}
                />

            </div>
            </React.Fragment>
        );
    }
}

function AdvOptionCheckbox(props) {
    const { checked, onChange, children, classNames } = props;

    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
    return (
        <AdvOption.Option classNames={classNames}>
            <AdvOption.OptionLabel onClick={() => {onChange(!checked)}}>{children}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <div className="csvArgs-chkbox">
                    <i className={iconClasses.join(' ')}  onClick={() => { onChange(!checked); }} />
                </div>
            </AdvOption.OptionValue>
        </AdvOption.Option>
    );
}
export default DiscoverSchemas;