// ==UserScript==
// @name         AI Translation
// @namespace    http://tampermonkey.net/
// @version      2025-02-26
// @description  AI translation
// @author       omoifly
// @match        http://*/*
// @match        https://*/*
// @sandbox      JavaScript
// @grant        none
// ==/UserScript==
// really appreciate to https://leohearts.com/archives/10.html

(function () {
    'use strict';

    const TRANSLATION_API_URL = 'YOUR_OLLAMA_URL_OR_ELSE';
    const MODEL = "huihui_ai/qwen2.5-1m-abliterated:14b";
    const PROMPT = "你是精通多国语言的翻译专家，请将以下文本翻译成中文：";

    // Use let/const instead of var
    let mousePosition = { x: 0, y: 0 };
    // Track mouse position with event listener
    document.addEventListener('mousemove', (event) => {
        mousePosition.x = event.pageX;
        mousePosition.y = event.pageY;
    });

    let closeTranslator = () => { };

    const displayText = (text, pos) => {
        // Create and display a floating container with the translated text
        const translationContainer = document.createElement('div');
        translationContainer.style = `
            position: absolute;
            top: ${pos.y}px;
            left: ${pos.x}px;
            max-width: 350px;
            background-color: white;
            color: #333;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.5;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            border-left: 4px solid #4285f4;
            animation: fadeIn 0.3s;
        `;
        const content = document.createElement('div');
        content.textContent = text;
        translationContainer.appendChild(content);
        document.body.appendChild(translationContainer);

        // Set up dismiss functionality
        const handleClickOutside = (e) => {
            if (!translationContainer.contains(e.target)) {
                translationContainer.remove();
                document.removeEventListener('click', handleClickOutside);
            }
        };

        // Small delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);

        // Update closeTranslator to also remove this container
        const oldCloseTranslator = closeTranslator;
        closeTranslator = () => {
            oldCloseTranslator();
            if (translationContainer.parentNode) {
                translationContainer.remove();
            }
            document.removeEventListener('click', handleClickOutside);
        };
    };

    const translateText = async (text, translationPosition) => {
        // Show loading animation before making the API call
        const closeAnimation = showLoadingAnimation(translationPosition);
        try {
            const response = await fetch(TRANSLATION_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: `${PROMPT} [${text}]。`,
                    stream: false
                })
            });
            const data = await response.json();
            console.log(`Translated: ${data.response}`);
            closeAnimation();
            displayText(data.response, translationPosition);
        } catch (error) {
            console.error('Translation error:', error);
            closeAnimation();
            displayText(`Translation Error: ${error}`, translationPosition);
        }
    };

    // Display loading animation while waiting for response
    const showLoadingAnimation = (pos) => {
        const loadingContainer = document.createElement('div');
        loadingContainer.id = 'translation-loading';
        loadingContainer.style = `
                position: absolute;
                top: ${pos.y}px;
                left: ${pos.x}px;
                background-color: white;
                padding: 15px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                border-left: 4px solid #4285f4;
            `;

        const spinner = document.createElement('div');
        spinner.style = `
                width: 20px;
                height: 20px;
                border: 3px solid rgba(0,0,0,0.1);
                border-top-color: #4285f4;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 10px;
                display: inline-block;
            `;

        const loadingText = document.createElement('span');
        loadingText.textContent = '翻译中...';

        loadingContainer.appendChild(spinner);
        loadingContainer.appendChild(loadingText);
        document.body.appendChild(loadingContainer);

        // Add the animation style
        if (!document.querySelector('#translation-animation-style')) {
            const style = document.createElement('style');
            style.id = 'translation-animation-style';
            style.textContent = `
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `;
            document.head.appendChild(style);
        }

        return () => loadingContainer.remove();
    };

    // Handle text selection
    document.addEventListener('click', () => {
        closeTranslator();
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            // Create a floating translate button
            const translateButton = document.createElement('div');
            translateButton.textContent = '翻译';
            const translationPosition = {x: mousePosition.x + 10, y: mousePosition.y + 10};

            translateButton.style = `
                position: absolute;
                top: ${translationPosition.y}px;
                left: ${translationPosition.x}px;
                background-color: #4285f4;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(translateButton);

            translateButton.addEventListener('click', (e) => {
                e.stopPropagation();
                translateText(selectedText, translationPosition);
                translateButton.remove();
            });

            // Update closeTranslator to remove the button
            closeTranslator = () => {
                if (translateButton.parentNode) {
                    translateButton.remove();
                }
            };
        }
    });
})();