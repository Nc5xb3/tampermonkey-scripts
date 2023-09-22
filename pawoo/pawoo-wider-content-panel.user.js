// ==UserScript==
// @name         Nc Pawoo wide content panel
// @namespace    https://pawoo.net/
// @version      0.1.2
// @description  Beep boop
// @author       Nc5xb3
// @match        https://pawoo.net/*
// @match        https://www.pawoo.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pawoo.net
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://code.jquery.com/jquery-3.6.1.min.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    const MAX_WIDTH = GM_getValue('custom_panel_width', 800);
    const CONTAIN_IMAGE_ON_HOVER = GM_getValue('contain_image_on_hover', false);

    function updateWidth(width) {
        // Enable advanced web interface: false
        GM_addStyle(`div.columns-area__panels__main { max-width: ${width}px; }`);
        GM_addStyle(`div.columns-area__panels__main > div.columns-area > div.column { max-width: ${width}px; }`);

        // Enable advanced web interface: true
        GM_addStyle(`div.ui > div.columns-area > div.column { width: ${width}px; }`);
    }
    function setContainImageOnHover(bool) {
        console.log(bool)
        if (bool) {
            GM_addStyle('.media-gallery__item-thumbnail img:hover, .media-gallery__preview:hover { -o-object-fit: contain; object-fit: contain; background-color: rgba(0, 0, 0, .5) }')
        } else {
            GM_addStyle('.media-gallery__item-thumbnail img:hover, .media-gallery__preview:hover { -o-object-fit: cover; object-fit: cover; }')
        }
    }

    updateWidth(MAX_WIDTH)
    setContainImageOnHover(CONTAIN_IMAGE_ON_HOVER)

    // widget css
    GM_addStyle('.nc-panel { display: flex; flex-direction: column; padding: 5px; background-color: #202432; }')
    GM_addStyle('.nc-button { padding: 1px 5px; background-color: #32394e; }')
    GM_addStyle('.nc-mt { margin-top: 4px; }')

    $(document).ready(function() {
        let widget = $('<div/>')
            .css({
                'z-index': '9999',
                position: 'fixed',
                top: '5px',
                right: '8px',
                color: '#FFF',
            })
            .html([
                $('<div/>')
                .html([
                    $('<div/>').attr('title', 'nc customize').css({
                        color: '#53596c',
                        'text-align': 'right',
                    }).html(
                        $('<i/>').addClass('fa fa-cog')
                    )
                    .css({
                        'user-select': 'none',
                        cursor: 'pointer',
                    })
                    .on('click', function () {
                        $('#nc-pawoo-panel').toggle()
                    }),
                    $('<div/>').attr('id', 'nc-pawoo-panel').addClass('nc-panel').html([

                        $('<b/>').html('Panel content width'),
                        $('<div/>').addClass('nc-mt')
                        .css({
                            display: 'flex',
                        })
                        .html([
                            $('<input/>').attr('id', 'nc-panel-width').attr('type', 'number').val(MAX_WIDTH),
                            $('<span/>').css({ 'padding-left': '4px' }).html('px')
                        ]),

                        $('<div/>').addClass('nc-mt')
                        .css({
                            display: 'flex',
                        })
                        .html([
                            $('<input/>').attr('id', 'nc-contain-image-on-hover').attr('type', 'checkbox').prop('checked', CONTAIN_IMAGE_ON_HOVER),
                            $('<label/>').css({ 'padding-left': '4px' }).attr('for', 'nc-contain-image-on-hover').html('show full image on hover')
                        ]),

                        $('<div/>').addClass('nc-mt')
                        .css({
                            display: 'flex',
                            'flex-direction': 'row-reverse',
                        })
                        .html([
                            $('<div/>').attr('id', 'nc-btn-save').addClass('nc-button').html('save')
                            .css({
                                'user-select': 'none',
                                cursor: 'pointer',
                            })
                            .on('click', function() {
                                const NEW_WIDTH = $('#nc-panel-width').val()
                                const NEW_SHOW_FULL_IMAGE_ON_HOVER = $('#nc-contain-image-on-hover').is(':checked')

                                GM_setValue('custom_panel_width', NEW_WIDTH)
                                GM_setValue('contain_image_on_hover', NEW_SHOW_FULL_IMAGE_ON_HOVER)

                                $('#nc-btn-message').html('saved')
                                setTimeout(function () {
                                    $('#nc-btn-message').html('')
                                }, 1000)

                                updateWidth(NEW_WIDTH)
                                setContainImageOnHover(NEW_SHOW_FULL_IMAGE_ON_HOVER)
                            }),
                            $('<span/>').attr('id', 'nc-btn-message').css({ 'padding-right': '4px', 'font-size': '90%' }),
                        ])
                    ]).hide()
                ])
            ])

        $('body').append(widget)
        console.log('added widget')
    })

})();
