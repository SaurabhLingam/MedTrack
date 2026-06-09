import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "../../Components/TextWrapper";

const MediLogDash = ({ navigation }) => {
  const [todayDoses, setTodayDoses] = useState([]);
  const [takenCount, setTakenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadTodaySummary();
    const unsubscribe = navigation.addListener("focus", loadTodaySummary);
    return unsubscribe;
  }, [navigation]);

  const loadTodaySummary = async () => {
    try {
      const userEmail = await AsyncStorage.getItem("currentUser");
      if (!userEmail) return;

      const medsRaw = await AsyncStorage.getItem(`medicines_${userEmail}`);
      const meds = medsRaw ? JSON.parse(medsRaw) : [];
      const activeMeds = meds.filter((m) => m.active !== false);

      const historyRaw = await AsyncStorage.getItem(`history_${userEmail}`);
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      const today = new Date().toDateString();
      const todayHistory = history.filter(
        (h) => new Date(h.scheduledTime).toDateString() === today,
      );

      const taken = todayHistory.filter((h) => h.taken).length;
      const pending = todayHistory.filter((h) => !h.taken).length;

      setTodayDoses(todayHistory.slice(0, 3));
      setTakenCount(taken);
      setPendingCount(pending);
    } catch (_) {}
  };

  const adherence =
    takenCount + pendingCount > 0
      ? Math.round((takenCount / (takenCount + pendingCount)) * 100)
      : 0;

  const options = [
    {
      icon: "plus-circle-outline",
      label: "Log New Medicine",
      desc: "Add a medicine with reminders",
      route: "LogNewMedicine",
      color: "#0EA5B0",
      bg: "#F0FAFB",
    },
    {
      icon: "clipboard-text-clock-outline",
      label: "Dose History",
      desc: "Review your intake regularity",
      route: "History",
      color: "#5A7AF5",
      bg: "#F0F4FF",
    },
    {
      icon: "pill-multiple",
      label: "Medicine Box",
      desc: "All your current & past medicines",
      route: "MedicineBox",
      color: "#EF4444",
      bg: "#FFF5F5",
    },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color="#4A5568"
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Medicine Log</Text>
            <Text style={styles.subtitle}>Manage your health regime</Text>
          </View>
        </View>

        {/* Today's Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewHeaderLeft}>
              <MaterialCommunityIcons
                name="calendar-today"
                size={16}
                color="#0EA5B0"
              />
              <Text style={styles.overviewTitle}> Today's Overview</Text>
            </View>
            <Text style={styles.overviewDate}>
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#ECFDF5" }]}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={20}
                  color="#10B981"
                />
              </View>
              <Text style={[styles.statNum, { color: "#10B981" }]}>
                {takenCount}
              </Text>
              <Text style={styles.statLabel}>Taken</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#FFFBEB" }]}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color="#F59E0B"
                />
              </View>
              <Text style={[styles.statNum, { color: "#F59E0B" }]}>
                {pendingCount}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIconBox,
                  {
                    backgroundColor:
                      adherence >= 80
                        ? "#ECFDF5"
                        : adherence >= 50
                          ? "#FFFBEB"
                          : "#FFF5F5",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="chart-arc"
                  size={20}
                  color={
                    adherence >= 80
                      ? "#10B981"
                      : adherence >= 50
                        ? "#F59E0B"
                        : "#EF4444"
                  }
                />
              </View>
              <Text
                style={[
                  styles.statNum,
                  {
                    color:
                      adherence >= 80
                        ? "#10B981"
                        : adherence >= 50
                          ? "#F59E0B"
                          : "#EF4444",
                  },
                ]}
              >
                {adherence}%
              </Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          </View>

          {/* Adherence progress bar */}
          {takenCount + pendingCount > 0 && (
            <View style={styles.adherenceBar}>
              <View style={styles.adherenceBarBg}>
                <View
                  style={[
                    styles.adherenceBarFill,
                    {
                      width: `${adherence}%`,
                      backgroundColor:
                        adherence >= 80
                          ? "#10B981"
                          : adherence >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Upcoming Doses */}
        {todayDoses.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionLabel}>UPCOMING DOSES</Text>
            <View style={styles.upcomingCard}>
              {todayDoses.map((dose, i) => (
                <View
                  key={i}
                  style={[
                    styles.doseRow,
                    i < todayDoses.length - 1 && styles.doseRowBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.doseStatus,
                      { backgroundColor: dose.taken ? "#ECFDF5" : "#FFFBEB" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={dose.taken ? "check" : "clock-outline"}
                      size={14}
                      color={dose.taken ? "#10B981" : "#F59E0B"}
                    />
                  </View>
                  <View style={styles.doseInfo}>
                    <Text style={styles.doseName}>{dose.medicineName}</Text>
                    <Text style={styles.doseTime}>{dose.time}</Text>
                  </View>
                  <View
                    style={[
                      styles.doseBadge,
                      {
                        backgroundColor: dose.taken ? "#ECFDF5" : "#FFFBEB",
                        borderColor: dose.taken ? "#A7F3D0" : "#FDE68A",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.doseBadgeText,
                        { color: dose.taken ? "#10B981" : "#F59E0B" },
                      ]}
                    >
                      {dose.taken ? "Taken" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.route}
            style={styles.card}
            onPress={() => navigation.navigate(opt.route)}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: opt.bg }]}>
              <MaterialCommunityIcons
                name={opt.icon}
                size={26}
                color={opt.color}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{opt.label}</Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>
            </View>
            <View style={styles.chevronWrap}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color="#A0AEC0"
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MediLogDash;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    marginBottom: 24,
    gap: 16,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A2235",
  },

  subtitle: {
    fontSize: 13,
    color: "#A0AEC0",
    marginTop: 1,
  },

  overviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  overviewHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  overviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2235",
  },

  overviewDate: {
    fontSize: 13,
    color: "#A0AEC0",
    fontWeight: "600",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },

  statItem: {
    alignItems: "center",
    gap: 6,
  },

  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },

  statNum: {
    fontSize: 26,
    fontWeight: "800",
  },

  statLabel: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "600",
  },

  statDivider: {
    width: 1,
    backgroundColor: "#EDF2F7",
    alignSelf: "stretch",
    marginVertical: 8,
  },

  adherenceBar: {
    marginTop: 4,
  },

  adherenceBarBg: {
    height: 6,
    backgroundColor: "#EDF2F7",
    borderRadius: 3,
    overflow: "hidden",
  },

  adherenceBarFill: {
    height: 6,
    borderRadius: 3,
  },

  upcomingSection: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0AEC0",
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  upcomingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  doseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  doseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },

  doseStatus: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  doseInfo: {
    flex: 1,
  },

  doseName: {
    fontSize: 14,
    color: "#1A2235",
    fontWeight: "600",
    marginBottom: 2,
  },

  doseTime: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "500",
  },

  doseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },

  doseBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    flexShrink: 0,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2235",
    marginBottom: 3,
  },

  cardDesc: {
    fontSize: 12,
    color: "#718096",
    lineHeight: 17,
  },

  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    alignItems: "center",
  },
});
