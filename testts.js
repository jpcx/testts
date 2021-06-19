#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Test_description, _Test_deleteStacks, _Test_passed, _Test_error, _Test_throws, _Test_children, _Test_onceReady;
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
class TesttsInternalError extends Error {
    constructor(why, cause) {
        super("[testts] Internal Error: " + why);
        this.cause = cause;
    }
}
class TesttsArgumentError extends Error {
    constructor(why, ...args) {
        super("[testts] Argument Error: " + why);
        this.args = args;
    }
}
class TesttsTypeError extends TypeError {
    constructor(why) {
        super("[testts] Type Error: " + why);
    }
}
const ANSI_GRAY_FG = "\x1b[90m";
const ANSI_GREEN_FG = "\x1b[32m";
const ANSI_RED_FG = "\x1b[31m";
const ANSI_CYAN_FG = "\x1b[36m";
const ANSI_RESET = "\x1b[0m";
const TEST = ANSI_GRAY_FG + "▷" + ANSI_RESET;
const PASS = ANSI_GREEN_FG + "✓" + ANSI_RESET;
const FAIL = ANSI_RED_FG + "✗" + ANSI_RESET;
function addIndentAfterNewlines(str, spacing) {
    return str.split("\n").reduce((a, v, i, _) => {
        if (i === 0)
            a += v;
        else if (i === _.length - 1)
            a += "\n" + v;
        else
            a += "\n" + spacing + v;
        return a;
    }, "");
}
class StdioManipulator {
    constructor() {
        const _self = this;
        let _stdout = process.stdout.write.bind(process.stdout);
        let _stderr = process.stderr.write.bind(process.stdout);
        let _indent = 0;
        let _indentNewlinesOnly = false;
        Object.defineProperty(this, "indent", {
            get: () => _indent,
            set: (n) => {
                if (typeof n !== "number")
                    throw new TesttsInternalError("bad indent assignment");
                _indent = n;
            },
            enumerable: true,
            configurable: false,
        });
        Object.defineProperty(this, "indentNewlinesOnly", {
            get: () => _indentNewlinesOnly,
            set: (b) => {
                if (typeof b !== "boolean")
                    throw new TesttsInternalError("bad indentNewlinesOnly assignment");
                _indentNewlinesOnly = b;
            },
            enumerable: true,
            configurable: false,
        });
        this.reset = () => {
            process.stdout.write = _stdout;
            process.stderr.write = _stderr;
        };
        function makeWriter(write) {
            return (bufferOrStr, cbOrEncoding, cb) => {
                const spacing = new Array(_self.indent).fill(" ").join("");
                if (!_self.indentNewlinesOnly)
                    write(spacing);
                if (typeof bufferOrStr === "string" && bufferOrStr.match(/\S/)) {
                    bufferOrStr = addIndentAfterNewlines(bufferOrStr, spacing);
                }
                if (typeof cbOrEncoding === "function")
                    return write(bufferOrStr, cbOrEncoding);
                else
                    return write(bufferOrStr, cbOrEncoding, cb);
            };
        }
        process.stdout.write = makeWriter(_stdout);
        process.stderr.write = makeWriter(_stderr);
    }
}
const STDIO_MANIP = new StdioManipulator();
const TEST_PROMISES = new WeakSet();
let N_TESTS_PASSED = 0;
let N_TESTS_FAILED = 0;
function findPaths(testMatcher = "\\.test\\.js$") {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield (() => __awaiter(this, void 0, void 0, function* () {
            const _ = new Set();
            for (let i = 2; i < process.argv.length; ++i) {
                const cur = process.argv[i];
                const stats = yield new Promise((resolve, reject) => fs.lstat(cur, (err, stat) => {
                    if (err)
                        reject(err);
                    else
                        resolve(stat);
                }));
                if (stats.isFile()) {
                    _.add(path.resolve(cur));
                    process.argv.splice(i, 1);
                    --i;
                }
            }
            return _;
        }))();
        function search(cur) {
            return __awaiter(this, void 0, void 0, function* () {
                const stats = yield new Promise((resolve, reject) => fs.lstat(cur, (err, stat) => {
                    if (err)
                        reject(err);
                    else
                        resolve(stat);
                }));
                if (stats.isFile()) {
                    const name = path.basename(cur);
                    if (name.match(new RegExp(testMatcher, "m"))) {
                        result.add(path.resolve(cur));
                    }
                }
                else if (stats.isDirectory()) {
                    const subs = yield new Promise((resolve, reject) => fs.readdir(cur, (err, files) => {
                        if (err)
                            reject(err);
                        else
                            resolve(files);
                    }));
                    for (const s of subs)
                        yield search(path.join(cur, s));
                }
            });
        }
        try {
            for (const target of process.argv.slice(2)) {
                yield search(path.relative(process.cwd(), target) || "./");
            }
        }
        catch (e) {
            throw new TesttsInternalError("encountered an error while searching for tests", e);
        }
        if (result.size === 0)
            throw new TesttsArgumentError("cannot find tests", ...process.argv.slice(2));
        return Array.from(result);
    });
}
class Test {
    constructor(description, body, ondata, onerr, throws, deleteStacks) {
        _Test_description.set(this, void 0);
        _Test_deleteStacks.set(this, void 0);
        _Test_passed.set(this, false);
        _Test_error.set(this, null);
        _Test_throws.set(this, void 0);
        _Test_children.set(this, []);
        _Test_onceReady.set(this, void 0);
        __classPrivateFieldSet(this, _Test_description, description, "f");
        __classPrivateFieldSet(this, _Test_throws, throws, "f");
        __classPrivateFieldSet(this, _Test_deleteStacks, deleteStacks, "f");
        __classPrivateFieldSet(this, _Test_onceReady, new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield body(makeAPI((child) => __classPrivateFieldGet(this, _Test_children, "f").push(child), deleteStacks));
                if (!throws) {
                    ++N_TESTS_PASSED;
                    __classPrivateFieldSet(this, _Test_passed, true, "f");
                    ondata(result);
                    resolve();
                }
                else {
                    ++N_TESTS_FAILED;
                    __classPrivateFieldSet(this, _Test_passed, false, "f");
                    onerr();
                    resolve();
                }
            }
            catch (e) {
                __classPrivateFieldSet(this, _Test_error, e, "f");
                if (throws) {
                    if (throws.message || throws.constructedBy || throws.predicate) {
                        if (throws.predicate) {
                            __classPrivateFieldSet(this, _Test_passed, !!throws.predicate(e), "f");
                        }
                        else if (throws.constructedBy && throws.message) {
                            __classPrivateFieldSet(this, _Test_passed, e instanceof throws.constructedBy &&
                                e.message === throws.message, "f");
                        }
                        else if (throws.constructedBy) {
                            __classPrivateFieldSet(this, _Test_passed, e instanceof throws.constructedBy, "f");
                        }
                        else if (throws.message) {
                            __classPrivateFieldSet(this, _Test_passed, e.message === throws.message, "f");
                        }
                        else {
                            __classPrivateFieldSet(this, _Test_passed, false, "f");
                        }
                    }
                    else {
                        __classPrivateFieldSet(this, _Test_passed, true, "f");
                    }
                }
                else {
                    __classPrivateFieldSet(this, _Test_passed, false, "f");
                }
                if (__classPrivateFieldGet(this, _Test_passed, "f")) {
                    ++N_TESTS_PASSED;
                    ondata();
                    resolve();
                }
                else {
                    ++N_TESTS_FAILED;
                    onerr(e);
                    resolve();
                }
            }
        })), "f");
    }
    get passed() {
        return __classPrivateFieldGet(this, _Test_passed, "f");
    }
    get onceReady() {
        return __classPrivateFieldGet(this, _Test_onceReady, "f");
    }
    log() {
        return __awaiter(this, void 0, void 0, function* () {
            let anyChildrenFailed = false;
            if (__classPrivateFieldGet(this, _Test_children, "f").length) {
                console.log(TEST + " " + __classPrivateFieldGet(this, _Test_description, "f"));
            }
            else {
                if (__classPrivateFieldGet(this, _Test_passed, "f")) {
                    console.log(PASS + " " + __classPrivateFieldGet(this, _Test_description, "f"));
                }
                else {
                    console.error(FAIL + " " + __classPrivateFieldGet(this, _Test_description, "f"));
                    STDIO_MANIP.indent += 2;
                    if (__classPrivateFieldGet(this, _Test_error, "f")) {
                        if (__classPrivateFieldGet(this, _Test_deleteStacks, "f") && __classPrivateFieldGet(this, _Test_error, "f") instanceof Error)
                            delete __classPrivateFieldGet(this, _Test_error, "f").stack;
                        console.error(__classPrivateFieldGet(this, _Test_error, "f"));
                    }
                    if (__classPrivateFieldGet(this, _Test_throws, "f")) {
                        if (__classPrivateFieldGet(this, _Test_throws, "f").message ||
                            __classPrivateFieldGet(this, _Test_throws, "f").constructedBy ||
                            __classPrivateFieldGet(this, _Test_throws, "f").predicate) {
                            console.error("[expected throw]:");
                            console.error(__classPrivateFieldGet(this, _Test_throws, "f"));
                        }
                        else {
                            console.error("[expected throw]");
                        }
                    }
                    STDIO_MANIP.indent -= 2;
                }
            }
            let nChildrenBefore = __classPrivateFieldGet(this, _Test_children, "f").length;
            for (const child of __classPrivateFieldGet(this, _Test_children, "f")) {
                STDIO_MANIP.indent += 2;
                yield child.onceReady;
                yield child.log();
                anyChildrenFailed = anyChildrenFailed || !child.passed;
                STDIO_MANIP.indent -= 2;
            }
            if (__classPrivateFieldGet(this, _Test_children, "f").length > nChildrenBefore)
                throw new TesttsTypeError("found a subchild attached to a non-immediate parent... " +
                    "check for missing `test` parameters");
            if (anyChildrenFailed && __classPrivateFieldGet(this, _Test_passed, "f")) {
                --N_TESTS_PASSED;
                ++N_TESTS_FAILED;
                __classPrivateFieldSet(this, _Test_passed, false, "f");
                console.error(FAIL);
            }
            else if (__classPrivateFieldGet(this, _Test_children, "f").length && !__classPrivateFieldGet(this, _Test_passed, "f")) {
                process.stdout.write(FAIL + " ");
                STDIO_MANIP.indent += 2;
                if (__classPrivateFieldGet(this, _Test_error, "f")) {
                    STDIO_MANIP.indentNewlinesOnly = true;
                    console.error(__classPrivateFieldGet(this, _Test_error, "f"));
                    STDIO_MANIP.indentNewlinesOnly = false;
                }
                if (__classPrivateFieldGet(this, _Test_throws, "f")) {
                    if (__classPrivateFieldGet(this, _Test_throws, "f").message ||
                        __classPrivateFieldGet(this, _Test_throws, "f").constructedBy ||
                        __classPrivateFieldGet(this, _Test_throws, "f").predicate) {
                        console.error("[expected throw]:");
                        console.error(__classPrivateFieldGet(this, _Test_throws, "f"));
                    }
                    else {
                        console.error("[expected throw]");
                    }
                }
                STDIO_MANIP.indent -= 2;
            }
        });
    }
}
_Test_description = new WeakMap(), _Test_deleteStacks = new WeakMap(), _Test_passed = new WeakMap(), _Test_error = new WeakMap(), _Test_throws = new WeakMap(), _Test_children = new WeakMap(), _Test_onceReady = new WeakMap();
function makeAPI(registerChild, deleteStacks) {
    function throws(throwOrTestDescr, messageOrBody) {
        if (!throwOrTestDescr && !messageOrBody) {
            return genTestFn({});
        }
        else if (typeof throwOrTestDescr === "string") {
            if (typeof messageOrBody === "function") {
                return genTestFn({})(throwOrTestDescr, messageOrBody);
            }
            else if (messageOrBody === undefined) {
                return genTestFn({ message: throwOrTestDescr });
            }
            else {
                throw new TesttsArgumentError("test.throws requires a new test body as its second argument if the " +
                    "first argument is a string", throwOrTestDescr, messageOrBody);
            }
        }
        else if (typeof throwOrTestDescr === "function") {
            if (throwOrTestDescr === Error ||
                throwOrTestDescr.prototype instanceof Error) {
                if (typeof messageOrBody === "string") {
                    return genTestFn({
                        constructedBy: throwOrTestDescr,
                        message: messageOrBody,
                    });
                }
                else if (messageOrBody === undefined) {
                    return genTestFn({
                        constructedBy: throwOrTestDescr,
                    });
                }
                else {
                    throw new TesttsArgumentError("test.throws requires either an error message or a new test body " +
                        "as its second argument", throwOrTestDescr, messageOrBody);
                }
            }
            else {
                if (messageOrBody === undefined) {
                    return genTestFn({
                        predicate: throwOrTestDescr,
                    });
                }
                else {
                    throw new TesttsArgumentError("test.throws requires an empty second argument if the first is a " +
                        "throw predicate (a function that does not construct Errors)", throwOrTestDescr, messageOrBody);
                }
            }
        }
        else {
            throw new TesttsArgumentError("test.throws requires an error message, error constructor, predicate, " +
                "or new test description as its first argument", throwOrTestDescr, messageOrBody);
        }
    }
    function genTestFn(expectedThrow) {
        let passDeleteStacks = true;
        const test = (description, body) => {
            if (typeof body !== "function")
                throw new TesttsArgumentError("tests with descriptions require a test body");
            const execution = new Promise((resolve, reject) => {
                const t = new Test(description, body, resolve, reject, expectedThrow, passDeleteStacks ? deleteStacks : false);
                registerChild(t);
            });
            TEST_PROMISES.add(execution);
            return execution;
        };
        test.throws = throws;
        test.deleteStacks = (setting = true, passToChildren = true) => {
            deleteStacks = setting;
            passDeleteStacks = passToChildren;
        };
        return test;
    }
    return genTestFn();
}
function globalTestLauncher() {
    return __awaiter(this, void 0, void 0, function* () {
        process.addListener("unhandledRejection", (details, promise) => {
            if (!TEST_PROMISES.has(promise)) {
                STDIO_MANIP.reset();
                console.error("[testts] Error: Unhandled promise rejection. Exiting. See below:");
                console.error(details);
                process.exit(1);
            }
        });
        STDIO_MANIP.indent = 1;
        let matcher = undefined;
        for (let i = 2; i < process.argv.length - 1; ++i) {
            if (process.argv[i].trim() === "--match" ||
                process.argv[i].trim() === "-m") {
                matcher = process.argv[i + 1];
                process.argv.splice(i, 2);
            }
        }
        const paths = yield findPaths(matcher);
        const settings = (() => {
            try {
                const o = require(path.join(process.cwd(), "./.testts.json"));
                o.prioritized = o.prioritized
                    .map((p) => path.resolve(p))
                    .filter((p) => paths.includes(p));
                return o;
            }
            catch (e) {
                return { prioritized: [] };
            }
        })();
        for (const p of settings.prioritized) {
            const t = new Test(ANSI_CYAN_FG + path.relative(process.cwd(), p) + ANSI_RESET, (test) => {
                module.exports = {
                    test,
                };
                require(p);
            }, () => { }, () => { });
            yield t.onceReady;
            yield t.log();
        }
        const nonPrioritized = [];
        for (const p of paths) {
            if (settings.prioritized.includes(p))
                continue;
            nonPrioritized.push(new Test(ANSI_CYAN_FG + path.relative(process.cwd(), p) + ANSI_RESET, (test) => {
                module.exports = {
                    test,
                };
                require(p);
            }, () => { }, () => { }));
        }
        for (const t of nonPrioritized) {
            yield t.onceReady;
            yield t.log();
        }
    });
}
if (process.argv.length >= 3) {
    globalTestLauncher()
        .then(() => {
        STDIO_MANIP.reset();
        if (N_TESTS_FAILED) {
            console.error("\n" +
                ANSI_RED_FG +
                "passed [" +
                N_TESTS_PASSED +
                "/" +
                (N_TESTS_PASSED + N_TESTS_FAILED) +
                "] tests" +
                ANSI_RESET);
            process.exit(1);
        }
        else {
            console.error("\n" +
                ANSI_GREEN_FG +
                "passed [" +
                N_TESTS_PASSED +
                "/" +
                (N_TESTS_PASSED + N_TESTS_FAILED) +
                "] tests" +
                ANSI_RESET);
            process.exit(0);
        }
    })
        .catch((e) => {
        STDIO_MANIP.reset();
        console.error(e);
        process.exit(1);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9DQSx5QkFBeUI7QUFDekIsNkJBQTZCO0FBb0Q3QixNQUFNLG1CQUFvQixTQUFRLEtBQUs7SUFFckMsWUFBWSxHQUFXLEVBQUUsS0FBYTtRQUNwQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxtQkFBb0IsU0FBUSxLQUFLO0lBRXJDLFlBQVksR0FBVyxFQUFFLEdBQUcsSUFBVztRQUNyQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxlQUFnQixTQUFRLFNBQVM7SUFDckMsWUFBWSxHQUFXO1FBQ3JCLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFHRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDO0FBQ2pDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDO0FBQzdCLE1BQU0sSUFBSSxHQUFHLFlBQVksR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzlDLE1BQU0sSUFBSSxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBRTVDLFNBQVMsc0JBQXNCLENBQUMsR0FBVyxFQUFFLE9BQWU7SUFDMUQs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QUMsQ0FBQyxDQUFDO0NBQ04iLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKioqKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqXG4gKioqICAgICAgICAgICAgICBfICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiogICAgICAgICAgICAgIDpwICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6cCAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICAgICAgICAgICAgICAgICAgICAgICAgICBfICAgICA6eCAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAub3hveG94cCAgICAgICAgICAuOm94byAgICAgIDpwICAgOm94b3hveHAgLjpveG8gICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgIDp4b3hveG94ICAub3ggICAgIC54ICBveG8gcCAgIDp4ICA6eG94b3hveCAueCAgb3hvIHAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpkICAgLnggb3hvICAgIDpvLCAgYHhvYCAub3hveG94cCA6ZCAgICA6bywgIGB4b2AgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICAubyAgIHhveCAgOnhveCAgICAgIDp4b3hveG94ICA6eCAgIDp4b3ggICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpvICA6eCAgICBveG8gICA6b3ggICAgICAgIDpkICAgICA6byAgICAgOm94ICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICA6b3hveG94byAgICAgIDp4byAgICAgIDp4ICAgICA6eCAgICAgICA6eG8gICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpvICA6b3hveG94ICAgICAgICAgOm94ICAgIDpvICAgICA6byAgICAgICAgIDpveCAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICA6eCwgICAgICAgIC5veCwgIDpvICAgIDp4ICAgICA6eCAgICAub3gsICA6byAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpxLCA6b3gsICAgLnggZCd4b3hvIHhgICAgIDpvICAgICA6cSwgIGQneG94byB4YCAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICc6eCAgOnhveG94b2AgICAgLm94b2AgICAgIDpxLCAgICAnOnggICAgIC5veG9gICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgIDp4b3hvYCAgICAgICAgICAgICAgICc6eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgQGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2pwY3gvdGVzdHRzICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgQGxpY2Vuc2UgTEdQTC0zLjAtb3ItbGF0ZXIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgQGNvcHlyaWdodCAoQykgMjAyMSBKdXN0aW4gQ29sbGllciA8bUBqcGN4LmRldj4gICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSAgICAqXG4gKiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyAgICAgICAgICAqXG4gKiAgICBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgICAgICAqXG4gKiAgICBMaWNlbnNlLCBvciAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLiAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgICAgICAgICAqXG4gKiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW50ZXJuYWxpZWQgd2FycmFudHkgb2YgICAgICAqXG4gKiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlICAgICAgICAgICAqXG4gKiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy4gICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlICoqXG4gKiAgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uICBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LiAgKioqXG4gKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqKioqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IHR5cGUgVGVzdEJvZHk8VD4gPSAodGVzdDogVGVzdFJlZ2lzdHJhcikgPT4gVCB8IFByb21pc2U8VD47XG5leHBvcnQgdHlwZSBQcmVkaWNhdGU8VCBleHRlbmRzIEFycmF5PGFueT4+ID0gKC4uLmFyZ3M6IFQpID0+IGFueTtcblxuLyoqIHRlc3R0cyBjb25maWd1cmF0aW9uIGZpbGUgdHlwZSAoZnJvbSBgLnRlc3R0cy5qc29uYCBpbiBjd2QpICovXG5leHBvcnQgdHlwZSBTZXR0aW5ncyA9IHtcbiAgLyoqXG4gICAqIEEgbGlzdCBvZiBwYXRocyB0byBwcmlvcml0aXplLlxuICAgKiBFYWNoIHByaW9yaXRpemVkIHRlc3QgZmlsZSBleGVjdXRlcyBiZWZvcmUgYWxsIG90aGVyIHRlc3RzLlxuICAgKiBFeGVjdXRpb24gb3JkZXIgZm9sbG93cyBhcnJheSBvcmRlci5cbiAgICovXG4gIHByaW9yaXRpemVkOiBzdHJpbmdbXTtcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdWIgZXh0ZW5kcyBFcnJvciB7fVxuZXhwb3J0IGludGVyZmFjZSBFcnJvclN1YkNvbnN0cnVjdG9yIHtcbiAgbmV3ICguLi5hcmdzOiBhbnlbXSk6IEVycm9yU3ViO1xuICBwcm90b3R5cGU6IEVycm9yU3ViO1xufVxuXG4vKiogUmVnaXN0ZXJzIGEgbmV3IHRlc3QuICAqL1xuZXhwb3J0IHR5cGUgVGVzdFJlZ2lzdHJhciA9IHR5cGVvZiB0ZXN0O1xuLyoqIFJlZ2lzdGVycyBhIG5ldyB0ZXN0LiAgKi9cbmV4cG9ydCBkZWNsYXJlIGNvbnN0IHRlc3Q6IHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIG5ldyB0ZXN0LlxuICAgKiBAcGFyYW0gICAgZGVzY3JpcHRpb24gIC0gYW55IHN0cmluZyBkZXNjcmlwdGlvbiB0byBkZXNjcmliZSB0aGUgdGVzdC5cbiAgICogQHBhcmFtICAgIGJvZHkgICAgICAgICAtIGV4ZWN1dGlvbiBib2R5IHRoYXQgc2hvdWxkIHRocm93IG9uIGZhaWx1cmUuXG4gICAqL1xuICA8VD4oZGVzY3JpcHRpb246IHN0cmluZywgYm9keTogVGVzdEJvZHk8VD4pOiBQcm9taXNlPFQ+O1xuICAvKiogRGVzY3JpYmUgYW4gZXhwZWN0ZWQgdGhyb3cgKi9cbiAgdGhyb3dzOiB7XG4gICAgKGNvbnN0cnVjdG9yOiBFcnJvclN1YkNvbnN0cnVjdG9yLCBtZXNzYWdlPzogc3RyaW5nKTogVGVzdFJlZ2lzdHJhcjtcbiAgICAobWVzc2FnZTogc3RyaW5nKTogVGVzdFJlZ2lzdHJhcjtcbiAgICAoaXNDb3JyZWN0VGhyb3c6IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPik6IFRlc3RSZWdpc3RyYXI7XG4gICAgKCk6IFRlc3RSZWdpc3RyYXI7XG4gICAgPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPjtcbiAgfTtcbiAgLyoqXG4gICAqIERlbGV0ZSBzdGFjayB0cmFjZXMgKHNldHRpbmc9dHJ1ZSkuXG4gICAqIE9wdGlvbmFsbHkgcGFzcyB0aGlzIHNldHRpbmdzIHRvIGNoaWxkcmVuIChwYXNzVG9DaGlsZHJlbj10cnVlKVxuICAgKi9cbiAgZGVsZXRlU3RhY2tzKHNldHRpbmc/OiBib29sZWFuLCBwYXNzVG9DaGlsZHJlbj86IGJvb2xlYW4pOiB2b2lkO1xufTtcblxudHlwZSBUaHJvd0Rlc2NyaXB0b3IgPSB7XG4gIG1lc3NhZ2U/OiBzdHJpbmc7XG4gIGNvbnN0cnVjdGVkQnk/OiBFcnJvclN1YkNvbnN0cnVjdG9yO1xuICBwcmVkaWNhdGU/OiBQcmVkaWNhdGU8W0Vycm9yIHwgYW55XT47XG59O1xuXG5jbGFzcyBUZXN0dHNJbnRlcm5hbEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgY2F1c2U/OiBFcnJvcjtcbiAgY29uc3RydWN0b3Iod2h5OiBzdHJpbmcsIGNhdXNlPzogRXJyb3IpIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIEludGVybmFsIEVycm9yOiBcIiArIHdoeSk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG59XG5jbGFzcyBUZXN0dHNBcmd1bWVudEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgYXJnczogYW55W107XG4gIGNvbnN0cnVjdG9yKHdoeTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkge1xuICAgIHN1cGVyKFwiW3Rlc3R0c10gQXJndW1lbnQgRXJyb3I6IFwiICsgd2h5KTtcbiAgICB0aGlzLmFyZ3MgPSBhcmdzO1xuICB9XG59XG5jbGFzcyBUZXN0dHNUeXBlRXJyb3IgZXh0ZW5kcyBUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih3aHk6IHN0cmluZykge1xuICAgIHN1cGVyKFwiW3Rlc3R0c10gVHlwZSBFcnJvcjogXCIgKyB3aHkpO1xuICB9XG59XG5cbi8vIGdsb2JhbCBjb25zdGFudHNcbmNvbnN0IEFOU0lfR1JBWV9GRyA9IFwiXFx4MWJbOTBtXCI7XG5jb25zdCBBTlNJX0dSRUVOX0ZHID0gXCJcXHgxYlszMm1cIjtcbmNvbnN0IEFOU0lfUkVEX0ZHID0gXCJcXHgxYlszMW1cIjtcbmNvbnN0IEFOU0lfQ1lBTl9GRyA9IFwiXFx4MWJbMzZtXCI7XG5jb25zdCBBTlNJX1JFU0VUID0gXCJcXHgxYlswbVwiO1xuY29uc3QgVEVTVCA9IEFOU0lfR1JBWV9GRyArIFwi4pa3XCIgKyBBTlNJX1JFU0VUO1xuY29uc3QgUEFTUyA9IEFOU0lfR1JFRU5fRkcgKyBcIuKck1wiICsgQU5TSV9SRVNFVDtcbmNvbnN0IEZBSUwgPSBBTlNJX1JFRF9GRyArIFwi4pyXXCIgKyBBTlNJX1JFU0VUO1xuXG5mdW5jdGlvbiBhZGRJbmRlbnRBZnRlck5ld2xpbmVzKHN0cjogc3RyaW5nLCBzcGFjaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gc3RyLnNwbGl0KFwiXFxuXCIpLnJlZHVjZSgoYSwgdiwgaSwgXykgPT4ge1xuICAgIGlmIChpID09PSAwKSBhICs9IHY7XG4gICAgZWxzZSBpZiAoaSA9PT0gXy5sZW5ndGggLSAxKSBhICs9IFwiXFxuXCIgKyB2O1xuICAgIGVsc2UgYSArPSBcIlxcblwiICsgc3BhY2luZyArIHY7XG4gICAgcmV0dXJuIGE7XG4gIH0sIFwiXCIpO1xufVxuXG5pbnRlcmZhY2UgU3RkaW9NYW5pcHVsYXRvciB7XG4gIGluZGVudDogbnVtYmVyO1xuICBpbmRlbnROZXdsaW5lc09ubHk6IGJvb2xlYW47XG4gIHJlc2V0OiAoKSA9PiB2b2lkO1xufVxuY2xhc3MgU3RkaW9NYW5pcHVsYXRvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGNvbnN0IF9zZWxmID0gdGhpcztcbiAgICBsZXQgX3N0ZG91dCA9IHByb2Nlc3Muc3Rkb3V0LndyaXRlLmJpbmQocHJvY2Vzcy5zdGRvdXQpO1xuICAgIGxldCBfc3RkZXJyID0gcHJvY2Vzcy5zdGRlcnIud3JpdGUuYmluZChwcm9jZXNzLnN0ZG91dCk7XG4gICAgbGV0IF9pbmRlbnQgPSAwO1xuICAgIGxldCBfaW5kZW50TmV3bGluZXNPbmx5ID0gZmFsc2U7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaW5kZW50XCIsIHtcbiAgICAgIGdldDogKCkgPT4gX2luZGVudCxcbiAgICAgIHNldDogKG46IG51bWJlcikgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIG4gIT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXCJiYWQgaW5kZW50IGFzc2lnbm1lbnRcIik7XG4gICAgICAgIF9pbmRlbnQgPSBuO1xuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImluZGVudE5ld2xpbmVzT25seVwiLCB7XG4gICAgICBnZXQ6ICgpID0+IF9pbmRlbnROZXdsaW5lc09ubHksXG4gICAgICBzZXQ6IChiOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBiICE9PSBcImJvb2xlYW5cIilcbiAgICAgICAgICB0aHJvdyBuZXcgVGVzdHRzSW50ZXJuYWxFcnJvcihcImJhZCBpbmRlbnROZXdsaW5lc09ubHkgYXNzaWdubWVudFwiKTtcbiAgICAgICAgX2luZGVudE5ld2xpbmVzT25seSA9IGI7XG4gICAgICB9LFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgfSk7XG4gICAgdGhpcy5yZXNldCA9ICgpID0+IHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gX3N0ZG91dDtcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlID0gX3N0ZGVycjtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG1ha2VXcml0ZXIod3JpdGU6IHR5cGVvZiBfc3Rkb3V0IHwgdHlwZW9mIF9zdGRlcnIpIHtcbiAgICAgIHJldHVybiAoYnVmZmVyT3JTdHI6IGFueSwgY2JPckVuY29kaW5nPzogYW55LCBjYj86IGFueSk6IGJvb2xlYW4gPT4ge1xuICAgICAgICBjb25zdCBzcGFjaW5nID0gbmV3IEFycmF5KF9zZWxmLmluZGVudCkuZmlsbChcIiBcIikuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKCFfc2VsZi5pbmRlbnROZXdsaW5lc09ubHkpIHdyaXRlKHNwYWNpbmcpO1xuICAgICAgICAvLyBpZiBwcmludGluZyBhIHN0cmluZyAodGhhdCBpcyBub3Qgb25seSB3aGl0ZXNwYWNlKVxuICAgICAgICBpZiAodHlwZW9mIGJ1ZmZlck9yU3RyID09PSBcInN0cmluZ1wiICYmIGJ1ZmZlck9yU3RyLm1hdGNoKC9cXFMvKSkge1xuICAgICAgICAgIC8vIHJlcGxhY2UgYW55IG5ld2xpbmVzIHdpdGggbmwrc3BhY2VzIChleGNlcHQgZm9yIHRoZSBsYXN0IG9uZSlcbiAgICAgICAgICBidWZmZXJPclN0ciA9IGFkZEluZGVudEFmdGVyTmV3bGluZXMoYnVmZmVyT3JTdHIsIHNwYWNpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY2JPckVuY29kaW5nID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgcmV0dXJuIHdyaXRlKGJ1ZmZlck9yU3RyLCBjYk9yRW5jb2RpbmcpO1xuICAgICAgICBlbHNlIHJldHVybiB3cml0ZShidWZmZXJPclN0ciwgY2JPckVuY29kaW5nLCBjYik7XG4gICAgICB9O1xuICAgIH1cbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG1ha2VXcml0ZXIoX3N0ZG91dCk7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUgPSBtYWtlV3JpdGVyKF9zdGRlcnIpO1xuICB9XG59XG5cbi8vIG11dGFibGUgZ2xvYmFsIGRhdGFcbmNvbnN0IFNURElPX01BTklQID0gbmV3IFN0ZGlvTWFuaXB1bGF0b3IoKTtcbmNvbnN0IFRFU1RfUFJPTUlTRVM6IFdlYWtTZXQ8UHJvbWlzZTxhbnk+PiA9IG5ldyBXZWFrU2V0KCk7XG5sZXQgTl9URVNUU19QQVNTRUQgPSAwO1xubGV0IE5fVEVTVFNfRkFJTEVEID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZmluZFBhdGhzKFxuICB0ZXN0TWF0Y2hlcjogc3RyaW5nID0gXCJcXFxcLnRlc3RcXFxcLmpzJFwiXG4pOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIGNvbnN0IHJlc3VsdDogU2V0PHN0cmluZz4gPSBhd2FpdCAoYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IF8gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAvLyBjb2xsZWN0IGFueSBtYW51YWxseSBzcGVjaWZpZWQgZmlsZXMgZmlyc3RcbiAgICBmb3IgKGxldCBpID0gMjsgaSA8IHByb2Nlc3MuYXJndi5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgY3VyID0gcHJvY2Vzcy5hcmd2W2ldO1xuICAgICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgICAgZnMubHN0YXQoY3VyLCAoZXJyLCBzdGF0KSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycik7XG4gICAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBfLmFkZChwYXRoLnJlc29sdmUoY3VyKSk7XG4gICAgICAgIHByb2Nlc3MuYXJndi5zcGxpY2UoaSwgMSk7XG4gICAgICAgIC0taTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIF87XG4gIH0pKCk7XG5cbiAgLy8gZGVmaW5lIHRoZSBmaWxlIHNlYXJjaCBmdW5jdGlvblxuICBhc3luYyBmdW5jdGlvbiBzZWFyY2goY3VyOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdGF0czogZnMuU3RhdHMgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgZnMubHN0YXQoY3VyLCAoZXJyLCBzdGF0KSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpO1xuICAgICAgICBlbHNlIHJlc29sdmUoc3RhdCk7XG4gICAgICB9KVxuICAgICk7XG4gICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICBjb25zdCBuYW1lID0gcGF0aC5iYXNlbmFtZShjdXIpO1xuICAgICAgaWYgKG5hbWUubWF0Y2gobmV3IFJlZ0V4cCh0ZXN0TWF0Y2hlciwgXCJtXCIpKSkge1xuICAgICAgICByZXN1bHQuYWRkKHBhdGgucmVzb2x2ZShjdXIpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbnN0IHN1YnM6IHN0cmluZ1tdID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgICAgZnMucmVhZGRpcihjdXIsIChlcnIsIGZpbGVzKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycik7XG4gICAgICAgICAgZWxzZSByZXNvbHZlKGZpbGVzKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICBmb3IgKGNvbnN0IHMgb2Ygc3VicykgYXdhaXQgc2VhcmNoKHBhdGguam9pbihjdXIsIHMpKTtcbiAgICB9XG4gIH1cblxuICB0cnkge1xuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHByb2Nlc3MuYXJndi5zbGljZSgyKSkge1xuICAgICAgYXdhaXQgc2VhcmNoKHBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgdGFyZ2V0KSB8fCBcIi4vXCIpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBUZXN0dHNJbnRlcm5hbEVycm9yKFxuICAgICAgXCJlbmNvdW50ZXJlZCBhbiBlcnJvciB3aGlsZSBzZWFyY2hpbmcgZm9yIHRlc3RzXCIsXG4gICAgICBlXG4gICAgKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQuc2l6ZSA9PT0gMClcbiAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgIFwiY2Fubm90IGZpbmQgdGVzdHNcIixcbiAgICAgIC4uLnByb2Nlc3MuYXJndi5zbGljZSgyKVxuICAgICk7XG5cbiAgcmV0dXJuIEFycmF5LmZyb20ocmVzdWx0KTtcbn1cblxuY2xhc3MgVGVzdDxUPiB7XG4gIHB1YmxpYyBnZXQgcGFzc2VkKCkge1xuICAgIHJldHVybiB0aGlzLiNwYXNzZWQ7XG4gIH1cbiAgcHVibGljIGdldCBvbmNlUmVhZHkoKSB7XG4gICAgcmV0dXJuIHRoaXMuI29uY2VSZWFkeTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBsb2coKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGFueUNoaWxkcmVuRmFpbGVkID0gZmFsc2U7XG4gICAgaWYgKHRoaXMuI2NoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgY29uc29sZS5sb2coVEVTVCArIFwiIFwiICsgdGhpcy4jZGVzY3JpcHRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy4jcGFzc2VkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFBBU1MgKyBcIiBcIiArIHRoaXMuI2Rlc2NyaXB0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoRkFJTCArIFwiIFwiICsgdGhpcy4jZGVzY3JpcHRpb24pO1xuXG4gICAgICAgIFNURElPX01BTklQLmluZGVudCArPSAyO1xuICAgICAgICBpZiAodGhpcy4jZXJyb3IpIHtcbiAgICAgICAgICBpZiAodGhpcy4jZGVsZXRlU3RhY2tzICYmIHRoaXMuI2Vycm9yIGluc3RhbmNlb2YgRXJyb3IpXG4gICAgICAgICAgICBkZWxldGUgdGhpcy4jZXJyb3Iuc3RhY2s7XG4gICAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLiNlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuI3Rocm93cykge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHRoaXMuI3Rocm93cy5tZXNzYWdlIHx8XG4gICAgICAgICAgICB0aGlzLiN0aHJvd3MuY29uc3RydWN0ZWRCeSB8fFxuICAgICAgICAgICAgdGhpcy4jdGhyb3dzLnByZWRpY2F0ZVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd106XCIpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLiN0aHJvd3MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgU1RESU9fTUFOSVAuaW5kZW50IC09IDI7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBuQ2hpbGRyZW5CZWZvcmUgPSB0aGlzLiNjaGlsZHJlbi5sZW5ndGg7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiB0aGlzLiNjaGlsZHJlbikge1xuICAgICAgU1RESU9fTUFOSVAuaW5kZW50ICs9IDI7XG4gICAgICBhd2FpdCBjaGlsZC5vbmNlUmVhZHk7XG4gICAgICBhd2FpdCBjaGlsZC5sb2coKTtcbiAgICAgIGFueUNoaWxkcmVuRmFpbGVkID0gYW55Q2hpbGRyZW5GYWlsZWQgfHwgIWNoaWxkLnBhc3NlZDtcbiAgICAgIFNURElPX01BTklQLmluZGVudCAtPSAyO1xuICAgIH1cbiAgICBpZiAodGhpcy4jY2hpbGRyZW4ubGVuZ3RoID4gbkNoaWxkcmVuQmVmb3JlKVxuICAgICAgdGhyb3cgbmV3IFRlc3R0c1R5cGVFcnJvcihcbiAgICAgICAgXCJmb3VuZCBhIHN1YmNoaWxkIGF0dGFjaGVkIHRvIGEgbm9uLWltbWVkaWF0ZSBwYXJlbnQuLi4gXCIgK1xuICAgICAgICAgIFwiY2hlY2sgZm9yIG1pc3NpbmcgYHRlc3RgIHBhcmFtZXRlcnNcIlxuICAgICAgKTtcbiAgICBpZiAoYW55Q2hpbGRyZW5GYWlsZWQgJiYgdGhpcy4jcGFzc2VkKSB7XG4gICAgICAvLyBpZiBhbnkgY2hpbGRyZW4gZmFpbGVkIGJ1dCB0aGlzIHRlc3QgYm9keSBkaWQgbm90LCByZXBvcnQgZmFpbHVyZVxuICAgICAgLS1OX1RFU1RTX1BBU1NFRDtcbiAgICAgICsrTl9URVNUU19GQUlMRUQ7XG4gICAgICB0aGlzLiNwYXNzZWQgPSBmYWxzZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoRkFJTCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLiNjaGlsZHJlbi5sZW5ndGggJiYgIXRoaXMuI3Bhc3NlZCkge1xuICAgICAgLy8gZWxzZSBpZiB0aGVyZSB3YXMgY2hpbGQgb3V0cHV0IGZvciBhIGZhaWxlZCBwYXJlbnQsIHJlcG9ydCBmYWlsdXJlXG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShGQUlMICsgXCIgXCIpO1xuICAgICAgU1RESU9fTUFOSVAuaW5kZW50ICs9IDI7XG4gICAgICBpZiAodGhpcy4jZXJyb3IpIHtcbiAgICAgICAgU1RESU9fTUFOSVAuaW5kZW50TmV3bGluZXNPbmx5ID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLiNlcnJvcik7XG4gICAgICAgIFNURElPX01BTklQLmluZGVudE5ld2xpbmVzT25seSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuI3Rocm93cykge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgdGhpcy4jdGhyb3dzLm1lc3NhZ2UgfHxcbiAgICAgICAgICB0aGlzLiN0aHJvd3MuY29uc3RydWN0ZWRCeSB8fFxuICAgICAgICAgIHRoaXMuI3Rocm93cy5wcmVkaWNhdGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd106XCIpO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jdGhyb3dzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgU1RESU9fTUFOSVAuaW5kZW50IC09IDI7XG4gICAgfVxuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgICBib2R5OiBUZXN0Qm9keTxUPixcbiAgICBvbmRhdGE6IChkYXRhPzogVCkgPT4gdm9pZCxcbiAgICBvbmVycjogKGVycj86IGFueSkgPT4gdm9pZCxcbiAgICB0aHJvd3M/OiBUaHJvd0Rlc2NyaXB0b3IsXG4gICAgZGVsZXRlU3RhY2tzPzogYm9vbGVhblxuICApIHtcbiAgICB0aGlzLiNkZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xuICAgIHRoaXMuI3Rocm93cyA9IHRocm93cztcbiAgICB0aGlzLiNkZWxldGVTdGFja3MgPSBkZWxldGVTdGFja3M7XG4gICAgdGhpcy4jb25jZVJlYWR5ID0gbmV3IFByb21pc2U8dm9pZD4oYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJvZHkoXG4gICAgICAgICAgbWFrZUFQSSgoY2hpbGQpID0+IHRoaXMuI2NoaWxkcmVuLnB1c2goY2hpbGQpLCBkZWxldGVTdGFja3MpXG4gICAgICAgICk7XG4gICAgICAgIGlmICghdGhyb3dzKSB7XG4gICAgICAgICAgKytOX1RFU1RTX1BBU1NFRDtcbiAgICAgICAgICB0aGlzLiNwYXNzZWQgPSB0cnVlO1xuICAgICAgICAgIG9uZGF0YShyZXN1bHQpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICArK05fVEVTVFNfRkFJTEVEO1xuICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICAgIG9uZXJyKCk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMuI2Vycm9yID0gZTtcbiAgICAgICAgaWYgKHRocm93cykge1xuICAgICAgICAgIGlmICh0aHJvd3MubWVzc2FnZSB8fCB0aHJvd3MuY29uc3RydWN0ZWRCeSB8fCB0aHJvd3MucHJlZGljYXRlKSB7XG4gICAgICAgICAgICAvLyB0aHJvdyB3YXMgZGVzY3JpYmVkOyBjaGVjayB0aGUgZGVzY3JpcHRvclxuICAgICAgICAgICAgaWYgKHRocm93cy5wcmVkaWNhdGUpIHtcbiAgICAgICAgICAgICAgdGhpcy4jcGFzc2VkID0gISF0aHJvd3MucHJlZGljYXRlKGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aHJvd3MuY29uc3RydWN0ZWRCeSAmJiB0aHJvd3MubWVzc2FnZSkge1xuICAgICAgICAgICAgICB0aGlzLiNwYXNzZWQgPVxuICAgICAgICAgICAgICAgIGUgaW5zdGFuY2VvZiB0aHJvd3MuY29uc3RydWN0ZWRCeSAmJlxuICAgICAgICAgICAgICAgIGUubWVzc2FnZSA9PT0gdGhyb3dzLm1lc3NhZ2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRocm93cy5jb25zdHJ1Y3RlZEJ5KSB7XG4gICAgICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IGUgaW5zdGFuY2VvZiB0aHJvd3MuY29uc3RydWN0ZWRCeTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhyb3dzLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgdGhpcy4jcGFzc2VkID0gZS5tZXNzYWdlID09PSB0aHJvd3MubWVzc2FnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiNwYXNzZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy4jcGFzc2VkKSB7XG4gICAgICAgICAgKytOX1RFU1RTX1BBU1NFRDtcbiAgICAgICAgICBvbmRhdGEoKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKytOX1RFU1RTX0ZBSUxFRDtcbiAgICAgICAgICBvbmVycihlKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gICNkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAjZGVsZXRlU3RhY2tzPzogYm9vbGVhbjtcbiAgI3Bhc3NlZCA9IGZhbHNlO1xuICAjZXJyb3I6IGFueSB8IG51bGwgPSBudWxsO1xuICAjdGhyb3dzPzogVGhyb3dEZXNjcmlwdG9yO1xuICAjY2hpbGRyZW46IFRlc3Q8YW55PltdID0gW107XG5cbiAgI29uY2VSZWFkeTogUHJvbWlzZTx2b2lkPjtcbn1cblxuZnVuY3Rpb24gbWFrZUFQSShcbiAgcmVnaXN0ZXJDaGlsZDogPFQ+KGNoaWxkOiBUZXN0PFQ+KSA9PiB2b2lkLFxuICBkZWxldGVTdGFja3M/OiBib29sZWFuXG4pOiBUZXN0UmVnaXN0cmFyIHtcbiAgZnVuY3Rpb24gdGhyb3dzKFxuICAgIGNvbnN0cnVjdG9yOiBFcnJvclN1YkNvbnN0cnVjdG9yLFxuICAgIG1lc3NhZ2U/OiBzdHJpbmdcbiAgKTogVGVzdFJlZ2lzdHJhcjtcbiAgZnVuY3Rpb24gdGhyb3dzKG1lc3NhZ2U6IHN0cmluZyk6IFRlc3RSZWdpc3RyYXI7XG4gIGZ1bmN0aW9uIHRocm93cyhpc0NvcnJlY3RUaHJvdzogUHJlZGljYXRlPFtFcnJvclN1YiB8IGFueV0+KTogVGVzdFJlZ2lzdHJhcjtcbiAgZnVuY3Rpb24gdGhyb3dzKCk6IFRlc3RSZWdpc3RyYXI7XG4gIGZ1bmN0aW9uIHRocm93czxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD47XG4gIGZ1bmN0aW9uIHRocm93czxUPihcbiAgICB0aHJvd09yVGVzdERlc2NyPzpcbiAgICAgIHwgc3RyaW5nXG4gICAgICB8IEVycm9yU3ViQ29uc3RydWN0b3JcbiAgICAgIHwgUHJlZGljYXRlPFtFcnJvclN1YiB8IGFueV0+LFxuICAgIG1lc3NhZ2VPckJvZHk/OiBzdHJpbmcgfCBUZXN0Qm9keTxUPlxuICApIHtcbiAgICBpZiAoIXRocm93T3JUZXN0RGVzY3IgJiYgIW1lc3NhZ2VPckJvZHkpIHtcbiAgICAgIC8vIGlmIG5vIGFyZ3VtZW50cyB3ZXJlIHByb3ZpZGVkLCBzaW1wbHkgY3JlYXRlIGEgdGVzdCBleHBlY3RpbmcgdGhyb3dcbiAgICAgIHJldHVybiBnZW5UZXN0Rm4oe30pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRocm93T3JUZXN0RGVzY3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIC8vIGlmIGFyZzAgaXMgYSBzdHJpbmcsIGl0IGlzIGVpdGhlciBhbiBlcnJvciBtZXNzYWdlIG9yIHRlc3QgZGVzY3JpcHRpb25cbiAgICAgIGlmICh0eXBlb2YgbWVzc2FnZU9yQm9keSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIC8vIGFyZzAgaXMgYSB0ZXN0IGRlc2NyaXB0aW9uOyBhcmcxIGlzIGEgdGVzdCBib2R5XG4gICAgICAgIHJldHVybiBnZW5UZXN0Rm4oe30pKHRocm93T3JUZXN0RGVzY3IsIG1lc3NhZ2VPckJvZHkpO1xuICAgICAgfSBlbHNlIGlmIChtZXNzYWdlT3JCb2R5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gYXJnMCBpcyBhIG1lc3NhZ2U7IGFyZzEgaXMgdW51c2VkXG4gICAgICAgIHJldHVybiBnZW5UZXN0Rm4oeyBtZXNzYWdlOiB0aHJvd09yVGVzdERlc2NyIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgXCJ0ZXN0LnRocm93cyByZXF1aXJlcyBhIG5ldyB0ZXN0IGJvZHkgYXMgaXRzIHNlY29uZCBhcmd1bWVudCBpZiB0aGUgXCIgK1xuICAgICAgICAgICAgXCJmaXJzdCBhcmd1bWVudCBpcyBhIHN0cmluZ1wiLFxuICAgICAgICAgIHRocm93T3JUZXN0RGVzY3IsXG4gICAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRocm93T3JUZXN0RGVzY3IgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgLy8gaWYgYXJnMCBpcyBhIGZ1bmN0aW9uLCBpdCBpcyBlaXRoZXIgYSB0aHJvdyBwcmVkaWNhdGUgb3IgY29uc3RydWN0b3JcbiAgICAgIGlmIChcbiAgICAgICAgdGhyb3dPclRlc3REZXNjciA9PT0gRXJyb3IgfHxcbiAgICAgICAgdGhyb3dPclRlc3REZXNjci5wcm90b3R5cGUgaW5zdGFuY2VvZiBFcnJvclxuICAgICAgKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZU9yQm9keSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIC8vIGFyZzAgaXMgYW4gZXJyb3IgY29uc3RydWN0b3I7IGFyZzEgYW4gZXJyb3IgbWVzc2FnZVxuICAgICAgICAgIHJldHVybiBnZW5UZXN0Rm4oe1xuICAgICAgICAgICAgY29uc3RydWN0ZWRCeTogdGhyb3dPclRlc3REZXNjciBhcyBFcnJvclN1YkNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZU9yQm9keSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlT3JCb2R5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBhcmcwIGlzIGFuIGVycm9yIGNvbnN0cnVjdG9yOyBhcmcxIGlzIHVudXNlZFxuICAgICAgICAgIHJldHVybiBnZW5UZXN0Rm4oe1xuICAgICAgICAgICAgY29uc3RydWN0ZWRCeTogdGhyb3dPclRlc3REZXNjciBhcyBFcnJvclN1YkNvbnN0cnVjdG9yLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgICAgXCJ0ZXN0LnRocm93cyByZXF1aXJlcyBlaXRoZXIgYW4gZXJyb3IgbWVzc2FnZSBvciBhIG5ldyB0ZXN0IGJvZHkgXCIgK1xuICAgICAgICAgICAgICBcImFzIGl0cyBzZWNvbmQgYXJndW1lbnRcIixcbiAgICAgICAgICAgIHRocm93T3JUZXN0RGVzY3IsXG4gICAgICAgICAgICBtZXNzYWdlT3JCb2R5XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VPckJvZHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIGFyZzAgaXMgYW4gZXJyb3IgcHJlZGljYXRlOyBhcmcxIGlzIHVudXNlZFxuICAgICAgICAgIHJldHVybiBnZW5UZXN0Rm4oe1xuICAgICAgICAgICAgcHJlZGljYXRlOiB0aHJvd09yVGVzdERlc2NyIGFzIFByZWRpY2F0ZTxbRXJyb3IgfCBhbnldPixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgYW4gZW1wdHkgc2Vjb25kIGFyZ3VtZW50IGlmIHRoZSBmaXJzdCBpcyBhIFwiICtcbiAgICAgICAgICAgICAgXCJ0aHJvdyBwcmVkaWNhdGUgKGEgZnVuY3Rpb24gdGhhdCBkb2VzIG5vdCBjb25zdHJ1Y3QgRXJyb3JzKVwiLFxuICAgICAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UsIGVycm9yIGNvbnN0cnVjdG9yLCBwcmVkaWNhdGUsIFwiICtcbiAgICAgICAgICBcIm9yIG5ldyB0ZXN0IGRlc2NyaXB0aW9uIGFzIGl0cyBmaXJzdCBhcmd1bWVudFwiLFxuICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICBtZXNzYWdlT3JCb2R5XG4gICAgICApO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBnZW5UZXN0Rm4oZXhwZWN0ZWRUaHJvdz86IFRocm93RGVzY3JpcHRvcikge1xuICAgIGxldCBwYXNzRGVsZXRlU3RhY2tzID0gdHJ1ZTtcbiAgICBjb25zdCB0ZXN0ID0gPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBpZiAodHlwZW9mIGJvZHkgIT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgXCJ0ZXN0cyB3aXRoIGRlc2NyaXB0aW9ucyByZXF1aXJlIGEgdGVzdCBib2R5XCJcbiAgICAgICAgKTtcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbjogUHJvbWlzZTxUPiA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgdCA9IG5ldyBUZXN0KFxuICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgIGJvZHksXG4gICAgICAgICAgcmVzb2x2ZSBhcyAoZGF0YT86IFQpID0+IHZvaWQsXG4gICAgICAgICAgcmVqZWN0LFxuICAgICAgICAgIGV4cGVjdGVkVGhyb3csXG4gICAgICAgICAgcGFzc0RlbGV0ZVN0YWNrcyA/IGRlbGV0ZVN0YWNrcyA6IGZhbHNlXG4gICAgICAgICk7XG4gICAgICAgIHJlZ2lzdGVyQ2hpbGQodCk7XG4gICAgICB9KTtcbiAgICAgIFRFU1RfUFJPTUlTRVMuYWRkKGV4ZWN1dGlvbik7XG4gICAgICByZXR1cm4gZXhlY3V0aW9uO1xuICAgIH07XG4gICAgdGVzdC50aHJvd3MgPSB0aHJvd3M7XG4gICAgdGVzdC5kZWxldGVTdGFja3MgPSAoc2V0dGluZyA9IHRydWUsIHBhc3NUb0NoaWxkcmVuID0gdHJ1ZSkgPT4ge1xuICAgICAgZGVsZXRlU3RhY2tzID0gc2V0dGluZztcbiAgICAgIHBhc3NEZWxldGVTdGFja3MgPSBwYXNzVG9DaGlsZHJlbjtcbiAgICB9O1xuICAgIHJldHVybiB0ZXN0O1xuICB9XG4gIHJldHVybiBnZW5UZXN0Rm4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2xvYmFsVGVzdExhdW5jaGVyKCkge1xuICAvLyBjYXRjaCBhbnkgdW5oYW5kbGVkIHJlamVjdGlvbnMgdGhyb3duIGJ5IHRlc3RzXG4gIHByb2Nlc3MuYWRkTGlzdGVuZXIoXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgKGRldGFpbHMsIHByb21pc2UpID0+IHtcbiAgICAvLyBvbmx5IGxvZyB1bmhhbmRsZWQgcmVqZWN0aW9ucyBpZiB0aGV5IGRvbid0IGRpcmVjdGx5IGJlbG9uZyB0byBhIHRlc3RcbiAgICBpZiAoIVRFU1RfUFJPTUlTRVMuaGFzKHByb21pc2UpKSB7XG4gICAgICBTVERJT19NQU5JUC5yZXNldCgpO1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbdGVzdHRzXSBFcnJvcjogVW5oYW5kbGVkIHByb21pc2UgcmVqZWN0aW9uLiBFeGl0aW5nLiBTZWUgYmVsb3c6XCJcbiAgICAgICk7XG4gICAgICBjb25zb2xlLmVycm9yKGRldGFpbHMpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc2hpZnQgYWxsIHRlc3Qgb3V0cHV0IGJ5IDFcbiAgU1RESU9fTUFOSVAuaW5kZW50ID0gMTtcblxuICAvLyBjaGVjayBmb3Igb3B0aW9uc1xuICBsZXQgbWF0Y2hlcjogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMjsgaSA8IHByb2Nlc3MuYXJndi5sZW5ndGggLSAxOyArK2kpIHtcbiAgICBpZiAoXG4gICAgICBwcm9jZXNzLmFyZ3ZbaV0udHJpbSgpID09PSBcIi0tbWF0Y2hcIiB8fFxuICAgICAgcHJvY2Vzcy5hcmd2W2ldLnRyaW0oKSA9PT0gXCItbVwiXG4gICAgKSB7XG4gICAgICBtYXRjaGVyID0gcHJvY2Vzcy5hcmd2W2kgKyAxXTtcbiAgICAgIHByb2Nlc3MuYXJndi5zcGxpY2UoaSwgMik7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcGF0aHMgPSBhd2FpdCBmaW5kUGF0aHMobWF0Y2hlcik7XG5cbiAgY29uc3Qgc2V0dGluZ3M6IFNldHRpbmdzID0gKCgpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbyA9IHJlcXVpcmUocGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwiLi8udGVzdHRzLmpzb25cIikpO1xuICAgICAgby5wcmlvcml0aXplZCA9ICg8U2V0dGluZ3M+bykucHJpb3JpdGl6ZWRcbiAgICAgICAgLm1hcCgocCkgPT4gcGF0aC5yZXNvbHZlKHApKVxuICAgICAgICAuZmlsdGVyKChwKSA9PiBwYXRocy5pbmNsdWRlcyhwKSk7XG4gICAgICByZXR1cm4gbztcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4geyBwcmlvcml0aXplZDogW10gfTtcbiAgICB9XG4gIH0pKCk7XG5cbiAgLy8gaGFuZGxlIGFsbCBwcmlvcml0aXplZCBmaWxlIHRlc3RzIHNlcGFyYXRlbHksIGFuZCBpbmRpdmlkdWFsbHlcbiAgZm9yIChjb25zdCBwIG9mIHNldHRpbmdzLnByaW9yaXRpemVkKSB7XG4gICAgY29uc3QgdCA9IG5ldyBUZXN0KFxuICAgICAgQU5TSV9DWUFOX0ZHICsgcGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBwKSArIEFOU0lfUkVTRVQsXG4gICAgICAodGVzdCkgPT4ge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgICB0ZXN0LFxuICAgICAgICB9O1xuICAgICAgICByZXF1aXJlKHApO1xuICAgICAgfSxcbiAgICAgICgpID0+IHt9LFxuICAgICAgKCkgPT4ge31cbiAgICApO1xuICAgIGF3YWl0IHQub25jZVJlYWR5O1xuICAgIGF3YWl0IHQubG9nKCk7XG4gIH1cblxuICAvLyBjb2xsZWN0IGFsbCBub24tcHJpb3JpdGl6ZWQgZmlsZSB0ZXN0cywgdHJpZ2dlcmluZyBmaWxlIGV4ZWN1dGlvbi5cbiAgLy8gaWYgYXN5bmNocm9ub3VzLCBpbml0aWF0ZXMgYWxsIHRvcC1sZXZlbCBhc3luYyBvcGVyYXRpb25zIGJlZm9yZSBhd2FpdGluZ1xuICBjb25zdCBub25Qcmlvcml0aXplZDogVGVzdDx2b2lkPltdID0gW107XG5cbiAgZm9yIChjb25zdCBwIG9mIHBhdGhzKSB7XG4gICAgaWYgKHNldHRpbmdzLnByaW9yaXRpemVkLmluY2x1ZGVzKHApKSBjb250aW51ZTtcbiAgICBub25Qcmlvcml0aXplZC5wdXNoKFxuICAgICAgbmV3IFRlc3QoXG4gICAgICAgIEFOU0lfQ1lBTl9GRyArIHBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcCkgKyBBTlNJX1JFU0VULFxuICAgICAgICAodGVzdCkgPT4ge1xuICAgICAgICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICAgICAgdGVzdCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJlcXVpcmUocCk7XG4gICAgICAgIH0sXG4gICAgICAgICgpID0+IHt9LFxuICAgICAgICAoKSA9PiB7fVxuICAgICAgKVxuICAgICk7XG4gIH1cbiAgLy8gYXdhaXQgYW5kIGxvZyBhbGwgb2YgdGhlIHRlc3RzXG4gIGZvciAoY29uc3QgdCBvZiBub25Qcmlvcml0aXplZCkge1xuICAgIGF3YWl0IHQub25jZVJlYWR5O1xuICAgIGF3YWl0IHQubG9nKCk7XG4gIH1cbn1cblxuaWYgKHByb2Nlc3MuYXJndi5sZW5ndGggPj0gMykge1xuICBnbG9iYWxUZXN0TGF1bmNoZXIoKVxuICAgIC50aGVuKCgpID0+IHtcbiAgICAgIFNURElPX01BTklQLnJlc2V0KCk7XG4gICAgICBpZiAoTl9URVNUU19GQUlMRUQpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICBcIlxcblwiICtcbiAgICAgICAgICAgIEFOU0lfUkVEX0ZHICtcbiAgICAgICAgICAgIFwicGFzc2VkIFtcIiArXG4gICAgICAgICAgICBOX1RFU1RTX1BBU1NFRCArXG4gICAgICAgICAgICBcIi9cIiArXG4gICAgICAgICAgICAoTl9URVNUU19QQVNTRUQgKyBOX1RFU1RTX0ZBSUxFRCkgK1xuICAgICAgICAgICAgXCJdIHRlc3RzXCIgK1xuICAgICAgICAgICAgQU5TSV9SRVNFVFxuICAgICAgICApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIFwiXFxuXCIgK1xuICAgICAgICAgICAgQU5TSV9HUkVFTl9GRyArXG4gICAgICAgICAgICBcInBhc3NlZCBbXCIgK1xuICAgICAgICAgICAgTl9URVNUU19QQVNTRUQgK1xuICAgICAgICAgICAgXCIvXCIgK1xuICAgICAgICAgICAgKE5fVEVTVFNfUEFTU0VEICsgTl9URVNUU19GQUlMRUQpICtcbiAgICAgICAgICAgIFwiXSB0ZXN0c1wiICtcbiAgICAgICAgICAgIEFOU0lfUkVTRVRcbiAgICAgICAgKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKChlKSA9PiB7XG4gICAgICBTVERJT19NQU5JUC5yZXNldCgpO1xuICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICB9KTtcbn1cbiJdfQ==