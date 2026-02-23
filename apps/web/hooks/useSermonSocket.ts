"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSermonSocket = (sermonId: string) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // In production, this would be an environment variable
        const socket = io('http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to Preachfy Sync Server');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

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

    return { isConnected, syncCanvas, pulpitAction, socket: socketRef.current };
};
