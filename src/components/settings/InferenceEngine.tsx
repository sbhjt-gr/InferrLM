import React, { useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';

import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import SettingsSection from './SettingsSection';
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

  const isAppleSilicon = Platform.OS === 'ios' && (
    Device.modelName?.includes('M1') ||
    Device.modelName?.includes('M2') ||
    Device.modelName?.includes('M3') ||
    Device.modelName?.includes('M4') ||
    Device.modelName?.includes('M5')
  );

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
      description: 'Apple Silicon optimized inference',
      icon: 'apple',
      enabled: true,
      requiresAppleSilicon: true,
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
    const isDisabled = !engine.enabled || (engine.requiresAppleSilicon && !isAppleSilicon);
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
          onEngineChange(engine.id);
          setModalVisible(false);
        }}
        disabled={isDisabled}
      >
        <View
          style={[
            styles.engineIconContainer,
            { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(74, 6, 96, 0.1)' },
          ]}
        >
          <MaterialCommunityIcons
            name={engine.icon as any}
            size={28}
            color={isDisabled
              ? (currentTheme === 'dark' ? '#666' : themeColors.secondaryText)
              : (isSelected ? (currentTheme === 'dark' ? '#fff' : '#4a0660') : (currentTheme === 'dark' ? '#fff' : themeColors.text))}
          />
        </View>
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
          {engine.requiresAppleSilicon && !isAppleSilicon && (
            <Text style={[styles.requirementText, { color: currentTheme === 'dark' ? '#FF9494' : '#d32f2f' }]}>Requires Apple Silicon</Text>
          )}

          <View style={styles.featureBlock}>
            <Text style={[styles.featureTitle, { color: themeColors.text }]}>Feature support</Text>
            {featureList.map(item => {
              const on = engineFeatureCaps[item.id];
              return (
                <View key={item.id} style={styles.featureRow}>
                  <MaterialCommunityIcons
                    name={on ? 'check-circle' : 'close-circle'}
                    size={18}
                    color={on ? themeColors.primary : '#ff3b30'}
                  />
                  <Text style={[styles.featureText, { color: themeColors.text }]}>{item.label}</Text>
                </View>
              );
            })}
          </View>
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

  return (
    <SettingsSection title="Inference Engine">
      <TouchableOpacity
        style={[styles.settingItem, styles.settingItemBorder]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: themeColors.primary }]}>
            <MaterialCommunityIcons name="robot" size={24} color="white" />
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
    </SettingsSection>
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
  engineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  featureBlock: {
    marginTop: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
});

export default InferenceEngineSection;
