var runEntity = (typeof window !== 'undefined' && this === window ?
                                                              window : exports);

var httpStatus = {
    "OK"                 : 200,
    "BadRequest"         : 400,
    "Forbidden"          : 403,
    "NotFound"           : 404,
    "InternalServerError": 500
};

runEntity.httpStatus = httpStatus;