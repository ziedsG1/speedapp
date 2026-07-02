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

  return (
    <>
      <Stack.Screen
        options={{
          title: MARATHON_LABELS[run.marathonType],
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
              origin={run.route[0]}
              destination={run.destination ?? run.route[run.route.length - 1]}
              route={run.route}
              animateOnMount
              interactive={false}
            />
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.runName, { color: colors.text }]}>{run.name}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{date}</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Finish Time</Text>
              <Text style={[styles.statBoxValue, { color: Colors.accent }]}>{run.finishTime}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Distance</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {run.routeDistanceKm
                  ? `${run.routeDistanceKm.toFixed(1)} km`
                  : `${run.distanceKm} km`}
              </Text>
              {run.routeSource === 'serpapi' && (
                <Text style={[styles.routeSource, { color: colors.textSecondary }]}>
                  SerpApi street route
                </Text>
              )}
              {run.routeSource === 'directions' && (
                <Text style={[styles.routeSource, { color: colors.textSecondary }]}>
                  Google Directions
                </Text>
              )}
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Pace</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>
                {Math.floor(run.paceMinPerKm)}:{String(Math.round((run.paceMinPerKm % 1) * 60)).padStart(2, '0')}/km
              </Text>
            </View>
            {run.calories && (
              <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Calories</Text>
                <Text style={[styles.statBoxValue, { color: colors.text }]}>~{run.calories}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.splitsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.splitsTitle, { color: colors.text }]}>Split Times</Text>
          {run.splits.map((split) => (
            <View key={split.km} style={[styles.splitRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.splitKm, { color: colors.text }]}>{split.km} km</Text>
              <Text style={[styles.splitTime, { color: Colors.accent }]}>{split.cumulativeTime}</Text>
              <Text style={[styles.splitPace, { color: colors.textSecondary }]}>{split.pace}/km</Text>
            </View>
          ))}
        </View>

        <View style={styles.mapWrap}>
          <AnimatedMap
            origin={run.route[0]}
            destination={run.destination ?? run.route[run.route.length - 1]}
            route={run.route}
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
  routeSource: {
    fontSize: 10,
    marginTop: 2,
  },
  splitsCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
  },
  splitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitKm: { fontSize: 14, fontWeight: '500', width: 60 },
  splitTime: { fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
  splitPace: { fontSize: 13, width: 70, textAlign: 'right' },
});
