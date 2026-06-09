import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Image,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Text } from "../../Components/TextWrapper";

const topBackgroundImage = require("../../assets/medicinetrackbg1.webp");
const bottomBackgroundImage = require("../../assets/medicinetrackbg2.webp");

const { width, height } = Dimensions.get("window");

// ─── Design Tokens ──────────────────────────────────────────────────────────
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
  white: "#FFFFFF",
};

// ─── Step Data ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: "01",
    icon: "line-scan",
    label: "Scan",
    sub: "Point at packet",
    accent: palette.coral,
    bg: "#FFF0F0",
  },
  {
    num: "02",
    icon: "cpu-64-bit",
    label: "Analyse",
    sub: "AI processes",
    accent: palette.gold,
    bg: "#FFFBEC",
  },
  {
    num: "03",
    icon: "text-box-check-outline",
    label: "Results",
    sub: "Info displayed",
    accent: palette.brightTeal,
    bg: "#EDFAF7",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  // ── Animation refs ─────────────────────────────────────────────────────────
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const cardScale1 = useRef(new Animated.Value(0.92)).current;
  const cardScale2 = useRef(new Animated.Value(0.92)).current;
  const dotAnim1 = useRef(new Animated.Value(1)).current;
  const dotAnim2 = useRef(new Animated.Value(1)).current;
  const dotAnim3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale1, {
        toValue: 1,
        friction: 6,
        tension: 50,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale2, {
        toValue: 1,
        friction: 6,
        tension: 50,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Wiggle
    Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: -1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.delay(2200),
      ]),
    ).start();

    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 550,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.delay(1400),
      ]),
    ).start();

    // Scan line
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 90,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Step indicator dots
    const stagger = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(1800),
        ]),
      ).start();
    stagger(dotAnim1, 0);
    stagger(dotAnim2, 300);
    stagger(dotAnim3, 600);
  }, []);

  const wiggleInterp = wiggleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-12deg", "12deg"],
  });

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera roll access is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
      });
      if (!result.canceled && result.assets?.length > 0) {
        navigation.navigate("MediTrackResult", {
          imageUri: result.assets[0].uri,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload image: " + error.message);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Decorative blobs ───────────────────────────────────────────────── */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottomRight} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
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
              size={18}
              color={palette.brightTeal}
              style={{ marginRight: 6 }}
            />
            <Text weight="700" style={styles.headerTitle}>
              Know Your Medicine
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>AI</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Hero tagline ────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text weight="700" style={styles.heroHeading}>
            Identify Any{"\n"}Medicine Instantly
          </Text>
          <Text style={styles.heroSub}>
            Scan or upload a photo of your{"\n"}medicine packet for full details
          </Text>
        </Animated.View>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <Animated.View style={[styles.sectionWrapper, { opacity: fadeIn }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>HOW IT WORKS</Text>
            </View>
          </View>

          <View style={styles.stepsRow}>
            {STEPS.map((step, i) => {
              const dotAnims = [dotAnim1, dotAnim2, dotAnim3];
              const iconAnims = [
                { transform: [{ rotate: wiggleInterp }] },
                { transform: [{ scale: pulseAnim }] },
                { transform: [{ translateY: bounceAnim }] },
              ];
              return (
                <View
                  key={i}
                  style={[styles.stepCard, { backgroundColor: step.bg }]}
                >
                  {/* Number chip */}
                  <View
                    style={[styles.stepNumChip, { borderColor: step.accent }]}
                  >
                    <Text
                      weight="700"
                      style={[styles.stepNum, { color: step.accent }]}
                    >
                      {step.num}
                    </Text>
                  </View>

                  {/* Animated icon */}
                  <Animated.View
                    style={[
                      styles.stepIconWrap,
                      { backgroundColor: step.accent + "22" },
                      iconAnims[i],
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={step.icon}
                      size={28}
                      color={step.accent}
                    />
                  </Animated.View>

                  <Text
                    weight="700"
                    style={[styles.stepLabel, { color: palette.textPrimary }]}
                  >
                    {step.label}
                  </Text>
                  <Text style={styles.stepSub}>{step.sub}</Text>

                  {/* Activity dot */}
                  <Animated.View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: step.accent,
                        transform: [{ scale: dotAnims[i] }],
                      },
                    ]}
                  />

                  {/* Connector arrow */}
                  {i < 2 && (
                    <View style={styles.connector}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={16}
                        color={palette.textSoft}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Action Cards ────────────────────────────────────────────────── */}
        <View style={styles.actionsSection}>
          {/* Scan Card */}
          <Animated.View style={{ transform: [{ scale: cardScale1 }] }}>
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardScan]}
              onPress={() => navigation.navigate("MediTrackScanner")}
              activeOpacity={0.88}
            >
              <View style={styles.actionCardInner}>
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: "#FF6B6B22" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="camera-outline"
                    size={30}
                    color={palette.coral}
                  />
                </View>
                <View style={styles.actionTextBlock}>
                  <Text weight="700" style={styles.actionCardTitle}>
                    Scan Medicine
                  </Text>
                  <Text style={styles.actionCardDesc}>
                    Use camera for instant recognition
                  </Text>
                </View>
                <View
                  style={[
                    styles.actionArrow,
                    { backgroundColor: palette.coral + "22" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={18}
                    color={palette.coral}
                  />
                </View>
              </View>
              {/* Decorative corner accent */}
              <View
                style={[
                  styles.cardAccent,
                  { backgroundColor: palette.coral + "15" },
                ]}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Upload Card */}
          <Animated.View style={{ transform: [{ scale: cardScale2 }] }}>
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardUpload]}
              onPress={handleUpload}
              activeOpacity={0.88}
            >
              <View style={styles.actionCardInner}>
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: "#A78BFA22" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="image-plus"
                    size={30}
                    color={palette.lavender}
                  />
                </View>
                <View style={styles.actionTextBlock}>
                  <Text weight="700" style={styles.actionCardTitle}>
                    Upload Image
                  </Text>
                  <Text style={styles.actionCardDesc}>
                    Pick from your photo library
                  </Text>
                </View>
                <View
                  style={[
                    styles.actionArrow,
                    { backgroundColor: palette.lavender + "22" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={18}
                    color={palette.lavender}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.cardAccent,
                  { backgroundColor: palette.lavender + "15" },
                ]}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Phone demo ──────────────────────────────────────────────────── */}
        <View style={styles.demoWrapper}>
          {/* Left tip */}
          <View style={styles.demoTip}>
            <View style={styles.tipBubble}>
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={13}
                color={palette.gold}
              />
              <Text style={styles.tipText}>Hold steady</Text>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.phone}>
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneScreen}>
              {/* Scan frame corners */}
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />

              {/* Centre icon */}
              <Animated.View style={{ opacity: glowAnim }}>
                <MaterialCommunityIcons
                  name="pill"
                  size={44}
                  color={palette.brightTeal}
                />
              </Animated.View>

              {/* Scan line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineAnim }] },
                ]}
              />
            </View>
            <View style={styles.phoneHome} />
          </View>

          {/* Right tip */}
          <View style={styles.demoTip}>
            <View style={styles.tipBubble}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={13}
                color={palette.brightTeal}
              />
              <Text style={styles.tipText}>Good lighting</Text>
            </View>
          </View>
        </View>

        {/* ── Trust strip ─────────────────────────────────────────────────── */}
        <View style={styles.trustStrip}>
          {[
            {
              icon: "shield-check-outline",
              label: "Verified Info",
              color: palette.brightTeal,
            },
            {
              icon: "flash-outline",
              label: "Instant Result",
              color: palette.gold,
            },
            {
              icon: "lock-outline",
              label: "100% Private",
              color: palette.lavender,
            },
          ].map((item, i) => (
            <View key={i} style={styles.trustItem}>
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={item.color}
              />
              <Text style={[styles.trustLabel, { color: item.color }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.surface,
  },

  // Decorative blobs
  blobTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: palette.brightTeal + "18",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: 60,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.lavender + "14",
  },

  scroll: { paddingBottom: 20 },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    color: palette.textPrimary,
    letterSpacing: 0.2,
  },
  headerRight: {
    alignItems: "flex-end",
    width: 40,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.brightTeal + "20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.brightTeal,
  },
  badgeText: {
    fontSize: 10,
    color: palette.teal,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── Hero
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 10,
  },
  heroHeading: {
    fontSize: 30,
    lineHeight: 38,
    color: palette.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 14,
    color: palette.textMid,
    lineHeight: 21,
  },

  // ── Section wrapper
  sectionWrapper: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionPill: {
    alignSelf: "flex-start",
    backgroundColor: palette.teal + "18",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionPillText: {
    fontSize: 10,
    color: palette.teal,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  // ── Steps
  stepsRow: {
    flexDirection: "row",
    gap: 10,
  },
  stepCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    position: "relative",
    // subtle border
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "visible",
  },
  stepNumChip: {
    position: "absolute",
    top: 10,
    left: 10,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  stepNum: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  stepIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    marginTop: 6,
  },
  stepLabel: {
    fontSize: 12,
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  stepSub: {
    fontSize: 10,
    color: palette.textSoft,
    textAlign: "center",
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  connector: {
    position: "absolute",
    right: -8,
    top: "50%",
    marginTop: -8,
    zIndex: 10,
  },

  // ── Action Cards
  actionsSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 14,
  },
  actionCard: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: palette.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  actionCardScan: { borderLeftWidth: 4, borderLeftColor: palette.coral },
  actionCardUpload: { borderLeftWidth: 4, borderLeftColor: palette.lavender },
  actionCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextBlock: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 15,
    color: palette.textPrimary,
    marginBottom: 3,
  },
  actionCardDesc: {
    fontSize: 12,
    color: palette.textSoft,
    lineHeight: 17,
  },
  actionArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAccent: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -40,
    right: -30,
  },

  // ── Phone demo
  demoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 36,
    paddingHorizontal: 16,
    gap: 12,
  },
  demoTip: {
    flex: 1,
    alignItems: "center",
  },
  tipBubble: {
    backgroundColor: palette.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  tipText: {
    fontSize: 10,
    color: palette.textMid,
    fontWeight: "600",
    textAlign: "center",
  },
  phone: {
    width: 130,
    height: 260,
    borderRadius: 28,
    backgroundColor: palette.deepTeal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.deepTeal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    paddingVertical: 10,
  },
  phoneSpeaker: {
    position: "absolute",
    top: 14,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.midTeal,
  },
  phoneScreen: {
    width: 110,
    height: 210,
    backgroundColor: "#0D2B25",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  phoneHome: {
    position: "absolute",
    bottom: 10,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.midTeal,
  },
  // Scan frame corners
  cornerTL: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: palette.brightTeal,
    borderRadius: 2,
  },
  cornerTR: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: palette.brightTeal,
    borderRadius: 2,
  },
  cornerBL: {
    position: "absolute",
    bottom: 14,
    left: 14,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: palette.brightTeal,
    borderRadius: 2,
  },
  cornerBR: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: palette.brightTeal,
    borderRadius: 2,
  },
  scanLine: {
    position: "absolute",
    top: 14,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: palette.brightTeal,
    shadowColor: palette.mintGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    borderRadius: 1,
  },

  // ── Trust strip
  trustStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: palette.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustItem: {
    alignItems: "center",
    gap: 6,
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default HomeScreen;
