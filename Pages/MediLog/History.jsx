import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "../../Components/TextWrapper";

// ─── Helper ───────────────────────────────────────────────────────────────────
const groupByDate = (history) => {
  const groups = {};
  history.forEach((item) => {
    const key = new Date(item.scheduledTime).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([date, items]) => ({ date, items }));
};

const DOSE_TYPE_ICONS = {
  Tablet: "pill",
  Capsule: "pill-multiple",
  Syrup: "bottle-tonic-outline",
  Injection: "needle",
  Drops: "water-outline",
  Inhaler: "air-filter",
  Patch: "bandage",
  Cream: "lotion-outline",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ value, label, color, icon, bg }) => (
  <View style={statStyles.card}>
    <View style={[statStyles.iconBox, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <Text style={[statStyles.value, { color }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 6,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: "800",
  },
  label: {
    fontSize: 11,
    color: "#A0AEC0",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
});

// ─── Component ────────────────────────────────────────────────────────────────
const History = ({ navigation }) => {
  const [grouped, setGrouped] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const [streak, setStreak] = useState(0);
  const [filter, setFilter] = useState("all"); // all | taken | missed

  useEffect(() => {
    loadHistory();
    const unsubscribe = navigation.addListener("focus", loadHistory);
    return unsubscribe;
  }, [navigation]);

  const loadHistory = async () => {
    try {
      const userEmail = await AsyncStorage.getItem("currentUser");
      if (!userEmail) return;

      const historyRaw = await AsyncStorage.getItem(`history_${userEmail}`);
      let history = historyRaw ? JSON.parse(historyRaw) : [];

      // Mark past-due entries as missed automatically
      const now = new Date();
      let updated = false;
      history = history.map((h) => {
        if (!h.taken && new Date(h.scheduledTime) < now && !h.markedMissed) {
          updated = true;
          return { ...h, markedMissed: true };
        }
        return h;
      });

      if (updated) {
        await AsyncStorage.setItem(
          `history_${userEmail}`,
          JSON.stringify(history),
        );
      }

      // Adherence calc (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = history.filter(
        (h) => new Date(h.scheduledTime) > sevenDaysAgo,
      );
      const takenRecent = recent.filter((h) => h.taken).length;
      setAdherenceRate(
        recent.length > 0 ? Math.round((takenRecent / recent.length) * 100) : 0,
      );

      // Streak calc
      const days = [
        ...new Set(
          history
            .filter((h) => h.taken)
            .map((h) => new Date(h.takenAt || h.scheduledTime).toDateString()),
        ),
      ].sort((a, b) => new Date(b) - new Date(a));

      let streakCount = 0;
      let checkDate = new Date();
      for (const day of days) {
        if (day === checkDate.toDateString()) {
          streakCount++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }
      setStreak(streakCount);

      setGrouped(groupByDate(history));
    } catch (_) {}
  };

  const toggleTaken = async (item) => {
    try {
      const userEmail = await AsyncStorage.getItem("currentUser");
      const historyRaw = await AsyncStorage.getItem(`history_${userEmail}`);
      const history = JSON.parse(historyRaw || "[]");

      const idx = history.findIndex((h) => h.id === item.id);
      if (idx === -1) return;

      history[idx].taken = !history[idx].taken;
      history[idx].takenAt = history[idx].taken
        ? new Date().toISOString()
        : null;

      const medsRaw = await AsyncStorage.getItem(`medicines_${userEmail}`);
      const meds = medsRaw ? JSON.parse(medsRaw) : [];
      const medIdx = meds.findIndex((m) => m.id === item.medicineId);
      if (medIdx !== -1) {
        if (history[idx].taken && meds[medIdx].remainingQuantity > 0) {
          meds[medIdx].remainingQuantity -= 1;
        } else if (!history[idx].taken) {
          meds[medIdx].remainingQuantity += 1;
        }
        await AsyncStorage.setItem(
          `medicines_${userEmail}`,
          JSON.stringify(meds),
        );
      }

      await AsyncStorage.setItem(
        `history_${userEmail}`,
        JSON.stringify(history),
      );
      loadHistory();
    } catch (_) {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, []);

  const getFilteredItems = (items) => {
    if (filter === "taken") return items.filter((i) => i.taken);
    if (filter === "missed")
      return items.filter((i) => !i.taken && i.markedMissed);
    return items;
  };

  const isToday = (dateStr) =>
    new Date(dateStr).toDateString() === new Date().toDateString();

  const isYesterday = (dateStr) => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Date(dateStr).toDateString() === d.toDateString();
  };

  const renderDateLabel = (dateStr) => {
    if (isToday(dateStr)) return "Today";
    if (isYesterday(dateStr)) return "Yesterday";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  };

  const adherenceColor =
    adherenceRate >= 80
      ? "#10B981"
      : adherenceRate >= 50
        ? "#F59E0B"
        : "#EF4444";

  const adherenceBg =
    adherenceRate >= 80
      ? "#ECFDF5"
      : adherenceRate >= 50
        ? "#FFFBEB"
        : "#FFF5F5";

  const FILTERS = [
    { key: "all", label: "All", icon: "format-list-bulleted" },
    { key: "taken", label: "Taken", icon: "check-circle-outline" },
    { key: "missed", label: "Missed", icon: "close-circle-outline" },
  ];

  const renderItem = ({ item: group }) => {
    const filtered = getFilteredItems(group.items);
    if (!filtered.length) return null;

    const allTaken = group.items.every((i) => i.taken);
    const someTaken = group.items.some((i) => i.taken);
    const takenCount = group.items.filter((i) => i.taken).length;
    const totalCount = group.items.length;

    const dayStatus = allTaken ? "done" : someTaken ? "partial" : "missed";
    const dayColor =
      dayStatus === "done"
        ? "#10B981"
        : dayStatus === "partial"
          ? "#F59E0B"
          : "#EF4444";
    const dayBg =
      dayStatus === "done"
        ? "#ECFDF5"
        : dayStatus === "partial"
          ? "#FFFBEB"
          : "#FFF5F5";
    const dayIcon =
      dayStatus === "done"
        ? "check-circle"
        : dayStatus === "partial"
          ? "circle-half-full"
          : "close-circle";
    const dayLabel =
      dayStatus === "done"
        ? "All done"
        : dayStatus === "partial"
          ? "Partial"
          : "Missed";

    return (
      <View style={styles.group}>
        {/* Date Section Header */}
        <View style={styles.dateHeader}>
          <View style={styles.dateHeaderLeft}>
            <View
              style={[styles.dateAccentBar, { backgroundColor: dayColor }]}
            />
            <View>
              <Text style={styles.dateLabel}>
                {renderDateLabel(group.date)}
              </Text>
              <Text style={styles.dateSub}>
                {takenCount} of {totalCount} doses taken
              </Text>
            </View>
          </View>
          <View style={[styles.dayBadge, { backgroundColor: dayBg }]}>
            <MaterialCommunityIcons name={dayIcon} size={13} color={dayColor} />
            <Text style={[styles.dayBadgeText, { color: dayColor }]}>
              {" "}
              {dayLabel}
            </Text>
          </View>
        </View>

        {/* Dose cards */}
        <View style={styles.dosesCard}>
          {filtered.map((dose, index) => {
            const isTaken = dose.taken;
            return (
              <View key={dose.id}>
                <TouchableOpacity
                  style={[
                    styles.doseRow,
                    isTaken && styles.doseRowTaken,
                    !isTaken && dose.markedMissed && styles.doseRowMissed,
                    index < filtered.length - 1 && styles.doseRowBorder,
                  ]}
                  onPress={() => toggleTaken(dose)}
                  activeOpacity={0.8}
                >
                  {/* Left state stripe */}
                  <View
                    style={[
                      styles.doseStripe,
                      {
                        backgroundColor: isTaken
                          ? "#10B981"
                          : dose.markedMissed
                            ? "#EF4444"
                            : "#E2E8F0",
                      },
                    ]}
                  />

                  {/* Icon */}
                  <View
                    style={[
                      styles.doseIconWrap,
                      {
                        backgroundColor: isTaken
                          ? "#ECFDF5"
                          : dose.markedMissed
                            ? "#FFF5F5"
                            : "#F7F9FC",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={DOSE_TYPE_ICONS[dose.doseType] || "pill"}
                      size={20}
                      color={
                        isTaken
                          ? "#10B981"
                          : dose.markedMissed
                            ? "#EF4444"
                            : "#A0AEC0"
                      }
                    />
                  </View>

                  {/* Info */}
                  <View style={styles.doseInfo}>
                    <Text style={styles.doseName}>{dose.medicineName}</Text>
                    <View style={styles.doseMetaRow}>
                      <Text style={styles.doseMeta}>{dose.doseType}</Text>
                      <View style={styles.dotSep} />
                      <Text style={styles.doseMeta}>{dose.time}</Text>
                    </View>
                    {isTaken && dose.takenAt && (
                      <View style={styles.takenChip}>
                        <MaterialCommunityIcons
                          name="clock-check-outline"
                          size={11}
                          color="#10B981"
                        />
                        <Text style={styles.takenChipText}>
                          {" "}
                          Taken at{" "}
                          {new Date(dose.takenAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionChip,
                      isTaken
                        ? styles.actionChipTaken
                        : styles.actionChipPending,
                    ]}
                    onPress={() => toggleTaken(dose)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <MaterialCommunityIcons
                      name={isTaken ? "check" : "plus"}
                      size={13}
                      color={isTaken ? "#10B981" : "#FFFFFF"}
                    />
                    <Text
                      style={[
                        styles.actionChipText,
                        isTaken
                          ? styles.actionChipTextTaken
                          : styles.actionChipTextPending,
                      ]}
                    >
                      {isTaken ? "Done" : "Mark"}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#4A5568" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Dose History</Text>
          <Text style={styles.subtitle}>Track your intake regularity</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          value={`${adherenceRate}%`}
          label={"7-Day\nAdherence"}
          color={adherenceColor}
          icon="chart-arc"
          bg={adherenceBg}
        />
        <StatCard
          value={`${streak} 🔥`}
          label={"Day\nStreak"}
          color="#F59E0B"
          icon="fire"
          bg="#FFFBEB"
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={f.icon}
                size={14}
                color={isActive ? "#fff" : "#718096"}
              />
              <Text
                style={[styles.filterText, isActive && styles.filterTextActive]}
              >
                {" "}
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0EA5B0"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons
                name="history"
                size={44}
                color="#CBD5E0"
              />
            </View>
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>
              Log a medicine to start tracking your doses here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default History;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
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

  // ─── Stats ─────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 24,
    marginBottom: 16,
  },

  // ─── Filters ───────────────────────────────────────────────────────────────
  filters: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 20,
  },

  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },

  filterPillActive: {
    backgroundColor: "#0EA5B0",
    borderColor: "#0EA5B0",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#718096",
  },

  filterTextActive: {
    color: "#fff",
  },

  // ─── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },

  // ─── Group ─────────────────────────────────────────────────────────────────
  group: {
    marginBottom: 24,
  },

  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  dateHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dateAccentBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },

  dateLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A2235",
  },

  dateSub: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "500",
    marginTop: 1,
  },

  dayBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  dayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ─── Doses Card ────────────────────────────────────────────────────────────
  dosesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  doseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 16,
    backgroundColor: "#FFFFFF",
  },

  doseRowTaken: {
    backgroundColor: "#F8FFFE",
  },

  doseRowMissed: {
    backgroundColor: "#FFFAFA",
  },

  doseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },

  doseStripe: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 12,
    marginRight: 12,
    minHeight: 48,
  },

  doseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },

  doseInfo: {
    flex: 1,
  },

  doseName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2235",
    marginBottom: 3,
  },

  doseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  doseMeta: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "500",
  },

  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E0",
  },

  takenChip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  takenChipText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },

  // ─── Action Chip ───────────────────────────────────────────────────────────
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
    flexShrink: 0,
  },

  actionChipTaken: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  actionChipPending: {
    backgroundColor: "#0EA5B0",
    shadowColor: "#0EA5B0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  actionChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  actionChipTextTaken: {
    color: "#10B981",
  },

  actionChipTextPending: {
    color: "#FFFFFF",
  },

  // ─── Empty ─────────────────────────────────────────────────────────────────
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },

  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 4,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4A5568",
  },

  emptyText: {
    fontSize: 14,
    color: "#A0AEC0",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 16,
  },
});
