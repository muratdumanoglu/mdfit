
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native';

type ProgressEntry = {
  id: string;
  date: string;
  weight: number;
  waist: number;
  bodyFat: number;
};

type FitnessGoal = 'Kas geliştirme' | 'Yağ kaybı' | 'Kilo koruma';

type UserProfile = {
  name: string;
  age: number;
  height: number;
  currentWeight: number;
  targetWeight: number;
  goal: FitnessGoal;
};

type ProfileForm = {
  name: string;
  age: string;
  height: string;
  currentWeight: string;
  targetWeight: string;
  goal: FitnessGoal;
};

const PROGRESS_STORAGE_KEY = '@mdfit/progress-entries';
const PROFILE_STORAGE_KEY = '@mdfit/user-profile';
const FITNESS_GOALS: FitnessGoal[] = ['Kas geliştirme', 'Yağ kaybı', 'Kilo koruma'];

const EMPTY_PROFILE: ProfileForm = {
  name: '',
  age: '',
  height: '',
  currentWeight: '',
  targetWeight: '',
  goal: 'Kas geliştirme',
};

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isProgressEntry(value: unknown): value is ProgressEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'string'
    && typeof entry.date === 'string'
    && isValidDate(entry.date)
    && typeof entry.weight === 'number'
    && Number.isFinite(entry.weight)
    && typeof entry.waist === 'number'
    && Number.isFinite(entry.waist)
    && typeof entry.bodyFat === 'number'
    && Number.isFinite(entry.bodyFat);
}

function parseProfileNumber(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.name === 'string'
    && profile.name.trim().length >= 2
    && profile.name.trim().length <= 40
    && typeof profile.age === 'number'
    && Number.isInteger(profile.age)
    && profile.age >= 13
    && profile.age <= 120
    && typeof profile.height === 'number'
    && Number.isFinite(profile.height)
    && profile.height >= 80
    && profile.height <= 250
    && typeof profile.currentWeight === 'number'
    && Number.isFinite(profile.currentWeight)
    && profile.currentWeight >= 20
    && profile.currentWeight <= 350
    && typeof profile.targetWeight === 'number'
    && Number.isFinite(profile.targetWeight)
    && profile.targetWeight >= 20
    && profile.targetWeight <= 350
    && typeof profile.goal === 'string'
    && FITNESS_GOALS.includes(profile.goal as FitnessGoal);
}

const programs = [
  { name: 'PUSH', detail: 'Göğüs · Omuz · Triceps', days: 'İtiş antrenmanı' },
  { name: 'PULL', detail: 'Sırt · Biceps', days: 'Çekiş antrenmanı' },
  { name: 'LEGS', detail: 'Quadriceps · Hamstring · Kalça', days: 'Bacak antrenmanı' },
  { name: 'UPPER / LOWER', detail: 'Üst ve alt vücut', days: 'Dengeli gelişim' },
  { name: 'FULL BODY', detail: 'Tüm vücut', days: 'Yeni başlayanlar için' },
  { name: 'BRO SPLIT', detail: 'Her gün farklı kas grubu', days: 'Klasik bölgesel program' },
];

