// ==UserScript==
// @name         Nc Pawoo Helper (JP)
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

    const gtUrl = 'https://translate.google.com.au/?sl=en&tl=ja&op=translate&text=';
    const gtsUrl = 'https://script.google.com/macros/s/AKfycbwu1fQ7xNENwU2sa9aTWPSX4gNo6haowdMhzTQhX3eZ8c8Od5KMDe2ddQKH_cjQ3hyS/exec?source=en&target=ja&text=';
    var contentIndex = 0;

    GM_addStyle('div.ncjp-translation.hide { display: none; }');

    function openTranslate(id) {
        var content = $('div[ncjp-content-id=' + id + ']');
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

            var translationButton = $('button[ncjp-button-id="' + id + '"]');
            var translationBlock = $('div[ncjp-translation-id="' + id + '"]');

            translationBlock.html('翻訳。。。');
            GM_xmlhttpRequest({
                method: 'GET',
                url: gtsUrl + message,
                onload: function (res) {
                    if (res.status === 200) {
                        var translation = res.responseText.replace(/\n/g, '<br>');
                        translationBlock.html(translation);
                        translationButton.attr('state', 'on').html('グーグルによる英語からの翻訳');
                    } else {
                        translationBlock.html('翻訳に失敗。。。代わりにグーグルの翻訳ページを開く');
                        console.error('Failed to translate. Opening google translate page instead');
                        window.open(gtUrl + message, '_blank');
                        //window.open('https://www.deepl.com/en/translator?share=generic#ja/en/' + encodeURIComponent(text.join("\n")), '_blank');
                    }
                }
            });
        } else {
            console.log('div[ncjp-content-id=' + id + '] not found')
        }

        return true;
    }

    const enRegex = /[a-zA-Z]/g;

    function addGTbuttons() {
        if (!document.hasFocus()) {
            return false;
        }

        var contents = $('div.status__content:not(.ncjp-addon)');
        contents.each(function (index, element) {
            var el = $(element);
            el.addClass('ncjp-addon');
            // el.css('background-color', 'red');

            if (enRegex.test(el.text())) {
                el.attr('ncjp-content-id', ++contentIndex);

                // seems like they disabled onclick functions, so adding listeners..
                var link = $('<button/>')
                .attr('ncjp-button-id', contentIndex)
                .attr('state', 'off')
                .html('投稿を翻訳する')
                .on('click', function() {
                    var id = $(this).attr('ncjp-button-id');
                    var state = $(this).attr('state');
                    var translationBlock = $('div[ncjp-translation-id="' + id + '"]');
                    var translation = translationBlock.text();
                    if (state === 'off') {
                        translationBlock.removeClass('hide');
                        if (translation.length > 0) {
                            console.log('show existing translation', id);
                            $(this).attr('state', 'on').html('グーグルによる英語からの翻訳');
                        } else {
                            console.log('translate', id);
                            openTranslate(id)
                        }
                    } else {
                        console.log('hide translation', id);
                        translationBlock.addClass('hide');
                        $(this).attr('state', 'off').html('投稿を翻訳する');
                    }
                });
                link.insertAfter(el);

                var tlBlock = $('<div/>')
                .attr('ncjp-translation-id', contentIndex)
                .addClass('ncjp-translation');
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
