// services/notificationService.js

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform, DeviceEventEmitter } from "react-native";

export const isExpoGo = Constants.appOwnership === "expo";

const inAppTimers = {};

const clearInAppTimer = (id) => {
  const entry = inAppTimers[id];
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  delete inAppTimers[id];
};

const playReminderSound = async () => {
  try {
    const { Audio } = require("expo-av");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      { uri: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" },
      { shouldPlay: true, volume: 1.0 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {
    console.warn("Could not play reminder sound:", e);
  }
};

const scheduleInAppReminder = ({ id, fireAt, title, body }) => {
  const delay = Math.max(0, fireAt.getTime() - Date.now());
  const timeoutId = setTimeout(() => {
    playReminderSound();
    DeviceEventEmitter.emit("medtrack-in-app-reminder", { title, message: body });
    delete inAppTimers[id];
  }, delay);
  inAppTimers[id] = { timeoutId, title, body };
};

// ─── Configure foreground notification behaviour (call once at app startup) ───
export function configureForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ─── Android channel ──────────────────────────────────────────────────────────
export async function setupNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medicine-reminders", {
      name: "Medicine Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

// ─── Action category ──────────────────────────────────────────────────────────
// FIX: opensAppToForeground: true on BOTH buttons.
//
// Why this matters:
//   • iOS (background/killed): when opensAppToForeground is false, iOS handles
//     the action entirely in the OS and never wakes the JS runtime, so our
//     AsyncStorage update never runs. Setting it to true guarantees the app
//     process receives the response and executes handleNotificationAction.
//   • Android: the flag controls whether the app comes to the foreground
//     visually, but the JS listener fires either way — however true is still
//     safer for reliable wakeup across all Android versions.
//   • In both cases the notification is dismissed explicitly via
//     dismissNotificationAsync() inside handleNotificationAction, so the
//     tray entry disappears regardless of this flag.
export async function setupNotificationCategory() {
  try {
    await Notifications.setNotificationCategoryAsync("medicine-reminder", [
      {
        identifier: "mark-taken",
        buttonTitle: "✅ Mark as Taken",
        options: {
          opensAppToForeground: true, // ← FIXED (was false)
        },
      },
      {
        identifier: "ignore",
        buttonTitle: "Ignore",
        options: {
          isDestructive: false,
          opensAppToForeground: true, // ← FIXED (was false)
        },
      },
    ]);
  } catch (e) {
    console.warn("Category setup error:", e);
  }
}

// ─── Permission request ───────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const result = await Notifications.requestPermissionsAsync();
    return result.status === "granted";
  }
  return true;
}

// ─── Dismiss a delivered notification from the tray ──────────────────────────
// Expo does not auto-remove the tray entry when an action button is tapped on
// Android. We must call this explicitly with the notification's request
// identifier. On iOS the OS clears it automatically after the action, but
// calling this is harmless and keeps behaviour consistent.
async function dismissNotification(response) {
  try {
    const notificationId = response.notification.request.identifier;
    if (notificationId) {
      await Notifications.dismissNotificationAsync(notificationId);
    }
  } catch (e) {
    // Non-fatal — log and continue
    console.warn("Could not dismiss notification:", e);
  }
}

// ─── Shared action handler ────────────────────────────────────────────────────
// Called from:
//   1. addNotificationResponseReceivedListener  (app running / background)
//   2. getLastNotificationResponseAsync         (app cold-launched by tap)
export async function handleNotificationAction(response) {
  if (!response) return;

  const actionId = response.actionIdentifier;
  const data = response.notification?.request?.content?.data;

  // ── "Ignore" action ────────────────────────────────────────────────────────
  // User explicitly dismissed — just clear the tray entry, nothing else.
  if (actionId === "ignore") {
    await dismissNotification(response);
    return;
  }

  // ── Default tap (user tapped the notification body, not an action button) ──
  // No data update needed; the OS has already opened the app.
  if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    await dismissNotification(response);
    return;
  }

  // ── Guard: we need a medicineId to do anything useful ─────────────────────
  if (!data?.medicineId) {
    await dismissNotification(response);
    return;
  }

  // ── "Mark as Taken" action ─────────────────────────────────────────────────
  if (actionId === "mark-taken") {
    try {
      const userEmail = await AsyncStorage.getItem("currentUser");
      if (!userEmail) {
        await dismissNotification(response);
        return;
      }

      // Update history: find today's pending entry for this medicine
      const historyRaw = await AsyncStorage.getItem(`history_${userEmail}`);
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      const today = new Date().toDateString();

      const idx = history.findIndex(
        (h) =>
          h.medicineId === data.medicineId &&
          new Date(h.scheduledTime).toDateString() === today &&
          !h.taken,
      );

      if (idx !== -1) {
        history[idx].taken = true;
        history[idx].takenAt = new Date().toISOString();
        await AsyncStorage.setItem(
          `history_${userEmail}`,
          JSON.stringify(history),
        );
      }

      // Decrement remaining quantity
      const medsRaw = await AsyncStorage.getItem(`medicines_${userEmail}`);
      const meds = medsRaw ? JSON.parse(medsRaw) : [];
      const medIdx = meds.findIndex((m) => m.id === data.medicineId);
      if (medIdx !== -1 && meds[medIdx].remainingQuantity > 0) {
        meds[medIdx].remainingQuantity -= 1;
        await AsyncStorage.setItem(
          `medicines_${userEmail}`,
          JSON.stringify(meds),
        );
      }
    } catch (e) {
      console.warn("Error handling mark-taken action:", e);
    } finally {
      // Always dismiss the notification, even if the data update failed
      await dismissNotification(response);
    }
  }
}

// ─── Schedule daily notifications for a medicine ─────────────────────────────
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

export async function scheduleNotifications(medicine) {
  if (isExpoGo) {
    const ids = [];
    for (const time of medicine.times) {
      const { hours, minutes } = parseTime(time);
      const id = `inapp_${medicine.id}_${time}`;
      const fireAt = new Date();
      fireAt.setHours(hours, minutes, 0, 0);
      if (fireAt.getTime() <= Date.now()) fireAt.setDate(fireAt.getDate() + 1);
      scheduleInAppReminder({
        id,
        fireAt,
        title: "💊 Medicine Reminder",
        body: `Time to take your ${medicine.name} (${medicine.doseType})`,
      });
      ids.push(id);
    }
    return ids;
  }

  try {
    const permission = await requestNotificationPermission();
    if (!permission) return [];

    // Channel & category are set up at app start, but called here as a
    // safety net in case scheduleNotifications is ever called before App mounts.
    await setupNotificationChannel();
    await setupNotificationCategory();

    const ids = [];
    console.log("Scheduling notifications for:", medicine.name, medicine.times);
    for (const time of medicine.times) {
      const { hours, minutes } = parseTime(time);
      console.log(`Scheduling at ${hours}:${minutes}`);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💊 Medicine Reminder",
          body: `Time to take your ${medicine.name} (${medicine.doseType})`,
          sound: true,
          categoryIdentifier: "medicine-reminder",
          data: { medicineId: medicine.id, medicineName: medicine.name },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
          channelId: "medicine-reminders",
        },
      });
      ids.push(id);
    }
    return ids;
  } catch (err) {
    console.warn("Notification scheduling error:", err);
    return [];
  }
}
