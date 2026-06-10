import {
    isTestSessionActive,
    registerTestFillHandler,
    startTestFillListener,
} from "./channel";
import type { TestFlowSection } from "./types";

export function setupTestFill(
    section: TestFlowSection,
    handler: () => boolean,
    isActive: () => boolean = () => true,
): () => void {
    if (!isTestSessionActive()) {
        return () => undefined;
    }
    startTestFillListener();
    return registerTestFillHandler(section, () => {
        if (!isActive()) {
            return false;
        }
        return handler();
    });
}
