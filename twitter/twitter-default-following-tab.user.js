// ==UserScript==
// @name         Twitter auto-switch to following tab
// @namespace    https://twitter.com/
// @version      0.1
// @description  try to take over the world!
// @author       Nc5xb3
// @match        https://twitter.com/home
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.1.min.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    function waitForElement(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    let tabOptionString = 'div[role="tablist"] > div[role="presentation"]';

    $(document).ready(function () {
        waitForElement(tabOptionString).then((elm) => {
            $(tabOptionString).find('span').each(function (i, e) {
                if (e.innerHTML === 'Following') {
                    $(e).trigger('click');
                }
            });
        });
    });
})();