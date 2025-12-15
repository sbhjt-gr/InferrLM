import React, { useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';

import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { featureCaps } from '../../services/feature-availability';
import { EngineCaps } from '../../managers/inference-manager';

type InferenceEngine = 'llama.cpp' | 'mediapipe' | 'mlc-llm' | 'mlx';

interface InferenceEngineProps {
  selectedEngine: InferenceEngine;
  onEngineChange: (engine: InferenceEngine) => void;
}

const featureList: { id: keyof EngineCaps; label: string }[] = [
  { id: 'embeddings', label: 'Embeddings' },
  { id: 'vision', label: 'Vision' },
  { id: 'audio', label: 'Audio / TTS' },
  { id: 'rag', label: 'RAG' },
  { id: 'grammar', label: 'JSON / Grammar' },
  { id: 'jinja', label: 'Jinja templates' },
  { id: 'dry', label: 'Dry-run / speculative' },
  { id: 'mirostat', label: 'Mirostat sampling' },
  { id: 'xtc', label: 'XTC' },
];

const InferenceEngineSection: React.FC<InferenceEngineProps> = ({
  selectedEngine,
  onEngineChange,
}) => {
  const { theme: currentTheme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [restartModalVisible, setRestartModalVisible] = useState(false);
  const [pendingEngine, setPendingEngine] = useState<InferenceEngine | null>(null);

  const supportsMLX = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 16;

  const engines = useMemo(() => [
    {
      id: 'llama.cpp' as const,
      name: 'Llama.cpp (default)',
      description: 'Widest model compatibility with the Llama.cpp engine',
      icon: 'chip',
      enabled: true,
    },
    {
      id: 'mlx' as const,
      name: 'MLX (beta)',
      description: 'Fast inference using MLX Swift',
      icon: 'apple',
      enabled: true,
      requiresMLX: true,
    },
    {
      id: 'mlc-llm' as const,
      name: 'MLC LLM',
      description: 'MLC pipeline (coming soon)',
      icon: 'flash',
      enabled: false,
    },
    {
      id: 'mediapipe' as const,
      name: 'MediaPipe',
      description: 'MediaPipe pipeline (coming soon)',
      icon: 'google',
      enabled: false,
    },
  ], []);

  const renderEngineItem = (engine: (typeof engines)[number]) => {
    const isSelected = selectedEngine === engine.id;
    const isDisabled = !engine.enabled || (engine.requiresMLX && !supportsMLX);
    const themeColors = theme[currentTheme];
    const capsKey = engine.id === 'mlx' ? 'mlx' : 'llama';
    const engineFeatureCaps: EngineCaps = featureCaps[capsKey];

    return (
      <TouchableOpacity
        key={engine.id}
        style={[
          styles.engineItem,
          { backgroundColor: themeColors.borderColor },
          isSelected && styles.selectedEngineItem,
          isDisabled && styles.engineItemDisabled,
        ]}
        onPress={() => {
          if (isDisabled) return;
          setPendingEngine(engine.id);
          setModalVisible(false);
          setRestartModalVisible(true);
        }}
        disabled={isDisabled}
      >
        <View style={styles.engineInfo}>
          <Text
            style={[
              styles.engineName,
              {
                color: isDisabled
                  ? (currentTheme === 'dark' ? '#666' : themeColors.secondaryText)
                  : (currentTheme === 'dark' ? '#fff' : themeColors.text),
                fontWeight: isSelected ? '600' : '500',
              },
            ]}
          >
            {engine.name}
          </Text>
          <Text
            style={[
              styles.engineDescription,
              { color: isDisabled ? (currentTheme === 'dark' ? '#666' : themeColors.secondaryText) : (currentTheme === 'dark' ? '#aaa' : themeColors.secondaryText) },
            ]}
          >
            {engine.description}
          </Text>
          {engine.requiresMLX && !supportsMLX && (
            <Text style={[styles.requirementText, { color: currentTheme === 'dark' ? '#FF9494' : '#d32f2f' }]}>Requires iOS 16+</Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={currentTheme === 'dark' ? '#fff' : '#4a0660'}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const themeColors = theme[currentTheme];
  const selectedDisplay = engines.find(e => e.id === selectedEngine)?.name ?? 'Unknown';
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  return (
    <>
      <TouchableOpacity
        style={[styles.settingItem, styles.settingItemBottomBorder]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
            <MaterialCommunityIcons name="engine" size={22} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>Inference Engine</Text>
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              {selectedDisplay} (restart required)
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={themeColors.secondaryText} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select inference engine</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.restartNotice, { color: themeColors.secondaryText }]}>
              Switching engines requires an app restart to take effect.
            </Text>

            <ScrollView style={styles.engineList} showsVerticalScrollIndicator={false}>
              {engines.map(renderEngineItem)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={restartModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRestartModalVisible(false)}
      >
        <View style={styles.restartModalOverlay}>
          <View style={[styles.restartModalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.restartModalHeader}>
              <MaterialCommunityIcons 
                name="restart" 
                size={24} 
                color={themeColors.primary} 
              />
              <Text style={[styles.restartModalTitle, { color: themeColors.text }]}>Restart Required</Text>
            </View>
            
            <Text style={[styles.restartModalText, { color: themeColors.text }]}>
              Changing the inference engine requires restarting the app to take effect. Would you like to restart now?
            </Text>
            
            <View style={styles.restartModalButtons}>
              <TouchableOpacity
                style={[styles.restartModalButton, { backgroundColor: themeColors.borderColor }]}
                onPress={() => {
                  setRestartModalVisible(false);
                  setPendingEngine(null);
                }}
              >
                <Text style={[styles.restartModalButtonText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.restartModalButton, { backgroundColor: themeColors.primary }]}
                onPress={async () => {
                  if (pendingEngine) {
                    onEngineChange(pendingEngine);
                  }
                  setRestartModalVisible(false);
                  try {
                    await Updates.reloadAsync();
                  } catch (error) {
                  }
                }}
              >
                <Text style={[styles.restartModalButtonText, { color: '#fff' }]}>Restart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingItemBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  restartNotice: {
    fontSize: 13,
    marginBottom: 12,
  },
  engineList: {
    paddingBottom: 20,
  },
  engineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedEngineItem: {
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
  },
  engineItemDisabled: {
    opacity: 0.5,
  },
  engineInfo: {
    flex: 1,
  },
  engineName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  engineDescription: {
    fontSize: 14,
  },
  requirementText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  restartModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restartModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  restartModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  restartModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  restartModalText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  restartModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  restartModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  restartModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InferenceEngineSection;
