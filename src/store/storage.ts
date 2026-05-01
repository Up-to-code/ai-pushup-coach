import AsyncStorage from '@react-native-async-storage/async-storage';

export const customStorage = {
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    if (!value || value === 'undefined') {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      await AsyncStorage.removeItem(name);
      return null;
    }
  },
  setItem: async (name: string, value: unknown) => {
    if (value === undefined) {
      await AsyncStorage.removeItem(name);
      return;
    }

    await AsyncStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};
