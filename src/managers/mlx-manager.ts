import { LLM } from '@inferrlm/react-native-mlx';
import { EngineCaps, GenOpts, InferenceManager, Msg } from './inference-manager';

const caps: EngineCaps = {
  embeddings: false,
  vision: false,
  audio: false,
  rag: false,
  grammar: false,
  jinja: false,
  dry: false,
  mirostat: false,
  xtc: false,
};

type State = {
  loaded: boolean;
  modelId: string;
};

class MlxManager implements InferenceManager {
  private state: State = { loaded: false, modelId: '' };

  async init(modelPath: string) {
    await LLM.load(modelPath, {} as any);
    this.state = { loaded: true, modelId: modelPath };
  }

  async gen(messages: Msg[], opts?: GenOpts) {
    if (!this.state.loaded) {
      throw new Error('engine_not_ready');
    }
    const prompt = messages
      .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : ''}`)
      .join('\n');
    let full = '';
    await LLM.stream(prompt, token => {
      full += token;
      if (opts?.onToken) {
        return opts.onToken(token);
      }
    });
    return full.trim();
  }

  async embed(text: string) {
    return Promise.reject<number[]>(new Error('embeddings_not_supported'));
  }

  async release() {
    if (this.state.loaded) {
      LLM.unload();
      this.state = { loaded: false, modelId: '' };
    }
  }

  caps() {
    return caps;
  }

  ready() {
    return this.state.loaded;
  }
}

export const mlxManager = new MlxManager();
