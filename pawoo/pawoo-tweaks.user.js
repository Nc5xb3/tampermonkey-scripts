// ==UserScript==
// @name         Nc Pawoo tweaks
// @namespace    https://pawoo.net/
// @version      0.1.5
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
    const SHOW_FULL_IMAGE = GM_getValue('show_full_image', false);
    const ZOOM_IMAGE_ON_HOVER = GM_getValue('zoom_image_on_hover', false);

    function updateWidth(width) {
        // Enable advanced web interface: false
        GM_addStyle(`div.columns-area__panels__main { max-width: ${width}px; }`);
        GM_addStyle(`div.columns-area__panels__main > div.columns-area > div.column { max-width: ${width}px; }`);

        // Enable advanced web interface: true
        GM_addStyle(`div.ui > div.columns-area > div.column { width: ${width}px; }`);
    }
    function zoomImage(e) {
        e.target.style.setProperty('--x', (100 * e.offsetX / e.target.offsetWidth) + '%');
        e.target.style.setProperty('--y', (100 * e.offsetY / e.target.offsetHeight) + '%');
    }

    let zoomCss = '--x: 50%; --y: 50%;';
    zoomCss += 'transform: scale(var(--zoom));';
    zoomCss += 'transform-origin: var(--x) var(--y);';
    zoomCss += 'clip-path: inset(';
    zoomCss += 'calc((1 - 1/var(--zoom)) * (var(--y)))';
    zoomCss += 'calc((1 - 1/var(--zoom)) * (100% - var(--x)))';
    zoomCss += 'calc((1 - 1/var(--zoom)) * (100% - var(--y)))';
    zoomCss += 'calc((1 - 1/var(--zoom)) * (var(--x)))';
    zoomCss += ');';

    GM_addStyle('body.nc-show-full-image .media-gallery__item-thumbnail img, body.nc-show-full-image .media-gallery__preview { -o-object-fit: contain; object-fit: contain; background-color: rgba(0, 0, 0, .5); ' + zoomCss + ' }')
    GM_addStyle('body:not(.nc-show-full-image) .media-gallery__item-thumbnail img, body:not(.nc-show-full-image) .media-gallery__preview { -o-object-fit: cover; object-fit: cover; ' + zoomCss + ' }')

    GM_addStyle('body.nc-zoom-image .media-gallery__item-thumbnail img:hover, body.nc-zoom-image .media-gallery__preview:hover { --zoom: 3; }')
    GM_addStyle('body:not(.nc-zoom-image) .media-gallery__item-thumbnail img:hover, body:not(.nc-zoom-image) .media-gallery__preview:hover { --zoom: 1; }')

    function updateConfig(customWidth, showFullImage, zoomOnHover) {
        updateWidth(customWidth)

        $('body').toggleClass('nc-show-full-image', showFullImage)
        $('body').toggleClass('nc-zoom-image', zoomOnHover)

        if (zoomOnHover) {
            $(document).on('mousemove', '.media-gallery__item-thumbnail img', zoomImage)
        } else {
            $(document).off('mousemove', '.media-gallery__item-thumbnail img')
        }
    }

    updateConfig(MAX_WIDTH, SHOW_FULL_IMAGE, ZOOM_IMAGE_ON_HOVER)

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
                            $('<input/>').attr('id', 'nc-show-full-image').attr('type', 'checkbox').prop('checked', SHOW_FULL_IMAGE),
                            $('<label/>').css({ 'padding-left': '4px' }).attr('for', 'nc-show-full-image').html('display full image')
                        ]),

                        $('<div/>').addClass('nc-mt')
                        .css({
                            display: 'flex',
                        })
                        .html([
                            $('<input/>').attr('id', 'nc-zoom-image-on-hover').attr('type', 'checkbox').prop('checked', ZOOM_IMAGE_ON_HOVER),
                            $('<label/>').css({ 'padding-left': '4px' }).attr('for', 'nc-zoom-image-on-hover').html('zoom image on hover')
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
                                const NEW_SHOW_FULL_IMAGE = $('#nc-show-full-image').is(':checked')
                                const NEW_ZOOM_IMAGE_ON_HOVER = $('#nc-zoom-image-on-hover').is(':checked')

                                GM_setValue('custom_panel_width', NEW_WIDTH)
                                GM_setValue('show_full_image', NEW_SHOW_FULL_IMAGE)
                                GM_setValue('zoom_image_on_hover', NEW_ZOOM_IMAGE_ON_HOVER)

                                $('#nc-btn-message').html('saved')
                                setTimeout(function () {
                                    $('#nc-btn-message').html('')
                                }, 1000)

                                updateConfig(NEW_WIDTH, NEW_SHOW_FULL_IMAGE, NEW_ZOOM_IMAGE_ON_HOVER)

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
