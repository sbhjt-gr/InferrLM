import { DeepSeekService } from './DeepSeekService';
import { onlineModelService } from './OnlineModelService';

let isInitialized = false;
let deepSeekService: DeepSeekService;

export const initDeepSeekService = (): DeepSeekService => {
  if (isInitialized) {
    return deepSeekService;
  }

  const instance = new DeepSeekService(
    (provider: string) => onlineModelService.getApiKey(provider),
    (provider: string) => onlineModelService.getBaseUrl(provider)
  );
  
  onlineModelService.setDeepSeekServiceGetter(() => instance);
  
  isInitialized = true;
  
  deepSeekService = instance;
  
  return instance;
}; 
