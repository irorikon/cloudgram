// src/api/auth.ts
import { request } from '@/utils/request'

export function listChannels() {
    return request.get('/api/channel/list')
}

export function getOneChannel() {
    return request.get('/api/channel/get')
}

export function createChannel(channelId: string, channelName: string) {
    return request.post('/api/channel/create', { channelId, channelName })
}

export function deleteChannel(channelId: string) {
    return request.post('/api/channel/delete', { channelId })
}

export function updateChannel(channelId: string, channelName: string) {
    return request.post('/api/channel/update', { channelId, channelName })
}

export function checkChannel(channelId: string) {
    return request.post('/api/system/channel', { channelId })
}