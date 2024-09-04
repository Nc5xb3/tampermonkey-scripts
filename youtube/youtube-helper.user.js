// ==UserScript==
// @name         Nc Youtube Helper
// @namespace    http://tampermonkey.net/
// @version      2024-09-04
// @description  try to take over the world!
// @author       Nc5xb3
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const gtsUrl = 'https://script.google.com/macros/s/AKfycbwu1fQ7xNENwU2sa9aTWPSX4gNo6haowdMhzTQhX3eZ8c8Od5KMDe2ddQKH_cjQ3hyS/exec?source=ja&target=en&text=';

    let running = false
    let translate = false

    let view = {
        iframe: false,
        document: null
    }
    const table_seen = {
        name: 'yla_seen',
        data: GM_getValue('yla_seen', {}),
        save: function() {
            GM_setValue('yla_seen', table_seen.data);
        }
    }

    function logger(message, css) {
        const prefix = '[YLA' + (view.iframe ? '-iframe' : '') + ']'
        console.log('%c' + prefix + ' ' + message, css ?? 'color: #e6ccf1')
    }
    function loggerObj(message, css) {
        const prefix = '[YLA' + (view.iframe ? '-iframe' : '') + ']'
        console.log('%c' + prefix, css ?? 'color: #e6ccf1', message)
    }

    function determineView() {
        let chatframe = document.getElementById('chatframe')
        if (chatframe) {
            view.iframe = true
            view.document = chatframe.contentDocument
        } else {
            view.iframe = false
            view.document = document
        }
    }

    let ageChatInterval = null
    const applyStyles = function() {
        // add styling
        //GM_addStyle('div#yla-mod { font-size: 12px; display: grid; text-align: center; padding: 0 10px; cursor: pointer; }');
        GM_addStyle('div#yla-mod.tl-on { color: #AAD; }');

        GM_addStyle('.yla-new { color: red !important; }')

        GM_addStyle('span#timestamp { font-size:70% !important;float:left;position:absolute;top:-2px;color:#666 !important; }')
        GM_addStyle('span#author-name { position:relative;top:2px; }')
        GM_addStyle('yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer:hover { background-color:#444;opacity:100% !important; }')
        GM_addStyle('yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer { transition-property:opacity;transition-duration: .5s; }')

        let opacities = [ 100, 95, 85, 70, 50, 30 ].sort((a, b) => a - b);
        let opacityCss = '';
        opacities.forEach(function(opac) {
            opacityCss += '.opacity-' + opac + '{opacity:' + opac + '%;}';
        });
        GM_addStyle(opacityCss)

        // create interval to age chat opacity
        if (ageChatInterval) {
            clearInterval(ageChatInterval)
        }
        ageChatInterval = setInterval(function() {
            // only when not focused
            if (view.document && !view.document.hasFocus()) {
                for (let index = 0; index < opacities.length - 1; index++) {
                    const a = opacities[index];
                    const b = opacities[index + 1];
                    view.document.querySelectorAll('.opacity-' + b).forEach(function(node) {
                        node.classList.remove('opacity-' + b)
                        node.classList.add('opacity-' + a);
                    });
                }
            }
        }, 1000 * 10)
    }

    const playSound = function(freq = 200, dur = 200, type = 'sine') {
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

    const clearYLA = function() {
        table_seen.data = {}
        table_seen.save()
        logger('Cleared!')
        alert('Cleared YLA DATA!')
    }

    const addSeen = function(name) {
        if (name in table_seen.data === false) {
            table_seen.data[name] = true
            table_seen.save()
            playSound()
            return true
        }
        return false
    }

    // Create Mutation Observer - https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

    const decipherChat = function(node) {
        if (node.tagName == 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER') {
            return {
                type: 'text',
                timestamp: node.querySelector('span#timestamp').textContent,
                author: node.querySelector('span#author-name').textContent,
                message: node.querySelector('span#message').textContent,
                image: node.querySelector('img#img').src,
                beforeContentButtons: node.querySelector('div#before-content-buttons'),
                badges: node.querySelector('span#chat-badges'),
                deleted: node.querySelector('span#deleted-state'),
                node: node
            }
        } else if (node.tagName == 'YT-LIVE-CHAT-PAID-MESSAGE-RENDERER') {
            return {
                type: 'paid',
                timestamp: node.querySelector('span#timestamp').textContent,
                author: node.querySelector('span#author-name').textContent,
                message: node.querySelector('div#message').textContent,
                purchaseAmount: node.querySelector('div#purchase-amount').textContent,
                node: node
            }
        }
        return {
            type: 'unknown',
            tagName: node.tagName,
            node: node
        }
    }

    const containsJapanese = function(string) {
        const regex = /[\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g
        return string.match(regex)
    }

    const processObject = function(obj) {
        if (obj.type == 'text') {
            obj.node.classList.add('opacity-100')

            const author = obj.author
            const message = obj.message
            if (translate && containsJapanese(message) && !obj.node.querySelector('span.nc-tl')) {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: gtsUrl + message,
                    onload: function (res) {
                        if (res.status === 200 && translate && !obj.node.querySelector('span.nc-tl')) {
                            var translation = res.responseText.replace(/\n/g, '<br>');

                            let translationElement = view.document.createElement('span')
                            translationElement.classList.add('nc-tl')
                            translationElement.setAttribute('style', 'display: block; font-size: 90%; color: #AAD;')
                            translationElement.textContent = translation
                            obj.node.querySelector('span#message').appendChild(translationElement)
                        }
                    }
                });
            }

            if (running) {
                const added = addSeen(author)
                if (added) {
                    obj.node.querySelector('span#author-name').classList.add('yla-new')
                }
            }
        }
    }

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

                processObject(chatInfo);
            });
        }
    };

    const ChatObserver = new MutationObserver(callback);

    let attempts = 10

    const displayButton = function() {
        let ylaButton = view.document.querySelector('div#yla-mod')
        if (ylaButton) {
            const location = ylaButton.getAttribute('location')
            logger('2/5 button already exists on ' + location)
            if (location === 'iframe') {
                attempts = 0
            } else {
                logger('2/5 removed button to be replaced... ')
                ylaButton.remove()
            }
            return false
        } else {
            let chatHeader = view.document.querySelector('yt-live-chat-header-renderer')
            if (!chatHeader) {
                logger('2/5 chat header not found')
                return false
            } else {
                logger('3/5 chat header found, adding button on ' + (view.iframe ? 'embed' : 'popup'))

                let customButton = view.document.createElement('div')
                customButton.setAttribute('id', 'yla-mod')
                customButton.setAttribute('style', 'font-size: 14px; display: grid; text-align: center; padding: 0 10px; cursor: pointer;')
                customButton.setAttribute('location', view.iframe ? 'iframe' : 'popup')
                customButton.textContent = 'MOD'

                let stateElement = view.document.createElement('span')
                stateElement.setAttribute('id', 'yla-state')
                stateElement.setAttribute('style', 'font-size: 11px;')
                stateElement.textContent = 'off'
                customButton.appendChild(stateElement)

                customButton.addEventListener('click', function (ev) {
                    // if held ctrl, ask if clear
                    if (ev.ctrlKey) {
                        if (confirm('clear seen data?')) {
                            clearYLA();
                        }
                        return;
                    } else if (ev.shiftKey) {
                        let names = Object.keys(table_seen.data);
                        alert(names.join("\r\n"));
                        return;
                    } else {
                        running = !running
                        stateElement.textContent = running ? 'on' : 'off'
                        if (running) {
                            let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
                            if (chat) {
                                chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                                    const chatInfo = decipherChat(node);
                                    processObject(chatInfo);
                                });
                            }
                        }
                    }
                })
                customButton.addEventListener('contextmenu', function (ev) {
                    translate = !translate
                    if (translate) {
                        customButton.classList.add('tl-on')

                        let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
                        if (chat) {
                            chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                                const chatInfo = decipherChat(node);
                                processObject(chatInfo);
                            });
                        }
                    } else {
                        customButton.classList.remove('tl-on')
                        view.document.querySelectorAll('span.nc-tl').forEach(function(node) {
                            node.remove()
                        });
                    }
                    ev.preventDefault()
                })

                // https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentElement
                chatHeader.querySelector('div#action-buttons').insertAdjacentElement('afterend', customButton)

                return true
            }
        }
    }

    const initYLA = () => {
        determineView()

        if (displayButton()) {
            // find chat then create observer
            let lookForChat = setInterval(function() {
                logger('4/5 looking for chat...')

                let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
                if (chat) {
                    logger('5/5 chat found, creating observer')
                    clearInterval(lookForChat)

                    ChatObserver.disconnect();
                    ChatObserver.observe(chat, { childList: true });

                    chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                        // get chat info
                        const chatInfo = decipherChat(node);

                        processObject(chatInfo);
                    });

                    let message = view.document.createElement('div')
                    message.setAttribute('id', 'yla-message')
                    message.setAttribute('style', 'font-size: 12px; padding: 5px 24px; color: #aaa;')
                    message.textContent = 'Observer started'
                    chat.append(message)

                    setTimeout(function() {
                        message.remove();
                    }, 3000);
                }
            }, 1000)
        } else {
            if (--attempts > 0) {
                logger('2/5 reattempt')
                setTimeout(initYLA, 1000)
            }
        }
    }

    window.addEventListener('yt-navigate-finish', function(event) {
        logger('1/5 yt-navigate-finish detected! Running init')
        attempts = 10
        setTimeout(initYLA, 100)
        applyStyles()
    })

    // load will occur in iframe and therefore applyStyles should guarantee scope
    window.addEventListener('load', function () {
        //logger('1/5 load detected! Running init')
        //setTimeout(initYLA, 100)
        applyStyles()
    })

})();
