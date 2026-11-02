import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { RequestStatus } from '../constants/types';

interface StageIndicatorProps {
  status: RequestStatus;
  selectedDonorId?: string | null;
  hasResponses?: boolean;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({
  status,
  selectedDonorId,
  hasResponses = false
}) => {
  // Determine current stage index (0 to 4)
  let currentStage = 0;
  if (['registered', 'pending'].includes(status)) currentStage = 0;
  else if (['alerting_donors', 'alerting', 'active'].includes(status)) currentStage = 1;
  else if (['donors_responded', 'responses_received'].includes(status)) currentStage = 2;
  else if (status === 'donor_selected') currentStage = 3;
  else if (status === 'fulfilled') currentStage = 4;
  else if (status === 'cancelled') currentStage = -1;

  // Auto-advance visual stage if donor is selected or responses exist
  if (currentStage < 3 && selectedDonorId) {
    currentStage = 3;
  } else if (currentStage < 2 && hasResponses) {
    currentStage = 2;
  }

  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <View style={styles.cancelledBanner}>
        <Ionicons name="close-circle" size={20} color={THEME.colors.urgent} />
        <Text style={styles.cancelledText}>This Blood Request has been CANCELLED</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {CONFIG.REQUEST_STAGES.map((stg, index) => {
          const isCompleted = currentStage > index;
          const isCurrent = currentStage === index;

          return (
            <React.Fragment key={stg.key}>
              {/* Connector line between steps */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    index <= currentStage && styles.connectorActive
                  ]}
                />
              )}

              {/* Step Circle */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && styles.circleCurrent
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNum,
                        isCurrent && styles.stepNumCurrent
                      ]}
                    >
                      {stg.step}
                    </Text>
                  )}
                </View>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.label,
                    isCurrent && styles.labelCurrent,
                    isCompleted && styles.labelCompleted
                  ]}
                >
                  {stg.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.sm
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  stepItem: {
    alignItems: 'center',
    width: 58
  },
  connector: {
    flex: 1,
    height: 3,
    backgroundColor: THEME.colors.borderLight,
    marginTop: 13,
    marginHorizontal: -4
  },
  connectorActive: {
    backgroundColor: THEME.colors.primary
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  circleCompleted: {
    backgroundColor: THEME.colors.success,
    borderColor: THEME.colors.success
  },
  circleCurrent: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
    ...THEME.shadows.emergency
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted
  },
  stepNumCurrent: {
    color: '#FFFFFF'
  },
  label: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 12
  },
  labelCurrent: {
    color: THEME.colors.primary,
    fontWeight: '800'
  },
  labelCompleted: {
    color: THEME.colors.navy,
    fontWeight: '600'
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.urgentBg,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: THEME.spacing.md
  },
  cancelledText: {
    color: THEME.colors.urgent,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8
  }
});

