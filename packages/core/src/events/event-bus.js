"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeckEventBus = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
class DeckEventBus extends eventemitter3_1.default {
    static instance = null;
    static getInstance() {
        if (!DeckEventBus.instance) {
            DeckEventBus.instance = new DeckEventBus();
        }
        return DeckEventBus.instance;
    }
}
exports.DeckEventBus = DeckEventBus;
//# sourceMappingURL=event-bus.js.map