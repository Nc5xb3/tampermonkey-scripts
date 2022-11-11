// ==UserScript==
// @name         Nc Youtube Helper
// @namespace    https://www.youtube.com/
// @version      0.2
// @description  help with chat mod stuff
// @author       Nc5xb3
// @match        https://www.youtube.com/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';
    var $ = window.jQuery;

    const table = {
        config: 'yla_config',
        data: 'yla_data',
    }
    let yla = {
        prefix: '[YLA]',
        ranInit: false,
        running: false,
        config: GM_getValue(table.config, { channels: {} }),
        data: GM_getValue(table.data, { seen: {} }),
    }
    let view = {
        iframe: false,
        popup: false,
        chat: null,
    }

    function logger(message, css) {
        console.log('%c' + message, css ?? 'color: #e6ccf1');
    }

    function determineView() {
        if ($('iframe#chatframe').length) {
            view.iframe = $('iframe#chatframe');
            view.popup = false;
            view.chat = $('iframe#chatframe').contents();
            yla.prefix = '[YLA]';
        } else {
            view.iframe = false;
            view.popup = true;
            view.chat = $('html');
            yla.prefix = '[YLA:POPUP]';
        }
    }

    function getChatElement() {
        return view.chat.find('#items.style-scope.yt-live-chat-item-list-renderer')
    }

    function getChannelName() {
        let channelElement = $('link[itemprop="name"]');
        if (channelElement.length) {
            return channelElement.attr('content');
        }
        return false;
    }

    function playSound(freq = 200, dur = 200, type = 'sine') {
        var context = new AudioContext();

        var oscillator = context.createOscillator();
        var gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = freq;
        oscillator.connect(gain);
        gain.gain.value = .02;
        gain.connect(context.destination);

        oscillator.start(0);

        setTimeout(function() {
            oscillator.disconnect();
            oscillator.stop();
            gain.disconnect();
        }, dur);
    }

    function decipherChat(element) {
        let el = $(element);

        return {
            image: el.find('img#img'),
            timestamp: el.find('span#timestamp'),
            author: el.find('span#author-name'),
            badges: el.find('span#chat-badges'),
            message: el.find('span#message'),
            deleted: el.find('span#deleted-state'),
            element: el,
        };
    }

    function clearYLA() {
        yla.data = { seen: {} };
        GM_setValue(table.data, yla.data);
        logger(yla.prefix + ' Cleared ' + table.data + '!');
        alert('Cleared YLA DATA!');
    }

    function addSeen(name) {
        if (name in yla.data.seen === false) {
            yla.data.seen[name] = true;
            playSound();
            GM_setValue(table.data, yla.data);
            return true;
        }
        return false;
    }

    function setChannelConfig(channel, state) {
        if (typeof channel === 'string' || channel instanceof String) {
            if (yla.config.channels[channel] != state) {
                logger(yla.prefix + ' set config for "' + channel + '" to ' + state);
                yla.config.channels[channel] = state;
                GM_setValue(table.config, yla.config);
            }
        }
    }
    function getChannelConfig(channel) {
        return yla.config.channels[channel] ?? false;
    }

    function addChatStyleDropdownListener() {
        let chatTypeDropdowns = view.chat.find('a.yt-dropdown-menu')
        chatTypeDropdowns.off().on('click', function() {
            if (view.chat.find('div#yla-mod').attr('state') === 'on') {
                logger(yla.prefix + ' Resetting button state');
                setTimeout(endObserver, 100);
                setTimeout(startObserver, 1100);
            }
        });
    }

    function setStyler() {
        let opacities = [ 100, 95, 85, 70, 50, 30 ].sort((a, b) => a - b);

        var styleTag = $('<style>' +
                         'span#timestamp { font-size:70% !important;float:left;position:absolute;top:-2px;color:#666 !important; }' +
                         'span#author-name { position:relative;top:2px; }' +
                         'yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer:hover { background-color:#444;opacity:100% !important; }' +
                         'yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer { transition-property:opacity;transition-duration: 1s; }' +
                         '</style>'
                        );
        view.chat.find('head').append(styleTag);

        let opacityCss = '';
        opacities.forEach(function(opac) {
            opacityCss += '.opacity-' + opac + '{opacity:' + opac + '%;}';
        });
        let styleTagB = $('<style>').html(opacityCss);
        view.chat.find('head').append(styleTagB);

        setInterval(function() {
            if (document.hasFocus() && view.chat.find('div#yla-mod').attr('state') === 'on') {
                for (let index = 0; index < opacities.length - 1; index++) {
                    const a = opacities[index];
                    const b = opacities[index + 1];
                    view.chat.find('.opacity-' + b).removeClass('opacity-' + b).addClass('opacity-' + a);
                }
            }
        }, 1000 * 60)
    }

    // Create Mutation Observer - https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

    const callback = function(mutationList, observer) {
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
                chatInfo.element.addClass('opacity-100');

                // add author to seen
                const author = chatInfo.author.text();
                const added = addSeen(author);
                if (added) {
                    chatInfo.author.css('color', 'red');
                }
            });
        }
    };

    const ChatObserver = new MutationObserver(callback);

    function startObserver() {
        let chatElement = getChatElement();
        if (chatElement !== null) {
            addChatStyleDropdownListener();

            logger(yla.prefix + ' Chat element found!');

            ChatObserver.disconnect();
            ChatObserver.observe(chatElement[0], { childList: true });

            logger(yla.prefix + ' Chat observer started.')

            view.chat.find('div#yla-mod').html('YLA on');

            let message = $('<div>')
            .attr('id', 'yla-message')
            .css('padding', '4px 24px')
            .css('color', '#AAA')
            .html('Observer started');

            $(chatElement).append(message);

            setTimeout(function() {
                message.remove();
            }, 3000);

            // update to current chat items
            $(chatElement).find('yt-live-chat-text-message-renderer').each(function(index, node) {
                // get chat info
                const chatInfo = decipherChat(node);
                chatInfo.element.addClass('opacity-100');

                // add author to seen
                const author = chatInfo.author.text();
                const added = addSeen(author);
                if (added) {
                    chatInfo.author.css('color', 'red');
                }
            });

            // make sound
            playSound(150, 150);
            setTimeout(function() {
                playSound(250, 150);
            }, 150);
        } else {
            console.error(yla.prefix + ' Chat element not found.');
            $('div#yla-mod').html('YLA fail');
        }
    }

    function endObserver() {
        let chatElement = getChatElement();
        if (chatElement !== null) {
            ChatObserver.disconnect();

            logger(yla.prefix + ' Chat observer ended.')

            view.chat.find('div#yla-mod').html('YLA off');

            let message = $('<div>')
            .attr('id', 'yla-message')
            .css('padding', '4px 24px')
            .css('color', '#AAA')
            .html('Observer disconnected');

            $(chatElement).append(message);

            setTimeout(function() {
                message.remove();
            }, 3000);

            // make sound
            playSound(250, 150);
            setTimeout(function() {
                playSound(150, 150);
            }, 150);
        } else {
            console.error(yla.prefix + ' Chat element not found.');
            $('div#yla-mod').html('YLA fail');
        }
    }

    function checkButtonState(customButton) {
        // if view is popup, skip
        if (view.popup) {
            return 0;
        }
        // set channel config
        const channel = getChannelName();
        const isActive = getChannelConfig(channel);
        logger(yla.prefix + ' Checking if YLA should be active for "' + channel + '"');
        if (isActive) {
            customButton.click();
            logger(yla.prefix + ' Turning button on!');
        }
    }

    function displayButton(isIframe) {
        // if button exists, don't do anything
        if (view.chat.find('div#yla-mod').length) {
            if (view.chat.find('div#yla-mod').attr('location') !== 'iframe') {
                // if button found but the location is not in iframe, replace button!
                logger(yla.prefix + ' Button to be replaced...');
                view.chat.find('div#yla-mod').remove();
            } else {
                logger(yla.prefix + ' Button exists, skipping process...');
                // checkButtonState(view.chat.find('div#yla-mod'));
                return false;
            }
        }

        let chatHeader = view.chat.find('yt-live-chat-header-renderer');

        if (chatHeader.length === 0) {
            console.error(yla.prefix + ' Failed to find chat frame');
            return false;
        }

        let customButton = $('<div>')
        .attr('id', 'yla-mod')
        .attr('state', 'off')
        .attr('title', table.data)
        .attr('location', isIframe ? 'iframe' : 'popup')
        .html('YLA off');

        customButton.on('click', function (ev) {
            // if held ctrl, ask if clear
            if (ev.ctrlKey) {
                if (confirm('clear seen data?')) {
                    clearYLA();
                }
                return;
            }
            if (ev.shiftKey) {
                let names = Object.keys(yla.data.seen);
                alert(names.join("\r\n"));
                return;
            }
            // toggle YLA
            const channel = getChannelName();
            if (customButton.attr('state') === 'on') {
                customButton.attr('state', 'off').html('YLA ...');
                setTimeout(endObserver, 100);
                setChannelConfig(channel, false);
            } else {
                customButton.attr('state', 'on').html('YLA ...');
                setTimeout(startObserver, 100);
                setChannelConfig(channel, true);
            }
        });

        // add listeners to chat style dropdown
        addChatStyleDropdownListener();

        // add button to display
        customButton.insertAfter(chatHeader.find('#primary-content'));
        logger(yla.prefix + ' Button added' + (!!view.popup ? ' in popup' : '') + '!');

        checkButtonState(view.chat.find('div#yla-mod'));

        // set stylers
        setStyler();
    }

    function initYLA() {
        if (yla.running) {
            return 0;
        }
        yla.running = true;
        setTimeout(function() {
            determineView();
            logger(yla.prefix + ' Initializing Youtube Livechat Assistant...');

            if (view.iframe) {
                logger(yla.prefix + ' Watching for an IFRAME to load...');
                view.iframe.on('load', function() {
                    logger(yla.prefix + ' IFRAME load event triggered!');
                    // determine view again in the case the button is added
                    determineView();

                    displayButton(true);
                });
            } else {
                displayButton(false);
            }
            yla.running = false;
        }, 100);
    }

    $(document).ready(() => {
        setTimeout(initYLA, 100);
        // add new listener when yt navigation happens
        if (!yla.ranInit) {
            yla.ranInit = true;
            $('body')[0].addEventListener('yt-navigate-finish', function(event) {
                logger(yla.prefix + ' yt-navigate-finish detected! Running init');
                initYLA();
            });
        }
    })

})();