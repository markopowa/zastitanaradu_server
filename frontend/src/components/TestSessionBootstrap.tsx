import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import {
    getTestSessionId,
    isTestSessionActive,
    startTestFillListener,
    startTestSession,
} from "../testFlow/channel";

export function TestSessionBootstrap() {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const fromUrl = searchParams.get("testSession");
        if (fromUrl) {
            startTestSession(fromUrl);
        }
        if (isTestSessionActive()) {
            startTestFillListener();
        }
    }, [searchParams]);

    useEffect(() => {
        if (!getTestSessionId()) {
            return;
        }
        startTestFillListener();
    }, []);

    return null;
}
