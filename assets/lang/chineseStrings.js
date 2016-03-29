StatusMessageTStr = {
'Success': '成功！',
'Completed': '完成',
'Viewing': '观看',
'Error': '遇到错误',
'Loading': '装载',
'LoadingDataset': '加载数据集',
'LoadingTables': '加载表',
'LoadFailed': '加载数据失败',
'CreatingTable': '创建表',
'TableCreationFailed': '创建表失败',
'Join': '连接表',
'JoinFailed': '连接表失败',
'DeleteTable': '删除表',
'DeleteTableFailed': '删除表故障',
'CouldNotDelete': '无法删除',
'ExportTable': '导出表',
'ExportFailed': '导出失败',
'Aggregate': '执行汇总',
'AggregateFailed': '总失败',
'SplitColumn': '分列',
'SplitColumnFailed': '分列失败',
'ChangeType': '更改数据类型',
'ChangeTypeFailed': '变化数据类型失败',
'OnColumn': '在列',
'Sort': '排序列',
'SortFailed': '排序列失败',
'Map': '映射列',
'MapFailed': '地图失败',
'GroupBy': '通过执行组',
'GroupByFailed': '由失败的组',
'Filter': '过滤柱',
'FilterFailed': '过滤柱失败',
'Profile': '简介',
'ProfileFailed': '简介失败',
'Window': '执行窗口',
'WindowFailed': '窗口失败',
'HorizontalPartition': '表演水平分区',
'HPartitionFailed': '水平分区失败'
};
TooltipTStr = {
'ComingSoon': '快来了',
'FocusColumn': '重点列',
'ChooseUdfModule': '请首先选择一个模块',
'ChooseColToExport': '请选定列要导出',
'NoJoin': 'Knnot接合<type>',
'SuggKey': '建议重点',
'NoWSToMV': '没有工作表移动到',
'NoExport': '不能导出类​​型的列<type>',
'Undo': '撤销：<op>',
'NoUndo': '最后的操作是“<op>”，不能撤消',
'NoUndoNoOp': '没有操作可以撤销',
'Redo': '重做：<op>',
'NoRedo': '没有操作可以恢复',
'CloseQG': '点击隐藏查询图',
'OpenQG': '点击查看查询图',
'Bookmark': '点击添加书签',
'Bookmarked': '书签'
};
CommonTxtTstr = {
'XcWelcome': '有乐趣xcalar的洞察力！',
'Create': '创建',
'Continue': '继续',
'Copy': '复制',
'DefaultVal': '默认值',
'HoldToDrag': '单击并按住拖动到',
'IntFloatOnly': '只有整数/浮点',
'NumCol': '列数',
'Exit': '出口',
'ClickToOpts': '点击查看选项',
'BackToOrig': '回到原来的',
'Optional': '自选',
'LogoutWarn': '请注销，否则会丢失未保存的工作。',
'SupportBundle': '生成的支持包',
'SupportBundleInstr': '请检查你的后端.tar.gz文件',
'SupportBundleMsg': '支持上传包ID的<id> successfully generated! It is located on your Xcalar Server at <path>',
'SuppoortBundleFail': '生成失败',
'OpFail': '手术失败'
};
ErrTStr = {
'NoEmpty': '请填写此字段。',
'InvalidField': '无效的字段。',
'InvalidFilePath': '无效的文件路径',
'InvalidFileName': '无效的文件名，找不到当前目录中的文件。',
'NoHashTag': '请输入一个有效的名称不带＃符号。',
'NoSpecialChar': '请输入一个有效的名称，没有特殊字符。',
'NoSpecialCharOrSpace': '请输入一个有效的名称，没有特殊字符或空格。',
'NoSpecialCharInParam': '没有特殊字符或空格允许的参数括号中。',
'UnclosedParamBracket': '未闭合的参数支架检测。',
'NoEmptyList': '请选择下拉列表上的选项。',
'NoEmptyFn': '功能字段为空，请输入功能。',
'NoEmptyOrCheck': '请填写此字段或保持空勾选复选框。',
'NameInUse': '名字是在使用中，请别称。',
'DSNameConfilct': '数据集具有相同名称已经退出。请选择其他名称。',
'TableConflict': '表具有相同的名称已经存在，请选择其他名称。',
'ExportConflict': '此文件名取，请选择其他名称。',
'ColumnConfilct': '列具有相同名称已经存在，请选择其他名称。',
'DFGConflict': '数据流组具有相同名称已经存在，请选择其他名称。',
'ScheduleConflict': '时间表具有相同名称已经存在，请选择其他名称。',
'InvalidWSInList': '无效的工作表的名称，请选择在弹出的列表中选择一个工作表。',
'OnlyNumber': '请输入一个号码。',
'OnlyPositiveNumber': '请输入一个数大于0。',
'NoNegativeNumber': '请输入一个数目大于或等于0',
'NoAllZeros': '值不能全为零',
'NoWKBKSelect': '没有工作簿中选择。',
'NoGroupSelect': '没有组。',
'InvalidColName': '无效的列名。',
'NoBucketOnStr': '列类型为字符串，不能水桶到范围。',
'ParamInUse': '不能删除，该参数是在使用中。',
'NoPreviewJSON': 'JSON文件不阅，请指向数据的情况下直接预览。',
'NoPreviewExcel': 'Excel文件不阅，请指向数据的情况下直接预览。',
'MVFolderConflict': '不能移动，名称冲突与目标文件夹中的文件',
'TimeExpire': '请选择一个时间，就是在未来。',
'LongFileName': '文件名过长，请使用不到255个字符。',
'LargeFile': '文件太大。请分解成更小的文件（<10MB）。',
'NoSupportOp': '不支持此操作。',
'InvalidColumn': '无效的列名：<name>',
'InvalidURLToBrowse': '请加协议文件的路径。例如：NFS：///或HDFS：///或file：///（本地文件系统）',
'PreservedName': '这个名字被保留，请使用其他名称。',
'InvalidWin': '不能窗口排序的表'
};
ErrWRepTStr = {
'FolderConflict': '文件夹“<name>”已存在，请选择其他名称。',
'WKBKConflict': '工作簿“<name>”已经存在，请选择其他名称。',
'ParamConflict': '参数“<name>”已存在，请选择其他名称。',
'TableConflict': '表“<name>”已经存在，请选择其他名称。',
'NoPath': '<path>没有被发现。重定向到根目录。',
'InvalidOpsType': '无效的类型的字段，就想：<type1>, but provided: <type2>。',
'InvalidCol': '列“<name>”不存在。',
'InvalidRange': '请输入之间<num1> and <num2>的值。',
'InvalidColType': '列“<name>" has an invalid type: <type>'
};
TipsTStr = {
'Scrollbar': '滚动表在这里',
'AddWorksheet': '添加工作表',
'EditColumn': '点击此处修改列名',
'LineMarker': '单击行号添加书签',
'JSONEle': '双击查看，然后单击键名拉列',
'ToggleGridView': '网格视图和列表视图之间切换',
'DragGrid': '您可以将数据集或文件夹各地重新排序',
'DataSampleTable': '点击表头，从数据购物车添加/删除列/。单击列标题，以进一步修改列。',
'Datacart': 'datacart区，您可以添加从数据集的列到你的购物车。这些列将被用来在活动工作表中创建表。您可以在工作表屏幕添加列了。',
'PullRightsidebar': '点击打开和关闭边栏',
'TablList': '点击查看详细信息',
'PullColumn': '点击键将列添加到您的表'
};
ThriftTStr = {
'CCNBEErr': '连接错误',
'CCNBE': '连接不能建立。',
'UpdateErr': 'xcalar版本不匹配',
'Update': '需要更新。',
'SetupErr': '设置失败',
'ListFileErr': '列表文件失败'
};
AlertTStr = {
'Error': '错误',
'NoDel': '删除Knnot',
'ContinueConfirm': '你确定要继续吗？'
};
FnBarTStr = {
'NewCol': '请首先指定新列的列名'
};
ScrollTStr = {
'Title': '滚动一行',
'BookMark': '行<row>'
};
AggTStr = {
'QuickAggTitle': '快速聚集',
'QuickAggInstr': '在活动表上观看所有列的常见的聚合函数。',
'CorrTitle': '相关系数',
'CorrInstr': '查看相关系数为每对数值列',
'NoSupport': '不支持',
'DivByZeroExplain': '唯一不同的值',
'AggTitle': '合计：<op>',
'AggInstr': '这列“<col>". \r\n The aggregate operation is "<op>”。',
'AggMsg': '{“价值”：<val>}'
};
IndexTStr = {
'Sorted': '表已经排序',
'SortedErr': '当前的表已经排序在<order>为了此列'
};
JoinTStr = {
'NoJoin': '加入Knnot',
'NoJoinMsg': '选择2列由加盟',
'NoKeyLeft': '左表没有选择的键',
'NoKeyRight': '右表没有选择的键',
'NoMatchLeft': '抱歉，无法找到一个很好的钥匙匹配左表',
'NoMatchRight': '抱歉，无法找到一个很好的钥匙匹配右表',
'ToSingleJoin': '切换到单加盟',
'ToMultiJoin': '切换到多条加入'
};
ExportTStr = {
'Success': '出口成功',
'SuccessMsg': '文件名：<file>.csv\n File Location: <location>',
'SuccessInstr': '表\“<table>\" was succesfully exported to <location> under the name: <file>的.csv'
};
MultiCastTStr = {
'NoRec': '没有智能投推荐',
'SelectCol': '请选择您要投列。'
};
ProfileTStr = {
'ProfileOf': '简介',
'Instr': '悬停栏上看到的细节。使用滚动条和输入框查看更多的数据。',
'LoadInstr': '请等待数据准备，可以关闭模​​式，并在以后查看。'
};
WKBKTStr = {
'Location': '工作簿的浏览器',
'NewWKBK': '新的工作簿',
'NewWKBKInstr': '你好<b><user></b>中，你有没有工作簿是，你可以创建新的工作簿，继续工作簿或复制工作簿',
'CurWKBKInstr': '你好<b><user></b>, current workbook is <b><workbook></b>',
'NoOldWKBK': '无法检索旧工作簿',
'NoOldWKBKInstr': '如果你仍然可以看到重新登录后错误，请复制日志并重新启动服务器。',
'NoOldWKBKMsg': '请用新的工作簿或注销，然后再试一次！',
'Expire': '请退出',
'ExpireMsg': '你登录了别的地方！',
'Hold': '签署了关于在别处',
'HoldMsg': '请关闭其他会话。',
'Release': '力释放',
'WKBKnotExists': '不存在工作簿'
};
SchedTStr = {
'SelectSched': '选择一个时间表',
'NoScheds': '没有可用的时间表',
'AddSchedFail': '添加日程失败'
};
DFGTStr = {
'DFExists': '数据流已存在',
'AddParamHint': '请首先创建数据流组面板参数。',
'DFCreateFail': '数据流创建失败',
'ParamModalFail': '参数模式失败',
'UpdateParamFail': '更新PARAMS失败'
};
DSTStr = {
'DS': '数据集',
'Export': '导出表单',
'LoadingDS': '数据加载是',
'DelDS': '删除数据',
'DelDSFail': '删除数据集失败',
'NewFolder': '新建文件夹',
'NoNewFolder': '创建文件夹Knnot',
'NoNewFolderMsg': '这个文件夹是不可编辑的，不能在这里创建新的文件夹',
'DelFolder': '删除文件夹',
'DelFolderInstr': '请先删除该文件夹中的所有数据集。',
'DelFolderMsg': '无法删除非空文件夹。请确保所有数据集从文件夹中删除之前被删除\ r \ n。',
'NoParse': '无法分析数据集。',
'DelDSConfirm': '你确定要删除数据集<ds>？',
'DelUneditable': '这个<ds>不可修改，无法删除',
'ToGridView': '切换到网格视图',
'ToListView': '切换到列表视图'
};
DSFormTStr = {
'LoadConfirm': '负载数据的确认',
'NoHeader': '你没有检查头选项，以促进第一行头。'
};
DataCartStr = {
'NoCartTitle': '没有选择的表',
'HaveCartTitle': '选择的表',
'NoColumns': '选择没有列',
'HelpText': '要添加到数据的车一列，在左边选择一个数据集，并点击你感兴趣的中心面板内的列名。'
};
DSPreviewTStr = {
'Save': '保存并退出',
'Promote': '促进第一行头',
'UnPromote': '撤消促进头部',
'ApplyHighlights': '申请在突出显示的字符作为分隔符',
'RMHighlights': '除去亮点',
'CommaAsDelim': '适用逗号作为分隔符',
'TabAsDelim': '适用于选项卡，分隔符',
'PipeAsDelim': '适用管材作为分隔符',
'RMDelim': '删除分隔符',
'HighlightDelimHint': '突出一个字符作为分隔符',
'Or': '要么',
'HighlightAnyDelimHint': '突出另一个字符作为分隔符',
'LoadJSON': '负荷JSON数据',
'LoadExcel': '负载为Excel数据',
'LoadExcelWithHeader': '加载为Excel数据集，促进头部',
'LoadUDF': '使用执行两种分析数据集',
'NoDelim': '你没有选择分隔符。',
'NoHeader': '你没有选择标题行。',
'NoDelimAndHeader': '你没有选择分隔符和标题行。'
};
DSExportTStr = {
'ExportFail': '无法添加出口目标',
'InvalidType': '无效目标类型',
'InvalidTypeMsg': '请选择一个有效的目标类型',
'RestoreFail': '出口目标恢复失败'
};
WSTStr = {
'SearchTableAndColumn': '搜索表或列',
'WSName': '工作表名称',
'WSHidden': '工作表隐藏',
'InvalidWSName': '无效的工作表名称',
'InvalidWSNameErr': '请输入一个有效的名字！',
'AddOrphanFail': '添加孤表失败',
'AddWSFail': '创建Knnot工作表',
'AddWSFailMsg': '有在面板太多工作表',
'DelWS': '删除工作表',
'DelWSMsg': '有此工作表活动表。你想怎么处理？'
};
TblTStr = {
'Create': '创建表',
'Del': '删除表',
'DelMsg': '你确定要删除表<table>？',
'DelFail': '删除表失败',
'Archive': '存档表',
'Active': '送表到工作表',
'ActiveFail': '添加失败不活动表'
};
ColTStr = {
'SplitColWarn': '许多列将产生',
'SplitColWarnMsg': '关于<num>列将产生，还要不要继续操作？',
'RenamSpecialChar': '无效的名称，不能包含\'（）\“或开始或结束空间'
};
MenuTStr = {
'Archive': '存档表',
'HideTbl': '隐藏目录',
'UnHideTbl': '取消隐藏表',
'DelTbl': '删除表',
'ExportTbl': '导出表',
'Visual': '可视化画面',
'CPColNames': '复制列名',
'DelAllDups': '删除所有重复',
'QuickAgg': '快速聚集',
'QuckAggaggFunc': '聚合函数',
'QuickAggcorrFunc': '相关系数',
'SmartCast': '智能型铸造',
'MVWS': '移动到工作表',
'SortCols': '排序列',
'SortAsc': 'A-Z',
'SortDesc': 'Z-一个',
'Resize': '调整',
'ResizeAllCols': '调整所有的列',
'ResizeHeader': '大小头',
'ResizeToContents': '大小内容',
'ResizeToAll': '大小适合所有',
'AddCol': '添加一列',
'AddColLeft': '在左边',
'AddColRight': '在右边',
'DelCol': '删除列',
'DelColPlura': '删除列',
'DupCol': '重复列',
'DelOtherDups': '删除重复等',
'HideCol': '隐藏列',
'HideColPlura': '隐藏列',
'UnHideCol': '取消隐藏列',
'UnHideColPlura': '取消隐藏列',
'TxtAlign': '文本对齐',
'TxtAlignLeft': '左对齐',
'TxtAlignCenter': '居中对齐',
'TxtAlignRight': '右对齐',
'TxtAlignWrap': '文本换行',
'RenameCol': '重命名列',
'RenameColTitle': '新列名',
'SplitCol': '分列',
'SplitColDelim': '通过定界符拆分列',
'SplitColNum': '拆分的数量',
'HP': '水平分割',
'HPNum': '分区数',
'HPPlaceholder': '10最大值',
'ChangeType': '更改数据类型',
'Win': '窗口',
'WinLag': '团队',
'WinLead': '铅',
'Format': '格式',
'Percent': '百分',
'Round': '回合',
'RoundTitle': 'NUM。的小数保持',
'Sort': '分类',
'Agg': '骨料',
'Flt': '过滤',
'FltCell': '筛选此值',
'ExclCell': '排除此值',
'GB': '通过...分组',
'Map': '地图',
'Join': '加入',
'Profile': '轮廓',
'Exts': '扩展',
'ExamCell': '检查',
'PullAllCell': '拉都',
'CPCell': '复制到剪贴板'
};
SideBarTStr = {
'SendToWS': '发送到工作表',
'WSTOSend': '工作表发送',
'NoSheet': '没有表',
'NoSheetTableInstr': '你有没有在任何工作表，请选择这些表工作表！',
'PopBack': '流行回来',
'PopOut': '弹出',
'WalkThroughUA': '演练不可用',
'DelTablesMsg': '你确定要删除选定的表吗？',
'SelectTable': '选择表',
'DupUDF': '重复模块',
'DupUDFMsg': 'Python模块<module>已经存在（模块名称是不区分大小写），你想用这个模块来更换呢？',
'UpoladUDF': '上传成功',
'UploadUDFMsg': '你的Python脚本已经上传成功！',
'UploadError': '上传错误',
'SyntaxError': '语法错误'
};
DaysTStr = {
'Sunday': '星期日',
'Monday': '星期一',
'Tuesday': '星期二',
'Wednesday': '星期三',
'Thursday': '星期四',
'Friday': '星期五',
'Saturday': '星期六',
'Today': '今天',
'Yesterday': '昨天',
'LastWeek': '上个星期',
'Older': '旧的'
};
