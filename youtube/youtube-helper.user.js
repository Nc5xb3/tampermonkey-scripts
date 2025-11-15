// ==UserScript==
// @name         Nc Youtube Helper
// @namespace    http://tampermonkey.net/
// @version      2025-11-15
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
    let translationCheckInterval = null
    let scrollHandlers = [] // Store scroll handlers for cleanup
    const translatingMessages = new Set() // Track messages currently being translated to prevent duplicates
    const applyStyles = function() {
        // Style for custom menu
        GM_addStyle('#yla-custom-menu { font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif; font-size: 14px; }');
        GM_addStyle('#yla-custom-menu span { user-select: none; }');
        GM_addStyle('#yla-seen-status, #yla-translate-status { color: #3ea6ff; font-weight: 500; }');

        // Style for active YLA button indicator
        GM_addStyle('yt-button-shape#yla-menu-button.yla-active button { background-color: rgba(62, 166, 255, 0.2) !important; position: relative; }');
        GM_addStyle('yt-button-shape#yla-menu-button.yla-active button::after { content: ""; position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; background-color: #3ea6ff; border-radius: 50%; z-index: 1; }');

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
        }, 2000 * 10)
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
            const timestampEl = node.querySelector('span#timestamp');
            const authorEl = node.querySelector('span#author-name');
            const messageEl = node.querySelector('span#message');
            const imageEl = node.querySelector('img#img');

            return {
                type: 'text',
                timestamp: timestampEl ? timestampEl.textContent : '',
                author: authorEl ? authorEl.textContent : '',
                message: messageEl ? messageEl.textContent : '',
                image: imageEl ? imageEl.src : '',
                beforeContentButtons: node.querySelector('div#before-content-buttons'),
                badges: node.querySelector('span#chat-badges'),
                deleted: node.querySelector('span#deleted-state'),
                node: node
            }
        } else if (node.tagName == 'YT-LIVE-CHAT-PAID-MESSAGE-RENDERER') {
            const timestampEl = node.querySelector('span#timestamp');
            const authorEl = node.querySelector('span#author-name');
            const messageEl = node.querySelector('div#message');
            const purchaseEl = node.querySelector('div#purchase-amount');

            return {
                type: 'paid',
                timestamp: timestampEl ? timestampEl.textContent : '',
                author: authorEl ? authorEl.textContent : '',
                message: messageEl ? messageEl.textContent : '',
                purchaseAmount: purchaseEl ? purchaseEl.textContent : '',
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

    const isElementInViewport = function(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const win = view.iframe ? view.document.defaultView : window;

        // Check if element is at least partially visible in viewport
        return (
            rect.top < win.innerHeight &&
            rect.bottom > 0 &&
            rect.left < win.innerWidth &&
            rect.right > 0
        );
    }

    const checkAndTranslateVisibleMessages = function() {
        if (!translate || !view.document) return;

        let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
        if (!chat) return;

        chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
            // Only process messages that are currently visible and need translation
            if (isElementInViewport(node)) {
                const chatInfo = decipherChat(node);
                if (chatInfo.type === 'text') {
                    const message = chatInfo.message;
                    // Skip if message is empty or already has translation
                    if (!message) return;

                    const hasTranslation = node.querySelector('span.nc-tl');

                    // Check if message needs translation (contains Japanese and doesn't have translation yet)
                    if (containsJapanese(message) && !hasTranslation) {
                        processObject(chatInfo);
                    }
                }
            }
        });
    }

    const processObject = function(obj) {
        if (obj.type == 'text') {
            obj.node.classList.add('opacity-100')

            const author = obj.author
            const message = obj.message
            if (translate && containsJapanese(message) && !obj.node.querySelector('span.nc-tl')) {
                // Only translate if the chat message is currently visible in the viewport
                if (isElementInViewport(obj.node)) {
                    // Create a unique key for this message to prevent duplicate requests
                    const messageKey = obj.node.getAttribute('id') || (obj.timestamp + '|' + obj.author + '|' + message.substring(0, 50));

                    // Skip if already translating this message
                    if (translatingMessages.has(messageKey)) {
                        return;
                    }

                    // Create placeholder element to show translation is in progress
                    const messageEl = obj.node.querySelector('span#message');
                    if (!messageEl) return; // Safety check

                    let placeholderElement = view.document.createElement('span')
                    placeholderElement.classList.add('nc-tl')
                    placeholderElement.setAttribute('style', 'display: block; font-size: 90%; color: #AAD;')
                    placeholderElement.textContent = '...'
                    messageEl.appendChild(placeholderElement)

                    // Store references to the specific elements to avoid querySelector issues
                    const messageNodeRef = obj.node
                    const placeholderRef = placeholderElement
                    const messageElRef = messageEl

                    // Mark as translating
                    translatingMessages.add(messageKey);

                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: gtsUrl + encodeURIComponent(message),
                        onload: function (res) {
                            // Remove from translating set
                            translatingMessages.delete(messageKey);

                            // Verify the placeholder is still in the correct message element
                            // and that it's still the same placeholder we created
                            if (placeholderRef && placeholderRef.parentElement === messageElRef &&
                                placeholderRef.textContent === '...' && res.status === 200 && translate) {
                                // Check again if element is still in viewport before updating translation
                                if (isElementInViewport(messageNodeRef)) {
                                    var translation = res.responseText.replace(/\n/g, '<br>');
                                    placeholderRef.textContent = translation
                                } else {
                                    // Element scrolled out of view, remove placeholder
                                    placeholderRef.remove()
                                }
                            }
                        },
                        onerror: function() {
                            // Remove from translating set
                            translatingMessages.delete(messageKey);

                            // Remove placeholder on error - verify it's still in the right place
                            if (placeholderRef && placeholderRef.parentElement === messageElRef &&
                                placeholderRef.textContent === '...') {
                                placeholderRef.remove()
                            }
                        }
                    });
                }
            }

            if (running) {
                const added = addSeen(author)
                if (added) {
                    const authorNameEl = obj.node.querySelector('span#author-name');
                    if (authorNameEl) {
                        authorNameEl.classList.add('yla-new');
                    }
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

    // Custom context menu
    let customMenu = null
    let menuButton = null

    const createCustomMenu = function() {
        // Create menu container
        customMenu = view.document.createElement('div')
        customMenu.setAttribute('id', 'yla-custom-menu')
        customMenu.style.cssText = 'position: fixed; background-color: #282828; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); padding: 8px 0; min-width: 200px; z-index: 10000; display: none;'

        // Create Seen Tracking menu item
        let seenItem = view.document.createElement('div')
        seenItem.setAttribute('id', 'yla-menu-seen')
        seenItem.style.cssText = 'padding: 12px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; color: #fff;'

        let seenLabel = view.document.createElement('span')
        seenLabel.textContent = 'Seen Tracking'
        let seenStatus = view.document.createElement('span')
        seenStatus.setAttribute('id', 'yla-seen-status')
        seenStatus.textContent = running ? 'ON' : 'OFF'
        seenItem.appendChild(seenLabel)
        seenItem.appendChild(seenStatus)
        seenItem.addEventListener('click', function(ev) {
            running = !running
            seenItem.querySelector('#yla-seen-status').textContent = running ? 'ON' : 'OFF'
            if (running) {
                let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
                if (chat) {
                    chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                        const chatInfo = decipherChat(node);
                        processObject(chatInfo);
                    });
                }
            }
            updateButtonIndicator()
            hideMenu()
        })
        seenItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3f3f3f'
        })
        seenItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent'
        })

        // Create Translation menu item
        let translateItem = view.document.createElement('div')
        translateItem.setAttribute('id', 'yla-menu-translate')
        translateItem.style.cssText = 'padding: 12px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; color: #fff;'

        let translateLabel = view.document.createElement('span')
        translateLabel.textContent = 'Translations'
        let translateStatus = view.document.createElement('span')
        translateStatus.setAttribute('id', 'yla-translate-status')
        translateStatus.textContent = translate ? 'ON' : 'OFF'
        translateItem.appendChild(translateLabel)
        translateItem.appendChild(translateStatus)
        translateItem.addEventListener('click', function(ev) {
            translate = !translate
            translateItem.querySelector('#yla-translate-status').textContent = translate ? 'ON' : 'OFF'
            if (translate) {
                let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
                if (chat) {
                    chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                        if (isElementInViewport(node)) {
                            const chatInfo = decipherChat(node);
                            processObject(chatInfo);
                        }
                    });
                }
            } else {
                view.document.querySelectorAll('span.nc-tl').forEach(function(node) {
                    node.remove()
                });
            }
            updateButtonIndicator()
            hideMenu()
        })
        translateItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3f3f3f'
        })
        translateItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent'
        })

        // Create separator
        let separator = view.document.createElement('div')
        separator.style.cssText = 'height: 1px; background-color: #3f3f3f; margin: 4px 0;'

        // Create "Clear Seen Data" menu item
        let clearSeenItem = view.document.createElement('div')
        clearSeenItem.setAttribute('id', 'yla-menu-clear-seen')
        clearSeenItem.style.cssText = 'padding: 12px 16px; cursor: pointer; color: #fff;'
        clearSeenItem.textContent = 'Clear Seen Data'
        clearSeenItem.addEventListener('click', function(ev) {
            if (confirm('Clear all seen data?')) {
                clearYLA();
                updateButtonIndicator()
                hideMenu()
            }
        })
        clearSeenItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3f3f3f'
        })
        clearSeenItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent'
        })

        // Create "Show Seen Names" menu item
        let showNamesItem = view.document.createElement('div')
        showNamesItem.setAttribute('id', 'yla-menu-show-names')
        showNamesItem.style.cssText = 'padding: 12px 16px; cursor: pointer; color: #fff;'
        showNamesItem.textContent = 'Show Seen Names'
        showNamesItem.addEventListener('click', function(ev) {
            let names = Object.keys(table_seen.data);
            if (names.length > 0) {
                alert(names.join("\r\n"));
            } else {
                alert('No seen names yet.');
            }
            hideMenu()
        })
        showNamesItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3f3f3f'
        })
        showNamesItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent'
        })

        customMenu.appendChild(seenItem)
        customMenu.appendChild(translateItem)
        customMenu.appendChild(separator)
        customMenu.appendChild(clearSeenItem)
        customMenu.appendChild(showNamesItem)
        view.document.body.appendChild(customMenu)
    }

    const showMenu = function(buttonElement) {
        if (!customMenu) {
            createCustomMenu()
        }

        // Update status displays
        if (customMenu.querySelector('#yla-seen-status')) {
            customMenu.querySelector('#yla-seen-status').textContent = running ? 'ON' : 'OFF'
        }
        if (customMenu.querySelector('#yla-translate-status')) {
            customMenu.querySelector('#yla-translate-status').textContent = translate ? 'ON' : 'OFF'
        }

        // Update button indicator
        updateButtonIndicator()

        // Position menu near button, ensuring it stays within viewport
        const rect = buttonElement.getBoundingClientRect()
        const win = view.iframe ? view.document.defaultView : window

        // Show menu temporarily to get its dimensions
        customMenu.style.display = 'block'
        const menuWidth = customMenu.offsetWidth
        const menuHeight = customMenu.offsetHeight
        const viewportWidth = win.innerWidth
        const viewportHeight = win.innerHeight

        // Calculate initial position (below button, aligned to left)
        let left = rect.left
        let top = rect.bottom + 4

        // Adjust if menu would go off the right edge
        if (left + menuWidth > viewportWidth) {
            left = viewportWidth - menuWidth - 8 // 8px padding from edge
        }

        // Adjust if menu would go off the left edge
        if (left < 8) {
            left = 8
        }

        // Adjust if menu would go off the bottom edge
        if (top + menuHeight > viewportHeight) {
            // Try positioning above button instead
            top = rect.top - menuHeight - 4
            // If still doesn't fit, position at bottom of viewport
            if (top < 8) {
                top = viewportHeight - menuHeight - 8
            }
        }

        // Adjust if menu would go off the top edge
        if (top < 8) {
            top = 8
        }

        customMenu.style.top = top + 'px'
        customMenu.style.left = left + 'px'
    }

    const hideMenu = function() {
        if (customMenu) {
            customMenu.style.display = 'none'
        }
    }

    const updateButtonIndicator = function() {
        if (!menuButton) return;

        // Check if any toggles are active
        const hasActiveToggle = running || translate;

        if (hasActiveToggle) {
            menuButton.classList.add('yla-active');
        } else {
            menuButton.classList.remove('yla-active');
        }
    }

    const displayButton = function() {
        let existingButton = view.document.querySelector('yt-button-shape#yla-menu-button, div#yla-menu-button')

        if (existingButton) {
            const location = existingButton.getAttribute('location')
            logger('2/5 button already exists on ' + location)
            if (location === 'iframe') {
                attempts = 0
            } else {
                logger('2/5 removed button to be replaced... ')
                existingButton.remove()
            }
            return false
        } else {
            let chatHeader = view.document.querySelector('yt-live-chat-header-renderer')
            if (!chatHeader) {
                logger('2/5 chat header not found')
                return false
            } else {
                logger('3/5 chat header found, adding button on ' + (view.iframe ? 'embed' : 'popup'))

                let actionButtons = chatHeader.querySelector('div#action-buttons')
                if (!actionButtons) {
                    logger('2/5 action buttons not found')
                    return false
                }

                // Create button using YouTube's button shape
                menuButton = view.document.createElement('yt-button-shape')
                menuButton.setAttribute('id', 'yla-menu-button')
                menuButton.setAttribute('location', view.iframe ? 'iframe' : 'popup')

                let button = view.document.createElement('button')
                button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--text'
                button.setAttribute('aria-label', 'YLA Options')
                button.setAttribute('type', 'button')

                let buttonTextWrapper = view.document.createElement('span')
                buttonTextWrapper.className = 'yt-spec-button-shape-next__button-text-content'

                let buttonText = view.document.createElement('span')
                buttonText.textContent = 'YLA'

                buttonTextWrapper.appendChild(buttonText)
                button.appendChild(buttonTextWrapper)
                menuButton.appendChild(button)

                // Add click handler to show menu
                button.addEventListener('click', function(ev) {
                    ev.stopPropagation()
                    if (customMenu && customMenu.style.display === 'block') {
                        hideMenu()
                    } else {
                        showMenu(button)
                    }
                })

                // Click outside to close menu
                view.document.addEventListener('click', function(ev) {
                    if (customMenu && customMenu.style.display === 'block') {
                        if (!customMenu.contains(ev.target) && ev.target !== button && !button.contains(ev.target)) {
                            hideMenu()
                        }
                    }
                })

                actionButtons.appendChild(menuButton)

                // Update indicator based on initial state
                updateButtonIndicator()

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
                        // Only process messages that are currently visible
                        if (isElementInViewport(node)) {
                            // get chat info
                            const chatInfo = decipherChat(node);

                            processObject(chatInfo);
                        }
                    });

                    // Also handle existing messages that might not have been processed
                    chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                        const authorNameEl = node.querySelector('span#author-name');
                        if (authorNameEl && !authorNameEl.hasAttribute('yla-click-handled')) {
                            authorNameEl.setAttribute('yla-click-handled', 'true');
                            authorNameEl.addEventListener('click', function(ev) {
                                const target = ev.target;

                                const isClickingAuthorName = (target === authorNameEl ||
                                                             (authorNameEl.contains(target) &&
                                                              !target.closest('button, yt-button-shape, yt-icon-button, [role="button"], a')));

                                if (isClickingAuthorName) {
                                    ev.stopPropagation();
                                    ev.preventDefault();
                                    ev.stopImmediatePropagation();
                                }
                            }, true);
                        }
                    });

                    // Clean up previous intervals and listeners
                    if (translationCheckInterval) {
                        clearInterval(translationCheckInterval);
                        translationCheckInterval = null;
                    }
                    // Remove previous scroll handlers
                    scrollHandlers.forEach(function(handler) {
                        if (handler.element && handler.handler) {
                            handler.element.removeEventListener('scroll', handler.handler);
                        }
                    });
                    scrollHandlers = [];

                    // Add scroll listener to translate messages that scroll into view
                    let scrollTimeout = null;
                    const scrollHandler = function() {
                        if (scrollTimeout) {
                            clearTimeout(scrollTimeout);
                        }
                        scrollTimeout = setTimeout(function() {
                            checkAndTranslateVisibleMessages();
                        }, 100); // Throttle to check every 100ms during scrolling
                    };

                    // Find the scrollable container - try multiple potential containers
                    let scrollContainer = chat.closest('yt-live-chat-item-list-renderer');
                    if (scrollContainer) {
                        scrollContainer.addEventListener('scroll', scrollHandler, { passive: true });
                        scrollHandlers.push({ element: scrollContainer, handler: scrollHandler });
                    }

                    // Also listen to window/document scroll for iframes
                    const win = view.iframe ? view.document.defaultView : window;
                    win.addEventListener('scroll', scrollHandler, { passive: true });
                    scrollHandlers.push({ element: win, handler: scrollHandler });

                    // Also check periodically in case scroll events don't fire (e.g., programmatic scrolling)
                    translationCheckInterval = setInterval(function() {
                        if (translate) {
                            checkAndTranslateVisibleMessages();
                        }
                    }, 1000); // Check every second for messages that need translation

                    view.document.querySelectorAll('div#yla-message').forEach(function(node) {
                        node.remove()
                    });

                    let message = view.document.createElement('div')
                    message.setAttribute('id', 'yla-message')
                    message.setAttribute('style', 'font-size: 12px; padding: 5px 24px; color: #aaa;')
                    message.textContent = 'Observer started'
                    chat.append(message)

                    setTimeout(function() {
                        message.remove();
                    }, 3000);

                    // auto remove annoying message
                    view.document.querySelectorAll('yt-live-chat-viewer-engagement-message-renderer').forEach(function(node) {
                        if (node.textContent.includes('Welcome to live chat!')) {
                            node.remove()
                        }
                    });
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
        setTimeout(initYLA, 100)
        applyStyles()
    })

})();
