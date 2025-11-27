/*
   SCORM API Wrapper
   Create by Philip Hutchison, January 2008
   https://github.com/pipwerks/scorm-api-wrapper

   This wrapper is designed to work with SCORM 1.2, SCORM 2004 3rd Edition,
   and AICC content.
*/


var pipwerks = {}; //pipwerks 'namespace' helps prevent naming conflicts

pipwerks.UTILS = {}; //For holding UTILS functions
pipwerks.debug = {
    isActive: true
}; //Enable (true) or disable (false) for debug mode

pipwerks.SCORM = { //Define the SCORM object
    version: null, //Store SCORM version.
    handleCompletionStatus: true, //Whether or not the wrapper should automatically handle the initial completion status
    handleExitMode: true, //Whether or not the wrapper should automatically handle the exit mode
    API: {
        handle: null,
        isFound: false
    }, //Create API child object
    connection: {
        isActive: false
    }, //Create connection child object
    data: {
        completionStatus: null,
        exitStatus: null
    }, //Create data child object
    debug: {} //Create debug child object
};



/* --------------------------------------------------------------------------------
   pipwerks.SCORM.isAvailable
   A simple function to allow Flash ExternalInterface to confirm
   presence of JS wrapper before attempting to call any other function.

   Accepts a parameter named "version". If a version is passed,
   the wrapper will attempt to look for a SCORM API of that version.
   If no version is passed, the wrapper will look for a SCORM API version
   in the following order: SCORM 2004, SCORM 1.2, AICC

   Returns true if an API handle was found.
----------------------------------------------------------------------------------- */

pipwerks.SCORM.isAvailable = function() {
    return true;
};



// ------------------------------------------------------------------------- //
// --- SCORM.API functions ------------------------------------------------- //
// ------------------------------------------------------------------------- //


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.API.find(window)
   Looks for an object named API in parent and opener windows

   Parameters: window (the browser window object).
   Returns:    Object if API is found, null if no API found
----------------------------------------------------------------------------------- */

pipwerks.SCORM.API.find = function(win) {

    var API = null,
        findAttempts = 0,
        findAttemptLimit = 500,
        trace = pipwerks.debug.trace,
        scorm = pipwerks.SCORM;

    while ((!win.API && !win.API_1484_11) &&
        (win.parent) &&
        (win.parent != win) &&
        (findAttempts <= findAttemptLimit)) {

        findAttempts++;
        win = win.parent;

    }

    //If SCORM version is specified by user, look for specific API
    if (scorm.version) {

        switch (scorm.version) {

            case "2004":

                if (win.API_1484_11) {

                    API = win.API_1484_11;

                } else {

                    trace("SCORM.API.find: SCORM 2004 API not found in this window. Looking for SCORM 1.2.");

                }

                break;

            case "1.2":

                if (win.API) {

                    API = win.API;

                } else {

                    trace("SCORM.API.find: SCORM 1.2 API not found in this window. Looking for AICC.");

                }

                break;

        }

        //If SCORM version not specified by user, look for APIs in the following order
    } else {

        if (win.API_1484_11) { //SCORM 2004-specific API.

            scorm.version = "2004"; //Set version
            API = win.API_1484_11;

        } else if (win.API) { //SCORM 1.2-specific API

            scorm.version = "1.2"; //Set version
            API = win.API;

        }

    }

    if (API) {

        trace("SCORM.API.find: API found. Version: " + scorm.version);
        trace("API: " + API);

    } else {

        trace("SCORM.API.find: Error finding API. \nFind attempts: " + findAttempts + ". \nFind attempt limit: " + findAttemptLimit);

    }

    return API;

};


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.API.get()
   Looks for an object named API, first in the current window's frame
   hierarchy and then, if necessary, in the current window's opener window
   hierarchy (if there is an opener window).

   Parameters: None.
   Returns:    Object if API is found, null if no API found
----------------------------------------------------------------------------------- */

