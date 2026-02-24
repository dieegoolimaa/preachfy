"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSermonSocket = (sermonId: string) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [latestBlocks, setLatestBlocks] = useState<any[] | null>(null);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    useEffect(() => {
        const socket = io('http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to Preachfy Sync Server');
        });

        socket.on('canvas-updated', (data) => {
            if (data.sermonId === sermonId) {
                setLatestBlocks(data.blocks);
            }
        });

        socket.on('pulpit-state-changed', (data) => {
            setActiveBlockId(data.blockId);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, [sermonId]);

    const syncCanvas = (blocks: Record<string, unknown>[]) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('sync-canvas', { sermonId, blocks });
        }
    };

    const pulpitAction = (blockId: string, action: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('pulpit-action', { blockId, action });
        }
    };

    return {
        isConnected,
        syncCanvas,
        pulpitAction,
        latestBlocks,
        activeBlockId,
        socket: socketRef.current
    };
};
