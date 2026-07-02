import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { useUser } from '@/context/UserContext';
import Colors from '@/constants/Colors';

export default function WelcomeScreen() {
  const { setUser } = useUser();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      return true;
    }
    Alert.alert(
      'Location Required',
      'SpeedApp needs your location to plan running routes and show 3D maps around you.',
      [{ text: 'OK' }]
    );
    return false;
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!ageNum || ageNum < 10 || ageNum > 100) {
      Alert.alert('Age Required', 'Please enter a valid age (10–100).');
      return;
    }

    setLoading(true);
    const granted = locationGranted || (await requestLocation());
    if (!granted) {
      setLoading(false);
      return;
    }

    await setUser({
      name: name.trim(),
      age: ageNum,
      onboardingComplete: true,
    });

    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient colors={['#0F0F1A', '#1A1A2E', '#0F0F1A']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.logo}>SpeedApp</Text>
            <Text style={styles.tagline}>Plan. Run. Conquer.</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>42K</Text>
                <Text style={styles.statLabel}>Marathon</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>3D</Text>
                <Text style={styles.statLabel}>Maps</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>GPS</Text>
                <Text style={styles.statLabel}>Routes</Text>
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome, Runner</Text>
            <Text style={styles.formSubtitle}>
              Tell us about yourself to personalize your marathon plans.
            </Text>

            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#6B7280"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Your Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              maxLength={3}
            />

            <Pressable
              style={[styles.locationBtn, locationGranted && styles.locationBtnGranted]}
              onPress={requestLocation}
            >
              <Text style={styles.locationIcon}>{locationGranted ? '✓' : '📍'}</Text>
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationTitle}>
                  {locationGranted ? 'Location Enabled' : 'Enable Location'}
                </Text>
                <Text style={styles.locationSub}>
                  Required for route planning & 3D map
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.continueBtnText}>Start Running</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  form: {
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0F0F1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D44',
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#F9FAFB',
    marginBottom: 20,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D44',
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  locationBtnGranted: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  locationIcon: {
    fontSize: 24,
  },
  locationTextWrap: { flex: 1 },
  locationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  locationSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  continueBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.7 },
  continueBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
