import AsyncStorage from '@react-native-async-storage/async-storage';
import { EngineId, InferenceManager } from '../managers/inference-manager';
import { llamaAdapter } from '../managers/llama-manager';
import { mlxManager } from '../managers/mlx-manager';
import { featureCaps, isFeatureOn } from './feature-availability';

const key = 'inference_engine';

class EngineService {
  private engine: EngineId = 'llama';
  private map: Record<EngineId, InferenceManager> = {
    llama: llamaAdapter,
    mlx: mlxManager,
  };

  async load() {
    const stored = await AsyncStorage.getItem(key);
    if (stored === 'mlx' || stored === 'llama') {
      this.engine = stored;
    }
    return this.engine;
  }

  async set(engine: EngineId) {
    this.engine = engine;
    await AsyncStorage.setItem(key, engine);
  }

  get() {
    return this.engine;
  }

  mgr() {
    return this.map[this.engine];
  }

  caps() {
    return featureCaps[this.engine];
  }

  on(feature: keyof typeof featureCaps['llama']) {
    return isFeatureOn(this.engine, feature);
  }

  needsRestart() {
    return true;
  }
}

export const engineService = new EngineService();
