MiniPaper: A tool to summarize and compress text files using the OpenAI ChatGPT API.

Usage:
1. Make sure you have an OpenAI API token.
2. Save your API token in a file named 'openai.token' located in the '~/.config/' directory.
3. Install MiniPaper globally: `npm install -g minipaper`
3. Run the script with the following command: `gptc source.txt compression_ratio`, where 'source.txt' is the input text file and 'compression_ratio' is the desired compression ratio (e.g., 2 for reducing the text to half its size).

Dependencies:
- Node.js
- chatgpt
