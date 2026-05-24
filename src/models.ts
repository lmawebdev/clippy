import type { DownloadState } from "./sharedState";

export interface Model {
  name: string;
  size: number;
  company?: string;
  url?: string;
  description?: string;
  homepage?: string;
}

export interface ManagedModel extends Model {
  path: string;
  downloaded?: boolean;
  downloadState?: DownloadState;
  imported?: boolean;
}

export type ModelState = Record<string, ManagedModel>;

export const BUILT_IN_MODELS: Model[] = [
  {
    name: "Gemma 2 (2B)",
    company: "Google",
    size: 1600,
    url: "https://huggingface.co/unsloth/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf",
    description:
      "Gemma 2 is Google's latest open model, built for responsible AI development from the same research and technology used to create the Gemini models.",
  },
  {
    name: "Gemma 2 (9B)",
    company: "Google",
    size: 6000,
    url: "https://huggingface.co/unsloth/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf",
    description:
      "Gemma 2 is Google's latest open model, built for responsible AI development from the same research and technology used to create the Gemini models.",
  },
  {
    name: "Gemma 2 (27B)",
    company: "Google",
    size: 17000,
    url: "https://huggingface.co/unsloth/gemma-2-27b-it-GGUF/resolve/main/gemma-2-27b-it-Q4_K_M.gguf",
    description:
      "Gemma 2 is Google's latest open model, built for responsible AI development from the same research and technology used to create the Gemini models.",
  },
  {
    name: "Gemma 4 (E2B)",
    company: "Google",
    size: 3100,
    url: "https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf",
    description:
      "Gemma 4 E2B is a lightweight, multimodal model from Google DeepMind, specifically optimized for edge devices and local execution, supporting text, image, and audio input.",
  },
  {
    name: "Gemma 4 (E4B)",
    company: "Google",
    size: 5000,
    url: "https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_K_M.gguf",
    description:
      "Gemma 4 E4B is a highly efficient, multimodal model from Google DeepMind designed for local execution with 128K context window and native support for function-calling.",
  },
  {
    name: "Phi-4 Mini (3.8B)",
    company: "Microsoft",
    size: 2490,
    url: "https://huggingface.co/unsloth/Phi-4-mini-instruct-GGUF/resolve/main/Phi-4-mini-instruct-Q4_K_M.gguf",
    description:
      "Phi-4-mini is a 3.8B parameter model and a dense, decoder-only transformer featuring grouped-query attention, 200,000 vocabulary, and shared input-output embeddings, designed for speed and efficiency.",
    homepage:
      "https://azure.microsoft.com/en-us/blog/empowering-innovation-the-next-generation-of-the-phi-family/",
  },
  {
    name: "Qwen 2.5 (3B)",
    company: "Qwen",
    size: 2000,
    url: "https://huggingface.co/unsloth/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf",
    description:
      "Qwen2.5 is the latest series of large language models by Qwen, showing significant improvements in coding, mathematics, and general reasoning.",
    homepage: "https://qwenlm.github.io/blog/qwen2.5/",
  },
  {
    name: "Llama 3.2 (1B Instruct)",
    company: "Meta",
    size: 808,
    url: "https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    description:
      "The Llama 3.2 collection of multilingual large language models (LLMs) is a collection of pretrained and instruction-tuned generative models in 1B and 3B sizes.",
    homepage:
      "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/",
  },
  {
    name: "Llama 3.2 (3B Instruct)",
    company: "Meta",
    size: 2020,
    url: "https://huggingface.co/unsloth/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    description:
      "The Llama 3.2 collection of multilingual large language models (LLMs) is a collection of pretrained and instruction-tuned generative models in 1B and 3B sizes.",
    homepage:
      "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/",
  },
];
