// ==UserScript==
// @name         Picarto Helper
// @namespace    https://picarto.tv/
// @version      0.1
// @description  Beep boop
// @author       Nc5xb3
// @match        https://picarto.tv/*
// @match        https://www.picarto.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=picarto.tv
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.1.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js
// ==/UserScript==

/* global $, moment */

(function() {
    'use strict';

    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    function waitForElement(selector) { // occurs once
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

    function pullMessageAsText(element) {
        var texts = [];
        // custom-emoji-img emoji-img
        element.find('[class*=StandardTypeMessagecontainer__BlockRow]').each(function(index, element) {
            var message = $(this);
            var html = message.html();
            message.find('img').each(function(index, elementB) {
                var img = $(this);
                html = html.replace(img.html(), '<span>[emoji:' + img.attr('alt').replace(/:/g, '') + ']</span>');
            });
            texts.push($(html).text());
        });
        return texts;
    }

    function decipherChat(element) {
        let el = $(element);

        let messages = pullMessageAsText(el).join("\n");

        return {
            avatar: el.find('span.ant-avatar img').attr('src'),
            username: el.find('span[class*=ChannelDisplayName__Name]').text(),
            message: messages, // el.find('span[class*=Message__StyledSpan]').text(),
            element: el,
        };
    }

    function removeRedirect(element) {
        element.find('a').each(function(index) {
            var link = $(this);
            if (link.attr('href').startsWith('/site/referrer?go=')) {
                const search = link.attr('href').substring('/site/referrer?'.length);
                const params = new URLSearchParams(search);
                const go = params.get('go')
                link.attr('href', go);
            }
        });
    }

    var foundChatboxCallback = null;

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

                if (el.attr('class').includes('styled__ChatContainer')) {
                    console.log('chatbox found');
                    if (foundChatboxCallback) {
                        foundChatboxCallback();
                    }
                }
            });
        }
    }
    const ContainerObserver = new MutationObserver(containerCallback);

    const lastChatCallback = function(mutationList, observer) {
        // Use traditional 'for loops' for IE 11
        for (const mutation of mutationList) {
            let nodes = mutation.addedNodes;
            nodes.forEach(function(node) {
                // if there's no child nodes, then skip
                if (node.children.length === 0) {
                    return;
                }

                let el = $(node);

                removeRedirect(el);

                let messages = pullMessageAsText(el).join("\n");
                console.log(messages);
            });
        }
    }
    const LastChatObserver = new MutationObserver(lastChatCallback);

    const chatCallback = function(mutationList, observer) {
        // Use traditional 'for loops' for IE 11
        for (const mutation of mutationList) {
            let nodes = mutation.addedNodes;
            nodes.forEach(function(node) {
                // if there's no child nodes, then skip
                if (node.children.length === 0) {
                    return;
                }

                // get chat info
                const chatInfo = decipherChat(node);

                if (chatInfo.username !== '') {
                    console.log(chatInfo.username + ': ' + chatInfo.message);
                    removeRedirect(chatInfo.element);
                }

                var thing = chatInfo.element.find('[class*=styled__StandardMessageContainer]');

                if (thing && thing.children()[1]) {
                    LastChatObserver.disconnect();
                    LastChatObserver.observe(thing.children()[1], { childList: true });
                }
            });
        }
    }
    const ChatObserver = new MutationObserver(chatCallback);

    $(document).ready(() => {
        addGlobalStyle('#nc_clock { padding: 0 10px; }');

        // add clock
        waitForElement('[class*=styled__ChatSwitchContainer]').then(function(element) {
            var clock = $('<div/>').attr('id', 'nc_clock');

            $(element).prepend(clock);

            setInterval(function () {
                clock.html(moment().format('hh:mm:ss A'));
            }, 1000);
        });

        // observe container switches
        waitForElement('[class*=styled__ChatBoxContainer]').then(function(element) {
            ContainerObserver.disconnect();
            ContainerObserver.observe(element, { childList: true });
        });

        // add observer to chatbox area
        foundChatboxCallback = function() {
            waitForElement('[class*=ChannelChat__ChatVirtualList]').then(function(element) {
                console.log('[PLA] Listening to chat..');
                ChatObserver.disconnect();
                ChatObserver.observe(element, { childList: true });
            });
        };
        foundChatboxCallback();
    });
})();
