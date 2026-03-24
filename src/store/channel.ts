import { defineStore } from 'pinia';

interface ChannelInfo {
  channelId: string;
  channelName: string;
  messageId: number;
  limited: boolean;
}

export const useChannelStore = defineStore('channel', {
    state: (): { channel: ChannelInfo | {} } => ({
        channel: {}
    }),
    getters: {
        getChannel: (state): ChannelInfo | {} => state.channel,
        hasChannel: (state): boolean => Object.keys(state.channel).length > 0
    },
    actions: {
        setChannel(channelId: string, channelName: string, messageId: number, limited: boolean) {
            this.channel = { channelId, channelName, messageId, limited };
        },
    },
    persist: true,
});