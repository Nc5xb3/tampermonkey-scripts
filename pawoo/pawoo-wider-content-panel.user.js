// ==UserScript==
// @name         Nc Pawoo wide content panel
// @namespace    https://pawoo.net/
// @version      0.0.1
// @description  Beep boop
// @author       Nc5xb3
// @match        https://pawoo.net/*
// @match        https://www.pawoo.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pawoo.net
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @require      https://code.jquery.com/jquery-3.6.1.min.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    const MAX_WIDTH = 800;

    // Enable advanced web interface: false
    GM_addStyle(`div.columns-area__panels__main { width: ${MAX_WIDTH}px; max-width: ${MAX_WIDTH}px; }`);
    GM_addStyle(`div.columns-area__panels__main > div.columns-area > div.column { max-width: ${MAX_WIDTH}px; }`);

    // Enable advanced web interface: true
    GM_addStyle(`div.ui > div.columns-area > div.column { width: ${MAX_WIDTH}px; }`);

})();
