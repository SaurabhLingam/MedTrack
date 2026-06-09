import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "../../Components/TextWrapper";

// Import from the centralised service — NO notification listener lives here
import { isExpoGo, scheduleNotifications } from "./notificationService"; // ← adjust path

// ─── Constants ────────────────────────────────────────────────────────────────
const DOSE_TYPES = [
  { label: "Tablet", icon: "pill" },
  { label: "Capsule", icon: "pill-multiple" },
  { label: "Syrup", icon: "bottle-tonic-outline" },
  { label: "Injection", icon: "needle" },
  { label: "Drops", icon: "water-outline" },
  { label: "Inhaler", icon: "air-filter" },
  { label: "Patch", icon: "bandage" },
  { label: "Cream", icon: "lotion-outline" },
];

const DOSE_FREQUENCIES = [
  { label: "Once a day", count: 1 },
  { label: "Twice a day", count: 2 },
  { label: "3 times a day", count: 3 },
  { label: "4 times a day", count: 4 },
  { label: "Every 6 hours", count: 4 },
  { label: "Every 8 hours", count: 3 },
  { label: "As needed", count: 0 },
];

const DEFAULT_TIMES = {
  0: [],
  1: ["08:00 AM"],
  2: ["08:00 AM", "08:00 PM"],
  3: ["08:00 AM", "02:00 PM", "08:00 PM"],
  4: ["08:00 AM", "12:00 PM", "04:00 PM", "08:00 PM"],
};

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINUTES = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];
const PERIODS = ["AM", "PM"];
const ITEM_HEIGHT = 48;
const STEP_LABELS = ["Details", "Dose", "Schedule"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseTime = (timeStr) => {
  try {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return { hours, minutes };
  } catch {
    return { hours: 8, minutes: 0 };
  }
};

const formatExpiryInput = (raw) => {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const validateExpiry = (value) => {
  const regex = /^(0[1-9]|1[0-2])\/(\d{4})$/;
  if (!regex.test(value)) return false;
  const [mm, yyyy] = value.split("/");
  const now = new Date();
  const expiryDate = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return expiryDate >= currentMonth;
};

// ─── AppModal ─────────────────────────────────────────────────────────────────
const AppModal = ({
  visible,
  icon,
  iconColor,
  iconBg,
  title,
  message,
  buttons = [],
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[modalStyles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[modalStyles.box, { transform: [{ scale: scaleAnim }] }]}
        >
          {icon && (
            <View
              style={[
                modalStyles.iconWrap,
                { backgroundColor: iconBg || "#F0FAFB" },
              ]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={32}
                color={iconColor || "#0EA5B0"}
              />
            </View>
          )}
          <Text style={modalStyles.title}>{title}</Text>
          {!!message && <Text style={modalStyles.message}>{message}</Text>}
          <View
            style={[
              modalStyles.btnRow,
              buttons.length === 1 && { justifyContent: "center" },
            ]}
          >
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  modalStyles.btn,
                  btn.primary
                    ? modalStyles.btnPrimary
                    : modalStyles.btnSecondary,
                ]}
                onPress={btn.onPress}
                activeOpacity={0.85}
              >
                {btn.icon && (
                  <MaterialCommunityIcons
                    name={btn.icon}
                    size={16}
                    color={btn.primary ? "#fff" : "#4A5568"}
                  />
                )}
                <Text
                  style={[
                    modalStyles.btnText,
                    btn.primary
                      ? modalStyles.btnTextPrimary
                      : modalStyles.btnTextSecondary,
                  ]}
                >
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(26,34,53,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  box: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A2235",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnPrimary: {
    backgroundColor: "#0EA5B0",
    shadowColor: "#0EA5B0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnSecondary: {
    backgroundColor: "#F7F9FC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  btnText: { fontSize: 14, fontWeight: "700" },
  btnTextPrimary: { color: "#fff" },
  btnTextSecondary: { color: "#4A5568" },
});

// ─── TimePicker Bottom Sheet ──────────────────────────────────────────────────
const TimePicker = ({ visible, initialTime, onConfirm, onClose }) => {
  const slideAnim = useRef(new Animated.Value(360)).current;

  const parseInitial = (t) => {
    if (!t) return { hour: "08", minute: "00", period: "AM" };
    try {
      const [time, period] = t.split(" ");
      const [h, m] = time.split(":");
      return {
        hour: h.padStart(2, "0"),
        minute: m || "00",
        period: period || "AM",
      };
    } catch {
      return { hour: "08", minute: "00", period: "AM" };
    }
  };

  const initial = parseInitial(initialTime);
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initial.period);

  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const periodScrollRef = useRef(null);

  useEffect(() => {
    if (visible) {
      const parsed = parseInitial(initialTime);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      setTimeout(() => {
        const hIdx = HOURS.indexOf(parsed.hour);
        const mIdx = MINUTES.indexOf(parsed.minute);
        const pIdx = PERIODS.indexOf(parsed.period);
        if (hIdx >= 0)
          hourScrollRef.current?.scrollTo({
            y: hIdx * ITEM_HEIGHT,
            animated: false,
          });
        if (mIdx >= 0)
          minuteScrollRef.current?.scrollTo({
            y: mIdx * ITEM_HEIGHT,
            animated: false,
          });
        if (pIdx >= 0)
          periodScrollRef.current?.scrollTo({
            y: pIdx * ITEM_HEIGHT,
            animated: false,
          });
      }, 100);
    } else {
      Animated.timing(slideAnim, {
        toValue: 360,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleConfirm = () =>
    onConfirm(`${selectedHour}:${selectedMinute} ${selectedPeriod}`);

  const renderColumn = (data, selected, onSelect, scrollRef) => (
    <View style={tpStyles.column}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          onSelect(data[Math.max(0, Math.min(idx, data.length - 1))]);
        }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        style={{ width: "100%" }}
      >
        {data.map((item) => (
          <TouchableOpacity
            key={item}
            style={tpStyles.item}
            onPress={() => {
              onSelect(item);
              scrollRef.current?.scrollTo({
                y: data.indexOf(item) * ITEM_HEIGHT,
                animated: true,
              });
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                tpStyles.itemText,
                item === selected && tpStyles.itemTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={tpStyles.selectionOverlay}>
        <View style={tpStyles.selectionBar} />
      </View>
    </View>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={tpStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[tpStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={tpStyles.handle} />
        <View style={tpStyles.header}>
          <TouchableOpacity onPress={onClose} style={tpStyles.headerSideBtn}>
            <Text style={tpStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={tpStyles.headerTitle}>Select Time</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={tpStyles.headerSideBtn}
          >
            <Text style={tpStyles.confirmHeaderText}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={tpStyles.preview}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color="#0EA5B0"
          />
          <Text style={tpStyles.previewText}>
            {" "}
            {selectedHour}:{selectedMinute} {selectedPeriod}
          </Text>
        </View>
        <View style={tpStyles.columnsRow}>
          <View style={tpStyles.columnWrap}>
            <Text style={tpStyles.columnLabel}>Hour</Text>
            {renderColumn(HOURS, selectedHour, setSelectedHour, hourScrollRef)}
          </View>
          <Text style={tpStyles.colonSep}>:</Text>
          <View style={tpStyles.columnWrap}>
            <Text style={tpStyles.columnLabel}>Minute</Text>
            {renderColumn(
              MINUTES,
              selectedMinute,
              setSelectedMinute,
              minuteScrollRef,
            )}
          </View>
          <View style={tpStyles.columnWrap}>
            <Text style={tpStyles.columnLabel}>Period</Text>
            {renderColumn(
              PERIODS,
              selectedPeriod,
              setSelectedPeriod,
              periodScrollRef,
            )}
          </View>
        </View>
        <TouchableOpacity
          style={tpStyles.confirmFullBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="check" size={18} color="#fff" />
          <Text style={tpStyles.confirmFullText}> Set Time</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const tpStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(26,34,53,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  headerSideBtn: { minWidth: 64, paddingVertical: 4 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#1A2235" },
  cancelText: { fontSize: 15, color: "#A0AEC0", fontWeight: "600" },
  confirmHeaderText: {
    fontSize: 15,
    color: "#0EA5B0",
    fontWeight: "700",
    textAlign: "right",
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FAFB",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BAE6EA",
  },
  previewText: { fontSize: 20, fontWeight: "800", color: "#0EA5B0" },
  columnsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 4,
  },
  columnWrap: { flex: 1, alignItems: "center" },
  columnLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A0AEC0",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  column: { height: ITEM_HEIGHT * 3, overflow: "hidden", width: "100%" },
  item: { height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" },
  itemText: { fontSize: 22, fontWeight: "600", color: "#CBD5E0" },
  itemTextSelected: { color: "#1A2235", fontWeight: "800", fontSize: 24 },
  selectionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
  },
  selectionBar: {
    height: ITEM_HEIGHT,
    backgroundColor: "#0EA5B015",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BAE6EA",
    marginHorizontal: 4,
  },
  colonSep: {
    fontSize: 24,
    fontWeight: "800",
    color: "#CBD5E0",
    marginBottom: 24,
    marginHorizontal: 2,
  },
  confirmFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5B0",
    marginHorizontal: 20,
    marginTop: 16,
    height: 54,
    borderRadius: 16,
    shadowColor: "#0EA5B0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmFullText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

// ─── StepHeader ───────────────────────────────────────────────────────────────
const StepHeader = ({ title, subtitle }) => (
  <View style={stepStyles.container}>
    <Text style={stepStyles.title}>{title}</Text>
    {subtitle ? <Text style={stepStyles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const stepStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800", color: "#1A2235", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#718096", lineHeight: 19 },
});

// ─── PreFill Banner ───────────────────────────────────────────────────────────
// Shown at the top of Step 1 when data arrives from the scan result.
const PreFillBanner = () => (
  <View style={pfStyles.banner}>
    <View style={pfStyles.iconWrap}>
      <MaterialCommunityIcons name="auto-fix" size={18} color="#0EA5B0" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={pfStyles.title}>Auto-filled from scan</Text>
      <Text style={pfStyles.subtitle}>
        Fields are pre-filled from the scanned packet. Review and edit as
        needed.
      </Text>
    </View>
  </View>
);

const pfStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#BAE6EA",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BAE6EA",
    flexShrink: 0,
    marginTop: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0EA5B0",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: "#4A8FA0",
    lineHeight: 17,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
const LogNewMedicine = ({ navigation, route }) => {
  // ── Read pre-fill params passed from ResultScreen ─────────────────────────
  const prefillName = route?.params?.prefillName ?? "";
  const prefillExpiry = route?.params?.prefillExpiry ?? "";
  const hasPrefill = !!(prefillName || prefillExpiry);

  // ── State ─────────────────────────────────────────────────────────────────
  const [name, setName] = useState(prefillName);
  const [expiry, setExpiry] = useState(prefillExpiry);
  const [expiryError, setExpiryError] = useState("");
  const [selectedDoseType, setSelectedDoseType] = useState(null);
  const [selectedFrequency, setSelectedFrequency] = useState(null);
  const [times, setTimes] = useState([]);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [step, setStep] = useState(1);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState(null);
  const [modal, setModal] = useState({
    visible: false,
    icon: null,
    iconColor: "#0EA5B0",
    iconBg: "#F0FAFB",
    title: "",
    message: "",
    buttons: [],
  });

  // If params change (e.g. deep-link re-navigate), re-seed the fields.
  useEffect(() => {
    if (prefillName) setName(prefillName);
    if (prefillExpiry) setExpiry(prefillExpiry);
  }, [prefillName, prefillExpiry]);

  const showModal = (config) => setModal({ ...config, visible: true });
  const hideModal = () => setModal((m) => ({ ...m, visible: false }));

  // ── NOTE: No notification listener here. It lives in App.js. ─────────────

  const handleExpiryChange = (raw) => {
    setExpiry(formatExpiryInput(raw));
    if (expiryError) setExpiryError("");
  };

  const checkExpiry = () => {
    if (!expiry.trim()) {
      setExpiryError("Expiry date is required.");
      return false;
    }
    if (!validateExpiry(expiry)) {
      setExpiryError("Please enter a valid expiry date.");
      return false;
    }
    setExpiryError("");
    return true;
  };

  const handleFrequencySelect = (freq) => {
    setSelectedFrequency(freq);
    setTimes(DEFAULT_TIMES[freq.count] || []);
  };

  const openTimePicker = (index) => {
    setEditingTimeIndex(index);
    setTimePickerVisible(true);
  };

  const handleTimeConfirm = (timeStr) => {
    setTimePickerVisible(false);
    if (editingTimeIndex === null) return;
    const updated = [...times];
    updated[editingTimeIndex] = timeStr;
    setTimes(updated);
    setEditingTimeIndex(null);
  };

  // ─── Seed today's history entries ─────────────────────────────────────────
  const seedTodayHistory = async (userEmail, medicine) => {
    if (!medicine.times.length) return;
    const historyRaw = await AsyncStorage.getItem(`history_${userEmail}`);
    const history = historyRaw ? JSON.parse(historyRaw) : [];
    const today = new Date();
    for (const time of medicine.times) {
      const { hours, minutes } = parseTime(time);
      const scheduled = new Date(today);
      scheduled.setHours(hours, minutes, 0, 0);
      history.push({
        id: `${medicine.id}_${time}_${today.toDateString()}`,
        medicineId: medicine.id,
        medicineName: medicine.name,
        doseType: medicine.doseType,
        time,
        scheduledTime: scheduled.toISOString(),
        taken: false,
        takenAt: null,
      });
    }
    await AsyncStorage.setItem(`history_${userEmail}`, JSON.stringify(history));
  };

  // ─── Step validation ───────────────────────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        showModal({
          visible: true,
          icon: "alert-circle-outline",
          iconColor: "#F59E0B",
          iconBg: "#FFFBEB",
          title: "Medicine Name Required",
          message: "Please enter the name of the medicine before continuing.",
          buttons: [
            {
              label: "Got it",
              primary: true,
              icon: "check",
              onPress: hideModal,
            },
          ],
        });
        return;
      }
      if (!checkExpiry()) {
        showModal({
          visible: true,
          icon: "calendar-alert",
          iconColor: "#EF4444",
          iconBg: "#FFF5F5",
          title: "Invalid Expiry Date",
          message:
            "Please enter a valid date in MM/YYYY format that is not in the past.",
          buttons: [
            {
              label: "Fix it",
              primary: true,
              icon: "pencil-outline",
              onPress: hideModal,
            },
          ],
        });
        return;
      }
      if (!quantity.trim()) {
        showModal({
          visible: true,
          icon: "counter",
          iconColor: "#F59E0B",
          iconBg: "#FFFBEB",
          title: "Quantity Required",
          message:
            "Please enter the quantity of medicine you currently have in stock.",
          buttons: [
            {
              label: "Got it",
              primary: true,
              icon: "check",
              onPress: hideModal,
            },
          ],
        });
        return;
      }
    }
    setStep(step + 1);
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedDoseType) {
      showModal({
        visible: true,
        icon: "pill",
        iconColor: "#F59E0B",
        iconBg: "#FFFBEB",
        title: "Dose Type Required",
        message: "Please select a dose type for this medicine.",
        buttons: [
          { label: "Got it", primary: true, icon: "check", onPress: hideModal },
        ],
      });
      return;
    }
    if (!selectedFrequency) {
      showModal({
        visible: true,
        icon: "clock-outline",
        iconColor: "#F59E0B",
        iconBg: "#FFFBEB",
        title: "Frequency Required",
        message: "Please select how often this medicine should be taken.",
        buttons: [
          { label: "Got it", primary: true, icon: "check", onPress: hideModal },
        ],
      });
      return;
    }

    setLoading(true);
    try {
      const userEmail = await AsyncStorage.getItem("currentUser");
      console.log("Saving medicine for user:", userEmail)

      const medsRaw = await AsyncStorage.getItem(`medicines_${userEmail}`);
      const meds = medsRaw ? JSON.parse(medsRaw) : [];

      const newMed = {
        id: Date.now().toString(),
        name: name.trim(),
        expiry: expiry.trim(),
        doseType: selectedDoseType.label,
        doseTypeIcon: selectedDoseType.icon,
        frequency: selectedFrequency.label,
        frequencyCount: selectedFrequency.count,
        times,
        quantity: parseInt(quantity) || 0,
        remainingQuantity: parseInt(quantity) || 0,
        notes: notes.trim(),
        active: true,
        startDate: new Date().toISOString(),
        notificationIds: [],
      };

      newMed.notificationIds = await scheduleNotifications(newMed);
      meds.push(newMed);
      await AsyncStorage.setItem(
        `medicines_${userEmail}`,
        JSON.stringify(meds),
      );
      await seedTodayHistory(userEmail, newMed);

      const reminderNote = isExpoGo
        ? "Reminders need a development build to activate. Timings are saved and ready."
        : `${times.length} daily reminder${times.length !== 1 ? "s" : ""} scheduled with Mark as Taken / Ignore actions.`;

      showModal({
        visible: true,
        icon: "check-circle-outline",
        iconColor: "#10B981",
        iconBg: "#ECFDF5",
        title: `${name} Added! 🎉`,
        message: reminderNote,
        buttons: [
          {
            label: "Done",
            primary: true,
            icon: "arrow-right",
            onPress: () => {
              hideModal();
              navigation.goBack();
            },
          },
        ],
      });
    } catch (e) {
      console.error(e);
      showModal({
        visible: true,
        icon: "alert-circle-outline",
        iconColor: "#EF4444",
        iconBg: "#FFF5F5",
        title: "Save Failed",
        message: "Something went wrong. Please try again.",
        buttons: [
          {
            label: "Retry",
            primary: true,
            icon: "refresh",
            onPress: () => {
              hideModal();
              handleSave();
            },
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 1 ───────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <StepHeader
        title="Basic Information"
        subtitle="Enter the medicine details and stock information."
      />

      {/* Pre-fill banner — only shown when data arrives from scan */}
      {hasPrefill && <PreFillBanner />}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Medicine Name</Text>
        <View
          style={[
            styles.inputContainer,
            focusedField === "name" && styles.inputFocused,
            // Subtle highlight when value was pre-filled
            hasPrefill && name === prefillName && styles.inputPrefilled,
          ]}
        >
          <MaterialCommunityIcons
            name="pill"
            size={18}
            color={focusedField === "name" ? "#0EA5B0" : "#A0AEC0"}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g. Paracetamol 500mg"
            placeholderTextColor="#CBD5E0"
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
          />
          {/* Small "auto-filled" chip visible while the value is unchanged */}
          {hasPrefill && name === prefillName && name !== "" && (
            <View style={styles.autoChip}>
              <MaterialCommunityIcons
                name="auto-fix"
                size={10}
                color="#0EA5B0"
              />
              <Text style={styles.autoChipText}>auto</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Expiry Date</Text>
        <View
          style={[
            styles.inputContainer,
            focusedField === "expiry" && styles.inputFocused,
            !!expiryError && styles.inputError,
            hasPrefill &&
              expiry === prefillExpiry &&
              prefillExpiry !== "" &&
              styles.inputPrefilled,
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-remove-outline"
            size={18}
            color={
              expiryError
                ? "#EF4444"
                : focusedField === "expiry"
                  ? "#0EA5B0"
                  : "#A0AEC0"
            }
          />
          <TextInput
            style={styles.input}
            placeholder="MM/YYYY"
            placeholderTextColor="#CBD5E0"
            value={expiry}
            onChangeText={handleExpiryChange}
            keyboardType="numeric"
            maxLength={7}
            onFocus={() => setFocusedField("expiry")}
            onBlur={() => {
              setFocusedField(null);
              if (expiry) checkExpiry();
            }}
          />
          {expiry.length === 7 && (
            <MaterialCommunityIcons
              name={validateExpiry(expiry) ? "check-circle" : "close-circle"}
              size={18}
              color={validateExpiry(expiry) ? "#10B981" : "#EF4444"}
            />
          )}
          {hasPrefill &&
            expiry === prefillExpiry &&
            prefillExpiry !== "" &&
            expiry.length !== 7 && (
              <View style={styles.autoChip}>
                <MaterialCommunityIcons
                  name="auto-fix"
                  size={10}
                  color="#0EA5B0"
                />
                <Text style={styles.autoChipText}>auto</Text>
              </View>
            )}
        </View>
        {!!expiryError && (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={13}
              color="#EF4444"
            />
            <Text style={styles.errorText}> {expiryError}</Text>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Quantity in Stock</Text>
        <View
          style={[
            styles.inputContainer,
            focusedField === "qty" && styles.inputFocused,
          ]}
        >
          <MaterialCommunityIcons
            name="counter"
            size={18}
            color={focusedField === "qty" ? "#0EA5B0" : "#A0AEC0"}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g. 30 tablets"
            placeholderTextColor="#CBD5E0"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            onFocus={() => setFocusedField("qty")}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <View
          style={[
            styles.inputContainer,
            styles.textArea,
            focusedField === "notes" && styles.inputFocused,
          ]}
        >
          <TextInput
            style={[styles.input, { textAlignVertical: "top", marginLeft: 0 }]}
            placeholder="e.g. Take after food, with a full glass of water"
            placeholderTextColor="#CBD5E0"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            onFocus={() => setFocusedField("notes")}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>
    </>
  );

  // ─── Step 2 ───────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <StepHeader
        title="Dose Type & Frequency"
        subtitle="Select how this medicine is taken and how often."
      />
      <Text style={styles.subSectionLabel}>Dose Type</Text>
      <View style={styles.doseTypeGrid}>
        {DOSE_TYPES.map((dt) => {
          const isActive = selectedDoseType?.label === dt.label;
          return (
            <TouchableOpacity
              key={dt.label}
              style={[styles.doseTypeBtn, isActive && styles.doseTypeBtnActive]}
              onPress={() => setSelectedDoseType(dt)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={dt.icon}
                size={24}
                color={isActive ? "#0EA5B0" : "#A0AEC0"}
              />
              <Text
                style={[
                  styles.doseTypeLbl,
                  isActive && styles.doseTypeLblActive,
                ]}
              >
                {dt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.subSectionLabel, { marginTop: 24 }]}>Frequency</Text>
      {DOSE_FREQUENCIES.map((freq) => {
        const isActive = selectedFrequency?.label === freq.label;
        return (
          <TouchableOpacity
            key={freq.label}
            style={[styles.freqBtn, isActive && styles.freqBtnActive]}
            onPress={() => handleFrequencySelect(freq)}
            activeOpacity={0.8}
          >
            <View style={styles.freqLeft}>
              <View
                style={[
                  styles.freqDot,
                  { backgroundColor: isActive ? "#0EA5B0" : "#E2E8F0" },
                ]}
              />
              <Text
                style={[styles.freqLabel, isActive && styles.freqLabelActive]}
              >
                {freq.label}
              </Text>
            </View>
            {isActive && (
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color="#0EA5B0"
              />
            )}
          </TouchableOpacity>
        );
      })}
    </>
  );

  // ─── Step 3 ───────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <>
      <StepHeader
        title="Dose Timings"
        subtitle="Tap each dose to pick a time. Reminders fire daily at these times."
      />
      {isExpoGo && (
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons
            name="information-outline"
            size={16}
            color="#0EA5B0"
          />
          <Text style={styles.infoBannerText}>
            {"  "}Push reminders require a{" "}
            <Text style={{ fontWeight: "800" }}>development build</Text>.{" "}
            Timings are saved and will activate once you switch.
          </Text>
        </View>
      )}
      {times.length === 0 ? (
        <View style={styles.emptyTimings}>
          <View style={styles.emptyTimingsIcon}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={36}
              color="#A0AEC0"
            />
          </View>
          <Text style={styles.emptyTimingsTitle}>No Fixed Schedule</Text>
          <Text style={styles.emptyTimingsText}>
            Take this medicine as needed.
          </Text>
        </View>
      ) : (
        <View style={styles.timingsCard}>
          {times.map((time, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.timingRow,
                i < times.length - 1 && styles.timingRowBorder,
              ]}
              onPress={() => openTimePicker(i)}
              activeOpacity={0.75}
            >
              <View style={styles.timingIndex}>
                <Text style={styles.timingIndexText}>{i + 1}</Text>
              </View>
              <View style={styles.timingLabelWrap}>
                <Text style={styles.timingDoseLabel}>Dose {i + 1}</Text>
                <Text style={styles.timingDoseSub}>Tap to change time</Text>
              </View>
              <View style={styles.timingDisplayChip}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color="#0EA5B0"
                />
                <Text style={styles.timingDisplayText}>{time}</Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={14}
                  color="#A0AEC0"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {!isExpoGo && times.length > 0 && (
        <View style={styles.notifNote}>
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={16}
            color="#F59E0B"
          />
          <Text style={styles.notifNoteText}>
            {"  "}Notifications include{" "}
            <Text style={{ fontWeight: "800" }}>Mark as Taken</Text> and Ignore
            actions.
          </Text>
        </View>
      )}
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Log New Medicine</Text>
          <Text style={styles.headerSub}>
            Step {step} of 3 — {STEP_LABELS[step - 1]}
          </Text>
        </View>
      </View>

      {/* Step Progress */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  step > s && styles.stepDotDone,
                  step === s && styles.stepDotActive,
                ]}
              >
                {step > s ? (
                  <MaterialCommunityIcons name="check" size={14} color="#fff" />
                ) : (
                  <Text
                    style={[styles.stepNum, step >= s && styles.stepNumActive]}
                  >
                    {s}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.stepLabel, step === s && styles.stepLabelActive]}
              >
                {STEP_LABELS[s - 1]}
              </Text>
            </View>
            {s < 3 && (
              <View
                style={[
                  styles.progressLine,
                  step > s && styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Scroll Content */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={() => setStep(step - 1)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color="#4A5568"
            />
            <Text style={styles.prevBtnText}> Back</Text>
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <TouchableOpacity
            style={[styles.nextBtn, step === 1 && { flex: 1 }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { flex: 1 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={loading ? "loading" : "check"}
              size={18}
              color="#fff"
            />
            <Text style={styles.nextBtnText}>
              {loading ? "Saving..." : "Save Medicine"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TimePicker
        visible={timePickerVisible}
        initialTime={
          editingTimeIndex !== null ? times[editingTimeIndex] : "08:00 AM"
        }
        onConfirm={handleTimeConfirm}
        onClose={() => {
          setTimePickerVisible(false);
          setEditingTimeIndex(null);
        }}
      />
      <AppModal
        visible={modal.visible}
        icon={modal.icon}
        iconColor={modal.iconColor}
        iconBg={modal.iconBg}
        title={modal.title}
        message={modal.message}
        buttons={modal.buttons}
        onDismiss={hideModal}
      />
    </SafeAreaView>
  );
};

export default LogNewMedicine;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F9FC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1A2235" },
  headerSub: { fontSize: 12, color: "#A0AEC0", marginTop: 1 },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  stepItem: { alignItems: "center", gap: 6 },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  stepDotActive: {
    borderColor: "#0EA5B0",
    backgroundColor: "#0EA5B0",
    shadowColor: "#0EA5B0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stepDotDone: { borderColor: "#0EA5B0", backgroundColor: "#0EA5B0" },
  stepNum: { fontSize: 13, fontWeight: "700", color: "#A0AEC0" },
  stepNumActive: { color: "#fff" },
  stepLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#CBD5E0",
    letterSpacing: 0.5,
  },
  stepLabelActive: { color: "#0EA5B0" },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 6,
    marginBottom: 20,
  },
  progressLineActive: { backgroundColor: "#0EA5B0" },
  scroll: { paddingHorizontal: 24, paddingBottom: 110 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#1A2235",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldGroup: { marginBottom: 4 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A5568",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0AEC0",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  textArea: { height: 88, paddingTop: 14, alignItems: "flex-start" },
  inputFocused: { borderColor: "#0EA5B0", backgroundColor: "#F0FAFB" },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  // Subtle teal-tinted background for pre-filled fields
  inputPrefilled: {
    borderColor: "#BAE6EA",
    backgroundColor: "#F0FAFB",
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1A2235" },
  // Small inline badge indicating the field was auto-filled
  autoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7FA",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
    marginLeft: 6,
  },
  autoChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0EA5B0",
    letterSpacing: 0.3,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -14,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  errorText: { fontSize: 12, color: "#EF4444", fontWeight: "500" },
  doseTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  doseTypeBtn: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: "#F7F9FC",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  doseTypeBtnActive: { borderColor: "#0EA5B0", backgroundColor: "#F0FAFB" },
  doseTypeLbl: {
    fontSize: 10,
    color: "#A0AEC0",
    textAlign: "center",
    fontWeight: "600",
  },
  doseTypeLblActive: { color: "#0EA5B0", fontWeight: "700" },
  freqBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  freqBtnActive: { borderColor: "#0EA5B0", backgroundColor: "#F0FAFB" },
  freqLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  freqDot: { width: 8, height: 8, borderRadius: 4 },
  freqLabel: { fontSize: 14, color: "#718096", fontWeight: "500" },
  freqLabelActive: { color: "#1A2235", fontWeight: "700" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BAE6EA",
  },
  infoBannerText: { fontSize: 13, color: "#0EA5B0", flex: 1, lineHeight: 19 },
  notifNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  notifNoteText: { fontSize: 13, color: "#92400E", flex: 1, lineHeight: 19 },
  emptyTimings: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyTimingsIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTimingsTitle: { fontSize: 16, fontWeight: "700", color: "#4A5568" },
  emptyTimingsText: { fontSize: 13, color: "#A0AEC0" },
  timingsCard: {
    backgroundColor: "#F7F9FC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  timingRowBorder: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  timingIndex: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#0EA5B0",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  timingIndexText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  timingLabelWrap: { flex: 1 },
  timingDoseLabel: { fontSize: 14, color: "#1A2235", fontWeight: "700" },
  timingDoseSub: { fontSize: 11, color: "#A0AEC0", marginTop: 2 },
  timingDisplayChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#BAE6EA",
    gap: 6,
  },
  timingDisplayText: { fontSize: 14, color: "#0EA5B0", fontWeight: "700" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: "#F7F9FC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  prevBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 54,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  prevBtnText: { color: "#4A5568", fontWeight: "600", fontSize: 15 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5B0",
    borderRadius: 16,
    height: 54,
    flex: 1,
    gap: 8,
    shadowColor: "#0EA5B0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
