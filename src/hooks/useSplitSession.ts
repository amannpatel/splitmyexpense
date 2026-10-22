import { useEffect, useMemo, useReducer, useState } from 'react';
import { createLocalStore, type SessionStore } from '../lib/storage';
import { newParticipant, sessionReducer } from '../lib/session';
import type { CurrencyCode } from '../lib/money';
import type { GroupSession, Participant } from '../lib/types';

const localStore = createLocalStore();

export function useSplitSession(store: SessionStore = localStore) {
  const [initial] = useState(() => store.load());
  const [session, dispatch] = useReducer(sessionReducer, initial.session);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setSaved(store.save(session));
  }, [session, store]);

  const actions = useMemo(
    () => ({
      add: (name: string, paidMinor: number) => dispatch({ type: 'add', participant: newParticipant(name, paidMinor) }),
      addToExisting: (id: string, amountMinor: number) => dispatch({ type: 'addToExisting', id, amountMinor }),
      update: (id: string, name: string, paidMinor: number) => dispatch({ type: 'update', id, name, paidMinor }),
      remove: (id: string) => dispatch({ type: 'remove', id }),
      insert: (participant: Participant, index: number) => dispatch({ type: 'insert', participant, index }),
      setTitle: (title: string) => dispatch({ type: 'setTitle', title }),
      setCurrency: (currency: CurrencyCode) => dispatch({ type: 'setCurrency', currency }),
      toggleSettled: (key: string) => dispatch({ type: 'toggleSettled', key }),
      resetSettled: () => dispatch({ type: 'resetSettled' }),
      replace: (next: GroupSession) => dispatch({ type: 'replace', session: next }),
    }),
    [],
  );

  return { session, actions, loadStatus: initial.status, saved };
}
