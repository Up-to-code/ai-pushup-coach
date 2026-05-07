import { useEffect, useState } from 'react';
import { usePlanStore, useSettingsStore, useUserStore, useWorkoutStore } from '../store';

const persistedStores = [
  useSettingsStore,
  usePlanStore,
  useUserStore,
  useWorkoutStore,
];

function allPersistedStoresHydrated() {
  return persistedStores.every((store) => store.persist.hasHydrated());
}

export function useSettingsHydrated() {
  const [hydrated, setHydrated] = useState(allPersistedStoresHydrated);

  useEffect(() => {
    if (allPersistedStoresHydrated()) {
      setHydrated(true);
      return;
    }

    const unsubscribers = persistedStores.map((store) =>
      store.persist.onFinishHydration(() => {
        if (allPersistedStoresHydrated()) {
          setHydrated(true);
        }
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return hydrated;
}
