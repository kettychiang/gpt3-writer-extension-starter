const getKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openai-key'], (result) => {
            if(result['openai-key']) {
                const decodedKey = atob(result['openai-key']);
                resolve(decodedKey);
            }
        });
    });
};

const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if(!activeTab) {
            console.log('Target tab is not open.');
            return;
        }

        chrome.tabs.sendMessage(
            activeTab,
            { message: 'inject', content },
            (response) => {
                if (response && response.status === 'failed') {
                    console.log('injection failed.');
                }
            }
        );
    });
};

const generate = async (prompt) => {
    // get your API key from storage
    const key = await getKey();
    const url = 'https://api.openai.com/v1/completions';
    // call completions endpoint
    const completionResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model:'text-davinci-003',
            prompt: prompt,
            max_tokens: 1250,
            temperature: 0.7,   
        }),
    });
    
    // select the top choice and send back
    const completion = await completionResponse.json();
    return completion.choices.pop();
}

const generateCompletionAction = async (info) => {
    try {
        // send message with generating text (this will be like a loading indicator)
        sendMessage('generating...');

        const { selectionText } = info;
        const basePromptPrefix = 
            `
            Write me an attractive and creative kid's story with the theme below.

            Theme:
            `; 
            // add this to call GPT-3
            const baseCompletion = await generate(`${basePromptPrefix}${selectionText}`);
            // add second prompt
            const secondPrompt =
            `
            Make a twist of the story at the end to give a surprised ending.
            
            Theme: ${selectionText}

            Story: ${baseCompletion.text}

            New Story:
            `;
            // call the second prompt
            const secondPromptCompletion = await generate(secondPrompt);

            // send the output when we're all done
            sendMessage(secondPromptCompletion.text);
            console.log(secondPromptCompletion.text)
            } catch (error) {
            console.log(error);

            // add this here to see if we run into any error
            sendMessage(error.toString());
    }
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'context-run',
        title: 'Generate bedtime story for kids',
        contexts: ['selection'],
    });
});

// add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);