export default function App() {
  const [tab, setTab] = useState('Ana Sayfa');
  const [done, setDone] = useState<string[]>([]);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [date, setDate] = useState(getToday);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStorageError, setProfileStorageError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0);

  const tabs = ['Ana Sayfa', 'Programlar', 'Hareketler', 'Gelişim', 'Profil'];

  useEffect(() => {
    let isActive = true;
    setIsLoadingEntries(true);
    setStorageError('');

    AsyncStorage.getItem(PROGRESS_STORAGE_KEY)
      .then((storedEntries) => {
        if (!isActive) return;
        if (storedEntries === null) {
          setEntries([]);
          return;
        }

        const parsedEntries: unknown = JSON.parse(storedEntries);
        if (!Array.isArray(parsedEntries) || !parsedEntries.every(isProgressEntry)) {
          throw new Error('Kayıt biçimi geçersiz.');
        }
        setEntries(parsedEntries);
      })
      .catch(() => {
        if (isActive) {
          setStorageError('Kayıtlar yüklenemedi. Lütfen yeniden deneyin.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingEntries(false);
      });

    return () => {
      isActive = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    let isActive = true;
    setIsLoadingProfile(true);
    setProfileStorageError('');

    AsyncStorage.getItem(PROFILE_STORAGE_KEY)
      .then((storedProfile) => {
        if (!isActive) return;
        if (storedProfile === null) {
          setProfile(EMPTY_PROFILE);
          return;
        }

        const parsedProfile: unknown = JSON.parse(storedProfile);
        if (!isUserProfile(parsedProfile)) {
          throw new Error('Profil biçimi geçersiz.');
        }
        setProfile({
          name: parsedProfile.name,
          age: String(parsedProfile.age),
          height: String(parsedProfile.height),
          currentWeight: String(parsedProfile.currentWeight),
          targetWeight: String(parsedProfile.targetWeight),
          goal: parsedProfile.goal,
        });
      })
      .catch(() => {
        if (isActive) {
          setProfileStorageError('Profil bilgileri yüklenemedi. Lütfen yeniden deneyin.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingProfile(false);
      });

    return () => {
      isActive = false;
    };
  }, [profileLoadAttempt]);

  const saveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');

    const name = profile.name.trim();
    const age = parseProfileNumber(profile.age);
    const height = parseProfileNumber(profile.height);
    const currentWeight = parseProfileNumber(profile.currentWeight);
    const targetWeight = parseProfileNumber(profile.targetWeight);

    if (name.length < 2 || name.length > 40) {
      setProfileError('Ad en az 2, en fazla 40 karakter olmalıdır.');
      return;
    }
    if (age === null || !Number.isInteger(age) || age < 13 || age > 120) {
      setProfileError('Yaş 13 ile 120 arasında tam sayı olmalıdır.');
      return;
    }
    if (height === null || height < 80 || height > 250) {
      setProfileError('Boy 80 ile 250 cm arasında olmalıdır.');
      return;
    }
    if (currentWeight === null || currentWeight < 20 || currentWeight > 350) {
      setProfileError('Mevcut kilo 20 ile 350 kg arasında olmalıdır.');
      return;
    }
    if (targetWeight === null || targetWeight < 20 || targetWeight > 350) {
      setProfileError('Hedef kilo 20 ile 350 kg arasında olmalıdır.');
      return;
    }

    const savedProfile: UserProfile = {
      name,
      age,
      height,
      currentWeight,
      targetWeight,
      goal: profile.goal,
    };

    setIsSavingProfile(true);
    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(savedProfile));
      setProfile({
        name: savedProfile.name,
        age: String(savedProfile.age),
        height: String(savedProfile.height),
        currentWeight: String(savedProfile.currentWeight),
        targetWeight: String(savedProfile.targetWeight),
        goal: savedProfile.goal,
      });
      setProfileSuccess('Profilin cihazına kaydedildi.');
    } catch {
      setProfileError('Profil cihazına kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveProgressEntry = async () => {
    setFormError('');
    setFormSuccess('');

    const parsedWeight = Number(weight.trim().replace(',', '.'));
    const parsedWaist = Number(waist.trim().replace(',', '.'));
    const parsedBodyFat = Number(bodyFat.trim().replace(',', '.'));

    if (!weight.trim() || !Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setFormError('Geçerli bir kilo girin.');
      return;
    }
    if (!waist.trim() || !Number.isFinite(parsedWaist) || parsedWaist <= 0) {
      setFormError('Geçerli bir bel çevresi girin.');
      return;
    }
    if (!bodyFat.trim() || !Number.isFinite(parsedBodyFat) || parsedBodyFat < 0 || parsedBodyFat > 100) {
      setFormError('Yağ oranı 0 ile 100 arasında olmalıdır.');
      return;
    }
    if (!isValidDate(date)) {
      setFormError('Tarihi YYYY-AA-GG biçiminde girin.');
      return;
    }

    const newEntry: ProgressEntry = {
      id: `${Date.now()}`,
      date,
      weight: parsedWeight,
      waist: parsedWaist,
      bodyFat: parsedBodyFat,
    };
    const updatedEntries = [newEntry, ...entries];

    setIsSavingEntry(true);
    try {
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
      setWeight('');
      setWaist('');
      setBodyFat('');
      setDate(getToday());
      setFormSuccess('Gelişim kaydın eklendi.');
    } catch {
      setFormError('Kayıt telefona kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSavingEntry(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>MD<Text style={styles.green}>FIT</Text></Text>
        <Text style={styles.subtitle}>GELİŞİMİNİ TAKİP ET. HEDEFİNE ULAŞ.</Text>

        {tab === 'Ana Sayfa' && (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>BUGÜN SENİN GÜNÜN</Text>
              <Text style={styles.heroTitle}>Antrenmanına hazır mısın?</Text>
              <Text style={styles.muted}>Küçük adımlar, büyük değişimler.</Text>
              <TouchableOpacity style={styles.button} onPress={() => setTab('Programlar')}>
                <Text style={styles.buttonText}>PROGRAMLARI KEŞFET  →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.number}>{done.length}</Text>
                <Text style={styles.muted}>Tamamlanan</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.number}>5</Text>
                <Text style={styles.muted}>Ana bölüm</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.number}>100%</Text>
                <Text style={styles.muted}>Ücretsiz</Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.section}>{tab === 'Programlar' ? 'ANTRENMAN PROGRAMLARI' : tab.toUpperCase()}</Text>

        {tab === 'Ana Sayfa' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bugünkü hedefin</Text>
            <Text style={styles.muted}>Bir program seç ve gelişim yolculuğuna başla.</Text>
            <TouchableOpacity onPress={() => setTab('Programlar')}>
              <Text style={styles.link}>Programları görüntüle →</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'Programlar' && programs.map((p) => (
          <TouchableOpacity
            key={p.name}
            style={styles.card}
            onPress={() => setDone((old) => old.includes(p.name) ? old : [...old, p.name])}
          >
            <View style={styles.programRow}>
              <View style={styles.programIcon}><Text style={styles.green}>{p.name === 'UPPER / LOWER' ? 'UL' : p.name.slice(0, 1)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.muted}>{p.detail}</Text>
                <Text style={styles.small}>{p.days}</Text>
              </View>
              <Text style={styles.green}>{done.includes(p.name) ? '✓' : '＋'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {tab === 'Hareketler' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hareket kütüphanesi</Text>
            <Text style={styles.muted}>Bench press · Squat · Deadlift · Lat pulldown · Shoulder press · Biceps curl</Text>
            <Text style={styles.small}>Sonraki aşamada hareket açıklamaları ve doğru form yönergeleri eklenecek.</Text>
          </View>
        )}

        {tab === 'Gelişim' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yeni ölçüm kaydı</Text>
              <Text style={styles.muted}>Ölçülerini kaydet, gelişimini zaman içinde takip et.</Text>

              <Text style={styles.inputLabel}>Kilo (kg)</Text>
              <TextInput
                accessibilityLabel="Kilo, kilogram"
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="Örn. 72,5"
                placeholderTextColor="#738071"
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Bel çevresi (cm)</Text>
              <TextInput
                accessibilityLabel="Bel çevresi, santimetre"
                style={styles.input}
                value={waist}
                onChangeText={setWaist}
                placeholder="Örn. 84"
                placeholderTextColor="#738071"
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Yağ oranı (%)</Text>
              <TextInput
                accessibilityLabel="Yağ oranı, yüzde"
                style={styles.input}
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="Örn. 18,5"
                placeholderTextColor="#738071"
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Tarih (YYYY-AA-GG)</Text>
              <TextInput
                accessibilityLabel="Ölçüm tarihi, yıl-ay-gün"
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="2026-01-31"
                placeholderTextColor="#738071"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

              {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
              {!!formSuccess && <Text style={styles.success}>{formSuccess}</Text>}
              {!!storageError && (
                <View>
                  <Text accessibilityRole="alert" style={styles.error}>{storageError}</Text>
                  <TouchableOpacity onPress={() => setLoadAttempt((attempt) => attempt + 1)}>
                    <Text style={styles.link}>Yeniden dene</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, (isLoadingEntries || isSavingEntry || !!storageError) && styles.disabledButton]}
                onPress={saveProgressEntry}
                disabled={isLoadingEntries || isSavingEntry || !!storageError}
              >
                <Text style={styles.buttonText}>
                  {isLoadingEntries ? 'KAYITLAR YÜKLENİYOR...' : isSavingEntry ? 'KAYDEDİLİYOR...' : 'KAYDI EKLE'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>ÖNCEKİ KAYITLAR</Text>
            {isLoadingEntries ? (
              <View style={styles.card}>
                <Text style={styles.muted}>Kayıtların yükleniyor...</Text>
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.muted}>Henüz kayıt yok. İlk ölçümünü ekleyerek başlayabilirsin.</Text>
              </View>
            ) : (
              [...entries]
                .sort((first, second) => second.date.localeCompare(first.date) || second.id.localeCompare(first.id))
                .map((entry) => (
                  <View key={entry.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{entry.date.split('-').reverse().join('.')}</Text>
                    <View style={styles.entryMetrics}>
                      <Text style={styles.muted}>{entry.weight} kg</Text>
                      <Text style={styles.muted}>{entry.waist} cm bel</Text>
                      <Text style={styles.muted}>%{entry.bodyFat} yağ</Text>
                    </View>
                  </View>
                ))
            )}
          </>
        )}

        {tab === 'Profil' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>MDFİT profilin</Text>
              <Text style={styles.muted}>Bilgilerini ekle, hedefini belirle ve formunu takip et.</Text>

              {isLoadingProfile ? (
                <Text style={styles.muted}>Profilin yükleniyor...</Text>
              ) : (
                <>
                  {!!profileStorageError && (
                    <View>
                      <Text accessibilityRole="alert" style={styles.error}>{profileStorageError}</Text>
                      <TouchableOpacity onPress={() => setProfileLoadAttempt((attempt) => attempt + 1)}>
                        <Text style={styles.link}>Yeniden dene</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Kullanıcı adı</Text>
                  <TextInput
                    accessibilityLabel="Kullanıcı adı"
                    style={styles.input}
                    value={profile.name}
                    onChangeText={(name) => setProfile((current) => ({ ...current, name }))}
                    placeholder="Adın"
                    placeholderTextColor="#738071"
                    maxLength={40}
                    autoCapitalize="words"
                  />

                  <Text style={styles.inputLabel}>Yaş</Text>
                  <TextInput
                    accessibilityLabel="Yaş"
                    style={styles.input}
                    value={profile.age}
                    onChangeText={(age) => setProfile((current) => ({ ...current, age }))}
                    placeholder="Örn. 28"
                    placeholderTextColor="#738071"
                    keyboardType="number-pad"
                  />

                  <Text style={styles.inputLabel}>Boy (cm)</Text>
                  <TextInput
                    accessibilityLabel="Boy, santimetre"
                    style={styles.input}
                    value={profile.height}
                    onChangeText={(height) => setProfile((current) => ({ ...current, height }))}
                    placeholder="Örn. 175"
                    placeholderTextColor="#738071"
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.inputLabel}>Mevcut kilo (kg)</Text>
                  <TextInput
                    accessibilityLabel="Mevcut kilo, kilogram"
                    style={styles.input}
                    value={profile.currentWeight}
                    onChangeText={(currentWeight) => setProfile((current) => ({ ...current, currentWeight }))}
                    placeholder="Örn. 72,5"
                    placeholderTextColor="#738071"
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.inputLabel}>Hedef kilo (kg)</Text>
                  <TextInput
                    accessibilityLabel="Hedef kilo, kilogram"
                    style={styles.input}
                    value={profile.targetWeight}
                    onChangeText={(targetWeight) => setProfile((current) => ({ ...current, targetWeight }))}
                    placeholder="Örn. 68"
                    placeholderTextColor="#738071"
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.inputLabel}>Hedefin</Text>
                  <View style={styles.goalOptions}>
                    {FITNESS_GOALS.map((goal) => (
                      <TouchableOpacity
                        key={goal}
                        accessibilityRole="button"
                        accessibilityState={{ selected: profile.goal === goal }}
                        style={[styles.goalOption, profile.goal === goal && styles.goalOptionActive]}
                        onPress={() => setProfile((current) => ({ ...current, goal }))}
                      >
                        <Text style={[styles.goalText, profile.goal === goal && styles.goalTextActive]}>{goal}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {!!profileError && <Text accessibilityRole="alert" style={styles.error}>{profileError}</Text>}
                  {!!profileSuccess && <Text style={styles.success}>{profileSuccess}</Text>}

                  <TouchableOpacity
                    style={[styles.button, (isSavingProfile || !!profileStorageError) && styles.disabledButton]}
                    onPress={saveProfile}
                    disabled={isSavingProfile || !!profileStorageError}
                  >
                    <Text style={styles.buttonText}>{isSavingProfile ? 'KAYDEDİLİYOR...' : 'PROFİLİ KAYDET'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            {profile.name.trim() && (
              <View style={styles.profileSummary}>
                <Text style={styles.eyebrow}>PROFİL ÖZETİ</Text>
                <Text style={styles.cardTitle}>{profile.name.trim()}</Text>
                <Text style={styles.muted}>
                  {profile.age || '—'} yaş · {profile.height || '—'} cm
                </Text>
                <Text style={styles.muted}>
                  Mevcut: {profile.currentWeight || '—'} kg · Hedef: {profile.targetWeight || '—'} kg
                </Text>
                <Text style={styles.cardTitle}>{profile.goal}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.nav}>
        {tabs.map((item) => (
          <TouchableOpacity key={item} style={styles.navItem} onPress={() => setTab(item)}>
            <Text style={[styles.navText, tab === item && styles.navActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101510' },
  content: { padding: 20, paddingBottom: 30 },
  logo: { color: '#ffffff', fontSize: 40, fontWeight: '900', marginTop: 18 },
  green: { color: '#9cff35', fontWeight: '800' },
  subtitle: { color: '#b6c0b2', fontSize: 11, marginTop: 4, letterSpacing: 1 },
  hero: { backgroundColor: '#1c271b', borderRadius: 20, padding: 20, marginTop: 25, borderWidth: 1, borderColor: '#34472c' },
  eyebrow: { color: '#9cff35', fontSize: 11, fontWeight: '800' },
  heroTitle: { color: '#ffffff', fontSize: 25, fontWeight: '900', marginTop: 12 },
  muted: { color: '#b6c0b2', fontSize: 13, marginTop: 7 },
  button: { backgroundColor: '#9cff35', padding: 14, borderRadius: 12, marginTop: 18, alignItems: 'center' },
  buttonText: { color: '#101510', fontWeight: '900', fontSize: 12 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: '#1a211a', padding: 12, borderRadius: 12, alignItems: 'center' },
  number: { color: '#9cff35', fontSize: 21, fontWeight: '900' },
  section: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginTop: 25, marginBottom: 12 },
  card: { backgroundColor: '#1a211a', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#293329' },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  inputLabel: { color: '#ffffff', fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 7 },
  input: { backgroundColor: '#101510', color: '#ffffff', borderWidth: 1, borderColor: '#34472c', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  goalOptions: { gap: 8, marginTop: 2 },
  goalOption: { borderWidth: 1, borderColor: '#34472c', borderRadius: 10, padding: 12, backgroundColor: '#101510' },
  goalOptionActive: { borderColor: '#9cff35', backgroundColor: '#26351f' },
  goalText: { color: '#b6c0b2', fontSize: 13, fontWeight: '700' },
  goalTextActive: { color: '#9cff35' },
  profileSummary: { backgroundColor: '#1c271b', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#34472c' },
  error: { color: '#ff8b8b', fontSize: 12, marginTop: 12 },
  success: { color: '#9cff35', fontSize: 12, marginTop: 12 },
  disabledButton: { opacity: 0.55 },
  entryMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 5 },
  link: { color: '#9cff35', fontWeight: '800', marginTop: 14 },
  small: { color: '#8e9b8a', fontSize: 11, marginTop: 6 },
  programRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  programIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#293b24', alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', backgroundColor: '#171e17', borderTopWidth: 1, borderTopColor: '#293329', paddingVertical: 12, paddingHorizontal: 3 },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { color: '#8e9b8a', fontSize: 9, fontWeight: '700' },
  navActive: { color: '#9cff35' },
});
