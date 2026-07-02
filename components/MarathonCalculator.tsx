import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  MARATHON_LABELS,
  calculateFinishTime,
  estimateCalories,
  generateSplits,
  type MarathonType,
} from '@/lib/marathon';

type Props = {
  onCalculate: (data: {
    marathonType: MarathonType;
    paceMinPerKm: number;
  }) => void;
  onStartRunning?: () => void;
  onStopRunning?: () => void;
  userAge?: number;
  loading?: boolean;
  destinationSelected?: boolean;
  plannedDistanceKm?: number | null;
  routeReady?: boolean;
  isRunning?: boolean;
  rerouting?: boolean;
};

export default function MarathonCalculator({
  onCalculate,
  onStartRunning,
  onStopRunning,
  userAge,
  loading = false,
  destinationSelected = false,
  plannedDistanceKm = null,
  routeReady = false,
  isRunning = false,
  rerouting = false,
}: Props) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [marathonType, setMarathonType] = useState<MarathonType>('full');
  const [paceMinutes, setPaceMinutes] = useState('5');
  const [paceSeconds, setPaceSeconds] = useState('30');

  const paceMinPerKm = useMemo(() => {
    const mins = parseInt(paceMinutes, 10) || 0;
    const secs = parseInt(paceSeconds, 10) || 0;
    return mins + secs / 60;
  }, [paceMinutes, paceSeconds]);

  const previewDistance = plannedDistanceKm ?? null;

  const finishTime = useMemo(() => {
    if (!previewDistance) return '--:--';
    return calculateFinishTime(previewDistance, paceMinPerKm);
  }, [previewDistance, paceMinPerKm]);

  const splits = useMemo(() => {
    if (!previewDistance) return [];
    return generateSplits(previewDistance, paceMinPerKm);
  }, [previewDistance, paceMinPerKm]);

  const weightKg = userAge ? Math.max(50, 80 - (userAge - 25) * 0.3) : 70;
  const calories = useMemo(() => {
    if (!previewDistance) return null;
    return estimateCalories(previewDistance, weightKg, paceMinPerKm);
  }, [previewDistance, weightKg, paceMinPerKm]);

  const handlePrimaryAction = () => {
    if (isRunning) {
      onStopRunning?.();
      return;
    }
    if (routeReady) {
      onStartRunning?.();
      return;
    }
    onCalculate({ marathonType, paceMinPerKm });
  };

  const types: MarathonType[] = ['5k', '10k', 'half', 'full'];
  const canPlan = destinationSelected && !loading && !isRunning;
  const canStart = routeReady && !loading && !rerouting;
  const buttonEnabled = isRunning ? true : routeReady ? canStart : canPlan;

  const buttonLabel = isRunning
    ? 'Stop Running'
    : routeReady
      ? 'Start Running'
      : 'Get Street Route';

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={styles.sectionTitle}>Run label</Text>
      <View style={styles.typeRow}>
        {types.map((type) => (
          <Pressable
            key={type}
            onPress={() => setMarathonType(type)}
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
              {MARATHON_LABELS[type]}
            </Text>
          </Pressable>
        ))}
      </View>

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
          />
          <Text style={[styles.paceLabel, { color: colors.textSecondary }]}>sec</Text>
        </View>
      </View>

      <View style={[styles.preview, { backgroundColor: colors.background }]}>
        <View style={styles.previewItem}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Street route</Text>
          <Text style={[styles.previewValue, { color: colors.text }]}>
            {previewDistance != null ? `${previewDistance.toFixed(2)} km` : 'Tap map'}
          </Text>
        </View>
        <View style={styles.previewItem}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Finish Time</Text>
          <Text style={[styles.previewValue, { color: Colors.accent }]}>{finishTime}</Text>
        </View>
        <View style={styles.previewItem}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Calories</Text>
          <Text style={[styles.previewValue, { color: colors.text }]}>
            {calories != null ? `~${calories}` : '--'}
          </Text>
        </View>
      </View>

      {splits.length > 0 && (
        <ScrollView style={styles.splitsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          <Text style={[styles.splitsTitle, { color: colors.textSecondary }]}>Split Times</Text>
          {splits.map((split) => (
            <View key={split.km} style={[styles.splitRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.splitKm, { color: colors.text }]}>{split.km} km</Text>
              <Text style={[styles.splitTime, { color: Colors.accent }]}>{split.cumulativeTime}</Text>
              <Text style={[styles.splitPace, { color: colors.textSecondary }]}>{split.pace}/km</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {!destinationSelected && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Tap the map to choose your finish point. Route starts from your current location.
        </Text>
      )}

      {isRunning && (
        <Text style={[styles.hint, { color: Colors.accent }]}>
          Follow the orange route. Your green line grows as you move. The route updates if you turn onto another street.
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
              {rerouting ? 'Updating route...' : 'Loading street route...'}
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
  splitsScroll: {
    maxHeight: 120,
  },
  splitsTitle: {
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitKm: {
    fontSize: 14,
    fontWeight: '500',
    width: 60,
  },
  splitTime: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  splitPace: {
    fontSize: 13,
    width: 70,
    textAlign: 'right',
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
