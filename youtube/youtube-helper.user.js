// ==UserScript==
// @name         Nc Youtube Helper
// @namespace    http://tampermonkey.net/
// @version      2025-11-18a
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
    let dividerEnabled = false

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

    let translationCheckInterval = null
    let scrollHandlers = [] // Store scroll handlers for cleanup
    const translatingMessages = new Set() // Track messages currently being translated to prevent duplicates
    let chatDivider = null
    let dividerBottomButton = null
    let dividerAfterNodeId = null // Store the ID of the message node the divider should be after (null = bottom)
    let isDragging = false
    let messageIdCounter = 0 // Counter for unique message IDs
    const applyStyles = function() {
        // Style for custom menu
        GM_addStyle('#yla-custom-menu { font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif; font-size: 14px; }');
        GM_addStyle('#yla-custom-menu span { user-select: none; }');
        GM_addStyle('.yla-status-indicator { color: #3ea6ff; font-weight: 500; }');

        // Modal styles
        GM_addStyle('#yla-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); z-index: 20000; display: flex; align-items: center; justify-content: center; }')
        GM_addStyle('#yla-modal { background: #282828; border-radius: 12px; padding: 24px; min-width: 300px; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); color: #fff; font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif; }')
        GM_addStyle('#yla-modal-title { font-size: 18px; font-weight: 500; margin-bottom: 16px; color: #fff; }')
        GM_addStyle('#yla-modal-message { font-size: 14px; margin-bottom: 20px; color: #e0e0e0; line-height: 1.5; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }')
        GM_addStyle('#yla-modal-buttons { display: flex; gap: 12px; justify-content: flex-end; }')
        GM_addStyle('#yla-modal-button { padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }')
        GM_addStyle('#yla-modal-button.primary { background: #3ea6ff; color: #fff; }')
        GM_addStyle('#yla-modal-button.primary:hover { background: #2d8ce8; }')
        GM_addStyle('#yla-modal-button.secondary { background: #3f3f3f; color: #fff; }')
        GM_addStyle('#yla-modal-button.secondary:hover { background: #4a4a4a; }')

        // Style for active YLA button indicator
        GM_addStyle('yt-button-shape#yla-menu-button.yla-active button { background-color: rgba(62, 166, 255, 0.2) !important; position: relative; }');
        GM_addStyle('yt-button-shape#yla-menu-button.yla-active button::after { content: ""; position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; background-color: #3ea6ff; border-radius: 50%; z-index: 1; }');

        GM_addStyle('.yla-new { color: red !important; }')

        GM_addStyle('span#timestamp { font-size:70% !important;float:left;position:absolute;top:-2px;color:#666 !important; }')
        GM_addStyle('span#author-name { position:relative;top:2px; }')
        GM_addStyle('yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer:hover { background-color:#444;opacity:100% !important; }')
        GM_addStyle('yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer { transition-property:opacity;transition-duration: .5s; }')

        // Divider styles
        GM_addStyle('#yla-chat-divider { position: absolute; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #3ea6ff, transparent); cursor: ns-resize; z-index: 1000; opacity: 0.7; transition: opacity 0.2s; }')
        GM_addStyle('#yla-chat-divider:hover { opacity: 1; height: 4px; }')
        GM_addStyle('#yla-chat-divider::before { content: ""; position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 40px; height: 8px; background: #3ea6ff; border-radius: 4px 4px 0 0; }')
        GM_addStyle('#yla-chat-divider::after { content: ""; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 40px; height: 4px; background: #3ea6ff; border-radius: 0 0 4px 4px; }')
        GM_addStyle('.yla-message-above-divider { opacity: 0.3 !important; }')
        GM_addStyle('.yla-message-below-divider { opacity: 1 !important; }')

        // Dot button to move divider to bottom
        GM_addStyle('#yla-divider-bottom-button { position: fixed; bottom: 10px; left: 10px; width: 12px; height: 12px; background: #3ea6ff; border-radius: 50%; cursor: pointer; z-index: 10001; opacity: 0.6; transition: all 0.2s; border: none; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }')
        GM_addStyle('#yla-divider-bottom-button:hover { opacity: 1; transform: scale(1.2); box-shadow: 0 2px 8px rgba(62, 166, 255, 0.5); }')
        GM_addStyle('#yla-divider-bottom-button:active { transform: scale(1.1); }')
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

    const showModal = function(title, message, buttons) {
        // Remove existing modal if any
        const existingModal = view.document.querySelector('#yla-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const overlay = view.document.createElement('div');
        overlay.setAttribute('id', 'yla-modal-overlay');
        
        const modal = view.document.createElement('div');
        modal.setAttribute('id', 'yla-modal');
        
        const titleEl = view.document.createElement('div');
        titleEl.setAttribute('id', 'yla-modal-title');
        titleEl.textContent = title;
        
        const messageEl = view.document.createElement('div');
        messageEl.setAttribute('id', 'yla-modal-message');
        messageEl.textContent = message;
        
        const buttonsEl = view.document.createElement('div');
        buttonsEl.setAttribute('id', 'yla-modal-buttons');
        
        buttons.forEach(function(button) {
            const btn = view.document.createElement('button');
            btn.setAttribute('id', 'yla-modal-button');
            btn.className = button.primary ? 'primary' : 'secondary';
            btn.textContent = button.text;
            btn.addEventListener('click', function() {
                if (button.onClick) {
                    button.onClick();
                }
                overlay.remove();
            });
            buttonsEl.appendChild(btn);
        });
        
        modal.appendChild(titleEl);
        modal.appendChild(messageEl);
        modal.appendChild(buttonsEl);
        overlay.appendChild(modal);
        
        // Close on overlay click
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Close on Escape key
        const escapeHandler = function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                view.document.removeEventListener('keydown', escapeHandler);
            }
        };
        view.document.addEventListener('keydown', escapeHandler);
        
        view.document.body.appendChild(overlay);
    }

    const showAlert = function(message, title = 'Notification') {
        showModal(title, message, [
            { text: 'OK', primary: true }
        ]);
    }

    const showConfirm = function(message, title = 'Confirm', onConfirm, onCancel) {
        showModal(title, message, [
            { text: 'Cancel', primary: false, onClick: onCancel },
            { text: 'OK', primary: true, onClick: onConfirm }
        ]);
    }

    const clearYLA = function() {
        table_seen.data = {}
        table_seen.save()
        logger('Cleared!')
        showAlert('Cleared YLA DATA!')
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

    const ensureMessageId = function(node) {
        if (!node.hasAttribute('yla-message-id')) {
            node.setAttribute('yla-message-id', 'yla-msg-' + (++messageIdCounter));
        }
        return node.getAttribute('yla-message-id');
    }

    const findNearestMessageNode = function(targetY, chat) {
        if (!chat || !view.document) return null;

        const chatRect = chat.getBoundingClientRect();
        const messages = Array.from(chat.querySelectorAll('yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer'));

        if (messages.length === 0) return null;

        let nearestNode = null;
        let minDistance = Infinity;

        messages.forEach(function(node) {
            const nodeRect = node.getBoundingClientRect();
            const nodeTop = nodeRect.top - chatRect.top;
            const nodeBottom = nodeRect.bottom - chatRect.top;

            // Check distance to bottom of message (we want divider after the message)
            const distToBottom = Math.abs(targetY - nodeBottom);
            if (distToBottom < minDistance) {
                minDistance = distToBottom;
                nearestNode = node;
            }
        });

        return nearestNode;
    }

    const updateMessageOpacity = function() {
        if (!chatDivider || !view.document) return;

        let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
        if (!chat) return;

        const dividerRect = chatDivider.getBoundingClientRect();
        const chatRect = chat.getBoundingClientRect();
        const dividerTop = dividerRect.top - chatRect.top;

        chat.querySelectorAll('yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer').forEach(function(node) {
            ensureMessageId(node); // Ensure all messages have IDs

            const nodeRect = node.getBoundingClientRect();
            const nodeTop = nodeRect.top - chatRect.top;
            const nodeBottom = nodeRect.bottom - chatRect.top;

            node.classList.remove('yla-message-above-divider', 'yla-message-below-divider');

            // If message overlaps or is above divider, it's above
            if (nodeBottom <= dividerTop + 5) {
                node.classList.add('yla-message-above-divider');
            } else {
                node.classList.add('yla-message-below-divider');
            }
        });
    }

    const createDivider = function(chat) {
        if (chatDivider) {
            chatDivider.remove();
        }

        chatDivider = view.document.createElement('div');
        chatDivider.setAttribute('id', 'yla-chat-divider');

        // Position divider at bottom initially - track the last message
        const messages = Array.from(chat.querySelectorAll('yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer'));
        if (messages.length > 0) {
            // Get the last message node and track it
            const lastMessage = messages[messages.length - 1];
            const nodeId = ensureMessageId(lastMessage);
            dividerAfterNodeId = nodeId;
        } else {
            // No messages, set to null (will position at bottom)
            dividerAfterNodeId = null;
        }

        // Make chat container relative positioned if not already
        const chatContainer = chat.parentElement;
        if (chatContainer) {
            const computedStyle = window.getComputedStyle(chatContainer);
            if (computedStyle.position === 'static') {
                chatContainer.style.position = 'relative';
            }
        }

        chat.appendChild(chatDivider);

        // Set initial position
        updateDividerPosition();

        // Add drag handlers
        let startY = 0;
        let startDividerTop = 0;

        chatDivider.addEventListener('mousedown', function(e) {
            isDragging = true;
            startY = e.clientY;
            const chatRect = chat.getBoundingClientRect();
            const dividerRect = chatDivider.getBoundingClientRect();
            startDividerTop = dividerRect.top - chatRect.top;
            e.preventDefault();
            e.stopPropagation();
        });

        const win = view.iframe ? view.document.defaultView : window;

        const mouseMoveHandler = function(e) {
            if (!isDragging || !chatDivider) return;

            let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
            if (!chat) return;

            const chatRect = chat.getBoundingClientRect();
            const deltaY = e.clientY - startY;
            const newTop = startDividerTop + deltaY;

            // Find nearest message node and snap to it
            const nearestNode = findNearestMessageNode(newTop, chat);

            if (nearestNode) {
                const nodeId = ensureMessageId(nearestNode);
                dividerAfterNodeId = nodeId;
                // Update immediately during dragging for responsive feel
                updateDividerPosition(true);
            }
        };

        const mouseUpHandler = function() {
            if (isDragging) {
                isDragging = false;
                // Final update with opacity when drag ends
                updateMessageOpacity();
            }
        };

        win.addEventListener('mousemove', mouseMoveHandler);
        win.addEventListener('mouseup', mouseUpHandler);

        // Store handlers for cleanup if needed
        chatDivider._mouseMoveHandler = mouseMoveHandler;
        chatDivider._mouseUpHandler = mouseUpHandler;

        // Create bottom button
        createDividerBottomButton();

        updateMessageOpacity();
    }

    const createDividerBottomButton = function() {
        // Remove existing button if any
        if (dividerBottomButton) {
            dividerBottomButton.remove();
        }

        dividerBottomButton = view.document.createElement('button');
        dividerBottomButton.setAttribute('id', 'yla-divider-bottom-button');
        dividerBottomButton.setAttribute('aria-label', 'Move divider to bottom');
        dividerBottomButton.setAttribute('title', 'Move divider to bottom');

        dividerBottomButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            moveDividerToBottom();
        });

        view.document.body.appendChild(dividerBottomButton);
    }

    let dividerUpdateTimeout = null;
    const updateDividerPosition = function(immediate = false) {
        if (!chatDivider) return;

        const updatePosition = function() {
            let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
            if (!chat) return;

            // Use requestAnimationFrame to ensure DOM is updated
            requestAnimationFrame(function() {
                const chatRect = chat.getBoundingClientRect();

                // Check if yla-message element exists
                const ylaMessage = chat.querySelector('#yla-message');
                let ylaMessageTop = null;
                if (ylaMessage) {
                    const ylaMessageRect = ylaMessage.getBoundingClientRect();
                    ylaMessageTop = ylaMessageRect.top - chatRect.top;
                }

                if (dividerAfterNodeId === null) {
                    // Position at bottom - but make sure it's not after yla-message
                    const chatHeight = chat.scrollHeight || chatRect.height;
                    let bottomPosition = chatHeight - 10;

                    // If yla-message exists and is near the bottom, position divider before it
                    if (ylaMessageTop !== null && ylaMessageTop < bottomPosition) {
                        bottomPosition = ylaMessageTop - 5;
                    }

                    chatDivider.style.top = bottomPosition + 'px';
                } else {
                    // Find the node we should be after
                    const targetNode = chat.querySelector('[yla-message-id="' + dividerAfterNodeId + '"]');
                    if (targetNode) {
                        const nodeRect = targetNode.getBoundingClientRect();
                        const nodeBottom = nodeRect.bottom - chatRect.top;
                        let dividerTop = nodeBottom;

                        // If yla-message exists and is after our target node, position divider before yla-message
                        if (ylaMessageTop !== null && ylaMessageTop > nodeBottom) {
                            dividerTop = ylaMessageTop - 5;
                        }

                        chatDivider.style.top = dividerTop + 'px';
                    } else {
                        // Node not found, move to bottom
                        dividerAfterNodeId = null;
                        const chatHeight = chat.scrollHeight || chatRect.height;
                        let bottomPosition = chatHeight - 10;

                        // If yla-message exists and is near the bottom, position divider before it
                        if (ylaMessageTop !== null && ylaMessageTop < bottomPosition) {
                            bottomPosition = ylaMessageTop - 5;
                        }

                        chatDivider.style.top = bottomPosition + 'px';
                    }
                }

                // Only update opacity if not dragging (to avoid performance issues during drag)
                if (!isDragging) {
                    updateMessageOpacity();
                }
            });
        };

        // If immediate (during dragging), update right away without debouncing
        if (immediate) {
            if (dividerUpdateTimeout) {
                clearTimeout(dividerUpdateTimeout);
                dividerUpdateTimeout = null;
            }
            updatePosition();
        } else {
            // Debounce updates to prevent jumping when not dragging
            if (dividerUpdateTimeout) {
                clearTimeout(dividerUpdateTimeout);
            }
            dividerUpdateTimeout = setTimeout(updatePosition, 50);
        }
    }

    const moveDividerToTop = function() {
        // Find the first message node and track it, so divider is at the top
        let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
        if (chat) {
            const messages = Array.from(chat.querySelectorAll('yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer'));
            if (messages.length > 0) {
                // Get the first message node
                const firstMessage = messages[0];
                const nodeId = ensureMessageId(firstMessage);
                dividerAfterNodeId = nodeId;
            } else {
                // No messages, set to null (will position at bottom)
                dividerAfterNodeId = null;
            }
        } else {
            dividerAfterNodeId = null;
        }
        updateDividerPosition();
    }

    const checkAndRestoreDivider = function() {
        if (!dividerEnabled) return; // Don't restore if divider is disabled

        let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
        if (!chat) return;

        // Check if divider exists and is in the DOM
        const existingDivider = chat.querySelector('#yla-chat-divider');
        if (!existingDivider || !chatDivider || !chat.contains(chatDivider)) {
            // Divider is missing, recreate it at the top
            logger('Divider missing, restoring to top');
            createDivider(chat);
            moveDividerToTop();
        }

        // Check if button exists
        const existingButton = view.document.querySelector('#yla-divider-bottom-button');
        if (!existingButton || !dividerBottomButton || !view.document.body.contains(dividerBottomButton)) {
            // Button is missing, recreate it
            createDividerBottomButton();
        }
    }

    const moveDividerToBottom = function() {
        // Find the last message node and track it, so new messages appear below
        let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
        if (chat) {
            const messages = Array.from(chat.querySelectorAll('yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer'));
            if (messages.length > 0) {
                // Get the last message node
                const lastMessage = messages[messages.length - 1];
                const nodeId = ensureMessageId(lastMessage);
                dividerAfterNodeId = nodeId;
            } else {
                // No messages, set to null (will position at bottom)
                dividerAfterNodeId = null;
            }
        } else {
            dividerAfterNodeId = null;
        }
        updateDividerPosition();
    }


    const callback = function(mutationList, observer) {
        // Use traditional 'for loops' for IE 11
        for (const mutation of mutationList) {
            let nodes = mutation.addedNodes;
            nodes.forEach(function(node) {
                // Skip if not an element node
                if (node.nodeType !== 1) {
                    return;
                }

                // Only process actual chat message renderers
                if (node.tagName !== 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER' &&
                    node.tagName !== 'YT-LIVE-CHAT-PAID-MESSAGE-RENDERER') {
                    return;
                }

                // if there's no child nodes, then skip
                if (node.children.length === 0) {
                    return;
                }

                // get chat info
                const chatInfo = decipherChat(node);

                processObject(chatInfo);

                // Ensure new message has an ID
                if (chatInfo.node) {
                    ensureMessageId(chatInfo.node);
                }

                // Update message opacity and divider position after new message is added
                if (chatDivider && dividerEnabled) {
                    setTimeout(function() {
                        // Check if divider still exists
                        checkAndRestoreDivider();

                        // Only update position if divider is at bottom (tracking no specific node)
                        // Otherwise, it should stay after the tracked node, so just update opacity
                        if (dividerAfterNodeId === null) {
                            // At bottom, update position to stay at bottom
                            updateDividerPosition();
                        } else {
                            // Tracking a specific node, just update opacity
                            // Position will be maintained by updateDividerPosition when needed
                            updateMessageOpacity();
                        }
                    }, 10);
                }
            });
        }
    };

    const ChatObserver = new MutationObserver(callback);

    let attempts = 10

    // Custom context menu
    let customMenu = null
    let menuButton = null

    const toggleAll = function() {
        // Check if at least one toggle is on
        const hasAnyOn = running || translate || dividerEnabled;
        
        if (hasAnyOn) {
            // Turn all off
            running = false;
            translate = false;
            dividerEnabled = false;
            
            // Hide divider and button
            if (chatDivider) {
                chatDivider.style.display = 'none';
            }
            if (dividerBottomButton) {
                dividerBottomButton.style.display = 'none';
            }
            
            // Remove translations
            view.document.querySelectorAll('span.nc-tl').forEach(function(node) {
                node.remove();
            });
        } else {
            // Turn all on
            running = true;
            translate = true;
            dividerEnabled = true;
            
            // Show/create divider
            let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer');
            if (chat) {
                createDivider(chat);
                // Process existing messages for seen tracking
                chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                    const chatInfo = decipherChat(node);
                    processObject(chatInfo);
                });
                // Process existing messages for translations
                chat.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(node) {
                    if (isElementInViewport(node)) {
                        const chatInfo = decipherChat(node);
                        processObject(chatInfo);
                    }
                });
            }
            if (dividerBottomButton) {
                dividerBottomButton.style.display = 'block';
            } else {
                createDividerBottomButton();
            }
        }
        
        // Update status displays
        if (customMenu) {
            if (customMenu.querySelector('#yla-seen-status')) {
                customMenu.querySelector('#yla-seen-status').textContent = running ? 'ON' : 'OFF';
            }
            if (customMenu.querySelector('#yla-translate-status')) {
                customMenu.querySelector('#yla-translate-status').textContent = translate ? 'ON' : 'OFF';
            }
            if (customMenu.querySelector('#yla-divider-status')) {
                customMenu.querySelector('#yla-divider-status').textContent = dividerEnabled ? 'ON' : 'OFF';
            }
        }
        
        updateButtonIndicator();
    }

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
        seenStatus.className = 'yla-status-indicator'
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
        translateStatus.className = 'yla-status-indicator'
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

        // Create Divider toggle menu item
        let dividerItem = view.document.createElement('div')
        dividerItem.setAttribute('id', 'yla-menu-divider')
        dividerItem.style.cssText = 'padding: 12px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; color: #fff;'

        let dividerLabel = view.document.createElement('span')
        dividerLabel.textContent = 'Divider'
        let dividerStatus = view.document.createElement('span')
        dividerStatus.setAttribute('id', 'yla-divider-status')
        dividerStatus.className = 'yla-status-indicator'
        dividerStatus.textContent = dividerEnabled ? 'ON' : 'OFF'
        dividerItem.appendChild(dividerLabel)
        dividerItem.appendChild(dividerStatus)
        dividerItem.addEventListener('click', function(ev) {
            dividerEnabled = !dividerEnabled
            dividerItem.querySelector('#yla-divider-status').textContent = dividerEnabled ? 'ON' : 'OFF'

            // Show/hide divider and button
            if (dividerEnabled) {
                let chat = view.document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
                if (chat) {
                    createDivider(chat)
                }
                if (dividerBottomButton) {
                    dividerBottomButton.style.display = 'block'
                } else {
                    createDividerBottomButton()
                }
            } else {
                if (chatDivider) {
                    chatDivider.style.display = 'none'
                }
                if (dividerBottomButton) {
                    dividerBottomButton.style.display = 'none'
                }
            }

            updateButtonIndicator()
            hideMenu()
        })
        dividerItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3f3f3f'
        })
        dividerItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent'
        })

        // Create "Toggle All" menu item
        let toggleAllItem = view.document.createElement('div')
        toggleAllItem.setAttribute('id', 'yla-menu-toggle-all')
        toggleAllItem.style.cssText = 'padding: 12px 16px; cursor: pointer; color: #fff; font-weight: 500;'
        toggleAllItem.textContent = 'Toggle All'
        toggleAllItem.addEventListener('click', function(ev) {
            toggleAll();
            hideMenu();
        })
        toggleAllItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3f3f3f'
        })
        toggleAllItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent'
        })

        // Create separator
        let separator = view.document.createElement('div')
        separator.style.cssText = 'height: 1px; background-color: #3f3f3f; margin: 4px 0;'

        // Create "Move Divider to Bottom" menu item
        let moveDividerItem = view.document.createElement('div')
        moveDividerItem.setAttribute('id', 'yla-menu-move-divider')
        moveDividerItem.style.cssText = 'padding: 12px 16px; cursor: pointer; color: #fff;'
        moveDividerItem.textContent = 'Move Divider to Bottom'
        moveDividerItem.addEventListener('click', function(ev) {
            moveDividerToBottom();
            hideMenu()
        })
        moveDividerItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3f3f3f'
        })
        moveDividerItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent'
        })

        // Create separator 2
        let separator2 = view.document.createElement('div')
        separator2.style.cssText = 'height: 1px; background-color: #3f3f3f; margin: 4px 0;'

        // Create "Clear Seen Data" menu item
        let clearSeenItem = view.document.createElement('div')
        clearSeenItem.setAttribute('id', 'yla-menu-clear-seen')
        clearSeenItem.style.cssText = 'padding: 12px 16px; cursor: pointer; color: #fff;'
        clearSeenItem.textContent = 'Clear Seen Data'
        clearSeenItem.addEventListener('click', function(ev) {
            showConfirm('Clear all seen data?', 'Clear Seen Data', function() {
                clearYLA();
                updateButtonIndicator()
                hideMenu()
            });
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
                showAlert(names.join("\r\n"), 'Seen Names');
            } else {
                showAlert('No seen names yet.', 'Seen Names');
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
        customMenu.appendChild(dividerItem)
        customMenu.appendChild(toggleAllItem)
        customMenu.appendChild(separator)
        customMenu.appendChild(moveDividerItem)
        customMenu.appendChild(separator2)
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
        if (customMenu.querySelector('#yla-divider-status')) {
            customMenu.querySelector('#yla-divider-status').textContent = dividerEnabled ? 'ON' : 'OFF'
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
        const hasActiveToggle = running || translate || dividerEnabled;

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
                    
                    // Ctrl+Click triggers toggle all
                    if (ev.ctrlKey || ev.metaKey) {
                        toggleAll();
                        return;
                    }
                    
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

                    // Create divider if enabled
                    if (dividerEnabled) {
                        createDivider(chat);

                        // Periodically check if divider is missing and restore it
                        setInterval(function() {
                            if (dividerEnabled) {
                                checkAndRestoreDivider();
                            }
                        }, 2000); // Check every 2 seconds
                    }

                    // Watch for chat height changes to update divider position
                    let resizeObserverTimeout = null;
                    const resizeObserver = new ResizeObserver(function() {
                        // Debounce resize observer to prevent excessive updates
                        if (resizeObserverTimeout) {
                            clearTimeout(resizeObserverTimeout);
                        }

                        resizeObserverTimeout = setTimeout(function() {
                            if (chatDivider) {
                                // Always update position - it will stick after the tracked node or at bottom
                                // This ensures the divider stays in the right place when chat grows
                                updateDividerPosition();
                            }
                        }, 100); // 100ms debounce for resize
                    });
                    resizeObserver.observe(chat);

                    chat.querySelectorAll('yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer').forEach(function(node) {
                        // Ensure all messages have IDs
                        ensureMessageId(node);

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
