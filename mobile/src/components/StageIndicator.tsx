import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { RequestStatus } from '../constants/types';

interface StageIndicatorProps {
  status?: RequestStatus;
  currentStatus?: RequestStatus;
  selectedDonorId?: string | null;
  hasResponses?: boolean;
  compact?: boolean;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({
  status,
  currentStatus,
  selectedDonorId,
  hasResponses = false,
  compact = false
}) => {
  const activeStatus = (currentStatus || status || 'registered') as RequestStatus;

  // Determine current stage index (0 to 4)
  let currentStage = 0;
  if (['registered', 'pending'].includes(activeStatus)) currentStage = 0;
  else if (['alerting_donors', 'alerting', 'active'].includes(activeStatus)) currentStage = 1;
  else if (['donors_responded', 'responses_received'].includes(activeStatus)) currentStage = 2;
  else if (activeStatus === 'donor_selected') currentStage = 3;
  else if (activeStatus === 'fulfilled') currentStage = 4;
  else if (activeStatus === 'cancelled') currentStage = -1;

  if (currentStage < 3 && selectedDonorId) {
    currentStage = 3;
  } else if (currentStage < 2 && hasResponses) {
    currentStage = 2;
  }

  const isCancelled = activeStatus === 'cancelled';

  if (isCancelled) {
    return (
      <View style={styles.cancelledBanner}>
        <Ionicons name="close-circle" size={16} color={THEME.colors.urgent} />
        <Text style={styles.cancelledText}>Blood Request Cancelled</Text>
      </View>
    );
  }

  if (compact) {
    const stageNames = ['Registered', 'Alerting', 'Responded', 'Selected', 'Fulfilled'];
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactBarRow}>
          {stageNames.map((name, idx) => {
            const isCompleted = currentStage > idx;
            const isCurrent = currentStage === idx;
            return (
              <View
                key={name}
                style={[
                  styles.compactSegment,
                  isCompleted && styles.compactSegmentCompleted,
                  isCurrent && styles.compactSegmentCurrent
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.compactLabel}>
          Stage {Math.max(1, currentStage + 1)} of 5: {stageNames[Math.max(0, currentStage)]}
        </Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8
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
    height: 2.5,
    backgroundColor: THEME.colors.slate200,
    marginTop: 13,
    marginHorizontal: -4
  },
  connectorActive: {
    backgroundColor: THEME.colors.primary
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.slate100,
    borderWidth: 1.5,
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
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate500
  },
  stepNumCurrent: {
    color: '#FFFFFF'
  },
  label: {
    fontSize: 9.5,
    color: THEME.colors.slate500,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 12
  },
  labelCurrent: {
    color: THEME.colors.primary,
    fontWeight: '800'
  },
  labelCompleted: {
    color: THEME.colors.navy,
    fontWeight: '700'
  },
  compactContainer: {
    marginVertical: 4
  },
  compactBarRow: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
    marginBottom: 4
  },
  compactSegment: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: THEME.colors.slate200
  },
  compactSegmentCompleted: {
    backgroundColor: THEME.colors.success
  },
  compactSegmentCurrent: {
    backgroundColor: THEME.colors.primary
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.slate600
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FECDD3'
  },
  cancelledText: {
    color: THEME.colors.urgent,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6
  }
});