pipwerks.SCORM.API.get = function() {

    var API = null,
        win = window,
        scorm = pipwerks.SCORM,
        find = scorm.API.find,
        trace = pipwerks.debug.trace;

    API = find(win);

    if (!API && win.opener) {

        trace("SCORM.API.get: Searching opener window.");
        API = find(win.opener);

    }

    //Special case for AICC
    if (!API && win.parent && win.parent.document) {

        if (win.parent.document.AICC_API) {
            scorm.version = "AICC";
            API = win.parent.document.AICC_API;
        }

    }

    if (API) {
        scorm.API.isFound = true;
    } else {
        trace("SCORM.API.get: Error finding API. \nCould not find an API instance in either the parent or the opener window.");
    }

    return API;

};


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.API.getHandle()
   Returns the handle to API object if it was previously set

   Parameters: None.
   Returns:    Object (the pipwerks.SCORM.API.handle)
----------------------------------------------------------------------------------- */

pipwerks.SCORM.API.getHandle = function() {

    var API = pipwerks.SCORM.API;

    if (!API.handle && !API.isFound) {

        API.handle = API.get();

    }

    return API.handle;

};



// ------------------------------------------------------------------------- //
// --- SCORM.connection functions ------------------------------------------ //
// ------------------------------------------------------------------------- //


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.connection.initialize()
   Tells the LMS to initiate the communication session.

   Parameters: None
   Returns:    Boolean
----------------------------------------------------------------------------------- */

pipwerks.SCORM.connection.initialize = function() {

    var success = false,
        scorm = pipwerks.SCORM,
        completionStatus = scorm.data.completionStatus,
        trace = pipwerks.debug.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean;

    trace("SCORM.connection.initialize called.");

    if (!scorm.connection.isActive) {

        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {

            switch (scorm.version) {
                case "1.2":
                    success = makeBoolean(API.LMSInitialize(""));
                    break;
                case "2004":
                    success = makeBoolean(API.Initialize(""));
                    break;
                case "AICC":
                    success = makeBoolean(API.LMSInitialize(""));
                    break;
            }

            if (success) {

                //Double-check that connection is active and working before returning 'true'
                errorCode = scorm.debug.getCode();

                if (errorCode !== null && errorCode === 0) {

                    scorm.connection.isActive = true;

                    if (scorm.handleCompletionStatus) {

                        //Automatically set completion status for new sessions; prevents uncessary errors and warnings
                        completionStatus = pipwerks.SCORM.status("get");

                        if (completionStatus) {

                            switch (completionStatus) {

                                //Both SCORM 1.2 and 2004
                                case "not attempted":
                                    pipwerks.SCORM.status("set", "incomplete");
                                    break;

                                    //SCORM 2004 only
                                case "unknown":
                                    pipwerks.SCORM.status("set", "incomplete");
                                    break;

                                    //Additional options, presented here in case you'd like to use them
                                    //case "completed"  : break;
                                    //case "incomplete" : break;
                                    //case "passed"     : break;    //SCORM 1.2 only
                                    //case "failed"     : break;    //SCORM 1.2 only
                                    //case "browsed"    : break;    //SCORM 1.2 only

                            }

                            //Commit changes
                            pipwerks.SCORM.save();

                        }

                    }

                } else {

                    success = false;
                    trace("SCORM.connection.initialize: Connection failed. Two possible reasons: \n1. Your LMS browser tool is not running. \n2. Your content isn't being launched from a LMS. \n\nError code: " + errorCode + ". \nError description: " + scorm.debug.getInfo(errorCode));

                }

            } else {

                errorCode = scorm.debug.getCode();

                if (errorCode !== null && errorCode !== 0) {

                    trace("SCORM.connection.initialize: Failed. \nError code: " + errorCode + ". \nError description: " + scorm.debug.getInfo(errorCode));

                } else {

                    trace("SCORM.connection.initialize: Failed. \nUnknown error. \nThere is likely an error in your code that is preventing the connection from completing.");

                }

            }

        } else {

            trace("SCORM.connection.initialize: API is null.");

        }

    } else {

        trace("SCORM.connection.initialize: Connection is already active.");

    }

    return success;

};


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.connection.terminate()
   Tells the LMS to terminate the communication session

   Parameters: None
   Returns:    Boolean
----------------------------------------------------------------------------------- */

