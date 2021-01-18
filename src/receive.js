"use strict";
/*
# Overview
Measures the maximum throughput of `receiver.receive()` in package `@azure/service-bus`.
# Instructions
1. Create a Service Bus namespace with `Tier=Premium` and `Messaging Units=4`.  It is recommended to use the largest possible namespace to allow maximum client throughput.
2. Create a queue inside the namespace.
3. Set env vars `SERVICE_BUS_CONNECTION_STRING` and `SERVICE_BUS_QUEUE_NAME`.
4. This test presumes that there are messages in the queue.
5. `ts-node receive.ts [maxConcurrentCalls] [totalMessages] [isReceiveAndDelete]`
6. Example: `ts-node receive.ts 1000 1000000 false`
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var service_bus_1 = require("@azure/service-bus");
var moment_1 = require("moment");
// Load the .env file if it exists
var dotenv = require("dotenv");
dotenv.config();
var _start = moment_1["default"]();
var _messages = 0;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var connectionString, entityPath, maxConcurrentCalls, messages, isReceiveAndDelete, writeResultsPromise;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connectionString = process.env.SB_CONN_STR;
                    entityPath = "test";
                    maxConcurrentCalls = process.argv.length > 2 ? parseInt(process.argv[2]) : 10;
                    messages = process.argv.length > 3 ? parseInt(process.argv[3]) : 100;
                    isReceiveAndDelete = process.argv.length > 4 ? !(process.argv[4] === "false") : true;
                    log("Maximum Concurrent Calls: " + maxConcurrentCalls);
                    log("Total messages: " + messages);
                    log("isReceiveAndDelete: " + isReceiveAndDelete);
                    writeResultsPromise = WriteResults(messages);
                    return [4 /*yield*/, RunTest(connectionString, entityPath, maxConcurrentCalls, messages, isReceiveAndDelete)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, writeResultsPromise];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function RunTest(connectionString, entityPath, maxConcurrentCalls, messages, isReceiveAndDelete) {
    return __awaiter(this, void 0, void 0, function () {
        var ns, receiver, processMessage, processError;
        var _this = this;
        return __generator(this, function (_a) {
            ns = new service_bus_1.ServiceBusClient(connectionString);
            receiver = ns.createReceiver(entityPath, isReceiveAndDelete ? { receiveMode: "receiveAndDelete" } : {});
            processMessage = function (msg) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _messages++;
                            if (!!isReceiveAndDelete) return [3 /*break*/, 2];
                            return [4 /*yield*/, receiver.completeMessage(msg)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            if (!(_messages === messages)) return [3 /*break*/, 5];
                            return [4 /*yield*/, receiver.close()];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, ns.close()];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [2 /*return*/];
                    }
                });
            }); };
            processError = function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    console.log("Error occurred: ", args.error);
                    return [2 /*return*/];
                });
            }); };
            receiver.subscribe({ processMessage: processMessage, processError: processError }, {
                autoCompleteMessages: false,
                maxConcurrentCalls: maxConcurrentCalls
            });
            return [2 /*return*/];
        });
    });
}
function WriteResults(messages) {
    return __awaiter(this, void 0, void 0, function () {
        var lastMessages, lastElapsed, maxMessages, maxElapsed, receivedMessages, currentMessages, elapsed, currentElapsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lastMessages = 0;
                    lastElapsed = 0;
                    maxMessages = 0;
                    maxElapsed = Number.MAX_SAFE_INTEGER;
                    _a.label = 1;
                case 1: return [4 /*yield*/, service_bus_1.delay(1000)];
                case 2:
                    _a.sent();
                    receivedMessages = _messages;
                    currentMessages = receivedMessages - lastMessages;
                    lastMessages = receivedMessages;
                    elapsed = moment_1["default"]().diff(_start);
                    currentElapsed = elapsed - lastElapsed;
                    lastElapsed = elapsed;
                    if (currentMessages / currentElapsed > maxMessages / maxElapsed) {
                        maxMessages = currentMessages;
                        maxElapsed = currentElapsed;
                    }
                    WriteResult(receivedMessages, elapsed, currentMessages, currentElapsed, maxMessages, maxElapsed);
                    _a.label = 3;
                case 3:
                    if (_messages < messages) return [3 /*break*/, 1];
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function WriteResult(totalMessages, totalElapsed, currentMessages, currentElapsed, maxMessages, maxElapsed) {
    var memoryUsage = process.memoryUsage();
    log("\tTot Msg\t" + totalMessages +
        ("\tCur MPS\t" + Math.round((currentMessages * 1000) / currentElapsed)) +
        ("\tAvg MPS\t" + Math.round((totalMessages * 1000) / totalElapsed)) +
        ("\tMax MPS\t" + Math.round((maxMessages * 1000) / maxElapsed)) +
        ("\tRSS\t" + memoryUsage.rss) +
        ("\tHeapUsed\t" + memoryUsage.heapUsed));
}
function log(message) {
    console.log("[" + moment_1["default"]().format("hh:mm:ss.SSS") + "] " + message);
}
main()["catch"](function (err) {
    log("Error occurred: " + err);
});
