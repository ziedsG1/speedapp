import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  MARATHON_DISTANCES,
  MARATHON_LABELS,
  calculateFinishTime,
  estimateCalories,
  secondsToTime,
  type MarathonType,
} from '@/lib/marathon';
import { estimateStepsFromKm } from '@/lib/steps';

type Props = {
  onPlanRoute: (data: {
    marathonType: MarathonType | 'custom';
    targetKm: number;
    paceMinPerKm: number;
  }) => void;
  onStartRunning?: () => void;
  onStopRunning?: () => void;
  userAge?: number;
  loading?: boolean;
  routeReady?: boolean;
  isRunning?: boolean;
  rerouting?: boolean;
  targetDistanceKm?: number;
  routeDistanceKm?: number | null;
  elapsedSeconds?: number;
  stepCount?: number;
  achievedDistanceKm?: number;
};

export default function MarathonCalculator({
  onPlanRoute,
  onStartRunning,
  onStopRunning,
  userAge,
  loading = false,
  routeReady = false,
  isRunning = false,
  rerouting = false,
  targetDistanceKm = 5,
  routeDistanceKm = null,
  elapsedSeconds = 0,
  stepCount = 0,
  achievedDistanceKm = 0,
}: Props) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [marathonType, setMarathonType] = useState<MarathonType | 'custom'>('5k');
  const [customKm, setCustomKm] = useState('5');
  const [paceMinutes, setPaceMinutes] = useState('5');
  const [paceSeconds, setPaceSeconds] = useState('30');

  const paceMinPerKm = useMemo(() => {
    const mins = parseInt(paceMinutes, 10) || 0;
    const secs = parseInt(paceSeconds, 10) || 0;
    return mins + secs / 60;
  }, [paceMinutes, paceSeconds]);

  const activeTargetKm = useMemo(() => {
    if (marathonType === 'custom') {
      const parsed = parseFloat(customKm.replace(',', '.'));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return MARATHON_DISTANCES[marathonType];
  }, [marathonType, customKm]);

  const targetTime = useMemo(() => {
    if (!activeTargetKm) return '--:--';
    return calculateFinishTime(activeTargetKm, paceMinPerKm);
  }, [activeTargetKm, paceMinPerKm]);

  const weightKg = userAge ? Math.max(50, 80 - (userAge - 25) * 0.3) : 70;
  const calories = useMemo(() => {
    const km = isRunning ? achievedDistanceKm : activeTargetKm;
    if (!km) return null;
    return estimateCalories(km, weightKg, paceMinPerKm);
  }, [activeTargetKm, achievedDistanceKm, isRunning, weightKg, paceMinPerKm]);

  const previewSteps = isRunning
    ? stepCount
    : estimateStepsFromKm(routeDistanceKm ?? activeTargetKm);

  const handleSelectType = (type: MarathonType | 'custom') => {
    setMarathonType(type);
    const km = type === 'custom' ? parseFloat(customKm.replace(',', '.')) : MARATHON_DISTANCES[type];
    if (km > 0 && !isRunning) {
      onPlanRoute({ marathonType: type, targetKm: km, paceMinPerKm });
    }
  };

  const handleCustomKmBlur = () => {
    if (marathonType !== 'custom' || isRunning) return;
    const km = parseFloat(customKm.replace(',', '.'));
    if (km > 0) {
      onPlanRoute({ marathonType: 'custom', targetKm: km, paceMinPerKm });
    }
  };

  const handlePrimaryAction = () => {
    if (isRunning) {
      onStopRunning?.();
      return;
    }
    if (routeReady) {
      onStartRunning?.();
      return;
    }
    if (activeTargetKm > 0) {
      onPlanRoute({ marathonType, targetKm: activeTargetKm, paceMinPerKm });
    }
  };

  const types: (MarathonType | 'custom')[] = ['5k', '10k', 'half', 'full', 'custom'];
  const canStart = routeReady && !loading && !rerouting;
  const buttonEnabled = isRunning ? true : routeReady ? canStart : activeTargetKm > 0 && !loading;

  const buttonLabel = isRunning
    ? 'Stop Running'
    : routeReady
      ? 'Start Running'
      : 'Plan Street Route';

  const timeLabel = isRunning ? 'Elapsed' : 'Target Time';
  const timeValue = isRunning ? secondsToTime(elapsedSeconds) : targetTime;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={styles.sectionTitle}>Run label</Text>
      <View style={styles.typeRow}>
        {types.map((type) => (
          <Pressable
            key={type}
            onPress={() => handleSelectType(type)}
            disabled={loading || isRunning}
            style={[
              styles.typeChip,
              {
                backgroundColor:
                  marathonType === type ? Colors.accent : colors.background,
                borderColor: marathonType === type ? Colors.accent : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.typeChipText,
                { color: marathonType === type ? '#FFF' : colors.textSecondary },
              ]}
            >
              {type === 'custom' ? 'Custom' : MARATHON_LABELS[type]}
            </Text>
          </Pressable>
        ))}
      </View>

      {marathonType === 'custom' && (
        <View style={[styles.kmInputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.kmInput, { color: colors.text }]}
            value={customKm}
            onChangeText={setCustomKm}
            onBlur={handleCustomKmBlur}
            keyboardType="decimal-pad"
            placeholder="e.g. 7.5"
            placeholderTextColor={colors.textSecondary}
            editable={!isRunning && !loading}
          />
          <Text style={[styles.kmLabel, { color: colors.textSecondary }]}>km goal</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Target Pace (min/km)</Text>
      <View style={styles.paceRow}>
        <View style={[styles.paceInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={paceMinutes}
            onChangeText={setPaceMinutes}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="5"
            placeholderTextColor={colors.textSecondary}
            editable={!isRunning}
          />
          <Text style={[styles.paceLabel, { color: colors.textSecondary }]}>min</Text>
        </View>
        <Text style={[styles.paceSep, { color: colors.text }]}>:</Text>
        <View style={[styles.paceInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={paceSeconds}
            onChangeText={setPaceSeconds}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="30"
            placeholderTextColor={colors.textSecondary}
            editable={!isRunning}
          />
          <Text style={[styles.paceLabel, { color: colors.textSecondary }]}>sec</Text>
        </View>
      </View>

      <View style={[styles.preview, { backgroundColor: colors.background }]}>
        <View style={styles.previewItem}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
            {isRunning ? 'Km achieved' : 'Street route'}
          </Text>
          <Text style={[styles.previewValue, { color: colors.text }]}>
            {isRunning
              ? `${achievedDistanceKm.toFixed(2)} km`
              : routeDistanceKm != null
                ? `${routeDistanceKm.toFixed(2)} km`
                : activeTargetKm
                  ? `${activeTargetKm} km goal`
                  : '--'}
          </Text>
        </View>
        <View style={styles.previewItem}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>{timeLabel}</Text>
          <Text style={[styles.previewValue, { color: Colors.accent }]}>{timeValue}</Text>
        </View>
        <View style={styles.previewItem}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Steps</Text>
          <Text style={[styles.previewValue, { color: colors.text }]}>
            {previewSteps > 0 ? previewSteps.toLocaleString() : '--'}
          </Text>
        </View>
      </View>

      {calories != null && (
        <Text style={[styles.calories, { color: colors.textSecondary }]}>
          Calories {isRunning ? 'so far' : 'estimate'}: ~{calories}
        </Text>
      )}

      {isRunning && (
        <Text style={[styles.hint, { color: Colors.accent }]}>
          Green line = your steps. Route updates if you turn onto another street.
        </Text>
      )}

      {!routeReady && !loading && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Tap 5K, 10K, or Custom to auto-create a street route from your location.
        </Text>
      )}

      <Pressable
        style={[
          styles.button,
          isRunning && styles.buttonStop,
          (!buttonEnabled || loading || rerouting) && styles.buttonDisabled,
        ]}
        onPress={handlePrimaryAction}
        disabled={!buttonEnabled || loading || rerouting}
      >
        {loading || rerouting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={styles.buttonText}>
              {rerouting ? 'Updating route...' : 'Planning street route...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  kmInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  kmInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  kmLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  paceLabel: {
    fontSize: 14,
  },
  paceSep: {
    fontSize: 28,
    fontWeight: '700',
  },
  preview: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    justifyContent: 'space-between',
  },
  previewItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  previewLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  calories: {
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonStop: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
