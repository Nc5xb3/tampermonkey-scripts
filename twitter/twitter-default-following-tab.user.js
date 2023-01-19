// ==UserScript==
// @name         Twitter auto-switch to following tab
// @namespace    https://twitter.com/
// @version      0.2
// @description  try to take over the world!
// @author       Nc5xb3
// @match        https://twitter.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.1.min.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    console.log('load auto switch tab')

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

    const containerCallback = function(mutationList, observer) {
        // Use traditional 'for loops' for IE 11
        for (const mutation of mutationList) {
            let nodes = mutation.addedNodes;
            nodes.forEach(function(node) {
                // if there's no child nodes, then skip
                if (node.children.length === 0) {
                    return;
                }


                let el = $(node);

                let page = el.find('h2 > span').text();
                console.log('page: ' + page);
                // can't filter to page === 'Home' because of different language

                el.find('div[role="presentation"] span').each(function (i, e) {
                    if (e.innerHTML === 'Following') {
                        console.log('following tab clicked');
                        $(e).trigger('click');
                    }
                });
            });
        }
    }
    const ContainerObserver = new MutationObserver(containerCallback);

    $(document).ready(function () {
        waitForElement('main[role="main"] > div').then(element => {
            let tablist = $(element).find('div[role="tablist"]');

            if (tablist) {
                ContainerObserver.disconnect();
                ContainerObserver.observe(element, { childList: true });
            } else {
                console.log('tablist not found');
            }
        });

    });
})();