pipwerks.SCORM.connection.terminate = function() {

    var success = false,
        scorm = pipwerks.SCORM,
        exitStatus = scorm.data.exitStatus,
        completionStatus = scorm.data.completionStatus,
        trace = pipwerks.debug.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean;

    trace("SCORM.connection.terminate called.");

    if (scorm.connection.isActive) {

        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {

            if (scorm.handleExitMode && !exitStatus) {

                if (completionStatus !== "completed" && completionStatus !== "passed") {

                    switch (scorm.version) {
                        case "1.2":
                            success = scorm.set("cmi.core.exit", "suspend");
                            break;
                        case "2004":
                            success = scorm.set("cmi.exit", "suspend");
                            break;
                    }

                } else {

                    switch (scorm.version) {
                        case "1.2":
                            success = scorm.set("cmi.core.exit", "logout");
                            break;
                        case "2004":
                            success = scorm.set("cmi.exit", "normal");
                            break;
                    }

                }

            }

            //Ensure we commit the data before terminating
            success = pipwerks.SCORM.save();

            if (success) {

                switch (scorm.version) {
                    case "1.2":
                        success = makeBoolean(API.LMSFinish(""));
                        break;
                    case "2004":
                        success = makeBoolean(API.Terminate(""));
                        break;
                    case "AICC":
                        success = makeBoolean(API.LMSFinish(""));
                        break;
                }

                if (success) {

                    scorm.connection.isActive = false;

                } else {

                    errorCode = scorm.debug.getCode();
                    trace("SCORM.connection.terminate: Failed. \nError code: " + errorCode + ". \nError description: " + scorm.debug.getInfo(errorCode));

                }

            }

        } else {

            trace("SCORM.connection.terminate: API is null.");

        }

    } else {

        trace("SCORM.connection.terminate: Connection is not active.");

    }

    return success;

};



// ------------------------------------------------------------------------- //
// --- SCORM.data functions ------------------------------------------------ //
// ------------------------------------------------------------------------- //


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.data.get(parameter)
   Requests information from the LMS.

   Parameters: parameter (string, name of the SCORM data model element)
   Returns:    string (the value of the specified data model element)
----------------------------------------------------------------------------------- */

pipwerks.SCORM.data.get = function(param) {

    var value = null,
        scorm = pipwerks.SCORM,
        trace = pipwerks.debug.trace;

    trace("SCORM.data.get(" + param + ") called.");

    if (scorm.connection.isActive) {

        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {

            switch (scorm.version) {
                case "1.2":
                    value = API.LMSGetValue(param);
                    break;
                case "2004":
                    value = API.GetValue(param);
                    break;
                case "AICC":
                    value = API.LMSGetValue(param);
                    break;
            }

            errorCode = scorm.debug.getCode();

            //GetValue returns an empty string on errors
            //If value is an empty string, check errorCode to make sure there are no errors
            if (value !== "" || errorCode === 0) {

                //GetValue is successful.
                //If value is empty string, it's a valid value.
                //Else, value is a normal string.

                //SCORM version-specific handling
                switch (scorm.version) {

                    case "1.2":

                        if (param === "cmi.core.lesson_status" || param === "cmi.core.entry") {
                            scorm.data.completionStatus = value;
                        }

                        if (param === "cmi.core.exit") {
                            scorm.data.exitStatus = value;
                        }

                        break;

                    case "2004":

                        if (param === "cmi.completion_status" || param === "cmi.entry") {
                            scorm.data.completionStatus = value;
                        }

                        if (param === "cmi.exit") {
                            scorm.data.exitStatus = value;
                        }

                        break;

                }

                //End version-specific handling

            } else {

                trace("SCORM.data.get(" + param + "): Failed. \nError code: " + errorCode + ". \nError description: " + scorm.debug.getInfo(errorCode));

            }

        } else {

            trace("SCORM.data.get(" + param + "): API is null.");

        }

    } else {

        trace("SCORM.data.get(" + param + "): Connection is not active.");

    }

    trace("SCORM.data.get(" + param + "): Value: " + value);

    return String(value);

};


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.data.set()
   Tells the LMS to assign a value to a data model element.

   Parameters: parameter (string). The data model element
               value (string). The value for the data model element
   Returns:    Boolean
----------------------------------------------------------------------------------- */

