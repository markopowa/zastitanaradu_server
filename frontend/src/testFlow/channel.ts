import { enqueueSnackbar } from "notistack";

import type {
    TestFillCommand,
    TestFlowMessage,
    TestFlowSection,
} from "./types";

const CHANNEL_NAME = "zn-integration-test";
const SESSION_KEY = "znTestSessionId";

const handlers = new Map<TestFlowSection, () => boolean>();

let listenerChannel: BroadcastChannel | null = null;

export function getTestSessionId(): string | null {
    return sessionStorage.getItem(SESSION_KEY);
}

export function isTestSessionActive(): boolean {
    return getTestSessionId() != null;
}

export function startTestSession(sessionId: string): void {
    sessionStorage.setItem(SESSION_KEY, sessionId);
}

export function endTestSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
    handlers.clear();
    if (listenerChannel) {
        listenerChannel.close();
        listenerChannel = null;
    }
}

export function registerTestFillHandler(
    section: TestFlowSection,
    handler: () => boolean,
): () => void {
    handlers.set(section, handler);
    return () => {
        if (handlers.get(section) === handler) {
            handlers.delete(section);
        }
    };
}

function openChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === "undefined") {
        return null;
    }
    return new BroadcastChannel(CHANNEL_NAME);
}

export function broadcastTestFill(section: TestFlowSection): void {
    const sessionId = getTestSessionId();
    if (!sessionId) return;
    const ch = openChannel();
    if (!ch) return;
    const msg: TestFillCommand = { type: "fill", section, sessionId };
    ch.postMessage(msg);
    ch.close();
}

export function startTestFillListener(): void {
    if (listenerChannel || !isTestSessionActive()) {
        return;
    }
    listenerChannel = openChannel();
    if (!listenerChannel) {
        return;
    }
    listenerChannel.onmessage = (event: MessageEvent<TestFlowMessage>) => {
        const msg = event.data;
        if (msg.type !== "fill") {
            return;
        }
        const sessionId = getTestSessionId();
        if (!sessionId || msg.sessionId !== sessionId) {
            return;
        }
        const handler = handlers.get(msg.section);
        const handled = handler?.() ?? false;
        const resultChannel = openChannel();
        resultChannel?.postMessage({
            type: "fill-result",
            section: msg.section,
            sessionId,
            handled,
        } satisfies TestFlowMessage);
        resultChannel?.close();
        if (handled) {
            enqueueSnackbar(`Test podaci učitani (${msg.section}).`, {
                variant: "info",
            });
        }
    };
}

export function subscribeTestFillResults(
    onResult: (section: TestFlowSection, handled: boolean) => void,
): () => void {
    const ch = openChannel();
    if (!ch) {
        return () => undefined;
    }
    ch.onmessage = (event: MessageEvent<TestFlowMessage>) => {
        const msg = event.data;
        if (msg.type !== "fill-result") {
            return;
        }
        const sessionId = getTestSessionId();
        if (!sessionId || msg.sessionId !== sessionId) {
            return;
        }
        onResult(msg.section, msg.handled);
    };
    return () => ch.close();
}
