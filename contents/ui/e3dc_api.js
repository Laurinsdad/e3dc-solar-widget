.pragma library

var BASE_URL = "https://s10.e3dc.com/s10";
var E3DC_WINDOW_ID = "";
// var authToken = ""; // Not used
// var savedCookies = ""; // Cannot read HttpOnly cookies, relying on withCredentials

// Helper to merge new cookies into our saved string
// function updateCookies(xhr) {
//     var newCookies = xhr.getResponseHeader("Set-Cookie");
//     if (newCookies) {
//         // Simple merge: just append. Browsers/Servers usually handle this.
//         // A better implementation would parse and deduplicate, but this is often enough.
//         if (savedCookies) {
//             savedCookies += "; " + newCookies;
//         } else {
//             savedCookies = newCookies;
//         }
//     }
// }

function authenticate(user, passwordHash, callback) {
    // callback(false, "DEBUG: Starting Auth", "Initializing GET request...");

    // Step 1: GET to establish session and get cookies (handled automatically by withCredentials)
    var xhrGet = new XMLHttpRequest();
    var url = BASE_URL + "/index.php?DENV=E3DC";

    xhrGet.onreadystatechange = function () {
        // callback(false, "DEBUG: GET State Change", "State: " + xhrGet.readyState + ", Status: " + xhrGet.status);

        if (xhrGet.readyState === XMLHttpRequest.DONE) {
            if (xhrGet.status === 200) {
                // callback(false, "DEBUG: GET Success", "Starting POST...");

                // Step 2: POST with cookies (auto) and DENV in body
                var xhrPost = new XMLHttpRequest();
                var postUrl = BASE_URL + "/phpcmd/cmd.php";

                xhrPost.onreadystatechange = function () {
                    // callback(false, "DEBUG: POST State Change", "State: " + xhrPost.readyState + ", Status: " + xhrPost.status);

                    if (xhrPost.readyState === XMLHttpRequest.DONE) {
                        if (xhrPost.status === 200) {
                            try {
                                var response = JSON.parse(xhrPost.responseText);
                                if (response.ERRNO === 0 || response.ERRNO === "0") {
                                    callback(true, "Authentication successful", "UserLevel: " + (response.CONTENT ? response.CONTENT.USERLEVEL : "Unknown"));
                                } else {
                                    callback(false, "Authentication failed: ERRNO " + response.ERRNO, xhrPost.responseText);
                                }
                            } catch (e) {
                                var debugInfo = "Response is not JSON.\nLength: " + xhrPost.responseText.length + "\nStart: " + xhrPost.responseText.substring(0, 500);
                                callback(false, "Authentication failed: Invalid response format", debugInfo);
                            }
                        } else {
                            callback(false, "Login POST failed: " + xhrPost.status, "Status: " + xhrPost.status);
                        }
                    }
                };

                xhrPost.onerror = function () {
                    callback(false, "Auth POST Network Error", "Request failed");
                };

                // Generate a GUID for Window-Id if not exists
                if (!E3DC_WINDOW_ID) {
                    E3DC_WINDOW_ID = "GUID-" + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                }

                xhrPost.open("POST", postUrl);
                xhrPost.withCredentials = true; // Key for cookies
                xhrPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xhrPost.setRequestHeader("Window-Id", E3DC_WINDOW_ID);
                xhrPost.setRequestHeader("Accept", "*/*");
                xhrPost.setRequestHeader("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                xhrPost.setRequestHeader("Origin", "https://s10.e3dc.com");
                xhrPost.setRequestHeader("Referer", url);

                try {
                    var data = "DO=LOGIN&USERNAME=" + encodeURIComponent(user) + "&PASSWD=" + encodeURIComponent(passwordHash) + "&DENV=E3DC";
                    xhrPost.send(data);
                } catch (e) {
                    callback(false, "Auth POST Exception", e.message);
                }

            } else {
                var debugInfo = "GET failed. Status: " + xhrGet.status + "\nResponse: " + xhrGet.responseText;
                callback(false, "GET login page failed: " + xhrGet.status, debugInfo);
            }
        }
    };

    xhrGet.onerror = function () {
        callback(false, "Auth GET Network Error", "Request failed");
    };

    xhrGet.open("GET", url);
    xhrGet.withCredentials = true;
    xhrGet.setRequestHeader("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    try {
        xhrGet.send();
    } catch (e) {
        callback(false, "Auth GET Exception", e.message);
    }
}

function fetchSystemStatus(callback) {
    var xhr = new XMLHttpRequest();
    var url = BASE_URL + "/phpcmd/cmd.php";

    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                // updateCookies(xhr); // Capture any new cookies from Overview!

                try {
                    var response = JSON.parse(xhr.responseText);

                    if (response.ERRNO && (response.ERRNO !== 0 && response.ERRNO !== "0")) {
                        callback(false, "Overview API Error. ERRNO: " + response.ERRNO);
                        return;
                    }

                    // Step 1: Extract Serial Number from IDOVERVIEWCOMMON response
                    var html = "";
                    if (response.CONTENT && Array.isArray(response.CONTENT)) {
                        for (var i = 0; i < response.CONTENT.length; i++) {
                            if (response.CONTENT[i].HTML) {
                                html = response.CONTENT[i].HTML;
                                break;
                            }
                        }
                    }

                    var serialNo = null;
                    var match = html.match(/s10list\s*=\s*'([^']+)';/);
                    if (match && match[1]) {
                        try {
                            var s10Data = JSON.parse(match[1]);
                            if (s10Data.length > 0) {
                                serialNo = s10Data[0].serialno;
                            }
                        } catch (e) {
                            console.error("Failed to parse s10list JSON", e);
                        }
                    }

                    if (serialNo) {
                        // Step 2: Select Device (Activate Context)
                        selectDevice(serialNo, callback);
                    } else {
                        callback(false, "Could not find Serial Number in Overview data.\nHTML snippet: " + html.substring(0, 100));
                    }

                } catch (e) {
                    callback(false, "Error parsing Overview response: " + e.message);
                }
            } else {
                callback(false, "Overview fetch failed: " + xhr.status);
            }
        }
    }

    // Generate a GUID for Window-Id if not exists
    if (!E3DC_WINDOW_ID) {
        E3DC_WINDOW_ID = "GUID-" + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Window-Id", E3DC_WINDOW_ID);
    // xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("Accept", "*/*");
    xhr.setRequestHeader("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    xhr.setRequestHeader("Origin", "https://s10.e3dc.com");
    xhr.setRequestHeader("Referer", BASE_URL + "/index.php?DENV=E3DC");

    // if (savedCookies) {
    //     xhr.setRequestHeader("Cookie", savedCookies);
    // }

    // Request Overview to get Serial Number
    var data = "DO=GETCONTENT&MODID=IDOVERVIEWCOMMON&DENV=E3DC";
    xhr.send(data);
}

function selectDevice(serialNo, callback) {
    var xhr = new XMLHttpRequest();
    var url = BASE_URL + "/phpcmd/cmd.php";

    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                // We don't really care about the response here, as long as it's successful.
                // This request sets the session context for the next call.
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.ERRNO && (response.ERRNO !== 0 && response.ERRNO !== "0")) {
                        callback(false, "Select Device Error. ERRNO: " + response.ERRNO);
                        return;
                    }
                    // Step 3: Fetch Live Data
                    fetchLiveData(serialNo, callback);
                } catch (e) {
                    callback(false, "Error parsing Select Device response: " + e.message);
                }
            } else {
                callback(false, "Select Device fetch failed: " + xhr.status);
            }
        }
    };

    // Generate a GUID for Window-Id if not exists
    if (!E3DC_WINDOW_ID) {
        E3DC_WINDOW_ID = "GUID-" + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Window-Id", E3DC_WINDOW_ID);
    xhr.setRequestHeader("Accept", "*/*");
    xhr.setRequestHeader("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    xhr.setRequestHeader("Origin", "https://s10.e3dc.com");
    xhr.setRequestHeader("Referer", BASE_URL + "/index.php?DENV=E3DC");

    // Use ARG0 to select the device, as seen in user's cURL
    var data = "DO=GETCONTENT&MODID=IDOVERVIEWUNITMAIN&ARG0=" + serialNo + "&TOS=-3600&DENV=E3DC";
    xhr.send(data);
}

function fetchLiveData(serialNo, callback) {
    var xhr = new XMLHttpRequest();
    var url = BASE_URL + "/phpcmd/cmd.php";

    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                // updateCookies(xhr); // Capture cookies from Live Data too

                try {
                    var response = JSON.parse(xhr.responseText);

                    if (response.ERRNO && (response.ERRNO !== 0 && response.ERRNO !== "0")) {
                        callback(false, "Live Data API Error. ERRNO: " + response.ERRNO);
                        return;
                    }

                    if (response.CONTENT) {
                        var content = JSON.parse(response.CONTENT);

                        // Parse values (summing up phases/strings where necessary)
                        var solar = parseInt(content.POWER_PV_S1 || 0) + parseInt(content.POWER_PV_S2 || 0) + parseInt(content.POWER_PV_S3 || 0);
                        var battery = parseInt(content.POWER_BAT || 0);
                        var home = parseInt(content.POWER_C_L1 || 0) + parseInt(content.POWER_C_L2 || 0) + parseInt(content.POWER_C_L3 || 0);

                        // Grid is likely POWER_LM (Load Meter) or POWER_ROOTLM. 
                        // POWER_AC seems to be Inverter Output (which equals Home Consumption when on Battery)
                        var grid = parseInt(content.POWER_LM_L1 || 0) + parseInt(content.POWER_LM_L2 || 0) + parseInt(content.POWER_LM_L3 || 0);

                        var wallbox = parseInt(content.POWER_WALLBOX || 0);
                        var soc = parseInt(content.SOC || 0);

                        var result = {
                            "solar": solar,
                            "battery": battery,
                            "home": home,
                            "grid": grid,
                            "wallbox": wallbox,
                            "soc": soc,
                            "raw": JSON.stringify(content, null, 2) // Pass raw data for debugging
                        };
                        callback(true, result);
                    } else {
                        callback(false, "Live Data response missing CONTENT. Raw: " + JSON.stringify(response));
                    }
                } catch (e) {
                    callback(false, "Error parsing Live Data: " + e.message);
                }
            } else {
                callback(false, "Live Data fetch failed: " + xhr.status);
            }
        }
    };

    // Generate a GUID for Window-Id if not exists
    if (!E3DC_WINDOW_ID) {
        E3DC_WINDOW_ID = "GUID-" + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Window-Id", E3DC_WINDOW_ID);
    // User's cURL did NOT have X-Requested-With, so removing it to match exactly
    // xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("Accept", "*/*");
    xhr.setRequestHeader("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    xhr.setRequestHeader("Origin", "https://s10.e3dc.com");
    xhr.setRequestHeader("Referer", BASE_URL + "/index.php?DENV=E3DC");

    // if (savedCookies) {
    //     xhr.setRequestHeader("Cookie", savedCookies);
    // }

    // Revert to exact payload from user's cURL (No Serial Number!)
    var data = "DO=LIVEUNITDATA&DENV=E3DC";
    xhr.send(data);
}



