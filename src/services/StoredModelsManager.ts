import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from './EventEmitter';
import { FileManager } from './FileManager';
import { StoredModel } from './ModelDownloaderTypes';
import { detectVisionCapabilities } from '../utils/multimodalHelpers';
import { ModelType } from '../types/models';

export class StoredModelsManager extends EventEmitter {
  private fileManager: FileManager;
  private readonly STORAGE_KEY = 'stored_models_list';
  private ready: boolean = false;
  private starting: boolean = false;
  private startPromise: Promise<void> | null = null;
  private mutex: Promise<void> = Promise.resolve();

  constructor(fileManager: FileManager) {
    super();
    this.fileManager = fileManager;
  }

  private async lock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.mutex;
    let release: () => void;
    this.mutex = new Promise(r => { release = r; });
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  private async confirmFilesExist(models: StoredModel[]): Promise<StoredModel[]> {
    const result: StoredModel[] = [];
    for (const model of models) {
      const exists = await this.fileExists(model.path);
      if (exists) {
        result.push(model);
      } else {
        console.log('model_file_missing', model.name);
      }
    }
    return result;
  }

  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }
    if (this.starting) {
      await this.startPromise;
      return;
    }

    this.starting = true;
    this.startPromise = (async () => {
      console.log('models_init_start');
      try {
        await this.syncOnLaunch();
        this.ready = true;
        console.log('models_init_done');
      } catch (err) {
        console.log('models_init_err', err);
        throw err;
      } finally {
        this.starting = false;
      }
    })();

    await this.startPromise;
  }

  async getStoredModels(): Promise<StoredModel[]> {
    console.log('get_models_start');
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        console.log('models_from_storage');
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.log('storage_read_error', error);
    }

    console.log('no_cached_models');
    return [];
  }

  private async scanAndPersist(): Promise<StoredModel[]> {
    return this.lock(async () => {
      console.log('scan_filesystem_start');
      try {
        const baseDir = this.fileManager.getBaseDir();
        console.log('base_dir', baseDir);

        const dirInfo = await FileSystem.getInfoAsync(baseDir);
        if (!dirInfo.exists) {
          console.log('dir_not_exists');
          await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
          const emptyModels: StoredModel[] = [];
          await this.saveModelsToStorage(emptyModels);
          return emptyModels;
        }

        console.log('reading_directory');
        const dir = await FileSystem.readDirectoryAsync(baseDir);
        console.log('files_found', dir.length);

        const models: StoredModel[] = [];
        if (dir.length > 0) {
          console.log('processing_files');
          for (const name of dir) {
            try {
              const path = `${baseDir}/${name}`;
              const fileInfo = await FileSystem.getInfoAsync(path, { size: true });
              if (!fileInfo.exists || (fileInfo as any).isDirectory) {
                continue;
              }

              const size = (fileInfo as any).size || 0;
              const modified = new Date().toISOString();

              const capabilities = detectVisionCapabilities(name);
              const modelType = capabilities.isProjection
                ? ModelType.PROJECTION
                : capabilities.isVision
                  ? ModelType.VISION
                  : ModelType.LLM;

              models.push({
                id: `${name}-${Date.now()}`,
                name,
                path,
                size,
                modified,
                isExternal: false,
                downloaded: true,
                modelType,
                capabilities: capabilities.capabilities,
                supportsMultimodal: capabilities.isVision,
                compatibleProjectionModels: capabilities.compatibleProjections,
                defaultProjectionModel: capabilities.defaultProjection,
              });
            } catch (fileError) {
              console.log('scan_file_error', name, fileError);
            }
          }
        }

        console.log('saving_to_storage', models.length);
        await this.saveModelsToStorage(models);
        console.log('scan_complete');
        return models;
      } catch (error) {
        console.log('scan_error', error);
        const emptyModels: StoredModel[] = [];
        await this.saveModelsToStorage(emptyModels);
        return emptyModels;
      }
    });
  }

  private async syncOnLaunch(): Promise<void> {
    console.log('sync_start');
    try {
      const baseDir = this.fileManager.getBaseDir();
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      
      if (!dirInfo.exists) {
        console.log('dir_not_exists_creating');
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
        await this.saveModelsToStorage([]);
        return;
      }

      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      const storedModels: StoredModel[] = storedData ? JSON.parse(storedData) : [];
      
      if (storedModels.length === 0) {
        const filesOnDisk = await FileSystem.readDirectoryAsync(baseDir);
        if (filesOnDisk.length > 0) {
          console.log('sync_empty_storage_but_files_exist');
          await this.scanAndPersist();
          return;
        }
      }

      const validated = await this.confirmFilesExist(storedModels);
      if (validated.length !== storedModels.length) {
        console.log('sync_removed_missing', storedModels.length - validated.length);
        await this.saveModelsToStorage(validated);
      }
      
      console.log('sync_complete');
    } catch (error) {
      console.log('sync_error', error);
      await this.scanAndPersist();
    }
  }

  private async saveModelsToStorage(models: StoredModel[]): Promise<void> {
    console.log('save_storage_start', models.length);
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(models));
      console.log('save_storage_complete');
    } catch (error) {
      console.log('save_storage_error', error);
      throw error;
    }
  }

  async deleteModel(path: string): Promise<void> {
    return this.lock(async () => {
      const dir = path.substring(0, path.lastIndexOf('/'));
      const baseName = path.substring(path.lastIndexOf('/') + 1);
      const projectorName = baseName.replace('.gguf', '-mmproj-f16.gguf');
      const projectorPath = `${dir}/${projectorName}`;
      
      let hasProjector = false;
      try {
        const projInfo = await FileSystem.getInfoAsync(projectorPath);
        hasProjector = projInfo?.exists ?? false;
      } catch {
        hasProjector = false;
      }
      
      const currentModels = await this.getStoredModels();
      let updated = currentModels.filter(m => m.path !== path);
      if (hasProjector) {
        updated = updated.filter(m => m.path !== projectorPath);
      }
      await this.saveModelsToStorage(updated);
      
      try {
        await this.fileManager.deleteFile(path);
        if (hasProjector) {
          await this.fileManager.deleteFile(projectorPath);
          console.log('mmproj_deleted', projectorName);
        }
      } catch (err) {
        console.log('file_delete_error', err);
      }
      
      this.emit('modelsChanged');
    });
  }

  async registerModel(name: string, path: string, size: number): Promise<StoredModel> {
    return this.lock(async () => {
      const current = await this.getStoredModels();
      const exists = current.some(m => m.name === name || m.path === path);
      if (exists) {
        throw new Error('Model already registered');
      }

      const capabilities = detectVisionCapabilities(name);
      const modelType = capabilities.isProjection
        ? ModelType.PROJECTION
        : capabilities.isVision
          ? ModelType.VISION
          : ModelType.LLM;

      const model: StoredModel = {
        id: `${name}-${Date.now()}`,
        name,
        path,
        size,
        modified: new Date().toISOString(),
        isExternal: false,
        downloaded: true,
        modelType,
        capabilities: capabilities.capabilities,
        supportsMultimodal: capabilities.isVision,
        compatibleProjectionModels: capabilities.compatibleProjections,
        defaultProjectionModel: capabilities.defaultProjection,
      };

      const updated = [...current, model];
      await this.saveModelsToStorage(updated);
      this.emit('modelsChanged');
      return model;
    });
  }

  async setDownloadStatus(name: string, downloaded: boolean): Promise<void> {
    return this.lock(async () => {
      const current = await this.getStoredModels();
      const idx = current.findIndex(m => m.name === name);
      if (idx === -1) {
        console.log('model_not_found', name);
        return;
      }
      current[idx] = { ...current[idx], downloaded };
      await this.saveModelsToStorage(current);
      this.emit('modelsChanged');
    });
  }

  public async refresh(): Promise<void> {
    await this.scanAndPersist();
    this.emit('modelsChanged');
  }

  async clearAllModels(): Promise<void> {
    try {
      const emptyModels: StoredModel[] = [];
      await this.saveModelsToStorage(emptyModels);
      this.emit('modelsChanged');
      console.log('all_models_cleared_from_storage');
    } catch (error) {
      console.log('clear_all_models_error', error);
      throw error;
    }
  }

  async reloadStoredModels(): Promise<StoredModel[]> {
    return await this.scanAndPersist();
  }

  async refreshStoredModels(): Promise<void> {
    try {
      const storedModels = await this.getStoredModels();
      const storedPaths = new Set(storedModels.map(m => m.path));
      
      const baseDir = this.fileManager.getBaseDir();
      const files = await FileSystem.readDirectoryAsync(baseDir);
      
      for (const name of files) {
        const filePath = `${baseDir}/${name}`;
        if (storedPaths.has(filePath)) {
          continue;
        }
        
        const info = await FileSystem.getInfoAsync(filePath, { size: true });
        if (!info.exists || (info as any).isDirectory) {
          continue;
        }
        
        try {
          await this.registerModel(name, filePath, (info as any).size || 0);
          console.log('auto_registered', name);
        } catch {
          console.log('register_skipped', name);
        }
      }
    } catch (error) {
      console.log('refresh_error', error);
    }
  }

  async linkExternalModel(uri: string, fileName: string): Promise<void> {
    return this.lock(async () => {
      const baseDir = this.fileManager.getBaseDir();
      const destPath = `${baseDir}/${fileName}`;
      
      const stored = await this.getStoredModels();
      const nameExists = stored.some(m => m.name === fileName);
      if (nameExists) {
        throw new Error('A model with this name already exists');
      }
      
      const destInfo = await FileSystem.getInfoAsync(destPath);
      if (destInfo.exists) {
        throw new Error('A file with this name already exists');
      }

      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      if (!fileInfo.exists) {
        throw new Error('External file does not exist');
      }

      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      }

      await FileSystem.copyAsync({
        from: uri,
        to: destPath
      });

      const size = (fileInfo as any).size || 0;
      const capabilities = detectVisionCapabilities(fileName);
      const modelType = capabilities.isProjection
        ? ModelType.PROJECTION
        : capabilities.isVision
          ? ModelType.VISION
          : ModelType.LLM;

      const newModel: StoredModel = {
        id: `${fileName}-${Date.now()}`,
        name: fileName,
        path: destPath,
        size,
        modified: new Date().toISOString(),
        isExternal: true,
        downloaded: true,
        modelType,
        capabilities: capabilities.capabilities,
        supportsMultimodal: capabilities.isVision,
        compatibleProjectionModels: capabilities.compatibleProjections,
        defaultProjectionModel: capabilities.defaultProjection,
      };

      const currentModels = await this.getStoredModels();
      const updatedModels = [...currentModels, newModel];
      await this.saveModelsToStorage(updatedModels);

      this.emit('modelsChanged');
    });
  }

  async exportModel(modelPath: string, modelName: string): Promise<void> {
    try {

      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        throw new Error('Model file does not exist');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      const tempDir = FileSystem.cacheDirectory + 'export/';
      const tempDirInfo = await FileSystem.getInfoAsync(tempDir);
      if (!tempDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      }

      const tempFilePath = tempDir + modelName;
      
      await FileSystem.copyAsync({
        from: modelPath,
        to: tempFilePath
      });


      await Sharing.shareAsync(tempFilePath, {
        mimeType: 'application/octet-stream',
        dialogTitle: `Export ${modelName}`,
      });

      
      this.emit('modelExported', { modelName, tempFilePath });

    } catch (error) {
      throw error;
    }
  }
}
