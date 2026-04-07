export interface OpenRouterCompletionConfig {
  model: string;
  temperature?: number;
  max_output_tokens?: number;
}

export interface OpenRouterProvider {
  createCompletion(input: {
    system?: string;
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
    }>;
    config: OpenRouterCompletionConfig;
    signal?: AbortSignal;
  }): Promise<{
    output_text: string;
    raw: unknown;
  }>;
}

