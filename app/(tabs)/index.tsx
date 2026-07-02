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
import {
  closestPointOnRoute,
  distanceMeters,
  pathDistanceMeters,
  shouldAppendPathPoint,
  sliceRouteFrom,
} from '@/lib/route-tracking';
import { saveRun, type SavedRun } from '@/lib/storage';

const OFF_ROUTE_THRESHOLD_M = 45;
const REROUTE_COOLDOWN_MS = 15000;
const ARRIVAL_THRESHOLD_M = 25;

export default function RunScreen() {
  const { user } = useUser();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const mapRef = useRef<AnimatedMapHandle>(null);

  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [route, setRoute] = useState<Coordinate[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const [runnerPosition, setRunnerPosition] = useState<Coordinate | null>(null);
  const [traveledPath, setTraveledPath] = useState<Coordinate[]>([]);
  const [distanceTraveledKm, setDistanceTraveledKm] = useState(0);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
    source: 'serpapi' | 'osrm' | 'directions';
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

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastRerouteAtRef = useRef(0);
  const offRouteCountRef = useRef(0);
  const destinationRef = useRef<Coordinate | null>(null);
  const routeRef = useRef<Coordinate[]>([]);
  const isRunningRef = useRef(false);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

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

  useEffect(() => {
    return () => {
      locationSubRef.current?.remove();
    };
  }, []);

  const resetRunState = useCallback(() => {
    setRouteReady(false);
    setIsRunning(false);
    setRunnerPosition(null);
    setTraveledPath([]);
    setDistanceTraveledKm(0);
    offRouteCountRef.current = 0;
    lastRerouteAtRef.current = 0;
  }, []);

  const handleMapPress = useCallback(
    (coordinate: Coordinate) => {
      if (isRunning) return;
      setDestination(coordinate);
      setRoute([]);
      setRouteInfo(null);
      setLastPlan(null);
      resetRunState();
    },
    [isRunning, resetRunState]
  );

  const handleClearDestination = useCallback(() => {
    if (isRunning) return;
    setDestination(null);
    setRoute([]);
    setRouteInfo(null);
    setLastPlan(null);
    resetRunState();
  }, [isRunning, resetRunState]);

  const refreshRouteFrom = useCallback(
    async (from: Coordinate, dest: Coordinate, silent = false) => {
      if (!silent) setRerouting(true);
      try {
        const result = await fetchWalkingRoute(from, dest);
        setRoute(result.coordinates);
        setRouteInfo({
          distanceKm: result.distanceKm,
          durationMinutes: result.durationMinutes,
          source: result.source,
        });
        setRouteReady(true);
        return result;
      } catch (err) {
        if (!silent) {
          const message =
            err instanceof DirectionsError
              ? err.message
              : 'Could not update the route.';
          Alert.alert('Route Error', message);
        }
        return null;
      } finally {
        if (!silent) setRerouting(false);
      }
    },
    []
  );

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
      resetRunState();

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
        setRouteReady(true);
        setRunnerPosition(userLocation);
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
    [userLocation, destination, user?.age, resetRunState]
  );

  const handleLocationUpdate = useCallback(
    async (loc: Location.LocationObject) => {
      if (!isRunningRef.current) return;

      const position: Coordinate = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      const dest = destinationRef.current;

      setRunnerPosition(position);
      setUserLocation(position);
      mapRef.current?.followRunner(position);

      setTraveledPath((prev) => {
        if (!shouldAppendPathPoint(prev, position)) return prev;
        const next = [...prev, position];
        setDistanceTraveledKm(pathDistanceMeters(next) / 1000);
        return next;
      });

      if (!dest) return;

      if (distanceMeters(position, dest) <= ARRIVAL_THRESHOLD_M) {
        locationSubRef.current?.remove();
        locationSubRef.current = null;
        setIsRunning(false);
        Alert.alert('Finish!', 'You reached your destination.');
        return;
      }

      const currentRoute = routeRef.current;
      if (currentRoute.length >= 2) {
        const remaining = sliceRouteFrom(position, currentRoute);
        if (remaining.length >= 2) {
          setRoute(remaining);
        }

        const { distanceM } = closestPointOnRoute(position, currentRoute);
        if (distanceM > OFF_ROUTE_THRESHOLD_M) {
          offRouteCountRef.current += 1;
        } else {
          offRouteCountRef.current = 0;
        }

        const now = Date.now();
        const shouldReroute =
          offRouteCountRef.current >= 2 && now - lastRerouteAtRef.current > REROUTE_COOLDOWN_MS;

        if (shouldReroute) {
          offRouteCountRef.current = 0;
          lastRerouteAtRef.current = now;
          void refreshRouteFrom(position, dest, true).then((result) => {
            if (result) {
              setLastPlan((plan) =>
                plan
                  ? {
                      ...plan,
                      distanceKm: result.distanceKm,
                      finishTime: calculateFinishTime(result.distanceKm, plan.paceMinPerKm),
                      splits: generateSplits(result.distanceKm, plan.paceMinPerKm),
                    }
                  : plan
              );
            }
          });
        }
      }
    },
    [refreshRouteFrom]
  );

  const handleStartRunning = useCallback(async () => {
    if (!userLocation || !destination || route.length < 2) {
      Alert.alert('Plan First', 'Get a street route before you start running.');
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Allow location access to track your run.');
      return;
    }

    const startPos = userLocation;
    setIsRunning(true);
    setRunnerPosition(startPos);
    setTraveledPath([startPos]);
    setDistanceTraveledKm(0);
    offRouteCountRef.current = 0;
    lastRerouteAtRef.current = Date.now();

    locationSubRef.current?.remove();
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 4,
      },
      handleLocationUpdate
    );

    mapRef.current?.followRunner(startPos);
  }, [userLocation, destination, route.length, handleLocationUpdate]);

  const handleStopRunning = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    setIsRunning(false);
  }, []);

  const handleSave = async () => {
    if (!lastPlan) {
      Alert.alert('Plan First', 'Get a street route before saving.');
      return;
    }

    const pathToSave = traveledPath.length > 1 ? traveledPath : route;
    if (pathToSave.length < 2) {
      Alert.alert('No Route', 'Wait for the route to load on the map.');
      return;
    }

    setSaving(true);
    const snapshot = await mapRef.current?.captureSnapshot();
    const actualDistanceKm =
      traveledPath.length > 1 ? pathDistanceMeters(traveledPath) / 1000 : lastPlan.distanceKm;

    const run: SavedRun = {
      id: Date.now().toString(),
      name: `${MARATHON_LABELS[lastPlan.marathonType]} · ${actualDistanceKm.toFixed(1)} km`,
      marathonType: lastPlan.marathonType,
      distanceKm: lastPlan.distanceKm,
      paceMinPerKm: lastPlan.paceMinPerKm,
      finishTime: lastPlan.finishTime,
      splits: lastPlan.splits,
      route: pathToSave,
      destination: lastPlan.destination,
      routeDistanceKm: actualDistanceKm,
      routeSource: routeInfo?.source,
      mapSnapshotUri: snapshot ?? undefined,
      calories: lastPlan.calories,
      createdAt: new Date().toISOString(),
    };

    await saveRun(run);
    setSaving(false);
    Alert.alert('Saved!', 'Your route has been added to your library.');
  };

  const badgeText = isRunning
    ? `Running · ${distanceTraveledKm.toFixed(2)} km traveled`
    : routeInfo
      ? `${routeInfo.source === 'serpapi' ? 'SerpApi' : routeInfo.source === 'osrm' ? 'OSRM streets' : 'Google'} · ${routeInfo.distanceKm.toFixed(2)} km · ~${routeInfo.durationMinutes} min`
      : destination
        ? routeReady
          ? 'Person at start — tap Start Running'
          : 'Tap Get Street Route below'
        : 'Tap map to choose finish point';

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
          disabled={route.length < 2 || isRunning}
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
          traveledPath={traveledPath}
          runnerPosition={runnerPosition}
          isRunning={isRunning}
          routeReady={routeReady}
          animateOnMount
          selectionEnabled={!routeLoading && !isRunning}
          onMapPress={handleMapPress}
        />
        {(routeLoading || rerouting) && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.mapLoadingText}>
              {rerouting ? 'Updating route...' : 'Loading street route...'}
            </Text>
          </View>
        )}
        <View style={[styles.mapBadge, { backgroundColor: colors.mapOverlay }]}>
          <Text style={styles.mapBadgeText}>{badgeText}</Text>
        </View>
        {destination && !routeLoading && !isRunning && (
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
          onStartRunning={handleStartRunning}
          onStopRunning={handleStopRunning}
          userAge={user?.age}
          loading={routeLoading}
          rerouting={rerouting}
          destinationSelected={!!destination}
          plannedDistanceKm={routeInfo?.distanceKm ?? null}
          routeReady={routeReady}
          isRunning={isRunning}
        />

        {lastPlan && route.length > 1 && !routeLoading && !isRunning && (
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
