import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleTripNotifications(
  trip: any,
  isDuringTrip: boolean,
  daysUntilNext: number | null,
) {
  await cancelAllScheduledNotifications();

  if (!trip) return;

  if (isDuringTrip) {
    // During trip: Daily 8:30 AM reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Good morning!',
        body: `Time to plan your day in ${trip.destination}. Ready for some adventure?`,
      },
      trigger: {
        hour: 8,
        minute: 30,
        repeats: true,
      } as Notifications.CalendarTriggerInput,
    });
  } else if (daysUntilNext !== null && daysUntilNext > 7) {
    // Inactive: Reminder after 7 days
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'The world is waiting.',
        body: "Missing the thrill of a new city? Let's start planning your next journey.",
      },
      trigger: {
        seconds: 7 * 24 * 60 * 60, // 7 days
        repeats: false,
      } as Notifications.TimeIntervalTriggerInput,
    });
  }
}
