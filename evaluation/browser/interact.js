/**
 * Author: Taye Adeyemi
 * Date: 2021-05-01
 * JavaScript drag and drop, resizing, and multi-touch gestures for modern browsers (and also IE9+) - Dragging, Resizing
 * Code version: 1.10.11
 * Type: Source code
 * URL: https://interactjs.io/
 * 
 */

import interact from 'https://cdn.interactjs.io/v1.10.11/interactjs/index.js';

interact('.resize-drag')
    .resizable({
        // resize from all edges and corners
        edges: { left: true, right: true, bottom: true, top: true },

        listeners: {
            move(event) {
                var target = event.target
                var x = (parseFloat(target.getAttribute('data-x')) || 0)
                var y = (parseFloat(target.getAttribute('data-y')) || 0)

                // update the element's style
                target.style.width = event.rect.width + 'px'
                target.style.height = event.rect.height + 'px'

                // translate when resizing from top or left edges
                x += event.deltaRect.left
                y += event.deltaRect.top

                target.style.transform = `translate(${x}px, ${y}px)`;

                target.setAttribute('data-x', x)
                target.setAttribute('data-y', y)
                target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
            }
        },
        modifiers: [
            // keep the edges inside the parent
            interact.modifiers.restrictEdges({
                outer: 'parent'
            }),

            // minimum size
            interact.modifiers.restrictSize({
                min: { width: 25, height: 25 }
            })
        ],

        inertia: true
    })
    .draggable({
        listeners: {
            move(event) {
                var target = event.target
                // keep the dragged position in the data-x/data-y attributes
                var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
                var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

                // translate the element
                target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

                // update the posiion attributes
                target.setAttribute('data-x', x)
                target.setAttribute('data-y', y)
            }
        },
        inertia: true,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent',
                endOnly: true
            })
        ]
    })