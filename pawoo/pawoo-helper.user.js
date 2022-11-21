// ==UserScript==
// @name         Nc Pawoo Helper
// @namespace    https://pawoo.net/
// @version      0.2.2
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

    GM_addStyle('div.nc-translation.hide { display: none; }');

    function openTranslate(id) {
        var content = $('div[nc-content-id=' + id + ']');
        if (content.length) {
            var text = [];
            var paragraphs = content.find('p');
            paragraphs.each(function (index, element) {
                var p = $(element);
                var html = '<p>' + p.html() + '</p>';
                html = html.replace(/\<br\>/g, "\n");
                text.push($(html).text());
            })
            var message = encodeURIComponent(text.join("\n"));

            var translationButton = $('button[nc-button-id="' + id + '"]');
            var translationBlock = $('div[nc-translation-id="' + id + '"]');

            translationBlock.html('translating...');
            GM_xmlhttpRequest({
                method: 'GET',
                url: gtsUrl + message,
                onload: function (res) {
                    if (res.status === 200) {
                        var translation = res.responseText.replace(/\n/g, '<br>');
                        translationBlock.html(translation);
                        translationButton.attr('state', 'on').html('Translated from Japanese by Google');
                    } else {
                        translationBlock.html('translation failed... opening google translation page instead');
                        console.error('Failed to translate. Opening google translate page instead');
                        window.open(gtUrl + message, '_blank');
                        //window.open('https://www.deepl.com/en/translator?share=generic#ja/en/' + encodeURIComponent(text.join("\n")), '_blank');
                    }
                }
            });
        } else {
            console.log('div[nc-content-id=' + id + '] not found')
        }

        return true;
    }

    const jpRegex = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g;

    function addGTbuttons() {
        if (!document.hasFocus()) {
            return false;
        }

        var contents = $('div.status__content:not(.nc-addon)');
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
                .html('Translate Toot')
                .on('click', function() {
                    var id = $(this).attr('nc-button-id');
                    var state = $(this).attr('state');
                    var translationBlock = $('div[nc-translation-id="' + id + '"]');
                    var translation = translationBlock.text();
                    if (state === 'off') {
                        translationBlock.removeClass('hide');
                        if (translation.length > 0) {
                            console.log('show existing translation', id);
                            $(this).attr('state', 'on').html('Translated from Japanese by Google');
                        } else {
                            console.log('translate', id);
                            openTranslate(id)
                        }
                    } else {
                        console.log('hide translation', id);
                        translationBlock.addClass('hide');
                        $(this).attr('state', 'off').html('Translate Toot');
                    }
                });
                link.insertAfter(el);

                var tlBlock = $('<div/>')
                .attr('nc-translation-id', contentIndex)
                .addClass('nc-translation');
                tlBlock.insertAfter(link);
            } else {
                el.addClass('no-jp');
            }
        })
        if (contents.length) {
            console.log('found ' + contents.length + ' contents');
        }
    };

    $(document).ready(function () {
        setTimeout(function() {
            addGTbuttons();
            setInterval(addGTbuttons, 2500);
        }, 1000);
    });

})();
