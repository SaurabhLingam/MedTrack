import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../Components/TextWrapper";
import { analyzeImage } from "./ScanResult";

const { width } = Dimensions.get("window");

// ─── Design Tokens ────────────────────────────────────────────────────────────
const palette = {
  deepTeal: "#0B3D35",
  midTeal: "#14675A",
  teal: "#1A8A78",
  brightTeal: "#22C5AC",
  mintGlow: "#6EFCE8",
  surface: "#F0FBF9",
  card: "#FFFFFF",
  textPrimary: "#0B2B26",
  textMid: "#3D6B62",
  textSoft: "#7FA99F",
  gold: "#FFD166",
  coral: "#FF6B6B",
  lavender: "#A78BFA",
  amber: "#FFAB40",
  blue: "#4FC3F7",
  white: "#FFFFFF",
  error: "#EF5350",
};

// ─── Section metadata ─────────────────────────────────────────────────────────
const SECTION_META = {
  Uses: { icon: "pill", color: "#22C5AC", bg: "#E8FAF7" },
  Indications: { icon: "pill", color: "#22C5AC", bg: "#E8FAF7" },
  Benefits: { icon: "heart-pulse", color: "#FF6B6B", bg: "#FFF0F0" },
  "How It Works": { icon: "cpu-64-bit", color: "#4FC3F7", bg: "#E8F7FF" },
  Dosage: { icon: "clipboard-text-outline", color: "#FFAB40", bg: "#FFF8EC" },
  "Side Effects": {
    icon: "alert-circle-outline",
    color: "#EF5350",
    bg: "#FFF0F0",
  },
  Warnings: { icon: "alert-outline", color: "#FF7043", bg: "#FFF2EE" },
  Contraindications: {
    icon: "close-circle-outline",
    color: "#A78BFA",
    bg: "#F5F0FF",
  },
  Interactions: { icon: "swap-horizontal", color: "#FFD166", bg: "#FFFBEC" },
  Storage: { icon: "archive-outline", color: "#26C6DA", bg: "#E8FAFB" },
  Disclaimer: { icon: "information-outline", color: "#90A4AE", bg: "#F4F6F7" },
};

const getSectionMeta = (title) => {
  for (const key of Object.keys(SECTION_META)) {
    if (title.includes(key)) return SECTION_META[key];
  }
  return {
    icon: "information-outline",
    color: palette.brightTeal,
    bg: "#E8FAF7",
  };
};

// ─── Expiry normaliser ────────────────────────────────────────────────────────
// Converts common expiry formats from the AI result into MM/YYYY for LogNewMedicine.
// Handles: "12/2026", "12/26", "Dec 2026", "December 2026", "2026-12", "12-2026"
const MONTH_NAMES = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const normaliseExpiry = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim();

  // "MM/YYYY" or "MM/YY"
  const slashMatch = s.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const mm = slashMatch[1].padStart(2, "0");
    let yyyy = slashMatch[2];
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    return `${mm}/${yyyy}`;
  }

  // "YYYY-MM" or "MM-YYYY"
  const dashMatch = s.match(/^(\d{2,4})-(\d{1,2})$|^(\d{1,2})-(\d{2,4})$/);
  if (dashMatch) {
    const a = dashMatch[1] || dashMatch[3];
    const b = dashMatch[2] || dashMatch[4];
    const [mm, yyyy] =
      a.length === 4
        ? [b.padStart(2, "0"), a]
        : [a.padStart(2, "0"), b.length === 2 ? "20" + b : b];
    return `${mm}/${yyyy}`;
  }

  // "Dec 2026" / "December 2026"
  const wordMatch = s.match(/^([a-zA-Z]+)[.\s,]+(\d{2,4})$/);
  if (wordMatch) {
    const abbr = wordMatch[1].toLowerCase().slice(0, 3);
    const mm = MONTH_NAMES[abbr];
    if (mm) {
      const yyyy =
        wordMatch[2].length === 2 ? "20" + wordMatch[2] : wordMatch[2];
      return `${mm}/${yyyy}`;
    }
  }

  return ""; // unable to parse — leave blank so user fills it
};

