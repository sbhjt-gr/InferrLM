import React, { createContext, useContext, useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { llamaManager } from '../utils/LlamaManager';
import { engineService } from '../services/inference-engine-service';
import { Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { modelDownloader } from '../services/ModelDownloader';

interface ModelContextType {
  selectedModelPath: string | null;
  selectedProjectorPath: string | null;
  isModelLoading: boolean;
  loadModel: (modelPath: string, mmProjectorPath?: string) => Promise<boolean>;
  unloadModel: (silent?: boolean) => Promise<void>;
  unloadProjector: () => Promise<void>;
  setSelectedModelPath: (path: string | null) => void;
  isMultimodalEnabled: boolean;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedModelPath, setSelectedModelPath] = useState<string | null>(null);
  const [selectedProjectorPath, setSelectedProjectorPath] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isMultimodalEnabled, setIsMultimodalEnabled] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  const insets = useSafeAreaInsets();
  const { theme: currentTheme } = useTheme();

  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const updateProjectorState = () => {
    const projectorPath = llamaManager.getMultimodalProjectorPath();
    const multimodalEnabled = llamaManager.isMultimodalInitialized();
    
    setSelectedProjectorPath(projectorPath);
    setIsMultimodalEnabled(multimodalEnabled);
  };

  const loadModel = async (modelPath: string, mmProjectorPath?: string): Promise<boolean> => {
    if (isModelLoading) {
      showSnackbar('Model is already loading', 'error');
      return false;
    }

    setIsModelLoading(true);
    
    try {
      const engine = engineService.get();
      const isGguf = modelPath.toLowerCase().endsWith('.gguf');

      if (engine === 'mlx' && isGguf) {
        showSnackbar('MLX engine does not support GGUF models', 'error');
        setIsModelLoading(false);
        return false;
      }

      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        console.log('model_file_missing', modelPath);
        showSnackbar('Model file not found', 'error');
        modelDownloader.refresh();
        setIsModelLoading(false);
        return false;
      }
      
      if (mmProjectorPath) {
        const projInfo = await FileSystem.getInfoAsync(mmProjectorPath);
        if (!projInfo.exists) {
          console.log('projector_file_missing', mmProjectorPath);
          mmProjectorPath = undefined;
        }
      }
      
      await engineService.mgr().init(modelPath, mmProjectorPath);
      
      setSelectedModelPath(modelPath);
      updateProjectorState();
      
      const modelName = modelPath.split('/').pop() || 'Model';
      const multimodalText = mmProjectorPath ? ' (Multimodal)' : '';
      showSnackbar(`${modelName}${multimodalText} loaded successfully`);

      return true;
    } catch (error) {
      showSnackbar('Error loading model', 'error');
      setSelectedModelPath(null);
      setSelectedProjectorPath(null);
      setIsMultimodalEnabled(false);
      return false;
    } finally {
      setIsModelLoading(false);
    }
  };

  const unloadModel = async (silent: boolean = false): Promise<void> => {
    try {
      await engineService.mgr().release();
    } catch (error) {
      llamaManager.emergencyCleanup();
    } finally {
      setSelectedModelPath(null);
      setSelectedProjectorPath(null);
      setIsMultimodalEnabled(false);
      if (!silent) {
        showSnackbar('Model unloaded');
      }
    }
  };

  const unloadProjector = async (): Promise<void> => {
    try {
      await llamaManager.releaseMultimodal();
    } catch (error) {
    } finally {
      setSelectedProjectorPath(null);
      setIsMultimodalEnabled(false);
      showSnackbar('Projector model unloaded');
    }
  };

  useEffect(() => {
    const unsubscribeLoaded = llamaManager.addListener('model-loaded', (modelPath: string) => {
      setSelectedModelPath(modelPath);
      updateProjectorState();
    });

    const unsubscribeUnloaded = llamaManager.addListener('model-unloaded', () => {
      setSelectedModelPath(null);
      setSelectedProjectorPath(null);
      setIsMultimodalEnabled(false);
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeUnloaded();
    };
  }, []);

  return (
    <ModelContext.Provider value={{
      selectedModelPath,
      selectedProjectorPath,
      isModelLoading,
      loadModel,
      unloadModel,
      unloadProjector,
      setSelectedModelPath,
      isMultimodalEnabled
    }}>
      {children}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{
          backgroundColor: snackbarType === 'success' ? '#4a0660' : '#B00020',
          marginBottom: insets.bottom,
        }}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
          textColor: '#FFFFFF',
        }}
      >
        <Text style={{ color: '#FFFFFF' }}>
          {snackbarMessage}
        </Text>
      </Snackbar>
    </ModelContext.Provider>
  );
};

export const useModel = () => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
}; 
