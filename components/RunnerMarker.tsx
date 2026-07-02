import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Marker } from 'react-native-maps';
import type { Coordinate } from '@/lib/marathon';

type Props = {
  coordinate: Coordinate;
  running?: boolean;
  title?: string;
};

export default function RunnerMarker({ coordinate, running = false, title = 'You' }: Props) {
  return (
    <Marker coordinate={coordinate} title={title} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <View style={styles.wrap}>
        <View style={[styles.ring, running && styles.ringRunning]} />
        <View style={[styles.body, running && styles.bodyRunning]}>
          <SymbolView
            name={{
              ios: running ? 'figure.run' : 'figure.stand',
              android: running ? 'directions_run' : 'person',
              web: running ? 'directions_run' : 'person',
            }}
            size={22}
            tintColor="#FFF"
          />
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  ringRunning: {
    backgroundColor: 'rgba(255, 107, 53, 0.25)',
    borderColor: '#FF6B35',
  },
  body: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  bodyRunning: {
    backgroundColor: '#FF6B35',
  },
});
