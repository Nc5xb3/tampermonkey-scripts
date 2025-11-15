// ==UserScript==
// @name         Nc Pawoo tweaks
// @namespace    https://pawoo.net/
// @version      0.2.0
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

    // Widget CSS - Modern and clean styling
    GM_addStyle(`
        .nc-widget-container {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
        }
        
        .nc-toggle-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            color: #fff;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            user-select: none;
            margin-left: auto;
        }
        
        .nc-toggle-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .nc-toggle-button i {
            font-size: 18px;
        }
        
        .nc-panel {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 20px;
            margin-top: 12px;
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            min-width: 280px;
            color: #e0e0e0;
            animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .nc-panel-title {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin: 0 0 4px 0;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .nc-form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .nc-form-group label {
            font-size: 13px;
            color: #b0b0b0;
            font-weight: 500;
        }
        
        .nc-input-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .nc-panel input[type="number"] {
            flex: 1;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .nc-panel input[type="number"]:focus {
            outline: none;
            border-color: #667eea;
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .nc-panel input[type="number"]::-webkit-inner-spin-button,
        .nc-panel input[type="number"]::-webkit-outer-spin-button {
            opacity: 0.5;
        }
        
        .nc-input-suffix {
            color: #888;
            font-size: 13px;
        }
        
        .nc-checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            transition: background 0.2s ease;
        }
        
        .nc-checkbox-group:hover {
            background: rgba(255, 255, 255, 0.08);
        }
        
        .nc-panel input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #667eea;
        }
        
        .nc-panel input[type="checkbox"] + label {
            flex: 1;
            margin: 0;
            cursor: pointer;
            color: #e0e0e0;
            font-size: 14px;
        }
        
        .nc-button-group {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 8px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .nc-button {
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        
        .nc-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .nc-button:active {
            transform: translateY(0);
        }
        
        .nc-message {
            font-size: 13px;
            color: #4ade80;
            font-weight: 500;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .nc-message.show {
            opacity: 1;
        }
    `)

    $(document).ready(function() {
        // Create toggle button
        const toggleButton = $('<div/>')
            .addClass('nc-toggle-button')
            .attr('title', 'Customize Pawoo')
            .html($('<i/>').addClass('fa fa-cog'))
            .on('click', function(e) {
                e.stopPropagation()
                $('#nc-pawoo-panel').slideToggle(200)
                $(this).toggleClass('active')
            })

        // Create panel
        const panel = $('<div/>')
            .attr('id', 'nc-pawoo-panel')
            .addClass('nc-panel')
            .html([
                $('<h3/>').addClass('nc-panel-title').html('Settings'),
                
                $('<div/>').addClass('nc-form-group').html([
                    $('<label/>').html('Panel Content Width'),
                    $('<div/>').addClass('nc-input-wrapper').html([
                        $('<input/>')
                            .attr('id', 'nc-panel-width')
                            .attr('type', 'number')
                            .attr('min', '400')
                            .attr('max', '2000')
                            .val(MAX_WIDTH),
                        $('<span/>').addClass('nc-input-suffix').html('px')
                    ])
                ]),
                
                $('<div/>').addClass('nc-checkbox-group').html([
                    $('<input/>')
                        .attr('id', 'nc-show-full-image')
                        .attr('type', 'checkbox')
                        .prop('checked', SHOW_FULL_IMAGE),
                    $('<label/>')
                        .attr('for', 'nc-show-full-image')
                        .html('Display full image')
                ]),
                
                $('<div/>').addClass('nc-checkbox-group').html([
                    $('<input/>')
                        .attr('id', 'nc-zoom-image-on-hover')
                        .attr('type', 'checkbox')
                        .prop('checked', ZOOM_IMAGE_ON_HOVER),
                    $('<label/>')
                        .attr('for', 'nc-zoom-image-on-hover')
                        .html('Zoom image on hover')
                ]),
                
                $('<div/>').addClass('nc-button-group').html([
                    $('<span/>')
                        .attr('id', 'nc-btn-message')
                        .addClass('nc-message'),
                    $('<button/>')
                        .attr('id', 'nc-btn-save')
                        .addClass('nc-button')
                        .html('Save Settings')
                        .on('click', function() {
                            const NEW_WIDTH = parseInt($('#nc-panel-width').val()) || MAX_WIDTH
                            const NEW_SHOW_FULL_IMAGE = $('#nc-show-full-image').is(':checked')
                            const NEW_ZOOM_IMAGE_ON_HOVER = $('#nc-zoom-image-on-hover').is(':checked')

                            GM_setValue('custom_panel_width', NEW_WIDTH)
                            GM_setValue('show_full_image', NEW_SHOW_FULL_IMAGE)
                            GM_setValue('zoom_image_on_hover', NEW_ZOOM_IMAGE_ON_HOVER)

                            const message = $('#nc-btn-message')
                            message.html('✓ Saved').addClass('show')
                            
                            setTimeout(function() {
                                message.removeClass('show')
                                setTimeout(function() {
                                    message.html('')
                                }, 300)
                            }, 1500)

                            updateConfig(NEW_WIDTH, NEW_SHOW_FULL_IMAGE, NEW_ZOOM_IMAGE_ON_HOVER)
                        })
                ])
            ])
            .hide()
            .on('click', function(e) {
                e.stopPropagation()
            })

        // Create container
        const widget = $('<div/>')
            .addClass('nc-widget-container')
            .append(toggleButton)
            .append(panel)

        $('body').append(widget)

        // Close panel when clicking outside
        $(document).on('click', function(e) {
            if (!widget.is(e.target) && widget.has(e.target).length === 0) {
                if (panel.is(':visible')) {
                    panel.slideUp(200)
                    toggleButton.removeClass('active')
                }
            }
        })
    })

})();
