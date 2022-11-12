// ==UserScript==
// @name         Nc Pawoo Helper
// @namespace    https://pawoo.net/
// @version      0.1
// @description  Beep boop
// @author       Nc5xb3
// @match        https://pawoo.net/*
// @match        https://www.pawoo.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pawoo.net
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.1.min.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    const gtUrl = 'https://translate.google.com.au/?sl=ja&tl=en&op=translate&text=';
    var contentIndex = 0;

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
            window.open(gtUrl + encodeURIComponent(text.join("\n")), '_blank');
        } else {
            console.log('div[nc-content-id=' + id + '] not found')
        }

        return true;
    }

    function addGTbuttons() {
        if (!document.hasFocus()) {
            return false;
        }

        var contents = $('div.status__content:not(.nc-addon)');
        contents.each(function (index, element) {
            var el = $(element);
            el.addClass('nc-addon');
            // el.css('background-color', 'red');

            el.attr('nc-content-id', ++contentIndex);

            // seems like they disabled onclick functions, so adding listeners..
            var link = $('<button/>')
            .attr('nc-content-id', contentIndex)
            .html('open google translate')

            link.on('click', () => {
                var id = $(this).attr('nc-content-id')
                openTranslate(id)
            });

            link.insertAfter(el)
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
