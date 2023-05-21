#!/usr/bin/env node

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import minimist from 'minimist';
import { ChatGPTAPI } from 'chatgpt';

async function main() {
  const args = parse_arguments(process.argv);
  const token = await load_token();
  const api = initialize_api(token);
  const words = await load_file_words(args.input_file);
  await process_file(api, words, args.compression_ratio);
}

function parse_arguments(raw_args) {
  const args = minimist(raw_args.slice(2));
  if (args._.length !== 2) {
    console.error('Usage: gptc source.txt compression_ratio');
    process.exit(1);
  }
  return { input_file: args._[0], compression_ratio: args._[1] };
}

async function load_token() {
  const token_path = path.join(os.homedir(), '.config', 'openai.token');
  try {
    return (await fs.readFile(token_path, 'utf8')).trim();
  } catch (err) {
    handle_token_loading_error(err);
  }
}

function handle_token_loading_error(err) {
  if (err.code === 'ENOENT') {
    console.error('Error: openai.token file not found in ~/.config/');
    console.error('Please make sure the file exists and contains your OpenAI API token.');
  } else {
    console.error('Error reading openai.token file:', err.message);
  }
  process.exit(1);
}

function initialize_api(token) {
  return new ChatGPTAPI({
    apiKey: token,
    systemMessage: "You're a PhD that summarizes papers, seeking to understand their actual meaning in order to capture and preserve important information.",
    completionParams: {
      model: "gpt-4",
      stream: true,
      temperature: 0.0,
      max_tokens: 4096,
    }
  });
}

async function load_file_words(input_file) {
  const paper = await fs.readFile(input_file, 'utf8');
  return paper.split(" ").map(x => x.replace(/\s/g, "")).filter(x => x.length > 0);
}

async function process_file(api, words, compression_ratio) {
  const chunk_size = 1024;
  const chunks_count = Math.ceil(words.length / chunk_size);
  for (let i = 0; i < chunks_count; i++) {
    const chunk = words.slice(i * chunk_size, (i + 1) * chunk_size);
    const summarized_chunk = await summarize_chunk(api, chunk, compression_ratio, i, chunks_count);
    console.log("");
  }
}

async function summarize_chunk(api, chunk, compression_ratio, chunk_index, chunks_count) {
  const message = create_message(chunk, compression_ratio, chunk_index, chunks_count);
  let last_text_length = 0;
  const result = await api.sendMessage(message, {
    onProgress: (partial_response) => {
      const new_text = partial_response.text.slice(last_text_length);
      process.stdout.write(new_text);
      last_text_length = partial_response.text.length;
    }
  });
  return result.text;
}

function create_message(chunk, compression_ratio, chunk_index, chunks_count) {
  const start_word = chunk_index * 1024 + 1;
  const end_word = Math.min((chunk_index + 1) * 1024, chunk.length);
  const total_words = chunk.length;

  return `
Below is a text composed of ${chunk.length} words (words ${start_word}-${end_word} of ${total_words}):

${chunk.join(" ")}

Summarize and compress this text to 1/${compression_ratio} of the size (exactly ${Math.floor(chunk.length/compression_ratio)} words). The resulting text must be readable and keep the important information. This is chunk ${chunk_index + 1} of ${chunks_count}. Do not start with "this text..." or "this paper..." or similar. Just translate the contents directly, keeping in mind it is a chunk of a broader text.
  `;
}

main();
