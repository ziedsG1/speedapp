import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import AnimatedMap from '@/components/AnimatedMap';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MARATHON_LABELS } from '@/lib/marathon';
import { getRunById, type SavedRun } from '@/lib/storage';

function typeLabel(run: SavedRun): string {
  if (run.marathonType === 'custom') return 'Custom';
  return MARATHON_LABELS[run.marathonType];
}

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [run, setRun] = useState<SavedRun | null>(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (id) getRunById(id).then(setRun);
  }, [id]);

  if (!run) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const date = new Date(run.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const finishPoint = run.destination ?? run.route[run.route.length - 1];

  return (
    <>
      <Stack.Screen
        options={{
          title: typeLabel(run),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {run.mapSnapshotUri ? (
          <Image source={{ uri: run.mapSnapshotUri }} style={styles.snapshot} />
        ) : (
          <View style={styles.mapWrap}>
            <AnimatedMap
              ref={mapRef}
              origin={run.startPoint}
              destination={finishPoint}
              route={run.route}
              highlightEndpoints
              animateOnMount
              interactive={false}
            />
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.runName, { color: colors.text }]}>{run.name}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{date}</Text>

          <View style={styles.endpointLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendStart]} />
              <Text style={[styles.legendText, { color: colors.text }]}>Start point</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendFinish]} />
              <Text style={[styles.legendText, { color: colors.text }]}>Finish point</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, styles.statBoxHighlight, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Km Achieved</Text>
              <Text style={[styles.statBoxValue, { color: '#10B981' }]}>
                {run.achievedDistanceKm.toFixed(2)} km
              </Text>
              <Text style={[styles.statSub, { color: colors.textSecondary }]}>
                goal {run.plannedDistanceKm.toFixed(1)} km
              </Text>
            </View>
            <View style={[styles.statBox, styles.statBoxHighlight, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Steps</Text>
              <Text style={[styles.statBoxValue, { color: Colors.accent }]}>
                {run.steps.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Finish Time</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>{run.finishTime}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Pace</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {Math.floor(run.paceMinPerKm)}:{String(Math.round((run.paceMinPerKm % 1) * 60)).padStart(2, '0')}/km
              </Text>
            </View>
            {run.calories != null && (
              <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Calories</Text>
                <Text style={[styles.statBoxValue, { color: colors.text }]}>~{run.calories}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.mapWrap}>
          <AnimatedMap
            origin={run.startPoint}
            destination={finishPoint}
            route={run.route}
            highlightEndpoints
            animateOnMount
            interactive
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  snapshot: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  mapWrap: {
    height: 240,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoCard: {
    margin: 20,
    borderRadius: 18,
    padding: 20,
  },
  runName: { fontSize: 22, fontWeight: '800' },
  date: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  endpointLegend: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  legendStart: {
    backgroundColor: '#10B981',
    borderColor: '#6EE7B7',
  },
  legendFinish: {
    backgroundColor: '#EF4444',
    borderColor: '#FCA5A5',
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '47%',
    borderRadius: 12,
    padding: 14,
  },
  statBoxHighlight: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statBoxLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
