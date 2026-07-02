import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MARATHON_LABELS } from '@/lib/marathon';
import { deleteRun, getRunHistory, type SavedRun } from '@/lib/storage';

function RunCard({
  run,
  onPress,
  onDelete,
  colors,
}: {
  run: SavedRun;
  onPress: () => void;
  onDelete: () => void;
  colors: typeof Colors.dark;
}) {
  const date = new Date(run.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      {run.mapSnapshotUri ? (
        <Image source={{ uri: run.mapSnapshotUri }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.background }]}>
          <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} size={32} tintColor={Colors.accent} />
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{MARATHON_LABELS[run.marathonType]}</Text>
          </View>
          <Pressable onPress={onDelete} hitSlop={12}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} tintColor="#EF4444" />
          </Pressable>
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {run.name}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time</Text>
            <Text style={[styles.statValue, { color: Colors.accent }]}>{run.finishTime}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{run.distanceKm} km</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pace</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Math.floor(run.paceMinPerKm)}:{String(Math.round((run.paceMinPerKm % 1) * 60)).padStart(2, '0')}
            </Text>
          </View>
        </View>

        <Text style={[styles.date, { color: colors.textSecondary }]}>{date}</Text>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    const history = await getRunHistory();
    setRuns(history);
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Run', 'Remove this run from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(id);
          loadHistory();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {runs.length} saved {runs.length === 1 ? 'run' : 'runs'}
        </Text>
      </View>

      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <SymbolView name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }} size={48} tintColor={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No runs yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Plan a marathon and save it to build your history.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RunCard
            run={item}
            colors={colors}
            onPress={() => router.push(`/history/${item.id}`)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 11, textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  date: { fontSize: 12 },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
