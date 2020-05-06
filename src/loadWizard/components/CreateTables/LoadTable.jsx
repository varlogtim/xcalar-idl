import React from 'react'
import styled from 'styled-components'
import { useTable, useSortBy, usePagination } from 'react-table'
import * as LoadCell from './LoadCell'
import prettyBytes from 'pretty-bytes'
import EtaCost from '../../utils/EtaCost'

const { xcTimeHelper } = global;

const Styles = styled.div`
  table {
    width: 100%;
    border-spacing: 0;
    border: 1px solid #aaa;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid #aaa;
      border-right: 1px solid #eee;

      :last-child {
        border-right: 0;
        text-align: center;
      }
    }
  }
`;


/**
 * Component: Table
 * @param {*} param0
 */
function Table({ columns, data }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      autoResetPage: false
    },
    useSortBy,
    usePagination
  )


  return (
    <React.Fragment>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                // Add the sorting props to control sorting. For this example
                // we can add them into the header props
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  {/* Add a sort direction indicator */}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>{' '}
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>{' '}
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>{' '}
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              gotoPage(page)
            }}
            style={{ width: '100px' }}
          />
        </span>{' '}
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
      <br />
      {/* <div>Showing the first 20 results of {rows.length} rows</div> */}
    </React.Fragment>
  )
}

function getFileSize(fileIds, fileInfos) {
    return fileIds.reduce((total, fileId) => {
        const fileInfo = fileInfos.get(fileId);
        if (fileInfo != null) {
            total += fileInfo.sizeInBytes;
        }
        return total;
    }, 0);
}

function validateCreate($input, tableName) {
    let isValid = true;
    // validate name
    tableName = tableName.trim().toUpperCase();
    isValid = xcHelper.validate([
        {
            "$ele": $input,
            "error": "Table name cannot be empty",
            "check": function() {
              return tableName === "";
            }
        },
        {
            "$ele": $input,
            "error": ErrTStr.TooLong,
            "check": function() {
                return (tableName.length >=
                        XcalarApisConstantsT.XcalarApiMaxTableNameLen);
            }
        },
        {
            "$ele": $input,
            "error": ErrTStr.TableStartsWithLetter,
            "check": function() {
                return !xcStringHelper.isStartWithLetter(tableName);
            }
        },
        {
            "$ele": $input,
            "error": ErrTStr.TableConflict,
            "check": function() {
                return PTblManager.Instance.hasTable(tableName)
            }

        },
        {
            "$ele": $input,
            "error": ErrTStr.InvalidPublishedTableName,
            "check": function() {
                return !xcHelper.checkNamePattern(PatternCategory.PTbl, PatternAction.Check, tableName);
            }
        }
    ]);

  return isValid ? tableName : null;
}

function LoadTable({
    page, rowsPerPage, isLoading = false,
    schemas, // Array<{schema: {hash, columns}, files: { count, size }}>
    schemasInProgress,  // Set<schemaName>
    schemasFailed,  // Map<schemaName, errorMsg>
    tablesInInput,
    tables,
    onClickSchema = (schemaName) => {},
    onClickCreateTable = (schemaName) => {},
    onFetchData = async (page, rowsPerPage) => {},
    onTableNameChange
}) {
    const columns = React.useMemo(() => [
        {
            Header: 'Schema',
            accessor: 'schema',
        },
        {
            Header: 'Size',
            accessor: 'size',
        },
        {
            Header: 'Count',
            accessor: 'count',
        },
        {
            Header: 'Time',
            accessor: 'time',
        },
        {
          Header: 'Table Name',
          accessor: "tableName",
        },
        {
            Header: 'Create',
            accessor: 'load',
        }
    ], []);

    const loadTableData = []
    // let totalCost = 0
    // let totalEta = 0
    const etaCost = new EtaCost();
    for (const {schema, files} of schemas) {
        const schemaName = schema.hash;

        const rowData = {
            schema: <button onClick={() => { onClickSchema(schemaName); }}>{schemaName}</button>,
            count: files.count,
            size: prettyBytes(files.size || 0),
            time: xcTimeHelper.getElapsedTimeStr(Math.ceil(etaCost.loadEtaBySize(files.size) * 1000)),
            tableName: null,
            load: null
        };

        if (schemasInProgress.has(schemaName)) {
            const {table, message} = schemasInProgress.get(schemaName);
            rowData.load = <LoadCell.Loading message={message}/>
            rowData.tableName = table;
        } else if (schemasFailed.has(schemaName)) {
            rowData.load = <LoadCell.Error error={schemasFailed.get(schemaName)} />
        } else if (tables.has(schemaName)) {
            const createdRes = tables.get(schemaName);
            rowData.load = <LoadCell.Success complementTable={createdRes.complementTable}/>
            rowData.tableName = createdRes.table;
        } else {
            const tableName = tablesInInput.get(schemaName);
            rowData.tableName = <input className="xc-input tableInput" value={tableName} onChange={(e) => onTableNameChange(schemaName, e.target.value)}/>
            rowData.load = <LoadCell.Create onClick={(e) => {
              // XXX this is a hacky way to use jQuery in order to use xcHelper.validate
              const $button = $(e.target);
              const $input = $button.parent().prev().find(".tableInput");
              const validTableName = validateCreate($input, tableName);
              if (validTableName) {
                  onClickCreateTable(schemaName, validTableName);
              }
            }} />
        }

        loadTableData.push(rowData);
    }

    return (
        <Styles>
            <Table columns={columns} data={loadTableData} />
        </Styles>
    );
}

export default LoadTable