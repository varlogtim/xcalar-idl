// source: xcalar/compute/localtypes/Status.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.Status', null, global);
/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.Status = {
  STATUS_OK: 0,
  STATUS_PERM: 1,
  STATUS_NO_ENT: 2,
  STATUS_SRCH: 3,
  STATUS_INTR: 4,
  STATUS_IO: 5,
  STATUS_NX_IO: 6,
  STATUS2_BIG: 7,
  STATUS_NO_EXEC: 8,
  STATUS_BAD_F: 9,
  STATUS_CHILD: 10,
  STATUS_AGAIN: 11,
  STATUS_NO_MEM: 12,
  STATUS_ACCESS: 13,
  STATUS_FAULT: 14,
  STATUS_NOT_BLK: 15,
  STATUS_BUSY: 16,
  STATUS_EXIST: 17,
  STATUS_EOF: 18,
  STATUS_X_DEV: 19,
  STATUS_NO_DEV: 20,
  STATUS_NOT_DIR: 21,
  STATUS_IS_DIR: 22,
  STATUS_INVAL: 23,
  STATUS_N_FILE: 24,
  STATUS_M_FILE: 25,
  STATUS_NO_TTY: 26,
  STATUS_TXT_BSY: 27,
  STATUS_F_BIG: 28,
  STATUS_NO_SPC: 29,
  STATUS_S_PIPE: 30,
  STATUS_ROFS: 31,
  STATUS_M_LINK: 32,
  STATUS_PIPE: 33,
  STATUS_DOM: 34,
  STATUS_RANGE: 35,
  STATUS_DEAD_LK: 36,
  STATUS_NAME_TOO_LONG: 37,
  STATUS_NO_LCK: 38,
  STATUS_NO_SYS: 39,
  STATUS_NOT_EMPTY: 40,
  STATUS_LOOP: 41,
  STATUS_NO_MSG: 42,
  STATUS_ID_RM: 43,
  STATUS_CH_RNG: 44,
  STATUS_L2_N_SYNC: 45,
  STATUS_L3_HLT: 46,
  STATUS_L3_RST: 47,
  STATUS_LN_RNG: 48,
  STATUS_UNATCH: 49,
  STATUS_NO_CSI: 50,
  STATUS_L2_HLT: 51,
  STATUS_BAD_E: 52,
  STATUS_BAD_R: 53,
  STATUS_X_FULL: 54,
  STATUS_NO_ANO: 55,
  STATUS_BAD_RQ_C: 56,
  STATUS_BAD_SLT: 57,
  STATUS_B_FONT: 58,
  STATUS_NO_STR: 59,
  STATUS_NO_DATA: 60,
  STATUS_TIME: 61,
  STATUS_NO_SR: 62,
  STATUS_NO_NET: 63,
  STATUS_NO_PKG: 64,
  STATUS_REMOTE: 65,
  STATUS_NO_LINK: 66,
  STATUS_ADV: 67,
  STATUS_SR_MNT: 68,
  STATUS_COMM: 69,
  STATUS_PROTO: 70,
  STATUS_MULTIHOP: 71,
  STATUS_DOT_DOT: 72,
  STATUS_BAD_MSG: 73,
  STATUS_OVERFLOW: 74,
  STATUS_NOT_UNIQ: 75,
  STATUS_BAD_FD: 76,
  STATUS_REM_CHG: 77,
  STATUS_LIB_ACC: 78,
  STATUS_LIB_BAD: 79,
  STATUS_LIB_SCN: 80,
  STATUS_LIB_MAX: 81,
  STATUS_LIB_EXEC: 82,
  STATUS_IL_SEQ: 83,
  STATUS_RESTART: 84,
  STATUS_STR_PIPE: 85,
  STATUS_USERS: 86,
  STATUS_NOT_SOCK: 87,
  STATUS_DEST_ADDR_REQ: 88,
  STATUS_MSG_SIZE: 89,
  STATUS_PROTOTYPE: 90,
  STATUS_NO_PROTO_OPT: 91,
  STATUS_PROTO_NO_SUPPORT: 92,
  STATUS_SOCK_T_NO_SUPPORT: 93,
  STATUS_OP_NOT_SUPP: 94,
  STATUS_PF_NO_SUPPORT: 95,
  STATUS_AF_NO_SUPPORT: 96,
  STATUS_ADDR_IN_USE: 97,
  STATUS_ADDR_NOT_AVAIL: 98,
  STATUS_NET_DOWN: 99,
  STATUS_NET_UNREACH: 100,
  STATUS_NET_RESET: 101,
  STATUS_CONN_ABORTED: 102,
  STATUS_CONN_RESET: 103,
  STATUS_NO_BUFS: 104,
  STATUS_IS_CONN: 105,
  STATUS_NOT_CONN: 106,
  STATUS_SHUTDOWN: 107,
  STATUS_TOO_MANY_REFS: 108,
  STATUS_TIMED_OUT: 109,
  STATUS_CONN_REFUSED: 110,
  STATUS_HOST_DOWN: 111,
  STATUS_HOST_UNREACH: 112,
  STATUS_ALREADY: 113,
  STATUS_IN_PROGRESS: 114,
  STATUS_STALE: 115,
  STATUS_U_CLEAN: 116,
  STATUS_NOT_NAM: 117,
  STATUS_N_AVAIL: 118,
  STATUS_IS_NAM: 119,
  STATUS_REMOTE_IO: 120,
  STATUS_D_QUOT: 121,
  STATUS_NO_MEDIUM: 122,
  STATUS_MEDIUM_TYPE: 123,
  STATUS_CANCELED: 124,
  STATUS_NO_KEY: 125,
  STATUS_KEY_EXPIRED: 126,
  STATUS_KEY_REVOKED: 127,
  STATUS_KEY_REJECTED: 128,
  STATUS_OWNER_DEAD: 129,
  STATUS_NOT_RECOVERABLE: 130,
  STATUS_RF_KILL: 131,
  STATUS_HW_POISON: 132,
  STATUS_TRUNC: 133,
  STATUS_UNIMPL: 134,
  STATUS_UNKNOWN: 135,
  STATUS_MSG_LIB_DELETE_FAILED: 136,
  STATUS_THR_CREATE_FAILED: 137,
  STATUS_THR_ABORTED: 138,
  STATUS_CONFIG_LIB_DEV_OPEN_FAILED: 139,
  STATUS_CONFIG_LIB_DEV_L_SEEK_FAILED: 140,
  STATUS_CONFIG_LIB_FLASH_DEV_OPEN_FAILED: 141,
  STATUS_CONFIG_LIB_FLASH_DEV_L_SEEK_FAILED: 142,
  STATUS_CONFIG_LIB_DELETE_FAILED: 143,
  STATUS_USR_NODE_INCORRECT_PARAMS: 144,
  STATUS_UNICODE_UNSUPPORTED: 145,
  STATUS_EAI_BAD_FLAGS: 146,
  STATUS_EAI_NO_NAME: 147,
  STATUS_EAI_FAIL: 148,
  STATUS_EAI_SERVICE: 149,
  STATUS_EAI_NO_DATA: 150,
  STATUS_EAI_ADDR_FAMILY: 151,
  STATUS_EAI_NOT_CANCEL: 152,
  STATUS_EAI_ALL_DONE: 153,
  STATUS_EAIIDN_ENCODE: 154,
  STATUS_LAST: 155,
  STATUS_MORE: 156,
  STATUS_CLI_UNKNOWN_CMD: 157,
  STATUS_CLI_PARSE_ERROR: 158,
  STATUS_SCHED_QUEUE_LEN_EXCEEDED: 159,
  STATUS_MSG_FAIL: 160,
  STATUS_MSG_OUT_OF_MESSAGES: 161,
  STATUS_MSG_SHUTDOWN: 162,
  STATUS_NO_SUCH_NODE: 163,
  STATUS_NEW_TABLE_CREATED: 164,
  STATUS_NO_SUCH_RESULT_SET: 165,
  STATUS_DF_APPEND_UNSUPPORTED: 166,
  STATUS_DF_REMOVE_UNSUPPORTED: 167,
  STATUS_DF_PARSE_ERROR: 168,
  STATUS_DF_RECORD_CORRUPT: 169,
  STATUS_DF_FIELD_NO_EXIST: 170,
  STATUS_DF_UNKNOWN_FIELD_TYPE: 171,
  STATUS_DF_RECORD_NOT_FOUND: 172,
  STATUS_DF_VAL_NOT_FOUND: 173,
  STATUS_DF_INVALID_FORMAT: 174,
  STATUS_DF_LOCAL_FATPTR_ONLY: 175,
  STATUS_DF_VALUES_BUF_TOO_SMALL: 176,
  STATUS_DF_MAX_VALUES_PER_FIELD_EXCEEDED: 177,
  STATUS_DF_FIELD_TYPE_UNSUPPORTED: 178,
  STATUS_DF_MAX_DICTIONARY_SEGMENTS_EXCEEDED: 179,
  STATUS_DF_BAD_RECORD_ID: 180,
  STATUS_DF_MAX_RECORDS_EXCEEDED: 181,
  STATUS_DF_TYPE_MISMATCH: 182,
  STATUS_DS_TOO_MANY_KEY_VALUES: 183,
  STATUS_DS_NOT_FOUND: 184,
  STATUS_DS_LOAD_ALREADY_STARTED: 185,
  STATUS_DS_URL_TOO_LONG: 186,
  STATUS_DS_INVALID_URL: 187,
  STATUS_DS_CREATE_NOT_SUPPORTED: 188,
  STATUS_DS_UNLINK_NOT_SUPPORTED: 189,
  STATUS_DS_RENAME_NOT_SUPPORTED: 190,
  STATUS_DS_WRITE_NOT_SUPPORTED: 191,
  STATUS_DS_SEEK_NOT_SUPPORTED: 192,
  STATUS_DS_SEEK_FAILED: 193,
  STATUS_DS_MK_DIR_NOT_SUPPORTED: 194,
  STATUS_DS_RM_DIR_NOT_SUPPORTED: 195,
  STATUS_DS_LOAD_FAILED: 196,
  STATUS_DS_DATASET_IN_USE: 197,
  STATUS_DS_FORMAT_TYPE_UNSUPPORTED: 198,
  STATUS_DS_MYSQL_INIT_FAILED: 199,
  STATUS_DS_MYSQL_CONNECT_FAILED: 200,
  STATUS_DS_MYSQL_QUERY_FAILED: 201,
  STATUS_EX_ODBC_CONNECT_FAILED: 202,
  STATUS_EX_ODBC_CLEANUP_FAILED: 203,
  STATUS_EX_ODBC_ADD_NOT_SUPPORTED: 204,
  STATUS_EX_ODBC_BIND_FAILED: 205,
  STATUS_EX_ODBC_TABLE_CREATION_FAILED: 206,
  STATUS_EX_ODBC_EXPORT_FAILED: 207,
  STATUS_EX_ODBC_TABLE_EXISTS: 208,
  STATUS_EX_ODBC_TABLE_DOESNT_EXIST: 209,
  STATUS_EX_TARGET_LIST_RACE: 210,
  STATUS_EX_TARGET_ALREADY_EXISTS: 211,
  STATUS_DS_GET_FILE_ATTR_NOT_SUPPORTED: 212,
  STATUS_DS_GET_FILE_ATTR_COMPRESSED: 213,
  STATUS_REALLOC_SHRINK_FAILED: 214,
  STATUS_NS_OBJ_ALREADY_EXISTS: 215,
  STATUS_TABLE_ALREADY_EXISTS: 216,
  STATUS_CLI_UNCLOSED_QUOTES: 217,
  STATUS_RANGE_PART_ERROR: 218,
  STATUS_NEW_FIELD_NAME_IS_BLANK: 219,
  STATUS_NO_DATA_DICT_FOR_FORMAT_TYPE: 220,
  STATUS_B_TREE_NOT_FOUND: 221,
  STATUS_B_TREE_KEY_TYPE_MISMATCH: 222,
  STATUS_B_TREE_DATASET_MISMATCH: 223,
  STATUS_CMD_NOT_COMPLETE: 224,
  STATUS_INVALID_RESULT_SET_ID: 225,
  STATUS_POSITION_EXCEED_RESULT_SET_SIZE: 226,
  STATUS_HANDLE_IN_USE: 227,
  STATUS_CLI_LINE_TOO_LONG: 228,
  STATUS_CLI_ERROR_READ_FROM_FILE: 229,
  STATUS_INVALID_TABLE_NAME: 230,
  STATUS_NS_OBJ_NAME_TOO_LONG: 231,
  STATUS_API_UNEXPECTED_EOF: 232,
  STATUS_STATS_INVALID_GROUP_ID: 233,
  STATUS_STATS_INVALID_GROUP_NAME: 234,
  STATUS_INVALID_HANDLE: 235,
  STATUS_THRIFT_PROTOCOL_ERROR: 236,
  STATUS_B_TREE_HAS_NO_ROOT: 237,
  STATUS_B_TREE_KEY_NOT_FOUND: 238,
  STATUS_QA_KEY_VALUE_PAIR_NOT_FOUND: 239,
  STATUS_AST_MALFORMED_EVAL_STRING: 240,
  STATUS_AST_NO_SUCH_FUNCTION: 241,
  STATUS_AST_WRONG_NUMBER_OF_ARGS: 242,
  STATUS_FIELD_NAME_TOO_LONG: 243,
  STATUS_FIELD_NAME_ALREADY_EXISTS: 244,
  STATUS_XDF_WRONG_NUMBER_OF_ARGS: 245,
  STATUS_XDF_UNARY_OPERAND_EXPECTED: 246,
  STATUS_XDF_TYPE_UNSUPPORTED: 247,
  STATUS_XDF_DIV_BY_ZERO: 248,
  STATUS_XDF_FLOAT_NAN: 249,
  STATUS_XDF_MIXED_TYPE_NOT_SUPPORTED: 250,
  STATUS_XDF_AGGREGATE_OVERFLOW: 251,
  STATUS_KV_NOT_FOUND: 252,
  STATUS_XDB_SLOT_PRETTY_VACANT: 253,
  STATUS_NO_DATA_IN_XDB: 254,
  STATUS_XDB_LOAD_IN_PROGRESS: 255,
  STATUS_XDB_NOT_FOUND: 256,
  STATUS_XDB_UNINITIALIZED_CURSOR: 257,
  STATUS_QR_TASK_FAILED: 258,
  STATUS_QR_ID_NON_EXIST: 259,
  STATUS_QR_JOB_NON_EXIST: 260,
  STATUS_QR_JOB_RUNNING: 261,
  STATUS_API_TASK_FAILED: 262,
  STATUS_ALREADY_INDEXED: 263,
  STATUS_EVAL_UNSUBSTITUTED_VARIABLES: 264,
  STATUS_KV_DST_FULL: 265,
  STATUS_MODULE_NOT_INIT: 266,
  STATUS_MAX_JOIN_FIELDS_EXCEEDED: 267,
  STATUS_XDB_KEY_TYPE_ALREADY_SET: 268,
  STATUS_JOIN_TYPE_MISMATCH: 269,
  STATUS_JOIN_DHT_MISMATCH: 270,
  STATUS_FAILED: 271,
  STATUS_ILLEGAL_FILE_NAME: 272,
  STATUS_EMPTY_FILE: 273,
  STATUS_EVAL_STRING_TOO_LONG: 274,
  STATUS_TABLE_DELETED: 275,
  STATUS_FAIL_OPEN_FILE: 276,
  STATUS_QUERY_FAILED: 277,
  STATUS_QUERY_NEEDS_NEW_SESSION: 278,
  STATUS_CREATE_DAG_NODE_FAILED: 279,
  STATUS_DELETE_DAG_NODE_FAILED: 280,
  STATUS_RENAME_DAG_NODE_FAILED: 281,
  STATUS_CHANGE_DAG_NODE_STATE_FAILED: 282,
  STATUS_AGGREGATE_NO_SUCH_FIELD: 283,
  STATUS_AGGREGATE_LOCAL_FN_NEED_ARGUMENT: 284,
  STATUS_AGGREGATE_ACC_NOT_INITED: 285,
  STATUS_AGGREGATE_RETURN_VALUE_NOT_SCALAR: 286,
  STATUS_NS_MAXIMUM_OBJECTS_REACHED: 287,
  STATUS_NS_OBJ_IN_USE: 288,
  STATUS_NS_INVALID_OBJ_NAME: 289,
  STATUS_NS_NOT_FOUND: 290,
  STATUS_DAG_NODE_NOT_FOUND: 291,
  STATUS_UPDATE_DAG_NODE_OPERATION_NOT_SUPPORTED: 292,
  STATUS_MSG_MAX_PAYLOAD_EXCEEDED: 293,
  STATUS_KV_ENTRY_NOT_FOUND: 294,
  STATUS_KV_ENTRY_NOT_EQUAL: 295,
  STATUS_STATS_COULD_NOT_GET_MEM_USED_INFO: 296,
  STATUS_STATUS_FIELD_NOT_INITED: 297,
  STATUS_AGG_NO_SUCH_FUNCTION: 298,
  STATUS_WAIT_KEY_TIMEOUT: 299,
  STATUS_VARIABLE_NAME_TOO_LONG: 300,
  STATUS_DG_DAG_NOT_FOUND: 301,
  STATUS_DG_INVALID_DAG_NAME: 302,
  STATUS_DG_DAG_NAME_TOO_LONG: 303,
  STATUS_DG_DAG_ALREADY_EXISTS: 304,
  STATUS_DG_DAG_EMPTY: 305,
  STATUS_DG_DAG_NOT_EMPTY: 306,
  STATUS_DG_DAG_NO_MORE: 307,
  STATUS_DG_DAG_RESERVED: 308,
  STATUS_DG_NODE_IN_USE: 309,
  STATUS_DG_DAG_NODE_ERROR: 310,
  STATUS_DG_OPERATION_NOT_SUPPORTED: 311,
  STATUS_DG_DAG_NODE_NOT_READY: 312,
  STATUS_DG_FAIL_TO_DESTROY_HANDLE: 313,
  STATUS_DS_DATASET_LOADED: 314,
  STATUS_DS_DATASET_NOT_READY: 315,
  STATUS_SESSION_NOT_FOUND: 316,
  STATUS_SESSION_EXISTS: 317,
  STATUS_SESSION_NOT_INACT: 318,
  STATUS_SESSION_USR_NAME_INVALID: 319,
  STATUS_SESSION_ERROR: 320,
  STATUS_SESSION_USR_ALREADY_EXISTS: 321,
  STATUS_DG_DELETE_OPERATION_NOT_PERMITTED: 322,
  STATUS_UDF_MODULE_LOAD_FAILED: 323,
  STATUS_UDF_MODULE_ALREADY_EXISTS: 324,
  STATUS_UDF_MODULE_NOT_FOUND: 325,
  STATUS_UDF_MODULE_EMPTY: 326,
  STATUS_UDF_MODULE_INVALID_NAME: 327,
  STATUS_UDF_MODULE_INVALID_TYPE: 328,
  STATUS_UDF_MODULE_INVALID_SOURCE: 329,
  STATUS_UDF_MODULE_SOURCE_TOO_LARGE: 330,
  STATUS_UDF_FUNCTION_LOAD_FAILED: 331,
  STATUS_UDF_FUNCTION_NOT_FOUND: 332,
  STATUS_UDF_FUNCTION_NAME_TOO_LONG: 333,
  STATUS_UDF_FUNCTION_TOO_MANY_PARAMS: 334,
  STATUS_UDF_VAR_NAME_TOO_LONG: 335,
  STATUS_UDF_UNSUPPORTED_TYPE: 336,
  STATUS_UDF_PERSIST_INVALID: 337,
  STATUS_UDF_PY_CONVERT: 338,
  STATUS_UDF_EXECUTE_FAILED: 339,
  STATUS_UDF_INVAL: 340,
  STATUS_UDF_DELETE_PARTIAL: 341,
  STATUS_XCALAR_EVAL_TOKEN_NAME_TOO_LONG: 342,
  STATUS_NO_CONFIG_FILE: 343,
  STATUS_COULD_NOT_RESOLVE_SCHEMA: 344,
  STATUS_DHT_EMPTY_DHT_NAME: 345,
  STATUS_DHT_UPPER_BOUND_LESS_THAN_LOWER_BOUND: 346,
  STATUS_LOG_CHECKSUM_FAILED: 347,
  STATUS_DHT_DOES_NOT_PRESERVE_ORDER: 348,
  STATUS_LOG_MAXIMUM_ENTRY_SIZE_EXCEEDED: 349,
  STATUS_LOG_CORRUPT_HEADER: 350,
  STATUS_LOG_CORRUPT: 351,
  STATUS_LOG_VERSION_MISMATCH: 352,
  STATUS_KV_INVALID_KEY_CHAR: 353,
  STATUS_DHT_PROTECTED: 354,
  STATUS_KV_STORE_NOT_FOUND: 355,
  STATUS_SSE42_UNSUPPORTED: 356,
  STATUS_PY_BAD_UDF_NAME: 357,
  STATUS_LIC_INPUT_INVALID: 358,
  STATUS_LIC_FILE_OPEN: 359,
  STATUS_LIC_FILE_READ: 360,
  STATUS_LIC_FILE_WRITE: 361,
  STATUS_LIC_PUB_KEY_MISSING: 362,
  STATUS_LIC_PUB_KEY_ERR: 363,
  STATUS_LIC_PUB_KEY_IDX: 364,
  STATUS_LIC_MISSING: 365,
  STATUS_LIC_ERR: 366,
  STATUS_LIC_SIGNATURE_INVALID: 367,
  STATUS_LIC_BASE32_MAP_INVALID: 368,
  STATUS_LIC_BASE32_VAL_INVALID: 369,
  STATUS_LIC_MD5_INVALID: 370,
  STATUS_LIC_UNK_ERROR: 371,
  STATUS_LIC_INVALID: 372,
  STATUS_LIC_WRONG_SIZE: 373,
  STATUS_LIC_EXPIRED: 374,
  STATUS_LIC_OLD_VERSION: 375,
  STATUS_LIC_INSUFFICIENT_NODES: 376,
  STATUS_LOG_HANDLE_CLOSED: 377,
  STATUS_LOG_HANDLE_INVALID: 378,
  STATUS_SHUTDOWN_IN_PROGRESS: 379,
  STATUS_ORDERING_NOT_SUPPORTED: 380,
  STATUS_HDFS_NO_CONNECT: 381,
  STATUS_HDFS_NO_DIRECTORY_LISTING: 382,
  STATUS_CLI_CANVAS_TOO_SMALL: 383,
  STATUS_DAG_PARAM_INPUT_TYPE_MISMATCH: 384,
  STATUS_PARAMETER_TOO_LONG: 385,
  STATUS_EXCEED_MAX_SCHEDULE_TIME: 386,
  STATUS_EXCEED_MAX_SCHEDULE_PERIOD: 387,
  STATUS_XCALAR_API_NOT_PARAMETERIZABLE: 388,
  STATUS_QR_NOT_FOUND: 389,
  STATUS_JOIN_ORDERING_MISMATCH: 390,
  STATUS_INVALID_USER_COOKIE: 391,
  STATUS_ST_TOO_MANY_SCHED_TASK: 392,
  STATUS_ROW_UNFINISHED: 393,
  STATUS_INPUT_TOO_LARGE: 394,
  STATUS_CONFIG_INVALID: 395,
  STATUS_INVAL_NODE_ID: 396,
  STATUS_NO_LOCAL_NODES: 397,
  STATUS_DS_FALLOCATE_NOT_SUPPORTED: 398,
  STATUS_NO_EXTENSION: 399,
  STATUS_EXPORT_TARGET_NOT_SUPPORTED: 400,
  STATUS_EXPORT_INVALID_CREATE_RULE: 401,
  STATUS_EXPORT_NO_COLUMNS: 402,
  STATUS_EXPORT_TOO_MANY_COLUMNS: 403,
  STATUS_EXPORT_COLUMN_NAME_TOO_LONG: 404,
  STATUS_EXPORT_EMPTY_RESULT_SET: 405,
  STATUS_EXPORT_UNRESOLVED_SCHEMA: 406,
  STATUS_EXPORT_SF_FILE_EXISTS: 407,
  STATUS_EXPORT_SF_FILE_DOESNT_EXIST: 408,
  STATUS_MON_PORT_INVALID: 409,
  STATUS_EXPORT_SF_FILE_DIR_DUPLICATE: 410,
  STATUS_EXPORT_SF_FILE_CORRUPTED: 411,
  STATUS_EXPORT_SF_FILE_RULE_NEEDS_NEW_FILE: 412,
  STATUS_EXPORT_SF_FILE_RULE_SIZE_TOO_SMALL: 413,
  STATUS_EXPORT_SF_SINGLE_SPLIT_CONFLICT: 414,
  STATUS_EXPORT_SF_APPEND_SEP_CONFLICT: 415,
  STATUS_EXPORT_SF_APPEND_SINGLE_HEADER: 416,
  STATUS_EXPORT_SF_INVALID_HEADER_TYPE: 417,
  STATUS_EXPORT_SF_INVALID_SPLIT_TYPE: 418,
  STATUS_EXPORT_SF_MAX_SIZE_ZERO: 419,
  STATUS_VERSION_MISMATCH: 420,
  STATUS_FILE_CORRUPT: 421,
  STATUS_API_FUNCTION_INVALID: 422,
  STATUS_LIB_ARCHIVE_ERROR: 423,
  STATUS_SEND_SOCKET_FAIL: 424,
  STATUS_NODE_SKIPPED: 425,
  STATUS_DF_CAST_TRUNCATION_OCCURRED: 426,
  STATUS_EVAL_CAST_ERROR: 427,
  STATUS_LOG_UNALIGNED: 428,
  STATUS_STR_ENCODING_NOT_SUPPORTED: 429,
  STATUS_SHMSG_INTERFACE_CLOSED: 430,
  STATUS_OPERATION_HAS_FINISHED: 431,
  STATUS_OPSTATISTICS_NOT_AVAIL: 432,
  STATUS_RETINA_PARSE_ERROR: 433,
  STATUS_RETINA_TOO_MANY_COLUMNS: 434,
  STATUS_UDF_MODULE_OVERWRITTEN_SUCCESSFULLY: 435,
  STATUS_SUPPORT_FAIL: 436,
  STATUS_SHMSG_PAYLOAD_TOO_LARGE: 437,
  STATUS_NO_CHILD: 438,
  STATUS_CHILD_TERMINATED: 439,
  STATUS_XDB_MAX_SG_ELEMS_EXCEEDED: 440,
  STATUS_AGGREGATE_RESULT_NOT_FOUND: 441,
  STATUS_MAX_ROW_SIZE_EXCEEDED: 442,
  STATUS_MAX_DIRECTORY_DEPTH_EXCEEDED: 443,
  STATUS_DIRECTORY_SUBDIR_OPEN_FAILED: 444,
  STATUS_INVALID_DATASET_NAME: 445,
  STATUS_MAX_STATS_GROUP_EXCEEDED: 446,
  STATUS_LRQ_DUPLICATE_USER_DEFINED_FIELDS: 447,
  STATUS_TYPE_CONVERSION_ERROR: 448,
  STATUS_NOT_SUPPORTED_IN_PROD_BUILD: 449,
  STATUS_OUT_OF_FAULT_INJ_MODULE_SLOTS: 450,
  STATUS_NO_SUCH_ERRORPOINT_MODULE: 451,
  STATUS_NO_SUCH_ERRORPOINT: 452,
  STATUS_ALL_FILES_EMPTY: 453,
  STATUS_STATS_GROUP_NAME_TOO_LONG: 454,
  STATUS_STATS_NAME_TOO_LONG: 455,
  STATUS_MAX_STATS_EXCEEDED: 456,
  STATUS_STATS_GROUP_IS_FULL: 457,
  STATUS_NO_MATCHING_FILES: 458,
  STATUS_FIELD_NOT_FOUND: 459,
  STATUS_IMMEDIATE_NAME_COLLISION: 460,
  STATUS_FATPTR_PREFIX_COLLISION: 461,
  STATUS_LIST_FILES_NOT_SUPPORTED: 462,
  STATUS_ALREADY_LOAD_DONE: 463,
  STATUS_SKIP_RECORD_NEEDS_DELIM: 464,
  STATUS_NO_PARENT: 465,
  STATUS_REBUILD_DAG_FAILED: 466,
  STATUS_STACK_SIZE_TOO_SMALL: 467,
  STATUS_TARGET_DOESNT_EXIST: 468,
  STATUS_EX_ODBC_REMOVE_NOT_SUPPORTED: 469,
  STATUS_FUNCTIONAL_TEST_DISABLED: 470,
  STATUS_FUNCTIONAL_TEST_NUM_FUNC_TEST_EXCEEDED: 471,
  STATUS_TARGET_CORRUPTED: 472,
  STATUS_UDF_PY_CONVERT_FROM_FAILED: 473,
  STATUS_HDFS_WR_NOT_SUPPORTED: 474,
  STATUS_FUNCTIONAL_TEST_NO_TABLES_LEFT: 475,
  STATUS_FUNCTIONAL_TEST_TABLE_EMPTY: 476,
  STATUS_REGEX_COMPILE_FAILED: 477,
  STATUS_UDF_NOT_FOUND: 478,
  STATUS_APIS_WORK_TOO_MANY_OUTSTANDING: 479,
  STATUS_INVALID_USER_NAME_LEN: 480,
  STATUS_UDF_PY_INJECT_FAILED: 481,
  STATUS_USR_NODE_INITED: 482,
  STATUS_FILE_LIST_PARSE_ERROR: 483,
  STATUS_LOAD_ARGS_INVALID: 484,
  STATUS_ALL_WORK_DONE: 485,
  STATUS_UDF_ALREADY_EXISTS: 486,
  STATUS_UDF_FUNCTION_TOO_FEW_PARAMS: 487,
  STATUS_DG_OPERATION_IN_ERROR: 488,
  STATUS_APP_NAME_INVALID: 489,
  STATUS_APP_HOST_TYPE_INVALID: 490,
  STATUS_APP_EXEC_TOO_BIG: 491,
  STATUS_RCC_INIT_ERR: 492,
  STATUS_RCC_DEFAULT: 493,
  STATUS_RCC_NOT_FOUND: 494,
  STATUS_RCC_ELEM_NOT_FOUND: 495,
  STATUS_RCC_INCOMPATIBLE_STATE: 496,
  STATUS_GVM_INVALID_ACTION: 497,
  STATUS_GLOBAL_VARIABLE_NOT_FOUND: 498,
  STATUS_CORRUPTED_OUTPUT_SIZE: 499,
  STATUS_DATASET_NAME_ALREADY_EXISTS: 500,
  STATUS_DATASET_ALREADY_DELETED: 501,
  STATUS_RETINA_NOT_FOUND: 502,
  STATUS_DHT_NOT_FOUND: 503,
  STATUS_TABLE_NOT_FOUND: 504,
  STATUS_RETINA_TOO_MANY_PARAMETERS: 505,
  STATUS_CONFIG_PARAM_IMMUTABLE: 506,
  STATUS_OPERATION_IN_ERROR: 507,
  STATUS_OPERATION_CANCELLED: 508,
  STATUS_QR_QUERY_NOT_EXIST: 509,
  STATUS_DG_PARENT_NODE_NOT_EXIST: 510,
  STATUS_LOAD_APP_NOT_EXIST: 511,
  STATUS_APP_OUT_PARSE_FAIL: 512,
  STATUS_FAULT_INJECTION: 513,
  STATUS_FAULT_INJECTION2_PC: 514,
  STATUS_EXPORT_APP_NOT_EXIST: 515,
  STATUS_SESSION_USR_IN_USE: 516,
  STATUS_NO_XDB_PAGE_BC_MEM: 517,
  STATUS_APP_FLAGS_INVALID: 518,
  STATUS_QUERY_JOB_PROCESSING: 519,
  STATUS_TWO_PC_BAR_MSG_INVALID: 520,
  STATUS_TWO_PC_BAR_TIMEOUT: 521,
  STATUS_TOO_MANY_CHILDREN: 522,
  STATUS_MAX_FILE_LIMIT_REACHED: 523,
  STATUS_API_WOULD_BLOCK: 524,
  STATUS_EXPORT_SF_SINGLE_HEADER_CONFLICT: 525,
  STATUS_AGG_FN_IN_CLASS1_AST: 526,
  STATUS_DAG_NODE_DROPPED: 527,
  STATUS_XDB_SLOT_HAS_ACTIVE_CURSOR: 528,
  STATUS_PROTOBUF_DECODE_ERROR: 529,
  STATUS_APP_LOAD_FAILED: 530,
  STATUS_APP_DOES_NOT_EXIST: 531,
  STATUS_NOT_SHARED: 532,
  STATUS_PROTOBUF_ENCODE_ERROR: 533,
  STATUS_JSON_ERROR: 534,
  STATUS_MSG_STREAM_NOT_FOUND: 535,
  STATUS_UNDERFLOW: 536,
  STATUS_PAGE_CACHE_FULL: 537,
  STATUS_SCHED_TASK_FUNCTIONALITY_REMOVED: 538,
  STATUS_PENDING_REMOVAL: 539,
  STATUS_APP_FAILED_TO_GET_OUTPUT: 540,
  STATUS_APP_FAILED_TO_GET_ERROR: 541,
  STATUS_NS_INTERNAL_TABLE_ERROR: 542,
  STATUS_NS_STALE: 543,
  STATUS_DUR_HANDLE_NO_INIT: 544,
  STATUS_DUR_VER_ERROR: 545,
  STATUS_DUR_DIRTY_WRITER: 546,
  STATUS_MAX_FIELD_SIZE_EXCEEDED: 547,
  STATUS_QR_QUERY_ALREADY_EXISTS: 548,
  STATUS_UDF_MODULE_IN_USE: 549,
  STATUS_TARGET_IN_USE: 550,
  STATUS_OPERATION_OUTSTANDING: 551,
  STATUS_DHT_ALREADY_EXISTS: 552,
  STATUS_DHT_IN_USE: 553,
  STATUS_TOO_MANY_RESULT_SETS: 554,
  STATUS_RETINA_ALREADY_EXISTS: 555,
  STATUS_RETINA_IN_USE: 556,
  STATUS_COMPRESS_FAILED: 557,
  STATUS_DE_COMPRESS_FAILED: 558,
  STATUS_QR_QUERY_NAME_INVALID: 559,
  STATUS_QR_QUERY_ALREADY_DELETED: 560,
  STATUS_QR_QUERY_IN_USE: 561,
  STATUS_XDB_SER_ERROR: 562,
  STATUS_XDB_DES_ERROR: 563,
  STATUS_XDB_RESIDENT: 564,
  STATUS_XDB_NOT_RESIDENT: 565,
  STATUS_SESSION_ALREADY_INACT: 566,
  STATUS_SESSION_INACT: 567,
  STATUS_SESSION_USR_ALREADY_DELETED: 568,
  STATUS_SESSION_USR_NOT_EXIST: 569,
  STATUS_NO_SHUTDOWN_PRIVILEGE: 570,
  STATUS_SERIALIZATION_LIST_EMPTY: 571,
  STATUS_APP_ALREADY_EXISTS: 572,
  STATUS_APP_NOT_FOUND: 573,
  STATUS_APP_IN_USE: 574,
  STATUS_INVALID_STREAM_CONTEXT: 575,
  STATUS_INVALID_STATS_PROTOCOL: 576,
  STATUS_STAT_STREAM_PARTIAL_FAILURE: 577,
  STATUS_LOG_LEVEL_SET_INVALID: 578,
  STATUS_CONNECTION_WRONG_HANDSHAKE: 579,
  STATUS_QUERY_ON_ANOTHER_NODE: 580,
  STATUS_APP_INSTANCE_START_ERROR: 581,
  STATUS_APIS_RECV_TIMEOUT: 582,
  STATUS_IP_ADDR_TOO_LONG: 583,
  STATUS_SUPPORT_BUNDLE_NOT_SENT: 584,
  STATUS_INVALID_BLOB_STREAM_PROTOCOL: 585,
  STATUS_STREAM_PARTIAL_FAILURE: 586,
  STATUS_UNKNOWN_PROC_MEM_INFO_FILE_FORMAT: 587,
  STATUS_APIS_WORK_INVALID_SIGNATURE: 588,
  STATUS_APIS_WORK_INVALID_LENGTH: 589,
  STATUS_LMDB_ERROR: 590,
  STATUS_XPU_NO_BUFS_TO_RECV: 591,
  STATUS_JOIN_INVALID_ORDERING: 592,
  STATUS_DATASET_ALREADY_LOCKED: 593,
  STATUS_USRNODE_STILL_ALIVE: 594,
  STATUS_BUFFER_ON_FAILED: 595,
  STATUS_CANT_UNBUFFER_LOGS: 596,
  STATUS_LOG_FLUSH_PERIOD_FAILURE: 597,
  STATUS_INVALID_LOG_LEVEL: 598,
  STATUS_NO_DS_USERS: 599,
  STATUS_JSON_QUERY_PARSE_ERROR: 600,
  STATUS_XEM_NOT_CONFIGURED: 601,
  STATUS_NO_DATASET_MEMORY: 602,
  STATUS_TABLE_EMPTY: 603,
  STATUS_USR_ADD_IN_PROG: 604,
  STATUS_SESSION_NOT_ACTIVE: 605,
  STATUS_USR_SESS_LOAD_FAILED: 606,
  STATUS_PROTOBUF_ERROR: 607,
  STATUS_RECORD_ERROR: 608,
  STATUS_CANNOT_REPLACE_KEY: 609,
  STATUS_SERIALIZATION_IS_DISABLED: 610,
  STATUS_FIELD_LIMIT_EXCEEDED: 611,
  STATUS_WRONG_NUMBER_OF_ARGS: 612,
  STATUS_MISSING_XCALAR_OP_CODE: 613,
  STATUS_MISSING_XCALAR_RANK_OVER: 614,
  STATUS_INVALID_XCALAR_OP_CODE: 615,
  STATUS_INVALID_XCALAR_RANK_OVER: 616,
  STATUS_INVALID_RUNTIME_PARAMS: 617,
  STATUS_INV_PUB_TABLE_NAME: 618,
  STATUS_EXISTS_PUB_TABLE_NAME: 619,
  STATUS_UNLICENSED_FEATURE_IN_USE: 620,
  STATUS_LIC_PRIV_KEY_MISSING: 621,
  STATUS_LIC_PRIV_KEY_ERR: 622,
  STATUS_LIC_PASSWD_MISSING: 623,
  STATUS_LIC_LICENSE_MISSING: 624,
  STATUS_LIC_SIGNATURE_MISSING: 625,
  STATUS_LIC_BUF_TOO_SMALL: 626,
  STATUS_LIC_PASSWORD_ERROR: 627,
  STATUS_LIC_VALUE_OUT_OF_RANGE: 628,
  STATUS_LIC_DECOMPRESS_INIT: 629,
  STATUS_LIC_DECOMPRESS_ERR: 630,
  STATUS_LIC_LICENSE_TOO_LARGE: 631,
  STATUS_LIC_COMPRESS_INIT: 632,
  STATUS_LIC_UNSUPPORTED_OPERATION: 633,
  STATUS_LIC_OP_DISABLED_UNLICENSED: 634,
  STATUS_WORKBOOK_INVALID_VERSION: 635,
  STATUS_PUB_TABLE_NAME_NOT_FOUND: 636,
  STATUS_PUB_TABLE_UPDATE_NOT_FOUND: 637,
  STATUS_UPGRADE_REQUIRED: 638,
  STATUS_UDF_NOT_SUPPORTED_IN_CROSS_JOINS: 639,
  STATUS_RETINA_NAME_INVALID: 640,
  STATUS_NO_SER_DES_PATH: 641,
  STATUS_EVAL_INVALID_TOKEN: 642,
  STATUS_XDF_INVALID_ARRAY_INPUT: 643,
  STATUS_BUF_CACHE_THICK_ALLOC_FAILED: 644,
  STATUS_DUR_BAD_SHA: 645,
  STATUS_DUR_BAD_IDL_VER: 646,
  STATUS_SESS_LIST_INCOMPLETE: 647,
  STATUS_PUB_TABLE_INACTIVE: 648,
  STATUS_PUB_TABLE_RESTORING: 649,
  STATUS_SELF_SELECT_REQUIRED: 650,
  STATUS_SESSION_NAME_MISSING: 651,
  STATUS_XPU_CONN_ABORTED: 652,
  STATUS_PT_UPDATE_PERM_DENIED: 653,
  STATUS_PT_COALESCE_PERM_DENIED: 654,
  STATUS_PT_OWNER_NODE_MISMATCH: 655,
  STATUS_NS_REF_TO_OBJECT_DENIED: 656,
  STATUS_CHECKSUM_NOT_FOUND: 657,
  STATUS_CHECKSUM_MISMATCH: 658,
  STATUS_RUNTIME_SET_PARAM_INVALID: 659,
  STATUS_RUNTIME_SET_PARAM_NOT_SUPPORTED: 660,
  STATUS_PUBLISH_TABLE_SNAPSHOT_IN_PROGRESS: 661,
  STATUS_UDF_OWNER_NODE_MISMATCH: 662,
  STATUS_UDF_SOURCE_MISMATCH: 663,
  STATUS_UDF_UPDATE_FAILED: 664,
  STATUS_UDF_BAD_PATH: 665,
  STATUS_DS_META_DATA_NOT_FOUND: 666,
  STATUS_DATASET_ALREADY_UNLOADED: 667,
  STATUS_UDF_MODULE_FULL_NAME_REQUIRED: 668,
  STATUS_CGROUPS_DISABLED: 669,
  STATUS_CGROUP_APP_IN_PROGRESS: 670,
  STATUS_JSON_SESS_SERIALIZE_ERROR: 671,
  STATUS_SESS_MDATA_INCONSISTENT: 672,
  STATUS_RUNTIME_CHANGE_IN_PROGRESS: 673,
  STATUS_SELECT_LIMIT_REACHED: 674,
  STATUS_LEGACY_TARGET_NOT_FOUND: 675,
  STATUS_DFP_ERROR: 676,
  STATUS_CGROUP_IN_PROGRESS: 677,
  STATUS_KV_INVALID_KEY: 678,
  STATUS_KV_INVALID_VALUE: 679,
  STATUS_COMPLEX_TYPE_NOT_SUPPORTED: 680,
  STATUS_PARQUET_PARSER_ERROR: 681,
  STATUS_UN_SUPPORTED_DECIMAL_TYPE: 682,
  STATUS_UN_SUPPORTED_LOGICAL_TYPE: 683,
  STATUS_KVS_REF_COUNT_LEAK: 684,
  STATUS_TABLE_PINNED: 685,
  STATUS_TABLE_ALREADY_PINNED: 686,
  STATUS_TABLE_NOT_PINNED: 687,
  STATUS_DEFER_FREE_XDB_PAGE_HDR: 688,
  STATUS_DAG_NODE_NUM_PARENT_INVALID: 689,
  STATUS_INV_TABLE_NAME: 690,
  STATUS_EXISTS_TABLE_NAME: 691,
  STATUS_TABLE_NAME_NOT_FOUND: 692,
  STATUS_MAP_FAILURE_SUMMARY_SCHEMA: 693,
  STATUS_MAP_FAILURE_MULTI_EVAL: 694,
  STATUS_UDF_ICV_MODE_FAILURE: 695,
  STATUS_COLUMN_NAME_MISMATCH: 696,
  STATUS_TYPE_MISMATCH: 697,
  STATUS_KEY_MISMATCH: 698,
  STATUS_KEY_NAME_MISMATCH: 699,
  STATUS_KEY_TYPE_MISMATCH: 700,
  STATUS_DHT_MISMATCH: 701,
  STATUS_DISALLOWED_RANKOVER: 702,
  STATUS_DISALLOWED_OP_CODE: 703,
  STATUS_DISALLOWED_BATCH_ID: 704,
  STATUS_DISALLOWED_FAT_PTR: 705,
  STATUS_INVAL_DELTA_SCHEMA: 706,
  STATUS_INVAL_TABLE_KEYS: 707,
  STATUS_CLUSTER_NOT_READY: 708,
  STATUS_NO_CGROUP_CTRL_PATHS: 709,
  STATUS_CGROUP_CTRL_PATH_LONG: 710,
  STATUS_ORDERING_MISMATCH: 711,
  STATUS_IMD_TABLE_ALREADY_LOCKED: 712,
  STATUS_EXPORT_MULTIPLE_TABLES: 713,
  STATUS_COLUMN_POSITION_MISMATCH: 714,
  STATUS_XDB_REF_COUNT_ERROR: 715,
  STATUS_STATS_COLLECTION_IN_PROGRESS: 716,
  STATUS_TABLE_ID_NOT_FOUND: 717,
  STATUS_INVAL_FULLY_QUAL_TAB_NAME: 718,
  STATUS_UDF_FLUSH_FAILED: 719,
  STATUS_TABLE_NOT_GLOBAL: 720,
  STATUS_FAILED_PARSE_STR_FIELD_LEN: 721,
  STATUS_FAILED_PARSE_BOOL_FIELD: 722,
  STATUS_FAILED_PARSE_INT32_FIELD: 723,
  STATUS_FAILED_PARSE_INT64_FIELD: 724,
  STATUS_FAILED_PARSE_UINT32_FIELD: 725,
  STATUS_FAILED_PARSE_UINT64_FIELD: 726,
  STATUS_FAILED_PARSE_FLOAT32_FIELD: 727,
  STATUS_FAILED_PARSE_FLOAT64_FIELD: 728,
  STATUS_FAILED_PARSE_TIMESTAMP_FIELD: 729,
  STATUS_FAILED_PARSE_NUMERIC_FIELD: 730,
  STATUS_FAILED_PARSE_PROTO_VAL_FIELD_LEN: 731,
  STATUS_FAILED_PARSE_PROTO_VAL_FIELD: 732,
  STATUS_INVALID_FIELD_TYPE: 733,
  STATUS_SYSTEM_APP_DISABLED: 734,
  STATUS_UNION_TYPE_MISMATCH: 735,
  STATUS_UNION_DHT_MISMATCH: 736,
  STATUS_APP_IN_PROGRESS: 737,
  STATUS_MAX_COLUMNS_FOUND: 738
};

goog.object.extend(exports, proto.xcalar.compute.localtypes.XcalarEnumType);
