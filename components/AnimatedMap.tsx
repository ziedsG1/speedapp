import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import RunnerMarker from '@/components/RunnerMarker';
import { customMapStyle } from '@/constants/mapStyle';
import type { Coordinate } from '@/lib/marathon';

export type AnimatedMapHandle = {
  captureSnapshot: () => Promise<string | null>;
  animateRoute: () => void;
  fitRoute: () => void;
  followRunner: (position: Coordinate) => void;
};

type AnimatedMapProps = {
  origin?: Coordinate | null;
  destination?: Coordinate | null;
  route?: Coordinate[];
  traveledPath?: Coordinate[];
  runnerPosition?: Coordinate | null;
  isRunning?: boolean;
  routeReady?: boolean;
  animateOnMount?: boolean;
  interactive?: boolean;
  selectionEnabled?: boolean;
  onMapPress?: (coordinate: Coordinate) => void;
  style?: object;
};

const DEFAULT_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const AnimatedMap = forwardRef<AnimatedMapHandle, AnimatedMapProps>(
  (
    {
      origin,
      destination,
      route = [],
      traveledPath = [],
      runnerPosition = null,
      isRunning = false,
      routeReady = false,
      animateOnMount = true,
      interactive = true,
      selectionEnabled = false,
      onMapPress,
      style,
    },
    ref
  ) => {
    const mapRef = useRef<MapView>(null);
    const [animatedIndex, setAnimatedIndex] = useState(0);
    const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useImperativeHandle(ref, () => ({
      captureSnapshot: async () => {
        try {
          const snapshot = await mapRef.current?.takeSnapshot({
            width: 800,
            height: 600,
            format: 'png',
            quality: 0.9,
            result: 'file',
          });
          return snapshot ?? null;
        } catch {
          return null;
        }
      },
      animateRoute: () => startRouteAnimation(),
      fitRoute: () => fitToRoute(),
      followRunner: (position: Coordinate) => {
        mapRef.current?.animateCamera(
          {
            center: position,
            pitch: 55,
            heading: 0,
            altitude: 500,
            zoom: 17,
          },
          { duration: 600 }
        );
      },
    }));

    const fitToRoute = () => {
      const points = [
        ...route,
        ...traveledPath,
        origin,
        destination,
        runnerPosition,
      ].filter(Boolean) as Coordinate[];

      if (points.length < 2) {
        if (origin) {
          mapRef.current?.animateCamera(
            {
              center: origin,
              pitch: 55,
              heading: 0,
              altitude: 800,
              zoom: 15,
            },
            { duration: 1200 }
          );
        }
        return;
      }

      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
        animated: true,
      });
      setTimeout(() => {
        mapRef.current?.animateCamera({ pitch: 55, altitude: 1200 }, { duration: 800 });
      }, 600);
    };

    const startRouteAnimation = () => {
      if (route.length < 2 || isRunning) return;
      let index = 0;
      if (animationRef.current) clearInterval(animationRef.current);

      animationRef.current = setInterval(() => {
        index = (index + 1) % route.length;
        setAnimatedIndex(index);
        const point = route[index];
        mapRef.current?.animateCamera(
          {
            center: point,
            pitch: 60,
            heading: index * 9,
            altitude: 600,
            zoom: 16,
          },
          { duration: 400 }
        );
      }, 800);
    };

    useEffect(() => {
      if (animateOnMount && !isRunning) {
        setTimeout(() => fitToRoute(), 500);
      }
      return () => {
        if (animationRef.current) clearInterval(animationRef.current);
      };
    }, [route, origin, destination, isRunning]);

    useEffect(() => {
      setAnimatedIndex(0);
    }, [route]);

    useEffect(() => {
      if (isRunning && animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }, [isRunning]);

    const handlePress = (event: { nativeEvent: { coordinate: Coordinate } }) => {
      if (!selectionEnabled || !onMapPress) return;
      onMapPress(event.nativeEvent.coordinate);
    };

    const initialRegion: Region = origin
      ? { ...origin, latitudeDelta: 0.015, longitudeDelta: 0.015 }
      : DEFAULT_REGION;

    const animatedRoute = route.slice(0, animatedIndex + 1);
    const startPoint = origin ?? route[0];
    const endPoint = destination ?? route[route.length - 1];
    const showRunnerAtStart = routeReady && !isRunning && startPoint;
    const showRunnerLive = isRunning && runnerPosition;

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          customMapStyle={customMapStyle}
          showsBuildings
          showsUserLocation={!showRunnerAtStart && !showRunnerLive}
          showsMyLocationButton={false}
          showsCompass={false}
          pitchEnabled={interactive}
          rotateEnabled={interactive}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          mapType="standard"
          onPress={handlePress}
        >
          {startPoint && !showRunnerAtStart && (
            <Marker coordinate={startPoint} title="Start" description="You are here" pinColor="#10B981" />
          )}

          {showRunnerAtStart && (
            <RunnerMarker coordinate={startPoint} running={false} title="Start here" />
          )}

          {showRunnerLive && (
            <RunnerMarker coordinate={runnerPosition} running title="Running" />
          )}

          {endPoint &&
            (!startPoint ||
              endPoint.latitude !== startPoint.latitude ||
              endPoint.longitude !== startPoint.longitude) && (
              <Marker coordinate={endPoint} title="Finish" description="Your destination" pinColor="#EF4444" />
            )}

          {route.length > 1 && (
            <Polyline
              coordinates={route}
              strokeColor="rgba(255, 107, 53, 0.2)"
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {isRunning && traveledPath.length > 1 && (
            <Polyline
              coordinates={traveledPath}
              strokeColor="#10B981"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {!isRunning && route.length > 1 && (
            <>
              <Polyline
                coordinates={animatedRoute.length > 1 ? animatedRoute : route}
                strokeColor="#FF6B35"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}

          {isRunning && route.length > 1 && (
            <Polyline
              coordinates={route}
              strokeColor="#FF6B35"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              lineDashPattern={[1, 8]}
            />
          )}
        </MapView>
      </View>
    );
  }
);

AnimatedMap.displayName = 'AnimatedMap';

export default AnimatedMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