// ─── Loading Screen ───────────────────────────────────────────────────────────
const LoadingView = ({ imageUri }) => {
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpac = useRef(new Animated.Value(0.8)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.6,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpac, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    dots.forEach((d, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 220),
          Animated.timing(d, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(d, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay((dots.length - i - 1) * 220),
        ]),
      ).start();
    });
  }, []);

  const scanTranslate = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-(width * 0.72) / 2, (width * 0.72) / 2],
  });

  return (
    <View style={loadStyles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Blobs */}
      <View style={loadStyles.blobA} />
      <View style={loadStyles.blobB} />

      <Animated.View style={[loadStyles.content, { opacity: fadeIn }]}>
        {/* Scan image frame */}
        <View style={loadStyles.frameWrap}>
          {/* Ripple ring */}
          <Animated.View
            style={[
              loadStyles.ripple,
              { transform: [{ scale: ringScale }], opacity: ringOpac },
            ]}
          />

          <View style={loadStyles.frame}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={loadStyles.frameImage}
                resizeMode="cover"
              />
            ) : (
              <View style={loadStyles.framePlaceholder}>
                <MaterialCommunityIcons
                  name="pill"
                  size={52}
                  color={palette.brightTeal}
                />
              </View>
            )}

            {/* Scan line */}
            <Animated.View
              style={[
                loadStyles.scanLine,
                { transform: [{ translateY: scanTranslate }] },
              ]}
            />

            {/* Corners */}
            {[
              {
                top: 0,
                left: 0,
                borderTopWidth: 3,
                borderLeftWidth: 3,
                borderBottomWidth: 0,
                borderRightWidth: 0,
                borderTopLeftRadius: 12,
              },
              {
                top: 0,
                right: 0,
                borderTopWidth: 3,
                borderRightWidth: 3,
                borderBottomWidth: 0,
                borderLeftWidth: 0,
                borderTopRightRadius: 12,
              },
              {
                bottom: 0,
                left: 0,
                borderBottomWidth: 3,
                borderLeftWidth: 3,
                borderTopWidth: 0,
                borderRightWidth: 0,
                borderBottomLeftRadius: 12,
              },
              {
                bottom: 0,
                right: 0,
                borderBottomWidth: 3,
                borderRightWidth: 3,
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderBottomRightRadius: 12,
              },
            ].map((s, i) => (
              <View
                key={i}
                style={[
                  loadStyles.corner,
                  s,
                  { borderColor: palette.brightTeal },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Icon */}
        <Animated.View
          style={[loadStyles.iconWrap, { transform: [{ scale: pulse }] }]}
        >
          <MaterialCommunityIcons
            name="line-scan"
            size={32}
            color={palette.brightTeal}
          />
        </Animated.View>

        {/* Text */}
        <Text weight="700" style={loadStyles.title}>
          Analysing Medicine
        </Text>
        <Text style={loadStyles.subtitle}>
          AI is reading the packet details…
        </Text>

        {/* Dot loader */}
        <View style={loadStyles.dotsRow}>
          {dots.map((d, i) => (
            <Animated.View key={i} style={[loadStyles.dot, { opacity: d }]} />
          ))}
        </View>

        {/* Step chips */}
        <View style={loadStyles.stepsRow}>
          {["Detecting text", "Parsing data", "Building report"].map((s, i) => (
            <View key={i} style={loadStyles.stepChip}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={12}
                color={palette.brightTeal}
              />
              <Text style={loadStyles.stepChipText}>{s}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Log CTA Card ─────────────────────────────────────────────────────────────
// Extracted as its own component for clarity and reusability.
const LogMedicineCTA = ({ onPress, medicineName }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={ctaStyles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Left accent stripe */}
        <View style={ctaStyles.accentStripe} />

        {/* Icon column */}
        <View style={ctaStyles.iconWrap}>
          <MaterialCommunityIcons
            name="pill-multiple"
            size={26}
            color={palette.white}
          />
        </View>

        {/* Text column */}
        <View style={ctaStyles.textCol}>
          <Text weight="700" style={ctaStyles.title}>
            Log This Medicine
          </Text>
          <Text style={ctaStyles.subtitle} numberOfLines={1}>
            {medicineName
              ? `Add "${medicineName}" to your tracker`
              : "Add to your medicine tracker"}
          </Text>
        </View>

        {/* Arrow */}
        <View style={ctaStyles.arrowWrap}>
          <MaterialCommunityIcons
            name="arrow-right-circle"
            size={28}
            color={palette.brightTeal}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ctaStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 20,
    marginHorizontal: 0,
    marginBottom: 16,
    overflow: "hidden",
    // shadow
    shadowColor: palette.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: palette.brightTeal + "40",
  },
  accentStripe: {
    width: 5,
    alignSelf: "stretch",
    backgroundColor: palette.brightTeal,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: palette.teal,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 14,
    marginVertical: 16,
    // subtle glow
    shadowColor: palette.brightTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  textCol: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  title: {
    fontSize: 16,
    color: palette.textPrimary,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: palette.textSoft,
    lineHeight: 17,
  },
  arrowWrap: {
    paddingRight: 16,
  },
});

// ─── Main Result Screen ───────────────────────────────────────────────────────
const ResultScreen = ({ navigation, route }) => {
  const { imageUri } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [resultData, setResultData] = useState(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await analyzeImage(imageUri);
      setResultData(data);
      setIsLoading(false);
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideUp, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    })();
  }, [imageUri]);

  // ─── Navigate to Log Medicine with pre-fill data ─────────────────────────
  const handleLogMedicine = () => {
    const prefillName = resultData?.medicine?.name ?? "";
    // normaliseExpiry converts the AI's raw expiry string → MM/YYYY for the form
    const prefillExpiry = normaliseExpiry(resultData?.medicine?.expDate ?? "");

    navigation.navigate("LogNewMedicine", {
      prefillName,
      prefillExpiry,
    });
  };

  if (isLoading) return <LoadingView imageUri={imageUri} />;

  

  const { medicine, info } = resultData;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={palette.midTeal}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons
            name="pill"
            size={16}
            color={palette.brightTeal}
            style={{ marginRight: 5 }}
          />
          <Text weight="700" style={styles.headerTitle}>
            Medicine Details
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.aiBadge}>
            <View style={styles.aiBadgeDot} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Scanned image ── */}
        {imageUri && (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: imageUri }}
              style={styles.scannedImage}
              resizeMode="cover"
            />
            <View style={styles.imageBadge}>
              <MaterialCommunityIcons
                name="check-circle"
                size={13}
                color={palette.brightTeal}
              />
              <Text style={styles.imageBadgeText}>Scanned</Text>
            </View>
          </View>
        )}

        {/* ── Main info card ── */}
        <View style={styles.mainCard}>
          {/* Name block */}
          <View style={styles.nameBlock}>
            <View style={styles.nameIconWrap}>
              <MaterialCommunityIcons
                name="pill"
                size={26}
                color={palette.white}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="700" style={styles.medicineName}>
                {medicine.displayName}
              </Text>
              <Text style={styles.genericName}>{medicine.genericName}</Text>
            </View>
            <View style={styles.confidencePill}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={13}
                color={palette.white}
              />
              <Text weight="700" style={styles.confidenceText}>
                {medicine.confidence}
              </Text>
            </View>
          </View>

          {/* Meta grid */}
          <View style={styles.metaGrid}>
            {[
              {
                icon: "domain",
                label: "Manufacturer",
                value: medicine.manufacturer,
                color: palette.teal,
              },
              {
                icon: "currency-inr",
                label: "MRP",
                value: medicine.mrp,
                color: palette.gold,
              },
              {
                icon: "clipboard-list",
                label: "Schedule",
                value: medicine.schedule,
                color: palette.lavender,
              },
              {
                icon: "barcode-scan",
                label: "Batch No.",
                value: medicine.batchNo,
                color: palette.blue,
              },
            ].map((item, i) => (
              <View key={i} style={styles.metaCell}>
                <View
                  style={[
                    styles.metaCellIcon,
                    { backgroundColor: item.color + "18" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={15}
                    color={item.color}
                  />
                </View>
                <Text style={styles.metaLabel}>{item.label}</Text>
                <Text weight="600" style={styles.metaValue} numberOfLines={1}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Dates strip */}
          <View style={styles.datesStrip}>
            <View style={styles.dateItem}>
              <MaterialCommunityIcons
                name="calendar-check-outline"
                size={14}
                color={palette.brightTeal}
              />
              <View style={{ marginLeft: 6 }}>
                <Text style={styles.dateLabel}>Manufactured</Text>
                <Text weight="700" style={styles.dateValue}>
                  {medicine.mfgDate}
                </Text>
              </View>
            </View>
            <View style={styles.dateSep} />
            <View style={styles.dateItem}>
              <MaterialCommunityIcons
                name="calendar-remove-outline"
                size={14}
                color={palette.coral}
              />
              <View style={{ marginLeft: 6 }}>
                <Text style={styles.dateLabel}>Expires</Text>
                <Text
                  weight="700"
                  style={[styles.dateValue, { color: palette.coral }]}
                >
                  {medicine.expDate}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Log This Medicine CTA ── */}
        <LogMedicineCTA
          onPress={handleLogMedicine}
          medicineName={medicine.displayName}
        />

        {/* ── Section label ── */}
        <View style={styles.sectionDivider}>
          <View style={styles.sectionDividerLine} />
          <View style={styles.sectionDividerPill}>
            <Text style={styles.sectionDividerText}>MEDICINE INFO</Text>
          </View>
          <View style={styles.sectionDividerLine} />
        </View>

        {/* ── Info sections ── */}
        {info.map((section, index) => {
          const meta = getSectionMeta(section.title);
          return (
            <View
              key={index}
              style={[styles.infoCard, { borderLeftColor: meta.color }]}
            >
              <View style={styles.infoCardHeader}>
                <View
                  style={[styles.infoIconWrap, { backgroundColor: meta.bg }]}
                >
                  <MaterialCommunityIcons
                    name={meta.icon}
                    size={18}
                    color={meta.color}
                  />
                </View>
                <Text
                  weight="700"
                  style={[styles.infoCardTitle, { color: meta.color }]}
                >
                  {section.title}
                </Text>
              </View>

              {section.content.map((item, i) => {
                if (!item || item.trim() === "") return null;
                const cleaned = item.replace(/^[•\-]\s*/, "");
                return (
                  <View key={i} style={styles.contentRow}>
                    <View
                      style={[styles.bullet, { backgroundColor: meta.color }]}
                    />
                    <Text style={styles.contentText}>{cleaned}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// ─── Loading Styles ───────────────────────────────────────────────────────────
const FRAME = width * 0.72;
const loadStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#071E1A",
    alignItems: "center",
    justifyContent: "center",
  },
  blobA: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: palette.brightTeal + "14",
  },
  blobB: {
    position: "absolute",
    bottom: 40,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.lavender + "10",
  },
  content: { alignItems: "center", paddingHorizontal: 28 },
  frameWrap: {
    width: FRAME + 40,
    height: FRAME + 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  ripple: {
    position: "absolute",
    width: FRAME,
    height: FRAME,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: palette.brightTeal,
  },
  frame: {
    width: FRAME,
    height: FRAME,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0D2B26",
    alignItems: "center",
    justifyContent: "center",
  },
  frameImage: { width: "100%", height: "100%" },
  framePlaceholder: { alignItems: "center", justifyContent: "center", flex: 1 },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 3,
    backgroundColor: palette.brightTeal,
    shadowColor: palette.mintGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  corner: { position: "absolute", width: 26, height: 26 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: palette.brightTeal + "18",
    borderWidth: 1,
    borderColor: palette.brightTeal + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    color: palette.white,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 22 },
  dotsRow: { flexDirection: "row", gap: 8, marginBottom: 28 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.brightTeal,
  },
  stepsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  stepChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: palette.brightTeal + "14",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: palette.brightTeal + "25",
  },
  stepChipText: { fontSize: 10, color: palette.brightTeal, fontWeight: "600" },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },

  blobTop: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.brightTeal + "14",
  },
  blobBottom: {
    position: "absolute",
    bottom: 60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: palette.lavender + "12",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  headerCenter: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 17, color: palette.textPrimary, letterSpacing: 0.2 },
  headerRight: { width: 40, alignItems: "flex-end" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.brightTeal + "20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.brightTeal,
  },
  aiBadgeText: {
    fontSize: 10,
    color: palette.teal,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  scroll: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 8 },

  // Image
  imageWrap: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  scannedImage: { width: "100%", height: 200 },
  imageBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  imageBadgeText: { fontSize: 11, color: palette.white, fontWeight: "600" },

  // Main card
  mainCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  nameBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.deepTeal,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  nameIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: palette.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  medicineName: {
    fontSize: 18,
    color: palette.white,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  genericName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontStyle: "italic",
  },
  confidencePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.brightTeal,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: palette.brightTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  confidenceText: { fontSize: 11, color: palette.white },

  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 14,
    gap: 10,
  },
  metaCell: {
    width: (width - 36 - 28 - 10) / 2,
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 12,
  },
  metaCellIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  metaLabel: { fontSize: 10, color: palette.textSoft, marginBottom: 2 },
  metaValue: { fontSize: 13, color: palette.textPrimary },

  datesStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: palette.surface,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dateItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  dateSep: {
    width: 1,
    height: 36,
    backgroundColor: palette.surface,
    marginHorizontal: 14,
  },
  dateLabel: { fontSize: 10, color: palette.textSoft, marginBottom: 2 },
  dateValue: { fontSize: 14, color: palette.textPrimary },

  // Section divider
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.textSoft + "30",
  },
  sectionDividerPill: {
    backgroundColor: palette.teal + "18",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionDividerText: {
    fontSize: 10,
    color: palette.teal,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  // Info cards
  infoCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardTitle: { fontSize: 15, flex: 1 },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
    flexShrink: 0,
  },
  contentText: {
    fontSize: 13,
    color: palette.textMid,
    lineHeight: 20,
    flex: 1,
  },

  // Error
  errorScreen: {
    flex: 1,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  errorTitle: {
    fontSize: 20,
    color: palette.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 13,
    color: palette.textSoft,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  errorBtn: {
    backgroundColor: palette.brightTeal,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: palette.brightTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  errorBtnText: { color: palette.white, fontSize: 15 },
});

export default ResultScreen;