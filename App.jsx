import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { DeviceEventEmitter } from "react-native";
import NotificationSliderAlert from "./Pages/MediLog/NotificationSliderAlert";
import {
  configureForegroundHandler,
  setupNotificationChannel,
  setupNotificationCategory,
  handleNotificationAction,
} from "./Pages/MediLog/notificationService"; // ← adjust if your folder differs

import Login from "./Pages/Intro/Login";
import Register from "./Pages/Intro/Register";

import Home from "./Pages/Home/Home";

import MediLogDash from "./Pages/MediLog/MediLogDash";
import LogNewMedicine from "./Pages/MediLog/LogNewMedicine";
import History from "./Pages/MediLog/History";
import MedicineBox from "./Pages/MediLog/MedicineBox";

import MediTrack from "./Pages/MediScan/MedicineScanDash";
import MediTrackScanner from "./Pages/MediScan/Scanner";
import MediTrackResult from "./Pages/MediScan/Result";

const Stack = createNativeStackNavigator();

export default function App() {
  const [inAppAlert, setInAppAlert] = useState({ visible: false, title: "", message: "" });

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("medtrack-in-app-reminder", ({ title, message }) => {
      setInAppAlert({ visible: true, title, message });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const init = async () => {
      await AsyncStorage.setItem("currentUser", "user@medtrack.app");

      // Re-register in-app timers for all existing medicines on app start
      const { scheduleNotifications, isExpoGo } = require("./Pages/MediLog/notificationService");
      if (isExpoGo) {
        const medsRaw = await AsyncStorage.getItem("medicines_user@medtrack.app");
        const meds = medsRaw ? JSON.parse(medsRaw) : [];
        for (const med of meds) {
          if (med.active && med.times?.length) {
            await scheduleNotifications(med);
          }
        }
        console.log(`Re-registered timers for ${meds.length} medicines`);
      }

      // 1. Configure how notifications appear while the app is in the foreground
      configureForegroundHandler();

      // 2. Register Android channel + action buttons at startup
      await setupNotificationChannel();
      await setupNotificationCategory();

      // 3. Handle the action that cold-launched / resumed the app
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) handleNotificationAction(response);
      });
    };

    init();

    // 4. Handle actions while the app is already running (fore- & background)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationAction,
    );

    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer>
      <NotificationSliderAlert
        visible={inAppAlert.visible}
        title={inAppAlert.title}
        message={inAppAlert.message}
        onClose={() => setInAppAlert(a => ({ ...a, visible: false }))}
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />


        <Stack.Screen name="MediLogDash" component={MediLogDash} />
        <Stack.Screen name="LogNewMedicine" component={LogNewMedicine} />
        <Stack.Screen name="History" component={History} />
        <Stack.Screen name="MedicineBox" component={MedicineBox} />

        <Stack.Screen name="MediTrack" component={MediTrack} />
        <Stack.Screen name="MediTrackScanner" component={MediTrackScanner} />
        <Stack.Screen name="MediTrackResult" component={MediTrackResult} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
