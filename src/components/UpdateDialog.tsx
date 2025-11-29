import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';

interface UpdateDialogProps {
  visible: boolean;
  onUpdate: () => Promise<void>;
  onClose: () => void;
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
  visible,
  onUpdate,
  onClose,
}) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate();
    } catch {
      setIsUpdating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: themeColors.background }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons 
              name="update" 
              size={24} 
              color="#4CAF50"
            />
            <Text style={[styles.title, { color: themeColors.text }]}>
              Update Available
            </Text>
          </View>
          
          <Text style={[styles.message, { color: themeColors.text }]}>
            A new version of Inferra is ready to install.
          </Text>
          
          <View style={styles.points}>
            <Text style={[styles.point, { color: themeColors.text }]}>
              The app will restart after updating
            </Text>
          </View>

          {isUpdating ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={[styles.loadingText, { color: themeColors.text }]}>
                Downloading update...
              </Text>
            </View>
          ) : (
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.btn, styles.laterBtn, { borderColor: themeColors.borderColor }]}
                onPress={onClose}
              >
                <Text style={[styles.laterText, { color: themeColors.text }]}>Later</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btn, styles.updateBtn]}
                onPress={handleUpdate}
              >
                <Text style={styles.updateText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  points: {
    marginVertical: 12,
    paddingLeft: 8,
  },
  point: {
    fontSize: 14,
    lineHeight: 24,
    opacity: 0.7,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  laterBtn: {
    borderWidth: 1,
  },
  laterText: {
    fontSize: 16,
    fontWeight: '500',
  },
  updateBtn: {
    backgroundColor: '#4CAF50',
  },
  updateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
});

export default UpdateDialog;