pipwerks.SCORM.data.set = function(param, value) {

    var success = false,
        scorm = pipwerks.SCORM,
        trace = pipwerks.debug.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean;

    trace("SCORM.data.set(" + param + ") called.");

    if (scorm.connection.isActive) {

        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {

            switch (scorm.version) {
                case "1.2":
                    success = makeBoolean(API.LMSSetValue(param, value));
                    break;
                case "2004":
                    success = makeBoolean(API.SetValue(param, value));
                    break;
                case "AICC":
                    success = makeBoolean(API.LMSSetValue(param, value));
                    break;
            }

            if (success) {

                if (param === "cmi.core.lesson_status" || param === "cmi.completion_status") {

                    scorm.data.completionStatus = value;

                }

            } else {

                errorCode = scorm.debug.getCode();
                trace("SCORM.data.set(" + param + "): Failed. \nError code: " + errorCode + ". \nError description: " + scorm.debug.getInfo(errorCode));

            }

        } else {

            trace("SCORM.data.set(" + param + "): API is null.");

        }

    } else {

        trace("SCORM.data.set(" + param + "): Connection is not active.");

    }

    return success;

};


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.data.save()
   Instructs the LMS to persist all data to this point in the session

   Parameters: None
   Returns:    Boolean
----------------------------------------------------------------------------------- */

pipwerks.SCORM.data.save = function() {

    var success = false,
        scorm = pipwerks.SCORM,
        trace = pipwerks.debug.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean;

    trace("SCORM.data.save called.");

    if (scorm.connection.isActive) {

        var API = scorm.API.getHandle();

        if (API) {

            switch (scorm.version) {
                case "1.2":
                    success = makeBoolean(API.LMSCommit(""));
                    break;
                case "2004":
                    success = makeBoolean(API.Commit(""));
                    break;
                case "AICC":
                    success = makeBoolean(API.LMSCommit(""));
                    break;
            }

        } else {

            trace("SCORM.data.save: API is null.");

        }

    } else {

        trace("SCORM.data.save: Connection is not active.");

    }

    return success;

};


pipwerks.SCORM.status = function(action, status) {

    var success = false,
        scorm = pipwerks.SCORM,
        trace = pipwerks.debug.trace,
        cmi = "";

    if (action !== null) {

        switch (scorm.version) {
            case "1.2":
                cmi = "cmi.core.lesson_status";
                break;
            case "2004":
                cmi = "cmi.completion_status";
                break;
        }

        switch (action) {

            case "get":
                success = pipwerks.SCORM.data.get(cmi);
                break;

            case "set":
                if (status !== null) {

                    success = pipwerks.SCORM.data.set(cmi, status);

                } else {

                    success = false;
                    trace("SCORM.status: status was not specified.");

                }

                break;

            default:
                success = false;
                trace("SCORM.status: action was not specified.");

        }

    } else {

        trace("SCORM.status: action was not specified.");

    }

    return success;

};


// ------------------------------------------------------------------------- //
// --- SCORM.debug functions ----------------------------------------------- //
// ------------------------------------------------------------------------- //


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.debug.getCode()
   Requests the error code for the current error state of the LMS

   Parameters: None
   Returns:    Integer (the last error code).
----------------------------------------------------------------------------------- */

pipwerks.SCORM.debug.getCode = function() {

    var scorm = pipwerks.SCORM,
        API = scorm.API.getHandle(),
        code = 0;

    if (API) {

        switch (scorm.version) {
            case "1.2":
                code = parseInt(API.LMSGetLastError(), 10);
                break;
            case "2004":
                code = parseInt(API.GetLastError(), 10);
                break;
            case "AICC":
                code = parseInt(API.LMSGetLastError(), 10);
                break;
        }

    } else {

        pipwerks.debug.trace("SCORM.debug.getCode: API is null.");

    }

    return code;

};


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.debug.getInfo()
   Requests a textual description of the current error state of the LMS

   Parameters: errorCode (integer).
   Returns:    String.
----------------------------------------------------------------------------------- */

pipwerks.SCORM.debug.getInfo = function(errorCode) {

    var scorm = pipwerks.SCORM,
        API = scorm.API.getHandle(),
        result = "";


    if (API) {

        switch (scorm.version) {
            case "1.2":
                result = API.LMSGetErrorString(errorCode.toString());
                break;
            case "2004":
                result = API.GetErrorString(errorCode.toString());
                break;
            case "AICC":
                result = API.LMSGetErrorString(errorCode.toString());
                break;
        }

    } else {

        pipwerks.debug.trace("SCORM.debug.getInfo: API is null.");

    }

    return String(result);

};


/* --------------------------------------------------------------------------------
   pipwerks.SCORM.debug.getDiagnosticInfo
   Requests detailed information about the current error state of the LMS

   Parameters: errorCode (integer).
   Returns:    String.
----------------------------------------------------------------------------------- */

pipwerks

























