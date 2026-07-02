import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import AnimatedMap, { type AnimatedMapHandle } from '@/components/AnimatedMap';
import MarathonCalculator from '@/components/MarathonCalculator';
import { useUser } from '@/context/UserContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { DirectionsError, fetchWalkingRoute } from '@/lib/directions';
import {
  MARATHON_LABELS,
  calculateFinishTime,
  estimateCalories,
  generateSplits,
  type Coordinate,
  type MarathonType,
  type Split,
} from '@/lib/marathon';
import { saveRun, type SavedRun } from '@/lib/storage';

export default function RunScreen() {
  const { user } = useUser();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const mapRef = useRef<AnimatedMapHandle>(null);

  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [route, setRoute] = useState<Coordinate[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
    source: 'directions' | 'fallback';
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastPlan, setLastPlan] = useState<{
    marathonType: MarathonType;
    distanceKm: number;
    paceMinPerKm: number;
    finishTime: string;
    splits: Split[];
    calories: number;
    destination: Coordinate;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const handleMapPress = useCallback((coordinate: Coordinate) => {
    setDestination(coordinate);
    setRoute([]);
    setRouteInfo(null);
    setLastPlan(null);
  }, []);

  const handleClearDestination = useCallback(() => {
    setDestination(null);
    setRoute([]);
    setRouteInfo(null);
    setLastPlan(null);
  }, []);

  const handleCalculate = useCallback(
    async (data: { marathonType: MarathonType; paceMinPerKm: number }) => {
      if (!userLocation) {
        Alert.alert('Location Required', 'Enable location to plan a street route from where you are.');
        return;
      }
      if (!destination) {
        Alert.alert('Choose Destination', 'Tap the map to pick where you want to run.');
        return;
      }

      setRouteLoading(true);
      setRoute([]);
      setRouteInfo(null);
      setLastPlan(null);

      try {
        const result = await fetchWalkingRoute(userLocation, destination);
        const distanceKm = result.distanceKm;
        const finishTime = calculateFinishTime(distanceKm, data.paceMinPerKm);
        const splits = generateSplits(distanceKm, data.paceMinPerKm);
        const weightKg = user?.age ? Math.max(50, 80 - (user.age - 25) * 0.3) : 70;
        const calories = estimateCalories(distanceKm, weightKg, data.paceMinPerKm);

        setRoute(result.coordinates);
        setRouteInfo({
          distanceKm,
          durationMinutes: result.durationMinutes,
          source: result.source,
        });
        setLastPlan({
          marathonType: data.marathonType,
          distanceKm,
          paceMinPerKm: data.paceMinPerKm,
          finishTime,
          splits,
          calories,
          destination,
        });

        setTimeout(() => {
          mapRef.current?.fitRoute();
          mapRef.current?.animateRoute();
        }, 800);
      } catch (err) {
        const message =
          err instanceof DirectionsError
            ? err.message
            : 'Could not fetch a walking route on streets.';
        Alert.alert('Route Error', message);
      } finally {
        setRouteLoading(false);
      }
    },
    [userLocation, destination, user?.age]
  );

  const handleSave = async () => {
    if (!lastPlan) {
      Alert.alert('Plan First', 'Get a street route before saving.');
      return;
    }
    if (route.length < 2) {
      Alert.alert('No Route', 'Wait for the route to load on the map.');
      return;
    }

    setSaving(true);
    const snapshot = await mapRef.current?.captureSnapshot();

    const run: SavedRun = {
      id: Date.now().toString(),
      name: `${MARATHON_LABELS[lastPlan.marathonType]} · ${lastPlan.distanceKm.toFixed(1)} km`,
      marathonType: lastPlan.marathonType,
      distanceKm: lastPlan.distanceKm,
      paceMinPerKm: lastPlan.paceMinPerKm,
      finishTime: lastPlan.finishTime,
      splits: lastPlan.splits,
      route,
      destination: lastPlan.destination,
      routeDistanceKm: routeInfo?.distanceKm,
      routeSource: routeInfo?.source,
      mapSnapshotUri: snapshot ?? undefined,
      calories: lastPlan.calories,
      createdAt: new Date().toISOString(),
    };

    await saveRun(run);
    setSaving(false);
    Alert.alert('Saved!', 'Your route has been added to your library.');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Hello, {user?.name ?? 'Runner'}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>Plan Your Run</Text>
        </View>
        <Pressable
          style={[styles.animateBtn, { backgroundColor: colors.card }]}
          onPress={() => mapRef.current?.animateRoute()}
          disabled={route.length < 2}
        >
          <SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={18} tintColor={Colors.accent} />
        </Pressable>
      </View>

      <View style={styles.mapContainer}>
        <AnimatedMap
          ref={mapRef}
          origin={userLocation}
          destination={destination}
          route={route}
          animateOnMount
          selectionEnabled={!routeLoading}
          onMapPress={handleMapPress}
        />
        {routeLoading && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.mapLoadingText}>Loading street route...</Text>
          </View>
        )}
        <View style={[styles.mapBadge, { backgroundColor: colors.mapOverlay }]}>
          <Text style={styles.mapBadgeText}>
            {routeInfo
              ? `Street route · ${routeInfo.distanceKm.toFixed(2)} km · ~${routeInfo.durationMinutes} min walk`
              : destination
                ? 'Tap Get Street Route below'
                : 'Tap map to choose finish point'}
          </Text>
        </View>
        {destination && !routeLoading && (
          <Pressable style={styles.clearBtn} onPress={handleClearDestination}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MarathonCalculator
          onCalculate={handleCalculate}
          userAge={user?.age}
          loading={routeLoading}
          destinationSelected={!!destination}
          plannedDistanceKm={routeInfo?.distanceKm ?? null}
        />

        {lastPlan && route.length > 1 && !routeLoading && (
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <SymbolView name={{ ios: 'square.and.arrow.down', android: 'save', web: 'save' }} size={20} tintColor="#FFF" />
            <Text style={styles.saveBtnText}>
              {saving ? 'Capturing Map...' : 'Save to Library'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  greeting: { fontSize: 14 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  animateBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    height: 280,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 15, 26, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapLoadingText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  mapBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 72,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  clearBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
