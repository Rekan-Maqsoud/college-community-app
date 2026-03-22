import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlassContainer, GlassPill } from './GlassComponents';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const STAGES = [
  { key: 'all', label: 'filter.allStages' },
  { key: 'stage_1', label: 'filter.stage1' },
  { key: 'stage_2', label: 'filter.stage2' },
  { key: 'stage_3', label: 'filter.stage3' },
  { key: 'stage_4', label: 'filter.stage4' },
  { key: 'stage_5', label: 'filter.stage5' },
  { key: 'stage_6', label: 'filter.stage6' },
  { key: 'graduate', label: 'filter.graduate' },
];

const StageFilter = ({ selectedStage = 'all', onStageChange, visible = false, onClose }) => {
  const { t, theme, isDarkMode } = useAppSettings();

  const handleStageSelect = (stageKey) => {
    onStageChange(stageKey);
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <GlassContainer
            borderRadius={borderRadius.lg}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: theme.text,
                    fontSize: fontSize(18),
                  },
                ]}
              >
                {t('filter.selectStage')}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close-outline"
                  size={moderateScale(24)}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.stageList}
              showsVerticalScrollIndicator={false}
            >
              {STAGES.map((stage) => {
                const isSelected = selectedStage === stage.key;
                
                return (
                  <TouchableOpacity
                    key={stage.key}
                    onPress={() => handleStageSelect(stage.key)}
                    activeOpacity={0.7}
                    style={{ marginBottom: spacing.xs }}
                  >
                    <GlassPill
                      active={isSelected}
                      activeColor={theme.primary}
                      style={[
                        styles.stageItem,
                        { marginBottom: 0 }
                      ]}
                      borderRadiusValue={borderRadius.md}
                    >
                      <Text
                        style={[
                          styles.stageLabel,
                          {
                            color: isSelected ? theme.primary : theme.text,
                            fontSize: fontSize(15),
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                      >
                        {t(stage.label)}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={moderateScale(22)}
                          color={theme.primary}
                        />
                      )}
                    </GlassPill>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </GlassContainer>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  modalContent: {
    width: '100%',
    maxWidth: moderateScale(400),
  },
  modalCard: {
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  stageList: {
    maxHeight: hp(50),
  },
  stageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  stageLabel: {},
});

export default StageFilter;
