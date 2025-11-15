// ==UserScript==
// @name         Nc Pawoo Helper
// @namespace    https://pawoo.net/
// @version      0.3.0
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

    const gtUrl = 'https://translate.google.com.au/?sl=ja&tl=en&op=translate&text=';
    const gtsUrl = 'https://script.google.com/macros/s/AKfycbwu1fQ7xNENwU2sa9aTWPSX4gNo6haowdMhzTQhX3eZ8c8Od5KMDe2ddQKH_cjQ3hyS/exec?source=ja&target=en&text=';
    var contentIndex = 0;
    var activeTranslationCount = 0;

    GM_addStyle(`
        div.nc-translation.hide { display: none; }
        div.nc-translation:empty { display: none; }

        /* Style translate button to match Pawoo/Mastodon theme */
        button[nc-button-id] {
            display: inline-block;
            margin: 4px 0;
            padding: 5px 12px;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.4;
            color: #6364ff;
            background: #e8e9ff;
            border: 1px solid #d0d1ff;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            text-decoration: none;
            box-sizing: border-box;
            outline: none;
        }

        button[nc-button-id]:hover {
            background: #d0d1ff;
            border-color: #6364ff;
            color: #6364ff;
        }

        button[nc-button-id]:active {
            transform: translateY(1px);
        }

        button[nc-button-id][state="on"] {
            color: #50a361;
            background: #e8f5eb;
            border-color: #c4e8d0;
        }

        button[nc-button-id][state="on"]:hover {
            background: #d0ead9;
            border-color: #50a361;
            color: #50a361;
        }

        /* Style translation block to match Pawoo content */
        div.nc-translation {
            margin: 8px 0 16px 0;
            padding: 12px;
            background: #f6f7f9;
            border-left: 3px solid #6364ff;
            border-radius: 4px;
            color: #282c37;
            font-size: 15px;
            line-height: 1.6;
        }
    `);

    // Function to extract text nodes that should be translated
    function extractTextNodesForTranslation(element) {
        var textNodes = [];
        var textSegments = [];

        // Elements to skip translating
        var skipTags = ['script', 'style', 'code', 'pre'];
        var skipSelectors = skipTags.join(',');

        // Walk through all nodes and collect text nodes that need translation
        function collectTextNodes(node, shouldSkip, parentTag) {
            if (node.nodeType === 3) { // Text node
                var textContent = node.textContent || '';
                var trimmed = textContent.trim();

                if (!trimmed) {
                    // Empty text node, skip
                    return;
                }

                // Check if parent is a link (keep links intact, but log it)
                var parent = node.parentNode;
                var parentIsLink = parent && parent.tagName && parent.tagName.toLowerCase() === 'a';

                if (shouldSkip) {
                    if (jpRegex.test(textContent)) {
                        console.log('[extractTextNodes] Skipped text node (shouldSkip=true, parent=' + parentTag + '): "' + trimmed.substring(0, 50) + '"');
                    }
                    return;
                }

                if (parentIsLink) {
                    if (jpRegex.test(textContent)) {
                        console.log('[extractTextNodes] Skipped text node (inside link): "' + trimmed.substring(0, 50) + '"');
                    }
                    return;
                }

                // Check if text contains Japanese
                if (jpRegex.test(textContent)) {
                    // Check if it's a hashtag or mention (starts with # or @)
                    // Only skip if it's ONLY a hashtag/mention (e.g., "#hashtag" or "@mention", not "text #hashtag")
                    var isOnlyHashtagMention = trimmed.match(/^[#@]\S+$/);

                    if (!isOnlyHashtagMention) {
                        textNodes.push(node);
                        textSegments.push(textContent);
                        console.log('[extractTextNodes] Found text node to translate: "' + trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : '') + '"');
                    } else {
                        console.log('[extractTextNodes] Skipping hashtag/mention: "' + trimmed + '"');
                    }
                }
            } else if (node.nodeType === 1) { // Element node
                var tagName = node.tagName ? node.tagName.toLowerCase() : '';
                var isSkipped = shouldSkip || skipTags.indexOf(tagName) !== -1;

                // Check if this element should be skipped
                var $node = $(node);
                if (skipSelectors && $node.is(skipSelectors)) {
                    isSkipped = true;
                }

                // Recursively process children
                for (var i = 0; i < node.childNodes.length; i++) {
                    collectTextNodes(node.childNodes[i], isSkipped, tagName);
                }
            }
        }

        // Collect all text nodes that need translation
        var elementDom = element[0];
        for (var i = 0; i < elementDom.childNodes.length; i++) {
            collectTextNodes(elementDom.childNodes[i], false, 'root');
        }

        // Summary logging
        console.log('[extractTextNodes] Summary: Found ' + textNodes.length + ' text node(s) to translate');

        // Also scan for any Japanese text we might have missed
        var allText = element.text();
        var allJapaneseMatches = allText.match(jpRegex);
        if (allJapaneseMatches) {
            var uniqueJapaneseChars = {};
            allJapaneseMatches.forEach(function(char) {
                uniqueJapaneseChars[char] = true;
            });
            var japaneseCharCount = Object.keys(uniqueJapaneseChars).length;
            if (textNodes.length === 0 && japaneseCharCount > 0) {
                console.warn('[extractTextNodes] WARNING: Found ' + japaneseCharCount + ' unique Japanese characters in element text, but extracted 0 text nodes! This might indicate missing nodes.');
            }
        }

        return {
            textNodes: textNodes,
            textSegments: textSegments
        };
    }

    // Function to apply translations to a cloned HTML element using translation map
    function applyTranslationsToClone(originalElement, translationMap) {
        var clone = originalElement.clone();
        var replacedCount = 0;

        // Elements to skip
        var skipTags = ['script', 'style', 'code', 'pre'];
        var skipSelectors = skipTags.join(',');

        // Walk through clone and replace matching text nodes
        function replaceTextNodes(node, shouldSkip) {
            if (node.nodeType === 3) { // Text node
                var textContent = node.textContent || '';

                if (!shouldSkip && textContent) {
                    var parent = node.parentNode;
                    if (parent && parent.tagName && parent.tagName.toLowerCase() === 'a') {
                        return;
                    }

                    // Check if this text has a translation
                    if (translationMap.hasOwnProperty(textContent)) {
                        var translation = translationMap[textContent];
                        node.textContent = translation;
                        replacedCount++;
                        console.log('[applyTranslationsToClone] Replaced: "' + textContent.substring(0, 30) + '" -> "' + translation.substring(0, 30) + '"');
                    }
                }
            } else if (node.nodeType === 1) { // Element node
                var tagName = node.tagName ? node.tagName.toLowerCase() : '';
                var isSkipped = shouldSkip || skipTags.indexOf(tagName) !== -1;

                var $node = $(node);
                if (skipSelectors && $node.is(skipSelectors)) {
                    isSkipped = true;
                }

                // Recursively process children
                for (var i = 0; i < node.childNodes.length; i++) {
                    replaceTextNodes(node.childNodes[i], isSkipped);
                }
            }
        }

        var cloneDom = clone[0];
        for (var i = 0; i < cloneDom.childNodes.length; i++) {
            replaceTextNodes(cloneDom.childNodes[i], false);
        }

        console.log('[applyTranslationsToClone] Replaced ' + replacedCount + ' text node(s)');

        return clone;
    }

    // Simple translation function - just translate all text in one call
    function openTranslateSimple(id) {
        activeTranslationCount++;
        var logPrefix = activeTranslationCount > 1 ?
            '[Simple Translation #' + id + ' - Total active: ' + activeTranslationCount + ']' :
            '[Simple Translation #' + id + ']';

        console.log(logPrefix + ' Simple translation called for post ID: ' + id);

        var content = $('div[nc-content-id=' + id + ']');
        if (content.length) {
            var translationButton = $('button[nc-button-id="' + id + '"]');
            var translationBlock = $('div[nc-translation-id="' + id + '"]');

            translationBlock.html('Translating...').removeClass('hide');

            // Get all text from the post (excluding links, scripts, etc.)
            var plainText = content.clone().find('a, script, style, code, pre').remove().end().text();
            var message = encodeURIComponent(plainText);

            GM_xmlhttpRequest({
                method: 'GET',
                url: gtsUrl + message,
                onload: function (res) {
                    activeTranslationCount--;
                    var remainingCount = activeTranslationCount;
                    var completionPrefix = remainingCount > 0 ?
                        '[Simple Translation #' + id + ' completed - ' + remainingCount + ' still active]' :
                        '[Simple Translation #' + id + ' completed]';

                    if (res.status === 200) {
                        var translation = res.responseText.trim().replace(/\n/g, '<br>');
                        translationBlock.html(translation).removeClass('hide');
                        translationButton.attr('state', 'on').html('Translated from Japanese by Google');
                        console.log(completionPrefix + ' Simple translation successful');
                    } else {
                        console.error(completionPrefix + ' Simple translation failed with status: ' + res.status);
                        translationBlock.html('translation failed... opening google translation page instead').removeClass('hide');
                        window.open(gtUrl + message, '_blank');
                    }
                }
            });
        } else {
            activeTranslationCount--;
            console.error(logPrefix + ' Content element not found (nc-content-id=' + id + ')');
        }

        return true;
    }

    function openTranslate(id) {
        activeTranslationCount++;
        var logPrefix = activeTranslationCount > 1 ?
            '[Translation #' + id + ' - Total active: ' + activeTranslationCount + ']' :
            '[Translation #' + id + ']';

        console.log(logPrefix + ' Translation called for post ID: ' + id);

        var content = $('div[nc-content-id=' + id + ']');
        if (content.length) {
            var translationButton = $('button[nc-button-id="' + id + '"]');
            var translationBlock = $('div[nc-translation-id="' + id + '"]');

            // Extract text nodes that need translation
            var extractionResult = extractTextNodesForTranslation(content);

            if (extractionResult.textSegments.length === 0) {
                activeTranslationCount--;
                console.log(logPrefix + ' No translatable text found, aborting translation');
                translationBlock.html('<em>No translatable text found</em>').removeClass('hide');
                return true;
            }

            console.log(logPrefix + ' Found ' + extractionResult.textSegments.length + ' text segment(s) to translate');

            // Get unique text segments (to avoid translating duplicates)
            var uniqueTexts = {};
            extractionResult.textSegments.forEach(function(segment) {
                uniqueTexts[segment] = true;
            });
            var uniqueTextArray = Object.keys(uniqueTexts);

            console.log(logPrefix + ' Found ' + uniqueTextArray.length + ' unique text segment(s) to translate (reusing translations for ' + (extractionResult.textSegments.length - uniqueTextArray.length) + ') duplicates)');

            // Translation map: original text -> translated text
            var translationMap = {};
            var completedCount = 0;
            var hasError = false;
            var totalUniqueSegments = uniqueTextArray.length;
            var delimiter = '@@@';

            // Function to update progress in translation block
            function updateProgress() {
                var progressText = 'Translating... (' + completedCount + '/' + totalUniqueSegments + ')';
                translationBlock.html(progressText).removeClass('hide');
            }

            // Show initial progress
            translationBlock.html('Translating... (0/' + totalUniqueSegments + ')').removeClass('hide');

            // Function to check if all translations are done
            function checkCompletion() {
                if (hasError) return;

                if (completedCount === totalUniqueSegments) {
                    activeTranslationCount--;
                    var remainingCount = activeTranslationCount;
                    var completionPrefix = remainingCount > 0 ?
                        '[Translation #' + id + ' completed - ' + remainingCount + ' still active]' :
                        '[Translation #' + id + ' completed]';

                    console.log(completionPrefix + ' All unique segments translated successfully');

                    // Apply translations to cloned HTML while preserving structure
                    var translatedClone = applyTranslationsToClone(content, translationMap);

                    // Get the translated HTML
                    var translatedHtml = translatedClone.html();

                    if (translatedHtml && translatedHtml.trim().length > 0) {
                        translationBlock.html(translatedHtml).removeClass('hide');
                        translationButton.attr('state', 'on').html('Translated from Japanese by Google');
                        console.log('[checkCompletion] HTML applied to translation block');
                    } else {
                        console.warn(completionPrefix + ' Translation returned empty HTML');
                        translationBlock.html('<em>Translation returned empty</em>').removeClass('hide');
                    }
                }
            }

            // Function to translate segments individually (fallback)
            function translateIndividually(segments, startIndex) {
                startIndex = startIndex || 0;
                segments.forEach(function(segment, idx) {
                    var actualIndex = startIndex + idx;
                    var message = encodeURIComponent(segment);

                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: gtsUrl + message,
                        onload: function (res) {
                            if (hasError) return;

                            if (res.status === 200) {
                                var translated = res.responseText.trim();
                                translationMap[segment] = translated;
                                completedCount++;

                                updateProgress();

                                var originalPreview = segment.substring(0, 30).replace(/\n/g, ' ');
                                var translatedPreview = translated.substring(0, 30).replace(/\n/g, ' ');
                                console.log(logPrefix + ' Segment ' + (actualIndex + 1) + '/' + totalUniqueSegments + ' translated individually: "' + originalPreview + '" -> "' + translatedPreview + '"');
                                checkCompletion();
                            } else {
                                if (!hasError) {
                                    hasError = true;
                                    activeTranslationCount--;
                                    var remainingCount = activeTranslationCount;
                                    var errorPrefix = remainingCount > 0 ?
                                        '[Translation #' + id + ' failed - ' + remainingCount + ' still active]' :
                                        '[Translation #' + id + ' failed]';

                                    console.error(errorPrefix + ' Translation failed for segment ' + (actualIndex + 1) + ' with status: ' + res.status);
                                    var plainText = content.clone().find('a, script, style, code, pre').remove().end().text();
                                    var fallbackMessage = encodeURIComponent(plainText);
                                    translationBlock.html('translation failed... opening google translation page instead').removeClass('hide');
                                    console.error('Failed to translate. Opening google translate page instead');
                                    window.open(gtUrl + fallbackMessage, '_blank');
                                }
                            }
                        }
                    });
                });
            }

            // Try to batch translate all unique segments at once
            if (uniqueTextArray.length > 1) {
                var batchedText = uniqueTextArray.join(delimiter);
                var message = encodeURIComponent(batchedText);

                console.log(logPrefix + ' Attempting batch translation of ' + uniqueTextArray.length + ' segments');

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: gtsUrl + message,
                    onload: function (res) {
                        if (hasError) return;

                        if (res.status === 200) {
                            var translated = res.responseText.trim();
                            var translatedSegments = translated.split(delimiter);

                            // Check if split count matches
                            if (translatedSegments.length === uniqueTextArray.length) {
                                console.log(logPrefix + ' Batch translation successful! Split matched (' + translatedSegments.length + ' segments)');

                                // Map translations
                                uniqueTextArray.forEach(function(segment, index) {
                                    var translatedText = translatedSegments[index].trim();
                                    translationMap[segment] = translatedText;
                                    completedCount++;

                                    var originalPreview = segment.substring(0, 30).replace(/\n/g, ' ');
                                    var translatedPreview = translatedText.substring(0, 30).replace(/\n/g, ' ');
                                    console.log(logPrefix + ' Segment ' + (index + 1) + '/' + totalUniqueSegments + ' from batch: "' + originalPreview + '" -> "' + translatedPreview + '"');
                                });

                                updateProgress();
                                checkCompletion();
                            } else {
                                // Split count doesn't match, fall back to individual translation
                                console.warn(logPrefix + ' Batch translation split mismatch! Expected ' + uniqueTextArray.length + ', got ' + translatedSegments.length + '. Falling back to individual translation.');
                                translateIndividually(uniqueTextArray, 0);
                            }
                        } else {
                            // API call failed, fall back to individual translation
                            console.warn(logPrefix + ' Batch translation failed with status ' + res.status + '. Falling back to individual translation.');
                            translateIndividually(uniqueTextArray, 0);
                        }
                    }
                });
            } else {
                // Only one segment, just translate it directly
                translateIndividually(uniqueTextArray, 0);
            }
        } else {
            activeTranslationCount--;
            console.error(logPrefix + ' Content element not found (nc-content-id=' + id + ')');
            console.log('div[nc-content-id=' + id + '] not found');
        }

        return true;
    }

    const jpRegex = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g;

    function addGTbuttons() {
        var contents = $('div.status__content:not(.nc-addon)');

        if (contents.length === 0) {
            return;
        }

        console.log('[addGTbuttons] Processing ' + contents.length + ' new post(s)');
        var buttonsAdded = 0;

        contents.each(function (index, element) {
            var el = $(element);
            el.addClass('nc-addon');
            // el.css('background-color', 'red');

            if (jpRegex.test(el.text())) {
                el.attr('nc-content-id', ++contentIndex);

                // seems like they disabled onclick functions, so adding listeners..
                var link = $('<button/>')
                .attr('nc-button-id', contentIndex)
                .attr('state', 'off')
                .html('Translate Post')
                .on('click', function(e) {
                    var id = $(this).attr('nc-button-id');
                    var state = $(this).attr('state');
                    var translationBlock = $('div[nc-translation-id="' + id + '"]');
                    var translation = translationBlock.text().trim();

                    // Check for Ctrl+click (or Cmd+click on Mac)
                    var isCtrlClick = e.ctrlKey || e.metaKey;

                    if (state === 'off') {
                        if (translation.length > 0) {
                            // Show existing translation
                            translationBlock.removeClass('hide');
                            console.log('show existing translation', id);
                            $(this).attr('state', 'on').html('Translated from Japanese by Google');
                        } else {
                            // Start new translation
                            if (isCtrlClick) {
                                // Ctrl+click: use simple translation
                                console.log('simple translate', id);
                                openTranslateSimple(id);
                            } else {
                                // Regular click: use complex translation
                                console.log('translate', id);
                                openTranslate(id);
                            }
                        }
                    } else {
                        console.log('hide translation', id);
                        translationBlock.addClass('hide');
                        $(this).attr('state', 'off').html('Translate Post');
                    }
                });

                // Check if button already exists to prevent duplicates
                var existingButton = el.next('button[nc-button-id="' + contentIndex + '"]');
                if (existingButton.length === 0) {
                link.insertAfter(el);
                    buttonsAdded++;
                } else {
                    console.warn('[addGTbuttons] Button already exists for post ID: ' + contentIndex);
                }

                var tlBlock = $('<div/>')
                .attr('nc-translation-id', contentIndex)
                .addClass('nc-translation hide');

                // Check if translation block already exists
                var existingBlock = $('div[nc-translation-id="' + contentIndex + '"]');
                if (existingBlock.length === 0) {
                tlBlock.insertAfter(link);
                } else {
                    console.warn('[addGTbuttons] Translation block already exists for post ID: ' + contentIndex);
                }
            } else {
                el.addClass('no-jp');
            }
        });

        if (buttonsAdded > 0) {
            console.log('[addGTbuttons] Added ' + buttonsAdded + ' translate button(s)');
        }
    };

    // Use MutationObserver to detect new posts as they're added to the DOM
    function setupObserver() {
        // Call addGTbuttons immediately for any existing posts
        addGTbuttons();

        // Create observer instance
        const observer = new MutationObserver(function(mutations) {
            let shouldCheck = false;

            // Check if any mutations added nodes that might be posts
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        // Check if the added node is a post or contains posts
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && node.classList.contains('status__content')) {
                                shouldCheck = true;
                            } else if (node.querySelectorAll) {
                                // Check if any child is a post
                                const posts = node.querySelectorAll('.status__content');
                                if (posts.length > 0) {
                                    shouldCheck = true;
                                }
                            }
                        }
                    });
                }
            });

            // Only process if we found potential new posts
            if (shouldCheck) {
                addGTbuttons();
            }
        });

        // Start observing the document body for changes
        observer.observe(document.body, {
            childList: true,    // Watch for added/removed child nodes
            subtree: true       // Watch all descendants, not just direct children
        });

        console.log('MutationObserver setup complete');
    }

    $(document).ready(function () {
        // Wait for page to be ready, then setup observer
        setTimeout(function() {
            setupObserver();
        }, 500);
    });

})();
