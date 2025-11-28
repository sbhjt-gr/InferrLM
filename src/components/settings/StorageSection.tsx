import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import SettingsSection from './SettingsSection';
import { getThemeAwareColor } from '../../utils/ColorUtils';

type StorageInfo = {
  tempSize: string;
  cacheSize: string;
};

type ClearingType = 'cache' | 'temp' | 'models' | null;

type StorageSectionProps = {
  storageInfo: StorageInfo;
  clearingType: ClearingType;
  onClearCache: () => void;
  onClearTempFiles: () => void;
  onClearAllModels: () => void;
};

const StorageSection = ({
  storageInfo,
  clearingType,
  onClearCache,
  onClearTempFiles,
  onClearAllModels
}: StorageSectionProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  return (
    <SettingsSection title="STORAGE">
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={onClearCache}
        disabled={clearingType !== null}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
            <MaterialCommunityIcons name="delete-outline" size={22} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>
              Clear Cache
            </Text>
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              {storageInfo.cacheSize} of cached data
            </Text>
          </View>
        </View>
        {clearingType === 'cache' ? (
          <ActivityIndicator size="small" color={themeColors.primary} />
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.settingItem, styles.settingItemBorder]}
        onPress={onClearTempFiles}
        disabled={clearingType !== null}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
            <MaterialCommunityIcons name="folder-outline" size={22} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>
              Clear Temporary Files
            </Text>
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              {storageInfo.tempSize} of temporary data
            </Text>
          </View>
        </View>
        {clearingType === 'temp' ? (
          <ActivityIndicator size="small" color={themeColors.primary} />
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.settingItem, styles.settingItemBorder]}
        onPress={onClearAllModels}
        disabled={clearingType !== null}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#FF3B3020' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={getThemeAwareColor('#FF3B30', currentTheme)} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>
              Clear All Models
            </Text>
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              All model data will be permanently deleted
            </Text>
          </View>
        </View>
        {clearingType === 'models' ? (
          <ActivityIndicator size="small" color={getThemeAwareColor('#FF3B30', currentTheme)} />
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
        )}
      </TouchableOpacity>
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
});

export default StorageSection; 
