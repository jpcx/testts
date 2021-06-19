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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9DQSx5QkFBeUI7QUFDekIsNkJBQTZCO0FBb0Q3QixNQUFNLG1CQUFvQixTQUFRLEtBQUs7SUFFckMsWUFBWSxHQUFXLEVBQUUsS0FBYTtRQUNwQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxtQkFBb0IsU0FBUSxLQUFLO0lBRXJDLFlBQVksR0FBVyxFQUFFLEdBQUcsSUFBVztRQUNyQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxlQUFnQixTQUFRLFNBQVM7SUFDckMsWUFBWSxHQUFXO1FBQ3JCLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFHRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDO0FBQ2pDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDO0FBQzdCLE1BQU0sSUFBSSxHQUFHLFlBQVksR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzlDLE1BQU0sSUFBSSxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBRTVDLFNBQVMsc0JBQXNCLENBQUMsR0FBVyxFQUFFLE9BQWU7SUFDMUQs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QUMsQ0FBQyxDQUFDO0NBQ04iLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKioqKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqXG4gKioqICAgICAgICAgICAgICBfICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiogICAgICAgICAgICAgIDpwICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6cCAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICAgICAgICAgICAgICAgICAgICAgICAgICBfICAgICA6eCAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAub3hveG94cCAgICAgICAgICAuOm94byAgICAgIDpwICAgOm94b3hveHAgLjpveG8gICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgIDp4b3hveG94ICAub3ggICAgIC54ICBveG8gcCAgIDp4ICA6eG94b3hveCAueCAgb3hvIHAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpkICAgLnggb3hvICAgIDpvLCAgYHhvYCAub3hveG94cCA6ZCAgICA6bywgIGB4b2AgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICAubyAgIHhveCAgOnhveCAgICAgIDp4b3hveG94ICA6eCAgIDp4b3ggICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpvICA6eCAgICBveG8gICA6b3ggICAgICAgIDpkICAgICA6byAgICAgOm94ICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICA6b3hveG94byAgICAgIDp4byAgICAgIDp4ICAgICA6eCAgICAgICA6eG8gICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpvICA6b3hveG94ICAgICAgICAgOm94ICAgIDpvICAgICA6byAgICAgICAgIDpveCAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDp4ICA6eCwgICAgICAgIC5veCwgIDpvICAgIDp4ICAgICA6eCAgICAub3gsICA6byAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgIDpxLCA6b3gsICAgLnggZCd4b3hvIHhgICAgIDpvICAgICA6cSwgIGQneG94byB4YCAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICc6eCAgOnhveG94b2AgICAgLm94b2AgICAgIDpxLCAgICAnOnggICAgIC5veG9gICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgIDp4b3hvYCAgICAgICAgICAgICAgICc6eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgQGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2pwY3gvdGVzdHRzICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgQGxpY2Vuc2UgTEdQTC0zLjAtb3ItbGF0ZXIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgQGNvcHlyaWdodCAoQykgMjAyMSBKdXN0aW4gQ29sbGllciA8bUBqcGN4LmRldj4gICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSAgICAqXG4gKiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyAgICAgICAgICAqXG4gKiAgICBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgICAgICAqXG4gKiAgICBMaWNlbnNlLCBvciAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLiAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgICAgICAgICAqXG4gKiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW50ZXJuYWxpZWQgd2FycmFudHkgb2YgICAgICAqXG4gKiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlICAgICAgICAgICAqXG4gKiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy4gICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlICoqXG4gKiAgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uICBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LiAgKioqXG4gKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqKioqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IHR5cGUgVGVzdEJvZHk8VD4gPSAodGVzdDogVGVzdFJlZ2lzdHJhcikgPT4gVHxQcm9taXNlPFQ+O1xuZXhwb3J0IHR5cGUgUHJlZGljYXRlPFQgZXh0ZW5kcyBBcnJheTxhbnk+PiA9ICguLi5hcmdzOiBUKSA9PiBhbnk7XG5cbi8qKiB0ZXN0dHMgY29uZmlndXJhdGlvbiBmaWxlIHR5cGUgKGZyb20gYC50ZXN0dHMuanNvbmAgaW4gY3dkKSAqL1xuZXhwb3J0IHR5cGUgU2V0dGluZ3MgPSB7XG4gIC8qKlxuICAgKiBBIGxpc3Qgb2YgcGF0aHMgdG8gcHJpb3JpdGl6ZS5cbiAgICogRWFjaCBwcmlvcml0aXplZCB0ZXN0IGZpbGUgZXhlY3V0ZXMgYmVmb3JlIGFsbCBvdGhlciB0ZXN0cy5cbiAgICogRXhlY3V0aW9uIG9yZGVyIGZvbGxvd3MgYXJyYXkgb3JkZXIuXG4gICAqL1xuICBwcmlvcml0aXplZDogc3RyaW5nW107XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3ViIGV4dGVuZHMgRXJyb3Ige31cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdWJDb25zdHJ1Y3RvciB7XG4gIG5ldyAoLi4uYXJnczogYW55W10pOiBFcnJvclN1YjtcbiAgcHJvdG90eXBlOiBFcnJvclN1Yjtcbn1cblxuLyoqIFJlZ2lzdGVycyBhIG5ldyB0ZXN0LiAgKi9cbmV4cG9ydCB0eXBlIFRlc3RSZWdpc3RyYXIgPSB0eXBlb2YgdGVzdDtcbi8qKiBSZWdpc3RlcnMgYSBuZXcgdGVzdC4gICovXG5leHBvcnQgZGVjbGFyZSBjb25zdCB0ZXN0OiB7XG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBuZXcgdGVzdC5cbiAgICogQHBhcmFtICAgIGRlc2NyaXB0aW9uICAtIGFueSBzdHJpbmcgZGVzY3JpcHRpb24gdG8gZGVzY3JpYmUgdGhlIHRlc3QuXG4gICAqIEBwYXJhbSAgICBib2R5ICAgICAgICAgLSBleGVjdXRpb24gYm9keSB0aGF0IHNob3VsZCB0aHJvdyBvbiBmYWlsdXJlLlxuICAgKi9cbiAgPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPjtcbiAgLyoqIERlc2NyaWJlIGFuIGV4cGVjdGVkIHRocm93ICovXG4gIHRocm93czoge1xuICAgIChjb25zdHJ1Y3RvcjogRXJyb3JTdWJDb25zdHJ1Y3RvciwgbWVzc2FnZT86IHN0cmluZyk6IFRlc3RSZWdpc3RyYXI7XG4gICAgKG1lc3NhZ2U6IHN0cmluZyk6IFRlc3RSZWdpc3RyYXI7XG4gICAgKGlzQ29ycmVjdFRocm93OiBQcmVkaWNhdGU8W0Vycm9yU3ViIHwgYW55XT4pOiBUZXN0UmVnaXN0cmFyO1xuICAgICgpOiBUZXN0UmVnaXN0cmFyO1xuICAgIDxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD47XG4gIH07XG4gIC8qKlxuICAgKiBEZWxldGUgc3RhY2sgdHJhY2VzIChzZXR0aW5nPXRydWUpLlxuICAgKiBPcHRpb25hbGx5IHBhc3MgdGhpcyBzZXR0aW5ncyB0byBjaGlsZHJlbiAocGFzc1RvQ2hpbGRyZW49dHJ1ZSlcbiAgICovXG4gIGRlbGV0ZVN0YWNrcyhzZXR0aW5nPzogYm9vbGVhbiwgcGFzc1RvQ2hpbGRyZW4/OiBib29sZWFuKTogdm9pZDtcbn07XG5cbnR5cGUgVGhyb3dEZXNjcmlwdG9yID0ge1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBjb25zdHJ1Y3RlZEJ5PzogRXJyb3JTdWJDb25zdHJ1Y3RvcjtcbiAgcHJlZGljYXRlPzogUHJlZGljYXRlPFtFcnJvciB8IGFueV0+O1xufTtcblxuY2xhc3MgVGVzdHRzSW50ZXJuYWxFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcHVibGljIGNhdXNlPzogRXJyb3I7XG4gIGNvbnN0cnVjdG9yKHdoeTogc3RyaW5nLCBjYXVzZT86IEVycm9yKSB7XG4gICAgc3VwZXIoXCJbdGVzdHRzXSBJbnRlcm5hbCBFcnJvcjogXCIgKyB3aHkpO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuY2xhc3MgVGVzdHRzQXJndW1lbnRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcHVibGljIGFyZ3M6IGFueVtdO1xuICBjb25zdHJ1Y3Rvcih3aHk6IHN0cmluZywgLi4uYXJnczogYW55W10pIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIEFyZ3VtZW50IEVycm9yOiBcIiArIHdoeSk7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgfVxufVxuY2xhc3MgVGVzdHRzVHlwZUVycm9yIGV4dGVuZHMgVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3Iod2h5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIFR5cGUgRXJyb3I6IFwiICsgd2h5KTtcbiAgfVxufVxuXG4vLyBnbG9iYWwgY29uc3RhbnRzXG5jb25zdCBBTlNJX0dSQVlfRkcgPSBcIlxceDFiWzkwbVwiO1xuY29uc3QgQU5TSV9HUkVFTl9GRyA9IFwiXFx4MWJbMzJtXCI7XG5jb25zdCBBTlNJX1JFRF9GRyA9IFwiXFx4MWJbMzFtXCI7XG5jb25zdCBBTlNJX0NZQU5fRkcgPSBcIlxceDFiWzM2bVwiO1xuY29uc3QgQU5TSV9SRVNFVCA9IFwiXFx4MWJbMG1cIjtcbmNvbnN0IFRFU1QgPSBBTlNJX0dSQVlfRkcgKyBcIuKWt1wiICsgQU5TSV9SRVNFVDtcbmNvbnN0IFBBU1MgPSBBTlNJX0dSRUVOX0ZHICsgXCLinJNcIiArIEFOU0lfUkVTRVQ7XG5jb25zdCBGQUlMID0gQU5TSV9SRURfRkcgKyBcIuKcl1wiICsgQU5TSV9SRVNFVDtcblxuZnVuY3Rpb24gYWRkSW5kZW50QWZ0ZXJOZXdsaW5lcyhzdHI6IHN0cmluZywgc3BhY2luZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0ci5zcGxpdChcIlxcblwiKS5yZWR1Y2UoKGEsIHYsIGksIF8pID0+IHtcbiAgICBpZiAoaSA9PT0gMCkgYSArPSB2O1xuICAgIGVsc2UgaWYgKGkgPT09IF8ubGVuZ3RoIC0gMSkgYSArPSBcIlxcblwiICsgdjtcbiAgICBlbHNlIGEgKz0gXCJcXG5cIiArIHNwYWNpbmcgKyB2O1xuICAgIHJldHVybiBhO1xuICB9LCBcIlwiKTtcbn1cblxuaW50ZXJmYWNlIFN0ZGlvTWFuaXB1bGF0b3Ige1xuICBpbmRlbnQ6IG51bWJlcjtcbiAgaW5kZW50TmV3bGluZXNPbmx5OiBib29sZWFuO1xuICByZXNldDogKCkgPT4gdm9pZDtcbn1cbmNsYXNzIFN0ZGlvTWFuaXB1bGF0b3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBjb25zdCBfc2VsZiA9IHRoaXM7XG4gICAgbGV0IF9zdGRvdXQgPSBwcm9jZXNzLnN0ZG91dC53cml0ZS5iaW5kKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICBsZXQgX3N0ZGVyciA9IHByb2Nlc3Muc3RkZXJyLndyaXRlLmJpbmQocHJvY2Vzcy5zdGRvdXQpO1xuICAgIGxldCBfaW5kZW50ID0gMDtcbiAgICBsZXQgX2luZGVudE5ld2xpbmVzT25seSA9IGZhbHNlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImluZGVudFwiLCB7XG4gICAgICBnZXQ6ICgpID0+IF9pbmRlbnQsXG4gICAgICBzZXQ6IChuOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBuICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgIHRocm93IG5ldyBUZXN0dHNJbnRlcm5hbEVycm9yKFwiYmFkIGluZGVudCBhc3NpZ25tZW50XCIpO1xuICAgICAgICBfaW5kZW50ID0gbjtcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpbmRlbnROZXdsaW5lc09ubHlcIiwge1xuICAgICAgZ2V0OiAoKSA9PiBfaW5kZW50TmV3bGluZXNPbmx5LFxuICAgICAgc2V0OiAoYjogbnVtYmVyKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgYiAhPT0gXCJib29sZWFuXCIpXG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXCJiYWQgaW5kZW50TmV3bGluZXNPbmx5IGFzc2lnbm1lbnRcIik7XG4gICAgICAgIF9pbmRlbnROZXdsaW5lc09ubHkgPSBiO1xuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuICAgIHRoaXMucmVzZXQgPSAoKSA9PiB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IF9zdGRvdXQ7XG4gICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZSA9IF9zdGRlcnI7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBtYWtlV3JpdGVyKHdyaXRlOiB0eXBlb2YgX3N0ZG91dCB8IHR5cGVvZiBfc3RkZXJyKSB7XG4gICAgICByZXR1cm4gKGJ1ZmZlck9yU3RyOiBhbnksIGNiT3JFbmNvZGluZz86IGFueSwgY2I/OiBhbnkpOiBib29sZWFuID0+IHtcbiAgICAgICAgY29uc3Qgc3BhY2luZyA9IG5ldyBBcnJheShfc2VsZi5pbmRlbnQpLmZpbGwoXCIgXCIpLmpvaW4oXCJcIik7XG4gICAgICAgIGlmICghX3NlbGYuaW5kZW50TmV3bGluZXNPbmx5KSB3cml0ZShzcGFjaW5nKTtcbiAgICAgICAgLy8gaWYgcHJpbnRpbmcgYSBzdHJpbmcgKHRoYXQgaXMgbm90IG9ubHkgd2hpdGVzcGFjZSlcbiAgICAgICAgaWYgKHR5cGVvZiBidWZmZXJPclN0ciA9PT0gXCJzdHJpbmdcIiAmJiBidWZmZXJPclN0ci5tYXRjaCgvXFxTLykpIHtcbiAgICAgICAgICAvLyByZXBsYWNlIGFueSBuZXdsaW5lcyB3aXRoIG5sK3NwYWNlcyAoZXhjZXB0IGZvciB0aGUgbGFzdCBvbmUpXG4gICAgICAgICAgYnVmZmVyT3JTdHIgPSBhZGRJbmRlbnRBZnRlck5ld2xpbmVzKGJ1ZmZlck9yU3RyLCBzcGFjaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNiT3JFbmNvZGluZyA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICAgIHJldHVybiB3cml0ZShidWZmZXJPclN0ciwgY2JPckVuY29kaW5nKTtcbiAgICAgICAgZWxzZSByZXR1cm4gd3JpdGUoYnVmZmVyT3JTdHIsIGNiT3JFbmNvZGluZywgY2IpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSBtYWtlV3JpdGVyKF9zdGRvdXQpO1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlID0gbWFrZVdyaXRlcihfc3RkZXJyKTtcbiAgfVxufVxuXG4vLyBtdXRhYmxlIGdsb2JhbCBkYXRhXG5jb25zdCBTVERJT19NQU5JUCA9IG5ldyBTdGRpb01hbmlwdWxhdG9yKCk7XG5jb25zdCBURVNUX1BST01JU0VTOiBXZWFrU2V0PFByb21pc2U8YW55Pj4gPSBuZXcgV2Vha1NldCgpO1xubGV0IE5fVEVTVFNfUEFTU0VEID0gMDtcbmxldCBOX1RFU1RTX0ZBSUxFRCA9IDA7XG5cbmFzeW5jIGZ1bmN0aW9uIGZpbmRQYXRocyhcbiAgdGVzdE1hdGNoZXI6IHN0cmluZyA9IFwiXFxcXC50ZXN0XFxcXC5qcyRcIlxuKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBjb25zdCByZXN1bHQ6IFNldDxzdHJpbmc+ID0gYXdhaXQgKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBfID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgLy8gY29sbGVjdCBhbnkgbWFudWFsbHkgc3BlY2lmaWVkIGZpbGVzIGZpcnN0XG4gICAgZm9yIChsZXQgaSA9IDI7IGkgPCBwcm9jZXNzLmFyZ3YubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IGN1ciA9IHByb2Nlc3MuYXJndltpXTtcbiAgICAgIGNvbnN0IHN0YXRzOiBmcy5TdGF0cyA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG4gICAgICAgIGZzLmxzdGF0KGN1ciwgKGVyciwgc3RhdCkgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpO1xuICAgICAgICAgIGVsc2UgcmVzb2x2ZShzdGF0KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgXy5hZGQocGF0aC5yZXNvbHZlKGN1cikpO1xuICAgICAgICBwcm9jZXNzLmFyZ3Yuc3BsaWNlKGksIDEpO1xuICAgICAgICAtLWk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBfO1xuICB9KSgpO1xuXG4gIC8vIGRlZmluZSB0aGUgZmlsZSBzZWFyY2ggZnVuY3Rpb25cbiAgYXN5bmMgZnVuY3Rpb24gc2VhcmNoKGN1cjogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgIGZzLmxzdGF0KGN1ciwgKGVyciwgc3RhdCkgPT4ge1xuICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgfSlcbiAgICApO1xuICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHBhdGguYmFzZW5hbWUoY3VyKTtcbiAgICAgIGlmIChuYW1lLm1hdGNoKG5ldyBSZWdFeHAodGVzdE1hdGNoZXIsIFwibVwiKSkpIHtcbiAgICAgICAgcmVzdWx0LmFkZChwYXRoLnJlc29sdmUoY3VyKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBzdWJzOiBzdHJpbmdbXSA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG4gICAgICAgIGZzLnJlYWRkaXIoY3VyLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpO1xuICAgICAgICAgIGVsc2UgcmVzb2x2ZShmaWxlcyk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnMpIGF3YWl0IHNlYXJjaChwYXRoLmpvaW4oY3VyLCBzKSk7XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICBmb3IgKGNvbnN0IHRhcmdldCBvZiBwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpIHtcbiAgICAgIGF3YWl0IHNlYXJjaChwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRhcmdldCkgfHwgXCIuL1wiKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgVGVzdHRzSW50ZXJuYWxFcnJvcihcbiAgICAgIFwiZW5jb3VudGVyZWQgYW4gZXJyb3Igd2hpbGUgc2VhcmNoaW5nIGZvciB0ZXN0c1wiLFxuICAgICAgZVxuICAgICk7XG4gIH1cblxuICBpZiAocmVzdWx0LnNpemUgPT09IDApXG4gICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICBcImNhbm5vdCBmaW5kIHRlc3RzXCIsXG4gICAgICAuLi5wcm9jZXNzLmFyZ3Yuc2xpY2UoMilcbiAgICApO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKHJlc3VsdCk7XG59XG5cbmNsYXNzIFRlc3Q8VD4ge1xuICBwdWJsaWMgZ2V0IHBhc3NlZCgpIHtcbiAgICByZXR1cm4gdGhpcy4jcGFzc2VkO1xuICB9XG4gIHB1YmxpYyBnZXQgb25jZVJlYWR5KCkge1xuICAgIHJldHVybiB0aGlzLiNvbmNlUmVhZHk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgbG9nKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxldCBhbnlDaGlsZHJlbkZhaWxlZCA9IGZhbHNlO1xuICAgIGlmICh0aGlzLiNjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGNvbnNvbGUubG9nKFRFU1QgKyBcIiBcIiArIHRoaXMuI2Rlc2NyaXB0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuI3Bhc3NlZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhQQVNTICsgXCIgXCIgKyB0aGlzLiNkZXNjcmlwdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKEZBSUwgKyBcIiBcIiArIHRoaXMuI2Rlc2NyaXB0aW9uKTtcblxuICAgICAgICBTVERJT19NQU5JUC5pbmRlbnQgKz0gMjtcbiAgICAgICAgaWYgKHRoaXMuI2Vycm9yKSB7XG4gICAgICAgICAgaWYgKHRoaXMuI2RlbGV0ZVN0YWNrcyAmJiB0aGlzLiNlcnJvciBpbnN0YW5jZW9mIEVycm9yKVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuI2Vycm9yLnN0YWNrO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLiN0aHJvd3MpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0aGlzLiN0aHJvd3MubWVzc2FnZSB8fFxuICAgICAgICAgICAgdGhpcy4jdGhyb3dzLmNvbnN0cnVjdGVkQnkgfHxcbiAgICAgICAgICAgIHRoaXMuI3Rocm93cy5wcmVkaWNhdGVcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbZXhwZWN0ZWQgdGhyb3ddOlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jdGhyb3dzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd11cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFNURElPX01BTklQLmluZGVudCAtPSAyO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgbkNoaWxkcmVuQmVmb3JlID0gdGhpcy4jY2hpbGRyZW4ubGVuZ3RoO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgdGhpcy4jY2hpbGRyZW4pIHtcbiAgICAgIFNURElPX01BTklQLmluZGVudCArPSAyO1xuICAgICAgYXdhaXQgY2hpbGQub25jZVJlYWR5O1xuICAgICAgYXdhaXQgY2hpbGQubG9nKCk7XG4gICAgICBhbnlDaGlsZHJlbkZhaWxlZCA9IGFueUNoaWxkcmVuRmFpbGVkIHx8ICFjaGlsZC5wYXNzZWQ7XG4gICAgICBTVERJT19NQU5JUC5pbmRlbnQgLT0gMjtcbiAgICB9XG4gICAgaWYgKHRoaXMuI2NoaWxkcmVuLmxlbmd0aCA+IG5DaGlsZHJlbkJlZm9yZSlcbiAgICAgIHRocm93IG5ldyBUZXN0dHNUeXBlRXJyb3IoXG4gICAgICAgIFwiZm91bmQgYSBzdWJjaGlsZCBhdHRhY2hlZCB0byBhIG5vbi1pbW1lZGlhdGUgcGFyZW50Li4uIFwiICtcbiAgICAgICAgICBcImNoZWNrIGZvciBtaXNzaW5nIGB0ZXN0YCBwYXJhbWV0ZXJzXCJcbiAgICAgICk7XG4gICAgaWYgKGFueUNoaWxkcmVuRmFpbGVkICYmIHRoaXMuI3Bhc3NlZCkge1xuICAgICAgLy8gaWYgYW55IGNoaWxkcmVuIGZhaWxlZCBidXQgdGhpcyB0ZXN0IGJvZHkgZGlkIG5vdCwgcmVwb3J0IGZhaWx1cmVcbiAgICAgIC0tTl9URVNUU19QQVNTRUQ7XG4gICAgICArK05fVEVTVFNfRkFJTEVEO1xuICAgICAgdGhpcy4jcGFzc2VkID0gZmFsc2U7XG4gICAgICBjb25zb2xlLmVycm9yKEZBSUwpO1xuICAgIH0gZWxzZSBpZiAodGhpcy4jY2hpbGRyZW4ubGVuZ3RoICYmICF0aGlzLiNwYXNzZWQpIHtcbiAgICAgIC8vIGVsc2UgaWYgdGhlcmUgd2FzIGNoaWxkIG91dHB1dCBmb3IgYSBmYWlsZWQgcGFyZW50LCByZXBvcnQgZmFpbHVyZVxuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoRkFJTCArIFwiIFwiKTtcbiAgICAgIFNURElPX01BTklQLmluZGVudCArPSAyO1xuICAgICAgaWYgKHRoaXMuI2Vycm9yKSB7XG4gICAgICAgIFNURElPX01BTklQLmluZGVudE5ld2xpbmVzT25seSA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jZXJyb3IpO1xuICAgICAgICBTVERJT19NQU5JUC5pbmRlbnROZXdsaW5lc09ubHkgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLiN0aHJvd3MpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuI3Rocm93cy5tZXNzYWdlIHx8XG4gICAgICAgICAgdGhpcy4jdGhyb3dzLmNvbnN0cnVjdGVkQnkgfHxcbiAgICAgICAgICB0aGlzLiN0aHJvd3MucHJlZGljYXRlXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbZXhwZWN0ZWQgdGhyb3ddOlwiKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMuI3Rocm93cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd11cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFNURElPX01BTklQLmluZGVudCAtPSAyO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gICAgYm9keTogVGVzdEJvZHk8VD4sXG4gICAgb25kYXRhOiAoZGF0YT86IFQpID0+IHZvaWQsXG4gICAgb25lcnI6IChlcnI/OiBhbnkpID0+IHZvaWQsXG4gICAgdGhyb3dzPzogVGhyb3dEZXNjcmlwdG9yLFxuICAgIGRlbGV0ZVN0YWNrcz86IGJvb2xlYW5cbiAgKSB7XG4gICAgdGhpcy4jZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbiAgICB0aGlzLiN0aHJvd3MgPSB0aHJvd3M7XG4gICAgdGhpcy4jZGVsZXRlU3RhY2tzID0gZGVsZXRlU3RhY2tzO1xuICAgIHRoaXMuI29uY2VSZWFkeSA9IG5ldyBQcm9taXNlPHZvaWQ+KGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBib2R5KFxuICAgICAgICAgIG1ha2VBUEkoKGNoaWxkKSA9PiB0aGlzLiNjaGlsZHJlbi5wdXNoKGNoaWxkKSwgZGVsZXRlU3RhY2tzKVxuICAgICAgICApO1xuICAgICAgICBpZiAoIXRocm93cykge1xuICAgICAgICAgICsrTl9URVNUU19QQVNTRUQ7XG4gICAgICAgICAgdGhpcy4jcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICBvbmRhdGEocmVzdWx0KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKytOX1RFU1RTX0ZBSUxFRDtcbiAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICBvbmVycigpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLiNlcnJvciA9IGU7XG4gICAgICAgIGlmICh0aHJvd3MpIHtcbiAgICAgICAgICBpZiAodGhyb3dzLm1lc3NhZ2UgfHwgdGhyb3dzLmNvbnN0cnVjdGVkQnkgfHwgdGhyb3dzLnByZWRpY2F0ZSkge1xuICAgICAgICAgICAgLy8gdGhyb3cgd2FzIGRlc2NyaWJlZDsgY2hlY2sgdGhlIGRlc2NyaXB0b3JcbiAgICAgICAgICAgIGlmICh0aHJvd3MucHJlZGljYXRlKSB7XG4gICAgICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9ICEhdGhyb3dzLnByZWRpY2F0ZShlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhyb3dzLmNvbnN0cnVjdGVkQnkgJiYgdGhyb3dzLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgdGhpcy4jcGFzc2VkID1cbiAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgdGhyb3dzLmNvbnN0cnVjdGVkQnkgJiZcbiAgICAgICAgICAgICAgICBlLm1lc3NhZ2UgPT09IHRocm93cy5tZXNzYWdlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aHJvd3MuY29uc3RydWN0ZWRCeSkge1xuICAgICAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBlIGluc3RhbmNlb2YgdGhyb3dzLmNvbnN0cnVjdGVkQnk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRocm93cy5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IGUubWVzc2FnZSA9PT0gdGhyb3dzLm1lc3NhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4jcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy4jcGFzc2VkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuI3Bhc3NlZCkge1xuICAgICAgICAgICsrTl9URVNUU19QQVNTRUQ7XG4gICAgICAgICAgb25kYXRhKCk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICsrTl9URVNUU19GQUlMRUQ7XG4gICAgICAgICAgb25lcnIoZSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAjZGVzY3JpcHRpb246IHN0cmluZztcbiAgI2RlbGV0ZVN0YWNrcz86IGJvb2xlYW47XG4gICNwYXNzZWQgPSBmYWxzZTtcbiAgI2Vycm9yOiBhbnkgfCBudWxsID0gbnVsbDtcbiAgI3Rocm93cz86IFRocm93RGVzY3JpcHRvcjtcbiAgI2NoaWxkcmVuOiBUZXN0PGFueT5bXSA9IFtdO1xuXG4gICNvbmNlUmVhZHk6IFByb21pc2U8dm9pZD47XG59XG5cbmZ1bmN0aW9uIG1ha2VBUEkoXG4gIHJlZ2lzdGVyQ2hpbGQ6IDxUPihjaGlsZDogVGVzdDxUPikgPT4gdm9pZCxcbiAgZGVsZXRlU3RhY2tzPzogYm9vbGVhblxuKTogVGVzdFJlZ2lzdHJhciB7XG4gIGZ1bmN0aW9uIHRocm93cyhcbiAgICBjb25zdHJ1Y3RvcjogRXJyb3JTdWJDb25zdHJ1Y3RvcixcbiAgICBtZXNzYWdlPzogc3RyaW5nXG4gICk6IFRlc3RSZWdpc3RyYXI7XG4gIGZ1bmN0aW9uIHRocm93cyhtZXNzYWdlOiBzdHJpbmcpOiBUZXN0UmVnaXN0cmFyO1xuICBmdW5jdGlvbiB0aHJvd3MoaXNDb3JyZWN0VGhyb3c6IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPik6IFRlc3RSZWdpc3RyYXI7XG4gIGZ1bmN0aW9uIHRocm93cygpOiBUZXN0UmVnaXN0cmFyO1xuICBmdW5jdGlvbiB0aHJvd3M8VD4oZGVzY3JpcHRpb246IHN0cmluZywgYm9keTogVGVzdEJvZHk8VD4pOiBQcm9taXNlPFQ+O1xuICBmdW5jdGlvbiB0aHJvd3M8VD4oXG4gICAgdGhyb3dPclRlc3REZXNjcj86XG4gICAgICB8IHN0cmluZ1xuICAgICAgfCBFcnJvclN1YkNvbnN0cnVjdG9yXG4gICAgICB8IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPixcbiAgICBtZXNzYWdlT3JCb2R5Pzogc3RyaW5nIHwgVGVzdEJvZHk8VD5cbiAgKSB7XG4gICAgaWYgKCF0aHJvd09yVGVzdERlc2NyICYmICFtZXNzYWdlT3JCb2R5KSB7XG4gICAgICAvLyBpZiBubyBhcmd1bWVudHMgd2VyZSBwcm92aWRlZCwgc2ltcGx5IGNyZWF0ZSBhIHRlc3QgZXhwZWN0aW5nIHRocm93XG4gICAgICByZXR1cm4gZ2VuVGVzdEZuKHt9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aHJvd09yVGVzdERlc2NyID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAvLyBpZiBhcmcwIGlzIGEgc3RyaW5nLCBpdCBpcyBlaXRoZXIgYW4gZXJyb3IgbWVzc2FnZSBvciB0ZXN0IGRlc2NyaXB0aW9uXG4gICAgICBpZiAodHlwZW9mIG1lc3NhZ2VPckJvZHkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAvLyBhcmcwIGlzIGEgdGVzdCBkZXNjcmlwdGlvbjsgYXJnMSBpcyBhIHRlc3QgYm9keVxuICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHt9KSh0aHJvd09yVGVzdERlc2NyLCBtZXNzYWdlT3JCb2R5KTtcbiAgICAgIH0gZWxzZSBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIGFyZzAgaXMgYSBtZXNzYWdlOyBhcmcxIGlzIHVudXNlZFxuICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHsgbWVzc2FnZTogdGhyb3dPclRlc3REZXNjciB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgYSBuZXcgdGVzdCBib2R5IGFzIGl0cyBzZWNvbmQgYXJndW1lbnQgaWYgdGhlIFwiICtcbiAgICAgICAgICAgIFwiZmlyc3QgYXJndW1lbnQgaXMgYSBzdHJpbmdcIixcbiAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aHJvd09yVGVzdERlc2NyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIGlmIGFyZzAgaXMgYSBmdW5jdGlvbiwgaXQgaXMgZWl0aGVyIGEgdGhyb3cgcHJlZGljYXRlIG9yIGNvbnN0cnVjdG9yXG4gICAgICBpZiAoXG4gICAgICAgIHRocm93T3JUZXN0RGVzY3IgPT09IEVycm9yIHx8XG4gICAgICAgIHRocm93T3JUZXN0RGVzY3IucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3JcbiAgICAgICkge1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2VPckJvZHkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAvLyBhcmcwIGlzIGFuIGVycm9yIGNvbnN0cnVjdG9yOyBhcmcxIGFuIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIGNvbnN0cnVjdGVkQnk6IHRocm93T3JUZXN0RGVzY3IgYXMgRXJyb3JTdWJDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VPckJvZHksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gYXJnMCBpcyBhbiBlcnJvciBjb25zdHJ1Y3RvcjsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIGNvbnN0cnVjdGVkQnk6IHRocm93T3JUZXN0RGVzY3IgYXMgRXJyb3JTdWJDb25zdHJ1Y3RvcixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgZWl0aGVyIGFuIGVycm9yIG1lc3NhZ2Ugb3IgYSBuZXcgdGVzdCBib2R5IFwiICtcbiAgICAgICAgICAgICAgXCJhcyBpdHMgc2Vjb25kIGFyZ3VtZW50XCIsXG4gICAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChtZXNzYWdlT3JCb2R5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBhcmcwIGlzIGFuIGVycm9yIHByZWRpY2F0ZTsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIHByZWRpY2F0ZTogdGhyb3dPclRlc3REZXNjciBhcyBQcmVkaWNhdGU8W0Vycm9yIHwgYW55XT4sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGFuIGVtcHR5IHNlY29uZCBhcmd1bWVudCBpZiB0aGUgZmlyc3QgaXMgYSBcIiArXG4gICAgICAgICAgICAgIFwidGhyb3cgcHJlZGljYXRlIChhIGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgY29uc3RydWN0IEVycm9ycylcIixcbiAgICAgICAgICAgIHRocm93T3JUZXN0RGVzY3IsXG4gICAgICAgICAgICBtZXNzYWdlT3JCb2R5XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgXCJ0ZXN0LnRocm93cyByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlLCBlcnJvciBjb25zdHJ1Y3RvciwgcHJlZGljYXRlLCBcIiArXG4gICAgICAgICAgXCJvciBuZXcgdGVzdCBkZXNjcmlwdGlvbiBhcyBpdHMgZmlyc3QgYXJndW1lbnRcIixcbiAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZ2VuVGVzdEZuKGV4cGVjdGVkVGhyb3c/OiBUaHJvd0Rlc2NyaXB0b3IpIHtcbiAgICBsZXQgcGFzc0RlbGV0ZVN0YWNrcyA9IHRydWU7XG4gICAgY29uc3QgdGVzdCA9IDxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD4gPT4ge1xuICAgICAgaWYgKHR5cGVvZiBib2R5ICE9PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgIFwidGVzdHMgd2l0aCBkZXNjcmlwdGlvbnMgcmVxdWlyZSBhIHRlc3QgYm9keVwiXG4gICAgICAgICk7XG4gICAgICBjb25zdCBleGVjdXRpb246IFByb21pc2U8VD4gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHQgPSBuZXcgVGVzdChcbiAgICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgICBib2R5LFxuICAgICAgICAgIHJlc29sdmUgYXMgKGRhdGE/OiBUKSA9PiB2b2lkLFxuICAgICAgICAgIHJlamVjdCxcbiAgICAgICAgICBleHBlY3RlZFRocm93LFxuICAgICAgICAgIHBhc3NEZWxldGVTdGFja3MgPyBkZWxldGVTdGFja3MgOiBmYWxzZVxuICAgICAgICApO1xuICAgICAgICByZWdpc3RlckNoaWxkKHQpO1xuICAgICAgfSk7XG4gICAgICBURVNUX1BST01JU0VTLmFkZChleGVjdXRpb24pO1xuICAgICAgcmV0dXJuIGV4ZWN1dGlvbjtcbiAgICB9O1xuICAgIHRlc3QudGhyb3dzID0gdGhyb3dzO1xuICAgIHRlc3QuZGVsZXRlU3RhY2tzID0gKHNldHRpbmcgPSB0cnVlLCBwYXNzVG9DaGlsZHJlbiA9IHRydWUpID0+IHtcbiAgICAgIGRlbGV0ZVN0YWNrcyA9IHNldHRpbmc7XG4gICAgICBwYXNzRGVsZXRlU3RhY2tzID0gcGFzc1RvQ2hpbGRyZW47XG4gICAgfTtcbiAgICByZXR1cm4gdGVzdDtcbiAgfVxuICByZXR1cm4gZ2VuVGVzdEZuKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdsb2JhbFRlc3RMYXVuY2hlcigpIHtcbiAgLy8gY2F0Y2ggYW55IHVuaGFuZGxlZCByZWplY3Rpb25zIHRocm93biBieSB0ZXN0c1xuICBwcm9jZXNzLmFkZExpc3RlbmVyKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIChkZXRhaWxzLCBwcm9taXNlKSA9PiB7XG4gICAgLy8gb25seSBsb2cgdW5oYW5kbGVkIHJlamVjdGlvbnMgaWYgdGhleSBkb24ndCBkaXJlY3RseSBiZWxvbmcgdG8gYSB0ZXN0XG4gICAgaWYgKCFURVNUX1BST01JU0VTLmhhcyhwcm9taXNlKSkge1xuICAgICAgU1RESU9fTUFOSVAucmVzZXQoKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiW3Rlc3R0c10gRXJyb3I6IFVuaGFuZGxlZCBwcm9taXNlIHJlamVjdGlvbi4gRXhpdGluZy4gU2VlIGJlbG93OlwiXG4gICAgICApO1xuICAgICAgY29uc29sZS5lcnJvcihkZXRhaWxzKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHNoaWZ0IGFsbCB0ZXN0IG91dHB1dCBieSAxXG4gIFNURElPX01BTklQLmluZGVudCA9IDE7XG5cbiAgLy8gY2hlY2sgZm9yIG9wdGlvbnNcbiAgbGV0IG1hdGNoZXI6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDI7IGkgPCBwcm9jZXNzLmFyZ3YubGVuZ3RoIC0gMTsgKytpKSB7XG4gICAgaWYgKFxuICAgICAgcHJvY2Vzcy5hcmd2W2ldLnRyaW0oKSA9PT0gXCItLW1hdGNoXCIgfHxcbiAgICAgIHByb2Nlc3MuYXJndltpXS50cmltKCkgPT09IFwiLW1cIlxuICAgICkge1xuICAgICAgbWF0Y2hlciA9IHByb2Nlc3MuYXJndltpICsgMV07XG4gICAgICBwcm9jZXNzLmFyZ3Yuc3BsaWNlKGksIDIpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHBhdGhzID0gYXdhaXQgZmluZFBhdGhzKG1hdGNoZXIpO1xuXG4gIGNvbnN0IHNldHRpbmdzOiBTZXR0aW5ncyA9ICgoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG8gPSByZXF1aXJlKHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcIi4vLnRlc3R0cy5qc29uXCIpKTtcbiAgICAgIG8ucHJpb3JpdGl6ZWQgPSAoPFNldHRpbmdzPm8pLnByaW9yaXRpemVkXG4gICAgICAgIC5tYXAoKHApID0+IHBhdGgucmVzb2x2ZShwKSlcbiAgICAgICAgLmZpbHRlcigocCkgPT4gcGF0aHMuaW5jbHVkZXMocCkpO1xuICAgICAgcmV0dXJuIG87XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIHsgcHJpb3JpdGl6ZWQ6IFtdIH07XG4gICAgfVxuICB9KSgpO1xuXG4gIC8vIGhhbmRsZSBhbGwgcHJpb3JpdGl6ZWQgZmlsZSB0ZXN0cyBzZXBhcmF0ZWx5LCBhbmQgaW5kaXZpZHVhbGx5XG4gIGZvciAoY29uc3QgcCBvZiBzZXR0aW5ncy5wcmlvcml0aXplZCkge1xuICAgIGNvbnN0IHQgPSBuZXcgVGVzdChcbiAgICAgIEFOU0lfQ1lBTl9GRyArIHBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcCkgKyBBTlNJX1JFU0VULFxuICAgICAgKHRlc3QpID0+IHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgICAgdGVzdCxcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWlyZShwKTtcbiAgICAgIH0sXG4gICAgICAoKSA9PiB7fSxcbiAgICAgICgpID0+IHt9XG4gICAgKTtcbiAgICBhd2FpdCB0Lm9uY2VSZWFkeTtcbiAgICBhd2FpdCB0LmxvZygpO1xuICB9XG5cbiAgLy8gY29sbGVjdCBhbGwgbm9uLXByaW9yaXRpemVkIGZpbGUgdGVzdHMsIHRyaWdnZXJpbmcgZmlsZSBleGVjdXRpb24uXG4gIC8vIGlmIGFzeW5jaHJvbm91cywgaW5pdGlhdGVzIGFsbCB0b3AtbGV2ZWwgYXN5bmMgb3BlcmF0aW9ucyBiZWZvcmUgYXdhaXRpbmdcbiAgY29uc3Qgbm9uUHJpb3JpdGl6ZWQ6IFRlc3Q8dm9pZD5bXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgcCBvZiBwYXRocykge1xuICAgIGlmIChzZXR0aW5ncy5wcmlvcml0aXplZC5pbmNsdWRlcyhwKSkgY29udGludWU7XG4gICAgbm9uUHJpb3JpdGl6ZWQucHVzaChcbiAgICAgIG5ldyBUZXN0KFxuICAgICAgICBBTlNJX0NZQU5fRkcgKyBwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHApICsgQU5TSV9SRVNFVCxcbiAgICAgICAgKHRlc3QpID0+IHtcbiAgICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgICAgIHRlc3QsXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXF1aXJlKHApO1xuICAgICAgICB9LFxuICAgICAgICAoKSA9PiB7fSxcbiAgICAgICAgKCkgPT4ge31cbiAgICAgIClcbiAgICApO1xuICB9XG4gIC8vIGF3YWl0IGFuZCBsb2cgYWxsIG9mIHRoZSB0ZXN0c1xuICBmb3IgKGNvbnN0IHQgb2Ygbm9uUHJpb3JpdGl6ZWQpIHtcbiAgICBhd2FpdCB0Lm9uY2VSZWFkeTtcbiAgICBhd2FpdCB0LmxvZygpO1xuICB9XG59XG5cbmlmIChwcm9jZXNzLmFyZ3YubGVuZ3RoID49IDMpIHtcbiAgZ2xvYmFsVGVzdExhdW5jaGVyKClcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICBTVERJT19NQU5JUC5yZXNldCgpO1xuICAgICAgaWYgKE5fVEVTVFNfRkFJTEVEKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgXCJcXG5cIiArXG4gICAgICAgICAgICBBTlNJX1JFRF9GRyArXG4gICAgICAgICAgICBcInBhc3NlZCBbXCIgK1xuICAgICAgICAgICAgTl9URVNUU19QQVNTRUQgK1xuICAgICAgICAgICAgXCIvXCIgK1xuICAgICAgICAgICAgKE5fVEVTVFNfUEFTU0VEICsgTl9URVNUU19GQUlMRUQpICtcbiAgICAgICAgICAgIFwiXSB0ZXN0c1wiICtcbiAgICAgICAgICAgIEFOU0lfUkVTRVRcbiAgICAgICAgKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICBcIlxcblwiICtcbiAgICAgICAgICAgIEFOU0lfR1JFRU5fRkcgK1xuICAgICAgICAgICAgXCJwYXNzZWQgW1wiICtcbiAgICAgICAgICAgIE5fVEVTVFNfUEFTU0VEICtcbiAgICAgICAgICAgIFwiL1wiICtcbiAgICAgICAgICAgIChOX1RFU1RTX1BBU1NFRCArIE5fVEVTVFNfRkFJTEVEKSArXG4gICAgICAgICAgICBcIl0gdGVzdHNcIiArXG4gICAgICAgICAgICBBTlNJX1JFU0VUXG4gICAgICAgICk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC5jYXRjaCgoZSkgPT4ge1xuICAgICAgU1RESU9fTUFOSVAucmVzZXQoKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfSk7XG59XG4iXX0=