import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
type Message = {
    id: string
    message: string,
    audio?: {
        uri: string,
        duration: number
    },
    translation: string
    time: string
}

type State = {
    messages: Message[]
}

interface StoreActions {
    addMessage: (msg: Message) => void;
    deleteMessage: (msgId: string) => void;
}

export const useStore = create<State & StoreActions>()(
    persist((set, get) => ({
        messages: [],
        addMessage: (msg: Message) => set((state) => ({ ...state, messages: [...state.messages, msg] })),
        deleteMessage: (msgId: string) => set((state) => ({ messages: state.messages.filter((msg) => msg.id != msgId) })),
    }),
    {
        name: 'messages-storage', 
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state)=>({
            messages: state.messages
        }),
    },
));