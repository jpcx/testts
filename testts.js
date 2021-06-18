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
var _Test_priority, _Test_description, _Test_deleteStacks, _Test_passed, _Test_error, _Test_throws, _Test_children, _Test_onceReady;
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
const _STDIO_MANIP_ = new StdioManipulator();
const _TEST_PROMISES_ = new WeakSet();
let _N_TESTS_PASSED_ = 0;
let _N_TESTS_FAILED_ = 0;
function findTestPaths(matcher = "\\.test\\.js") {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield (() => __awaiter(this, void 0, void 0, function* () {
            const _ = [];
            for (let i = 2; i < process.argv.length; ++i) {
                const cur = process.argv[i];
                const stats = yield new Promise((resolve, reject) => fs.lstat(cur, (err, stat) => {
                    if (err)
                        reject(err);
                    else
                        resolve(stat);
                }));
                if (stats.isFile()) {
                    _.push(path.resolve(cur));
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
                    if (name.match(new RegExp(matcher, "m")))
                        result.push(path.resolve(cur));
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
        if (result.length === 0)
            throw new TesttsArgumentError("cannot find tests", ...process.argv.slice(2));
        return result;
    });
}
function testsBySortedPriority(tests) {
    return tests
        .reduce((a, test) => {
        const existingIdx = a.findIndex((x) => x[0] === test.priority);
        if (existingIdx !== -1) {
            a[existingIdx][1].push(test);
        }
        else {
            a.push([test.priority, [test]]);
        }
        return a;
    }, [])
        .sort((a, b) => (a[0] <= b[0] ? -1 : 1));
}
class Test {
    constructor(description, body, ondata, onerr, throws, deleteStacks) {
        _Test_priority.set(this, 0);
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
                const result = yield body(makeAPI((child) => __classPrivateFieldGet(this, _Test_children, "f").push(child), (priority) => {
                    __classPrivateFieldSet(this, _Test_priority, priority, "f");
                }, deleteStacks));
                if (!throws) {
                    ++_N_TESTS_PASSED_;
                    __classPrivateFieldSet(this, _Test_passed, true, "f");
                    ondata(result);
                    resolve();
                }
                else {
                    ++_N_TESTS_FAILED_;
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
                    ++_N_TESTS_PASSED_;
                    ondata();
                    resolve();
                }
                else {
                    ++_N_TESTS_FAILED_;
                    onerr(e);
                    resolve();
                }
            }
        })), "f");
    }
    get priority() {
        return __classPrivateFieldGet(this, _Test_priority, "f");
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
                    _STDIO_MANIP_.indent += 2;
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
                    _STDIO_MANIP_.indent -= 2;
                }
            }
            let nChildrenBefore = __classPrivateFieldGet(this, _Test_children, "f").length;
            for (const pc of testsBySortedPriority(__classPrivateFieldGet(this, _Test_children, "f"))) {
                for (const child of pc[1]) {
                    _STDIO_MANIP_.indent += 2;
                    yield child.onceReady;
                    yield child.log();
                    anyChildrenFailed = anyChildrenFailed || !child.passed;
                    _STDIO_MANIP_.indent -= 2;
                }
            }
            if (__classPrivateFieldGet(this, _Test_children, "f").length > nChildrenBefore)
                throw new TesttsTypeError("found a subchild attached to a non-immediate parent... " +
                    "check for missing `test` parameters");
            if (anyChildrenFailed && __classPrivateFieldGet(this, _Test_passed, "f")) {
                --_N_TESTS_PASSED_;
                ++_N_TESTS_FAILED_;
                __classPrivateFieldSet(this, _Test_passed, false, "f");
                console.error(FAIL);
            }
            else if (__classPrivateFieldGet(this, _Test_children, "f").length && !__classPrivateFieldGet(this, _Test_passed, "f")) {
                process.stdout.write(FAIL + " ");
                _STDIO_MANIP_.indent += 2;
                if (__classPrivateFieldGet(this, _Test_error, "f")) {
                    _STDIO_MANIP_.indentNewlinesOnly = true;
                    console.error(__classPrivateFieldGet(this, _Test_error, "f"));
                    _STDIO_MANIP_.indentNewlinesOnly = false;
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
                _STDIO_MANIP_.indent -= 2;
            }
        });
    }
}
_Test_priority = new WeakMap(), _Test_description = new WeakMap(), _Test_deleteStacks = new WeakMap(), _Test_passed = new WeakMap(), _Test_error = new WeakMap(), _Test_throws = new WeakMap(), _Test_children = new WeakMap(), _Test_onceReady = new WeakMap();
function makeAPI(registerChild, registerPriority, deleteStacks) {
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
            _TEST_PROMISES_.add(execution);
            return execution;
        };
        test.throws = throws;
        test.deleteStacks = (setting = true, passToChildren = true) => {
            deleteStacks = setting;
            passDeleteStacks = passToChildren;
        };
        test.priority = (setting = 0) => {
            registerPriority(setting);
        };
        return test;
    }
    return genTestFn();
}
function globalTestLauncher() {
    return __awaiter(this, void 0, void 0, function* () {
        process.addListener("unhandledRejection", (details, promise) => {
            if (!_TEST_PROMISES_.has(promise)) {
                _STDIO_MANIP_.reset();
                console.error("[testts] Error: Unhandled promise rejection. Exiting. See below:");
                console.error(details);
                process.exit(1);
            }
        });
        _STDIO_MANIP_.indent = 1;
        let matcher = undefined;
        for (let i = 2; i < process.argv.length - 1; ++i) {
            if (process.argv[i].trim() === "--match" ||
                process.argv[i].trim() === "-m") {
                matcher = process.argv[i + 1];
                process.argv.splice(i, 2);
            }
        }
        const paths = yield findTestPaths(matcher);
        const fileTests = [];
        for (const p of paths) {
            fileTests.push(new Test(ANSI_CYAN_FG + path.relative(process.cwd(), p) + ANSI_RESET, (test) => {
                module.exports = {
                    test,
                };
                require(p);
            }, () => { }, () => { }));
        }
        console.log(testsBySortedPriority(fileTests));
        for (const pt of testsBySortedPriority(fileTests)) {
            for (const t of pt[1]) {
                yield t.onceReady;
            }
            for (const t of pt[1]) {
                yield t.log();
            }
        }
    });
}
if (process.argv.length >= 3) {
    globalTestLauncher()
        .then(() => {
        _STDIO_MANIP_.reset();
        if (_N_TESTS_FAILED_) {
            console.error("\n" +
                ANSI_RED_FG +
                "passed [" +
                _N_TESTS_PASSED_ +
                "/" +
                (_N_TESTS_PASSED_ + _N_TESTS_FAILED_) +
                "] tests" +
                ANSI_RESET);
            process.exit(1);
        }
        else {
            console.error("\n" +
                ANSI_GREEN_FG +
                "passed [" +
                _N_TESTS_PASSED_ +
                "/" +
                (_N_TESTS_PASSED_ + _N_TESTS_FAILED_) +
                "] tests" +
                ANSI_RESET);
            process.exit(0);
        }
    })
        .catch((e) => {
        _STDIO_MANIP_.reset();
        console.error(e);
        process.exit(1);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9DQSx5QkFBeUI7QUFDekIsNkJBQTZCO0FBK0M3QixNQUFNLG1CQUFvQixTQUFRLEtBQUs7SUFFckMsWUFBWSxHQUFXLEVBQUUsS0FBYTtRQUNwQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxtQkFBb0IsU0FBUSxLQUFLO0lBRXJDLFlBQVksR0FBVyxFQUFFLEdBQUcsSUFBVztRQUNyQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxlQUFnQixTQUFRLFNBQVM7SUFDckMsWUFBWSxHQUFXO1FBQ3JCLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFHRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDO0FBQ2pDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDO0FBQzdCLE1BQU0sSUFBSSxHQUFHLFlBQVksR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzlDLE1BQU0sSUFBSSxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBRTVDLFNBQVMsc0JBQXNCLENBQUMsR0FBVyxFQUFFLE9BQWU7SUFDMUQs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O1lBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQjtJQUNILENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ1gsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztDQUNOIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqKiogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKlxuICoqKiAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqICAgICAgICAgICAgICA6cCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOnAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgICAgICAgICAgICAgICAgICAgICAgICAgXyAgICAgOnggICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgLm94b3hveHAgICAgICAgICAgLjpveG8gICAgICA6cCAgIDpveG94b3hwIC46b3hvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICA6eG94b3hveCAgLm94ICAgICAueCAgb3hvIHAgICA6eCAgOnhveG94b3ggLnggIG94byBwICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6ZCAgIC54IG94byAgICA6bywgIGB4b2AgLm94b3hveHAgOmQgICAgOm8sICBgeG9gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgLm8gICB4b3ggIDp4b3ggICAgICA6eG94b3hveCAgOnggICA6eG94ICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOnggICAgb3hvICAgOm94ICAgICAgICA6ZCAgICAgOm8gICAgIDpveCAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOm94b3hveG8gICAgICA6eG8gICAgICA6eCAgICAgOnggICAgICAgOnhvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOm94b3hveCAgICAgICAgIDpveCAgICA6byAgICAgOm8gICAgICAgICA6b3ggICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOngsICAgICAgICAub3gsICA6byAgICA6eCAgICAgOnggICAgLm94LCAgOm8gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6cSwgOm94LCAgIC54IGQneG94byB4YCAgICA6byAgICAgOnEsICBkJ3hveG8geGAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAnOnggIDp4b3hveG9gICAgIC5veG9gICAgICA6cSwgICAgJzp4ICAgICAub3hvYCAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICA6eG94b2AgICAgICAgICAgICAgICAnOnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgIEBsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9qcGN4L3Rlc3R0cyAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBsaWNlbnNlIExHUEwtMy4wLW9yLWxhdGVyICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBjb3B5cmlnaHQgKEMpIDIwMjEgQGF1dGhvciBKdXN0aW4gQ29sbGllciA8bUBqcGN4LmRldj4gICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgICAgKlxuICogICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgICAgICAgICAgKlxuICogICAgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlICAgICAgKlxuICogICAgTGljZW5zZSwgb3IgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi4gICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsICAgICAgICAgKlxuICogICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGludGVybmFsaWVkIHdhcnJhbnR5IG9mICAgICAgKlxuICogICAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZSAgICAgICAgICAgKlxuICogICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSAqKlxuICogIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiAgSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi4gICoqKlxuICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKioqKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmV4cG9ydCB0eXBlIE5vblByb21pc2U8VD4gPSBUIGV4dGVuZHMgUHJvbWlzZTxhbnk+ID8gbmV2ZXIgOiBUO1xuZXhwb3J0IHR5cGUgVGVzdEJvZHlTeW5jPFQ+ID0gKHRlc3Q6IEFQSSkgPT4gTm9uUHJvbWlzZTxUPjtcbmV4cG9ydCB0eXBlIFRlc3RCb2R5QXN5bmM8VD4gPSAodGVzdDogQVBJKSA9PiBQcm9taXNlPFQ+O1xuZXhwb3J0IHR5cGUgVGVzdEJvZHk8VD4gPSBUZXN0Qm9keVN5bmM8VD4gfCBUZXN0Qm9keUFzeW5jPFQ+O1xuZXhwb3J0IHR5cGUgUHJlZGljYXRlPFQgZXh0ZW5kcyBBcnJheTxhbnk+PiA9ICguLi5hcmdzOiBUKSA9PiBhbnk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdWIgZXh0ZW5kcyBFcnJvciB7fVxuZXhwb3J0IGludGVyZmFjZSBFcnJvclN1YkNvbnN0cnVjdG9yIHtcbiAgbmV3ICguLi5hcmdzOiBhbnlbXSk6IEVycm9yU3ViO1xuICBwcm90b3R5cGU6IEVycm9yU3ViO1xufVxuXG4vKiogUmVnaXN0ZXJzIGEgbmV3IHRlc3QuICAqL1xuZXhwb3J0IHR5cGUgQVBJID0gdHlwZW9mIHRlc3Q7XG4vKiogUmVnaXN0ZXJzIGEgbmV3IHRlc3QuICAqL1xuZXhwb3J0IGRlY2xhcmUgY29uc3QgdGVzdDoge1xuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgbmV3IHRlc3QuXG4gICAqIEBwYXJhbSAgICBkZXNjcmlwdGlvbiAgLSBhbnkgc3RyaW5nIGRlc2NyaXB0aW9uIHRvIGRlc2NyaWJlIHRoZSB0ZXN0LlxuICAgKiBAcGFyYW0gICAgYm9keSAgICAgICAgIC0gZXhlY3V0aW9uIGJvZHkgdGhhdCBzaG91bGQgdGhyb3cgb24gZmFpbHVyZS5cbiAgICovXG4gIDxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD47XG4gIC8qKiBEZXNjcmliZSBhbiBleHBlY3RlZCB0aHJvdyAqL1xuICB0aHJvd3M6IHtcbiAgICAoY29uc3RydWN0b3I6IEVycm9yU3ViQ29uc3RydWN0b3IsIG1lc3NhZ2U/OiBzdHJpbmcpOiBBUEk7XG4gICAgKG1lc3NhZ2U6IHN0cmluZyk6IEFQSTtcbiAgICAoaXNDb3JyZWN0VGhyb3c6IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPik6IEFQSTtcbiAgICAoKTogQVBJO1xuICAgIDxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD47XG4gIH07XG4gIC8qKlxuICAgKiBEZWxldGUgc3RhY2sgdHJhY2VzIChzZXR0aW5nPXRydWUpLlxuICAgKiBPcHRpb25hbGx5IHBhc3MgdGhpcyBzZXR0aW5ncyB0byBjaGlsZHJlbiAocGFzc1RvQ2hpbGRyZW49dHJ1ZSlcbiAgICovXG4gIGRlbGV0ZVN0YWNrcyhzZXR0aW5nPzogYm9vbGVhbiwgcGFzc1RvQ2hpbGRyZW4/OiBib29sZWFuKTogdm9pZDtcbiAgLyoqIE9wdGlvbmFsbHkgc2V0IGFuIGV4ZWN1dGlvbiBwcmlvcml0eSAoc2V0dGluZz0wKSAqL1xuICBwcmlvcml0eShzZXR0aW5nPzogbnVtYmVyKTogdm9pZDtcbn07XG5cbnR5cGUgVGhyb3dEZXNjcmlwdG9yID0ge1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBjb25zdHJ1Y3RlZEJ5PzogRXJyb3JTdWJDb25zdHJ1Y3RvcjtcbiAgcHJlZGljYXRlPzogUHJlZGljYXRlPFtFcnJvciB8IGFueV0+O1xufTtcblxuY2xhc3MgVGVzdHRzSW50ZXJuYWxFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcHVibGljIGNhdXNlPzogRXJyb3I7XG4gIGNvbnN0cnVjdG9yKHdoeTogc3RyaW5nLCBjYXVzZT86IEVycm9yKSB7XG4gICAgc3VwZXIoXCJbdGVzdHRzXSBJbnRlcm5hbCBFcnJvcjogXCIgKyB3aHkpO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuY2xhc3MgVGVzdHRzQXJndW1lbnRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcHVibGljIGFyZ3M6IGFueVtdO1xuICBjb25zdHJ1Y3Rvcih3aHk6IHN0cmluZywgLi4uYXJnczogYW55W10pIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIEFyZ3VtZW50IEVycm9yOiBcIiArIHdoeSk7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgfVxufVxuY2xhc3MgVGVzdHRzVHlwZUVycm9yIGV4dGVuZHMgVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3Iod2h5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIFR5cGUgRXJyb3I6IFwiICsgd2h5KTtcbiAgfVxufVxuXG4vLyBnbG9iYWwgY29uc3RhbnRzXG5jb25zdCBBTlNJX0dSQVlfRkcgPSBcIlxceDFiWzkwbVwiO1xuY29uc3QgQU5TSV9HUkVFTl9GRyA9IFwiXFx4MWJbMzJtXCI7XG5jb25zdCBBTlNJX1JFRF9GRyA9IFwiXFx4MWJbMzFtXCI7XG5jb25zdCBBTlNJX0NZQU5fRkcgPSBcIlxceDFiWzM2bVwiO1xuY29uc3QgQU5TSV9SRVNFVCA9IFwiXFx4MWJbMG1cIjtcbmNvbnN0IFRFU1QgPSBBTlNJX0dSQVlfRkcgKyBcIuKWt1wiICsgQU5TSV9SRVNFVDtcbmNvbnN0IFBBU1MgPSBBTlNJX0dSRUVOX0ZHICsgXCLinJNcIiArIEFOU0lfUkVTRVQ7XG5jb25zdCBGQUlMID0gQU5TSV9SRURfRkcgKyBcIuKcl1wiICsgQU5TSV9SRVNFVDtcblxuZnVuY3Rpb24gYWRkSW5kZW50QWZ0ZXJOZXdsaW5lcyhzdHI6IHN0cmluZywgc3BhY2luZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0ci5zcGxpdChcIlxcblwiKS5yZWR1Y2UoKGEsIHYsIGksIF8pID0+IHtcbiAgICBpZiAoaSA9PT0gMCkgYSArPSB2O1xuICAgIGVsc2UgaWYgKGkgPT09IF8ubGVuZ3RoIC0gMSkgYSArPSBcIlxcblwiICsgdjtcbiAgICBlbHNlIGEgKz0gXCJcXG5cIiArIHNwYWNpbmcgKyB2O1xuICAgIHJldHVybiBhO1xuICB9LCBcIlwiKTtcbn1cblxuaW50ZXJmYWNlIFN0ZGlvTWFuaXB1bGF0b3Ige1xuICBpbmRlbnQ6IG51bWJlcjtcbiAgaW5kZW50TmV3bGluZXNPbmx5OiBib29sZWFuO1xuICByZXNldDogKCkgPT4gdm9pZDtcbn1cbmNsYXNzIFN0ZGlvTWFuaXB1bGF0b3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBjb25zdCBfc2VsZiA9IHRoaXM7XG4gICAgbGV0IF9zdGRvdXQgPSBwcm9jZXNzLnN0ZG91dC53cml0ZS5iaW5kKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICBsZXQgX3N0ZGVyciA9IHByb2Nlc3Muc3RkZXJyLndyaXRlLmJpbmQocHJvY2Vzcy5zdGRvdXQpO1xuICAgIGxldCBfaW5kZW50ID0gMDtcbiAgICBsZXQgX2luZGVudE5ld2xpbmVzT25seSA9IGZhbHNlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImluZGVudFwiLCB7XG4gICAgICBnZXQ6ICgpID0+IF9pbmRlbnQsXG4gICAgICBzZXQ6IChuOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBuICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgIHRocm93IG5ldyBUZXN0dHNJbnRlcm5hbEVycm9yKFwiYmFkIGluZGVudCBhc3NpZ25tZW50XCIpO1xuICAgICAgICBfaW5kZW50ID0gbjtcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpbmRlbnROZXdsaW5lc09ubHlcIiwge1xuICAgICAgZ2V0OiAoKSA9PiBfaW5kZW50TmV3bGluZXNPbmx5LFxuICAgICAgc2V0OiAoYjogbnVtYmVyKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgYiAhPT0gXCJib29sZWFuXCIpXG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXCJiYWQgaW5kZW50TmV3bGluZXNPbmx5IGFzc2lnbm1lbnRcIik7XG4gICAgICAgIF9pbmRlbnROZXdsaW5lc09ubHkgPSBiO1xuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuICAgIHRoaXMucmVzZXQgPSAoKSA9PiB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IF9zdGRvdXQ7XG4gICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZSA9IF9zdGRlcnI7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBtYWtlV3JpdGVyKHdyaXRlOiB0eXBlb2YgX3N0ZG91dCB8IHR5cGVvZiBfc3RkZXJyKSB7XG4gICAgICByZXR1cm4gKGJ1ZmZlck9yU3RyOiBhbnksIGNiT3JFbmNvZGluZz86IGFueSwgY2I/OiBhbnkpOiBib29sZWFuID0+IHtcbiAgICAgICAgY29uc3Qgc3BhY2luZyA9IG5ldyBBcnJheShfc2VsZi5pbmRlbnQpLmZpbGwoXCIgXCIpLmpvaW4oXCJcIik7XG4gICAgICAgIGlmICghX3NlbGYuaW5kZW50TmV3bGluZXNPbmx5KSB3cml0ZShzcGFjaW5nKTtcbiAgICAgICAgLy8gaWYgcHJpbnRpbmcgYSBzdHJpbmcgKHRoYXQgaXMgbm90IG9ubHkgd2hpdGVzcGFjZSlcbiAgICAgICAgaWYgKHR5cGVvZiBidWZmZXJPclN0ciA9PT0gXCJzdHJpbmdcIiAmJiBidWZmZXJPclN0ci5tYXRjaCgvXFxTLykpIHtcbiAgICAgICAgICAvLyByZXBsYWNlIGFueSBuZXdsaW5lcyB3aXRoIG5sK3NwYWNlcyAoZXhjZXB0IGZvciB0aGUgbGFzdCBvbmUpXG4gICAgICAgICAgYnVmZmVyT3JTdHIgPSBhZGRJbmRlbnRBZnRlck5ld2xpbmVzKGJ1ZmZlck9yU3RyLCBzcGFjaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNiT3JFbmNvZGluZyA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICAgIHJldHVybiB3cml0ZShidWZmZXJPclN0ciwgY2JPckVuY29kaW5nKTtcbiAgICAgICAgZWxzZSByZXR1cm4gd3JpdGUoYnVmZmVyT3JTdHIsIGNiT3JFbmNvZGluZywgY2IpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSBtYWtlV3JpdGVyKF9zdGRvdXQpO1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlID0gbWFrZVdyaXRlcihfc3RkZXJyKTtcbiAgfVxufVxuXG4vLyBtdXRhYmxlIGdsb2JhbCBkYXRhXG5jb25zdCBfU1RESU9fTUFOSVBfID0gbmV3IFN0ZGlvTWFuaXB1bGF0b3IoKTtcbmNvbnN0IF9URVNUX1BST01JU0VTXzogV2Vha1NldDxQcm9taXNlPGFueT4+ID0gbmV3IFdlYWtTZXQoKTtcbmxldCBfTl9URVNUU19QQVNTRURfID0gMDtcbmxldCBfTl9URVNUU19GQUlMRURfID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZmluZFRlc3RQYXRocyhcbiAgbWF0Y2hlcjogc3RyaW5nID0gXCJcXFxcLnRlc3RcXFxcLmpzXCJcbik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IGF3YWl0IChhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgXzogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBjb2xsZWN0IGFueSBtYW51YWxseSBzcGVjaWZpZWQgZmlsZXMgZmlyc3RcbiAgICBmb3IgKGxldCBpID0gMjsgaSA8IHByb2Nlc3MuYXJndi5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgY3VyID0gcHJvY2Vzcy5hcmd2W2ldO1xuICAgICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgICAgZnMubHN0YXQoY3VyLCAoZXJyLCBzdGF0KSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycik7XG4gICAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBfLnB1c2gocGF0aC5yZXNvbHZlKGN1cikpO1xuICAgICAgICBwcm9jZXNzLmFyZ3Yuc3BsaWNlKGksIDEpO1xuICAgICAgICAtLWk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBfO1xuICB9KSgpO1xuXG4gIC8vIGRlZmluZSB0aGUgZmlsZSBzZWFyY2ggZnVuY3Rpb25cbiAgYXN5bmMgZnVuY3Rpb24gc2VhcmNoKGN1cjogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgIGZzLmxzdGF0KGN1ciwgKGVyciwgc3RhdCkgPT4ge1xuICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgfSlcbiAgICApO1xuICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHBhdGguYmFzZW5hbWUoY3VyKTtcbiAgICAgIGlmIChuYW1lLm1hdGNoKG5ldyBSZWdFeHAobWF0Y2hlciwgXCJtXCIpKSkgcmVzdWx0LnB1c2gocGF0aC5yZXNvbHZlKGN1cikpO1xuICAgIH0gZWxzZSBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3Qgc3Viczogc3RyaW5nW10gPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgICBmcy5yZWFkZGlyKGN1ciwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgICBlbHNlIHJlc29sdmUoZmlsZXMpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzKSBhd2FpdCBzZWFyY2gocGF0aC5qb2luKGN1ciwgcykpO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKSB7XG4gICAgICBhd2FpdCBzZWFyY2gocGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0YXJnZXQpIHx8IFwiLi9cIik7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXG4gICAgICBcImVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIHNlYXJjaGluZyBmb3IgdGVzdHNcIixcbiAgICAgIGVcbiAgICApO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5sZW5ndGggPT09IDApXG4gICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICBcImNhbm5vdCBmaW5kIHRlc3RzXCIsXG4gICAgICAuLi5wcm9jZXNzLmFyZ3Yuc2xpY2UoMilcbiAgICApO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHRlc3RzQnlTb3J0ZWRQcmlvcml0eShcbiAgdGVzdHM6IFRlc3Q8YW55PltdXG4pOiBBcnJheTxbbnVtYmVyLCBUZXN0PGFueT5bXV0+IHtcbiAgcmV0dXJuIHRlc3RzXG4gICAgLnJlZHVjZSgoYSwgdGVzdCkgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmdJZHggPSBhLmZpbmRJbmRleCgoeCkgPT4geFswXSA9PT0gdGVzdC5wcmlvcml0eSk7XG4gICAgICBpZiAoZXhpc3RpbmdJZHggIT09IC0xKSB7XG4gICAgICAgIGFbZXhpc3RpbmdJZHhdWzFdLnB1c2godGVzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhLnB1c2goW3Rlc3QucHJpb3JpdHksIFt0ZXN0XV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGE7XG4gICAgfSwgW10gYXMgQXJyYXk8W251bWJlciwgVGVzdDxhbnk+W11dPilcbiAgICAuc29ydCgoYSwgYikgPT4gKGFbMF0gPD0gYlswXSA/IC0xIDogMSkpO1xufVxuXG5jbGFzcyBUZXN0PFQ+IHtcbiAgcHVibGljIGdldCBwcmlvcml0eSgpIHtcbiAgICByZXR1cm4gdGhpcy4jcHJpb3JpdHk7XG4gIH1cbiAgcHVibGljIGdldCBwYXNzZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuI3Bhc3NlZDtcbiAgfVxuICBwdWJsaWMgZ2V0IG9uY2VSZWFkeSgpIHtcbiAgICByZXR1cm4gdGhpcy4jb25jZVJlYWR5O1xuICB9XG5cbiAgLy8gcHVibGljIGFzeW5jIGV4ZWN1dGVCb2R5KCk6IFByb21pc2U8dm9pZD4ge31cbiAgLy8gcHVibGljIGFzeW5jIGV4ZWN1dGVDaGlsZHJlbigpOiBQcm9taXNlPHZvaWQ+IHt9XG4gIHB1YmxpYyBhc3luYyBsb2coKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICBsZXQgYW55Q2hpbGRyZW5GYWlsZWQgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLiNjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgY29uc29sZS5sb2coVEVTVCArIFwiIFwiICsgdGhpcy4jZGVzY3JpcHRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuI3Bhc3NlZCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFBBU1MgKyBcIiBcIiArIHRoaXMuI2Rlc2NyaXB0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKEZBSUwgKyBcIiBcIiArIHRoaXMuI2Rlc2NyaXB0aW9uKTtcblxuICAgICAgICAgIF9TVERJT19NQU5JUF8uaW5kZW50ICs9IDI7XG4gICAgICAgICAgaWYgKHRoaXMuI2Vycm9yKSB7XG4gICAgICAgICAgICBpZiAodGhpcy4jZGVsZXRlU3RhY2tzICYmIHRoaXMuI2Vycm9yIGluc3RhbmNlb2YgRXJyb3IpIGRlbGV0ZSB0aGlzLiNlcnJvci5zdGFjaztcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGhpcy4jdGhyb3dzKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHRoaXMuI3Rocm93cy5tZXNzYWdlIHx8XG4gICAgICAgICAgICAgIHRoaXMuI3Rocm93cy5jb25zdHJ1Y3RlZEJ5IHx8XG4gICAgICAgICAgICAgIHRoaXMuI3Rocm93cy5wcmVkaWNhdGVcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XTpcIik7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jdGhyb3dzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbZXhwZWN0ZWQgdGhyb3ddXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudCAtPSAyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsZXQgbkNoaWxkcmVuQmVmb3JlID0gdGhpcy4jY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgZm9yIChjb25zdCBwYyBvZiB0ZXN0c0J5U29ydGVkUHJpb3JpdHkodGhpcy4jY2hpbGRyZW4pKSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgcGNbMV0pIHtcbiAgICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudCArPSAyO1xuICAgICAgICAgIGF3YWl0IGNoaWxkLm9uY2VSZWFkeTtcbiAgICAgICAgICBhd2FpdCBjaGlsZC5sb2coKTtcbiAgICAgICAgICBhbnlDaGlsZHJlbkZhaWxlZCA9IGFueUNoaWxkcmVuRmFpbGVkIHx8ICFjaGlsZC5wYXNzZWQ7XG4gICAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgLT0gMjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMuI2NoaWxkcmVuLmxlbmd0aCA+IG5DaGlsZHJlbkJlZm9yZSlcbiAgICAgICAgdGhyb3cgbmV3IFRlc3R0c1R5cGVFcnJvcihcbiAgICAgICAgICBcImZvdW5kIGEgc3ViY2hpbGQgYXR0YWNoZWQgdG8gYSBub24taW1tZWRpYXRlIHBhcmVudC4uLiBcIiArXG4gICAgICAgICAgICBcImNoZWNrIGZvciBtaXNzaW5nIGB0ZXN0YCBwYXJhbWV0ZXJzXCJcbiAgICAgICAgKTtcbiAgICAgIGlmIChhbnlDaGlsZHJlbkZhaWxlZCAmJiB0aGlzLiNwYXNzZWQpIHtcbiAgICAgICAgLy8gaWYgYW55IGNoaWxkcmVuIGZhaWxlZCBidXQgdGhpcyB0ZXN0IGJvZHkgZGlkIG5vdCwgcmVwb3J0IGZhaWx1cmVcbiAgICAgICAgLS1fTl9URVNUU19QQVNTRURfO1xuICAgICAgICArK19OX1RFU1RTX0ZBSUxFRF87XG4gICAgICAgIHRoaXMuI3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICBjb25zb2xlLmVycm9yKEZBSUwpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLiNjaGlsZHJlbi5sZW5ndGggJiYgIXRoaXMuI3Bhc3NlZCkge1xuICAgICAgICAvLyBlbHNlIGlmIHRoZXJlIHdhcyBjaGlsZCBvdXRwdXQgZm9yIGEgZmFpbGVkIHBhcmVudCwgcmVwb3J0IGZhaWx1cmVcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoRkFJTCArIFwiIFwiKTtcbiAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgKz0gMjtcbiAgICAgICAgaWYgKHRoaXMuI2Vycm9yKSB7XG4gICAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnROZXdsaW5lc09ubHkgPSB0cnVlO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jZXJyb3IpO1xuICAgICAgICAgIF9TVERJT19NQU5JUF8uaW5kZW50TmV3bGluZXNPbmx5ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuI3Rocm93cykge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHRoaXMuI3Rocm93cy5tZXNzYWdlIHx8XG4gICAgICAgICAgICB0aGlzLiN0aHJvd3MuY29uc3RydWN0ZWRCeSB8fFxuICAgICAgICAgICAgdGhpcy4jdGhyb3dzLnByZWRpY2F0ZVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd106XCIpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLiN0aHJvd3MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgLT0gMjtcbiAgICAgIH1cblxuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgICBib2R5OiBUZXN0Qm9keTxUPixcbiAgICBvbmRhdGE6IChkYXRhPzogVCkgPT4gdm9pZCxcbiAgICBvbmVycjogKGVycj86IGFueSkgPT4gdm9pZCxcbiAgICB0aHJvd3M/OiBUaHJvd0Rlc2NyaXB0b3IsXG4gICAgZGVsZXRlU3RhY2tzPzogYm9vbGVhblxuICApIHtcbiAgICB0aGlzLiNkZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xuICAgIHRoaXMuI3Rocm93cyA9IHRocm93cztcbiAgICB0aGlzLiNkZWxldGVTdGFja3MgPSBkZWxldGVTdGFja3M7XG4gICAgdGhpcy4jb25jZVJlYWR5ID0gbmV3IFByb21pc2U8dm9pZD4oYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJvZHkoXG4gICAgICAgICAgbWFrZUFQSShcbiAgICAgICAgICAgIChjaGlsZCkgPT4gdGhpcy4jY2hpbGRyZW4ucHVzaChjaGlsZCksXG4gICAgICAgICAgICAocHJpb3JpdHkpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy4jcHJpb3JpdHkgPSBwcmlvcml0eTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWxldGVTdGFja3NcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICAgIGlmICghdGhyb3dzKSB7XG4gICAgICAgICAgKytfTl9URVNUU19QQVNTRURfO1xuICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IHRydWU7XG4gICAgICAgICAgb25kYXRhKHJlc3VsdCk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICsrX05fVEVTVFNfRkFJTEVEXztcbiAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICBvbmVycigpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLiNlcnJvciA9IGU7XG4gICAgICAgIGlmICh0aHJvd3MpIHtcbiAgICAgICAgICBpZiAodGhyb3dzLm1lc3NhZ2UgfHwgdGhyb3dzLmNvbnN0cnVjdGVkQnkgfHwgdGhyb3dzLnByZWRpY2F0ZSkge1xuICAgICAgICAgICAgLy8gdGhyb3cgd2FzIGRlc2NyaWJlZDsgY2hlY2sgdGhlIGRlc2NyaXB0b3JcbiAgICAgICAgICAgIGlmICh0aHJvd3MucHJlZGljYXRlKSB7XG4gICAgICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9ICEhdGhyb3dzLnByZWRpY2F0ZShlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhyb3dzLmNvbnN0cnVjdGVkQnkgJiYgdGhyb3dzLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgdGhpcy4jcGFzc2VkID1cbiAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgdGhyb3dzLmNvbnN0cnVjdGVkQnkgJiZcbiAgICAgICAgICAgICAgICBlLm1lc3NhZ2UgPT09IHRocm93cy5tZXNzYWdlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aHJvd3MuY29uc3RydWN0ZWRCeSkge1xuICAgICAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBlIGluc3RhbmNlb2YgdGhyb3dzLmNvbnN0cnVjdGVkQnk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRocm93cy5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IGUubWVzc2FnZSA9PT0gdGhyb3dzLm1lc3NhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4jcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy4jcGFzc2VkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuI3Bhc3NlZCkge1xuICAgICAgICAgICsrX05fVEVTVFNfUEFTU0VEXztcbiAgICAgICAgICBvbmRhdGEoKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKytfTl9URVNUU19GQUlMRURfO1xuICAgICAgICAgIG9uZXJyKGUpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgI3ByaW9yaXR5ID0gMDtcbiAgI2Rlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICNkZWxldGVTdGFja3M/OiBib29sZWFuO1xuICAjcGFzc2VkID0gZmFsc2U7XG4gICNlcnJvcjogYW55IHwgbnVsbCA9IG51bGw7XG4gICN0aHJvd3M/OiBUaHJvd0Rlc2NyaXB0b3I7XG4gICNjaGlsZHJlbjogVGVzdDxhbnk+W10gPSBbXTtcblxuICAjb25jZVJlYWR5OiBQcm9taXNlPHZvaWQ+O1xufVxuXG5mdW5jdGlvbiBtYWtlQVBJKFxuICByZWdpc3RlckNoaWxkOiA8VD4oY2hpbGQ6IFRlc3Q8VD4pID0+IHZvaWQsXG4gIHJlZ2lzdGVyUHJpb3JpdHk6IChwcmlvcml0eTogbnVtYmVyKSA9PiB2b2lkLFxuICBkZWxldGVTdGFja3M/OiBib29sZWFuXG4pOiBBUEkge1xuICBmdW5jdGlvbiB0aHJvd3MoY29uc3RydWN0b3I6IEVycm9yU3ViQ29uc3RydWN0b3IsIG1lc3NhZ2U/OiBzdHJpbmcpOiBBUEk7XG4gIGZ1bmN0aW9uIHRocm93cyhtZXNzYWdlOiBzdHJpbmcpOiBBUEk7XG4gIGZ1bmN0aW9uIHRocm93cyhpc0NvcnJlY3RUaHJvdzogUHJlZGljYXRlPFtFcnJvclN1YiB8IGFueV0+KTogQVBJO1xuICBmdW5jdGlvbiB0aHJvd3MoKTogQVBJO1xuICBmdW5jdGlvbiB0aHJvd3M8VD4oZGVzY3JpcHRpb246IHN0cmluZywgYm9keTogVGVzdEJvZHk8VD4pOiBQcm9taXNlPFQ+O1xuICBmdW5jdGlvbiB0aHJvd3M8VD4oXG4gICAgdGhyb3dPclRlc3REZXNjcj86XG4gICAgICB8IHN0cmluZ1xuICAgICAgfCBFcnJvclN1YkNvbnN0cnVjdG9yXG4gICAgICB8IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPixcbiAgICBtZXNzYWdlT3JCb2R5Pzogc3RyaW5nIHwgVGVzdEJvZHk8VD5cbiAgKSB7XG4gICAgaWYgKCF0aHJvd09yVGVzdERlc2NyICYmICFtZXNzYWdlT3JCb2R5KSB7XG4gICAgICAvLyBpZiBubyBhcmd1bWVudHMgd2VyZSBwcm92aWRlZCwgc2ltcGx5IGNyZWF0ZSBhIHRlc3QgZXhwZWN0aW5nIHRocm93XG4gICAgICByZXR1cm4gZ2VuVGVzdEZuKHt9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aHJvd09yVGVzdERlc2NyID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAvLyBpZiBhcmcwIGlzIGEgc3RyaW5nLCBpdCBpcyBlaXRoZXIgYW4gZXJyb3IgbWVzc2FnZSBvciB0ZXN0IGRlc2NyaXB0aW9uXG4gICAgICBpZiAodHlwZW9mIG1lc3NhZ2VPckJvZHkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAvLyBhcmcwIGlzIGEgdGVzdCBkZXNjcmlwdGlvbjsgYXJnMSBpcyBhIHRlc3QgYm9keVxuICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHt9KSh0aHJvd09yVGVzdERlc2NyLCBtZXNzYWdlT3JCb2R5KTtcbiAgICAgIH0gZWxzZSBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIGFyZzAgaXMgYSBtZXNzYWdlOyBhcmcxIGlzIHVudXNlZFxuICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHsgbWVzc2FnZTogdGhyb3dPclRlc3REZXNjciB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgYSBuZXcgdGVzdCBib2R5IGFzIGl0cyBzZWNvbmQgYXJndW1lbnQgaWYgdGhlIFwiICtcbiAgICAgICAgICAgIFwiZmlyc3QgYXJndW1lbnQgaXMgYSBzdHJpbmdcIixcbiAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aHJvd09yVGVzdERlc2NyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIGlmIGFyZzAgaXMgYSBmdW5jdGlvbiwgaXQgaXMgZWl0aGVyIGEgdGhyb3cgcHJlZGljYXRlIG9yIGNvbnN0cnVjdG9yXG4gICAgICBpZiAoXG4gICAgICAgIHRocm93T3JUZXN0RGVzY3IgPT09IEVycm9yIHx8XG4gICAgICAgIHRocm93T3JUZXN0RGVzY3IucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3JcbiAgICAgICkge1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2VPckJvZHkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAvLyBhcmcwIGlzIGFuIGVycm9yIGNvbnN0cnVjdG9yOyBhcmcxIGFuIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIGNvbnN0cnVjdGVkQnk6IHRocm93T3JUZXN0RGVzY3IgYXMgRXJyb3JTdWJDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VPckJvZHksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gYXJnMCBpcyBhbiBlcnJvciBjb25zdHJ1Y3RvcjsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIGNvbnN0cnVjdGVkQnk6IHRocm93T3JUZXN0RGVzY3IgYXMgRXJyb3JTdWJDb25zdHJ1Y3RvcixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgZWl0aGVyIGFuIGVycm9yIG1lc3NhZ2Ugb3IgYSBuZXcgdGVzdCBib2R5IFwiICtcbiAgICAgICAgICAgICAgXCJhcyBpdHMgc2Vjb25kIGFyZ3VtZW50XCIsXG4gICAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChtZXNzYWdlT3JCb2R5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBhcmcwIGlzIGFuIGVycm9yIHByZWRpY2F0ZTsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIHByZWRpY2F0ZTogdGhyb3dPclRlc3REZXNjciBhcyBQcmVkaWNhdGU8W0Vycm9yIHwgYW55XT4sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGFuIGVtcHR5IHNlY29uZCBhcmd1bWVudCBpZiB0aGUgZmlyc3QgaXMgYSBcIiArXG4gICAgICAgICAgICAgIFwidGhyb3cgcHJlZGljYXRlIChhIGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgY29uc3RydWN0IEVycm9ycylcIixcbiAgICAgICAgICAgIHRocm93T3JUZXN0RGVzY3IsXG4gICAgICAgICAgICBtZXNzYWdlT3JCb2R5XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgXCJ0ZXN0LnRocm93cyByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlLCBlcnJvciBjb25zdHJ1Y3RvciwgcHJlZGljYXRlLCBcIiArXG4gICAgICAgICAgXCJvciBuZXcgdGVzdCBkZXNjcmlwdGlvbiBhcyBpdHMgZmlyc3QgYXJndW1lbnRcIixcbiAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZ2VuVGVzdEZuKGV4cGVjdGVkVGhyb3c/OiBUaHJvd0Rlc2NyaXB0b3IpIHtcbiAgICBsZXQgcGFzc0RlbGV0ZVN0YWNrcyA9IHRydWU7XG4gICAgY29uc3QgdGVzdCA9IDxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD4gPT4ge1xuICAgICAgaWYgKHR5cGVvZiBib2R5ICE9PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgIFwidGVzdHMgd2l0aCBkZXNjcmlwdGlvbnMgcmVxdWlyZSBhIHRlc3QgYm9keVwiXG4gICAgICAgICk7XG4gICAgICBjb25zdCBleGVjdXRpb246IFByb21pc2U8VD4gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHQgPSBuZXcgVGVzdChcbiAgICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgICBib2R5LFxuICAgICAgICAgIHJlc29sdmUgYXMgKGRhdGE/OiBUKSA9PiB2b2lkLFxuICAgICAgICAgIHJlamVjdCxcbiAgICAgICAgICBleHBlY3RlZFRocm93LFxuICAgICAgICAgIHBhc3NEZWxldGVTdGFja3MgPyBkZWxldGVTdGFja3MgOiBmYWxzZVxuICAgICAgICApO1xuICAgICAgICByZWdpc3RlckNoaWxkKHQpO1xuICAgICAgfSk7XG4gICAgICBfVEVTVF9QUk9NSVNFU18uYWRkKGV4ZWN1dGlvbik7XG4gICAgICByZXR1cm4gZXhlY3V0aW9uO1xuICAgIH07XG4gICAgdGVzdC50aHJvd3MgPSB0aHJvd3M7XG4gICAgdGVzdC5kZWxldGVTdGFja3MgPSAoc2V0dGluZyA9IHRydWUsIHBhc3NUb0NoaWxkcmVuID0gdHJ1ZSkgPT4ge1xuICAgICAgZGVsZXRlU3RhY2tzID0gc2V0dGluZztcbiAgICAgIHBhc3NEZWxldGVTdGFja3MgPSBwYXNzVG9DaGlsZHJlbjtcbiAgICB9O1xuICAgIHRlc3QucHJpb3JpdHkgPSAoc2V0dGluZyA9IDApID0+IHtcbiAgICAgIHJlZ2lzdGVyUHJpb3JpdHkoc2V0dGluZyk7XG4gICAgfTtcbiAgICByZXR1cm4gdGVzdDtcbiAgfVxuICByZXR1cm4gZ2VuVGVzdEZuKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdsb2JhbFRlc3RMYXVuY2hlcigpIHtcbiAgLy8gY2F0Y2ggYW55IHVuaGFuZGxlZCByZWplY3Rpb25zIHRocm93biBieSB0ZXN0c1xuICBwcm9jZXNzLmFkZExpc3RlbmVyKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIChkZXRhaWxzLCBwcm9taXNlKSA9PiB7XG4gICAgLy8gb25seSBsb2cgdW5oYW5kbGVkIHJlamVjdGlvbnMgaWYgdGhleSBkb24ndCBkaXJlY3RseSBiZWxvbmcgdG8gYSB0ZXN0XG4gICAgaWYgKCFfVEVTVF9QUk9NSVNFU18uaGFzKHByb21pc2UpKSB7XG4gICAgICBfU1RESU9fTUFOSVBfLnJlc2V0KCk7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcIlt0ZXN0dHNdIEVycm9yOiBVbmhhbmRsZWQgcHJvbWlzZSByZWplY3Rpb24uIEV4aXRpbmcuIFNlZSBiZWxvdzpcIlxuICAgICAgKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZGV0YWlscyk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBzaGlmdCBhbGwgdGVzdCBvdXRwdXQgYnkgMVxuICBfU1RESU9fTUFOSVBfLmluZGVudCA9IDE7XG5cbiAgLy8gY2hlY2sgZm9yIG9wdGlvbnNcbiAgbGV0IG1hdGNoZXI6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDI7IGkgPCBwcm9jZXNzLmFyZ3YubGVuZ3RoIC0gMTsgKytpKSB7XG4gICAgaWYgKFxuICAgICAgcHJvY2Vzcy5hcmd2W2ldLnRyaW0oKSA9PT0gXCItLW1hdGNoXCIgfHxcbiAgICAgIHByb2Nlc3MuYXJndltpXS50cmltKCkgPT09IFwiLW1cIlxuICAgICkge1xuICAgICAgbWF0Y2hlciA9IHByb2Nlc3MuYXJndltpICsgMV07XG4gICAgICBwcm9jZXNzLmFyZ3Yuc3BsaWNlKGksIDIpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHBhdGhzID0gYXdhaXQgZmluZFRlc3RQYXRocyhtYXRjaGVyKTtcbiAgY29uc3QgZmlsZVRlc3RzOiBUZXN0PHZvaWQ+W10gPSBbXTtcbiAgZm9yIChjb25zdCBwIG9mIHBhdGhzKSB7XG4gICAgZmlsZVRlc3RzLnB1c2goXG4gICAgICBuZXcgVGVzdChcbiAgICAgICAgQU5TSV9DWUFOX0ZHICsgcGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBwKSArIEFOU0lfUkVTRVQsXG4gICAgICAgICh0ZXN0KSA9PiB7XG4gICAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgICAgICB0ZXN0LFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmVxdWlyZShwKTtcbiAgICAgICAgfSxcbiAgICAgICAgKCkgPT4ge30sXG4gICAgICAgICgpID0+IHt9XG4gICAgICApXG4gICAgKTtcbiAgfVxuICBjb25zb2xlLmxvZyh0ZXN0c0J5U29ydGVkUHJpb3JpdHkoZmlsZVRlc3RzKSk7XG4gIGZvciAoY29uc3QgcHQgb2YgdGVzdHNCeVNvcnRlZFByaW9yaXR5KGZpbGVUZXN0cykpIHtcbiAgICBmb3IgKGNvbnN0IHQgb2YgcHRbMV0pIHtcbiAgICAgIGF3YWl0IHQub25jZVJlYWR5O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHQgb2YgcHRbMV0pIHtcbiAgICAgIGF3YWl0IHQubG9nKCk7XG4gICAgfVxuICB9XG59XG5cbmlmIChwcm9jZXNzLmFyZ3YubGVuZ3RoID49IDMpIHtcbiAgZ2xvYmFsVGVzdExhdW5jaGVyKClcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICBfU1RESU9fTUFOSVBfLnJlc2V0KCk7XG4gICAgICBpZiAoX05fVEVTVFNfRkFJTEVEXykge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIFwiXFxuXCIgK1xuICAgICAgICAgICAgQU5TSV9SRURfRkcgK1xuICAgICAgICAgICAgXCJwYXNzZWQgW1wiICtcbiAgICAgICAgICAgIF9OX1RFU1RTX1BBU1NFRF8gK1xuICAgICAgICAgICAgXCIvXCIgK1xuICAgICAgICAgICAgKF9OX1RFU1RTX1BBU1NFRF8gKyBfTl9URVNUU19GQUlMRURfKSArXG4gICAgICAgICAgICBcIl0gdGVzdHNcIiArXG4gICAgICAgICAgICBBTlNJX1JFU0VUXG4gICAgICAgICk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgXCJcXG5cIiArXG4gICAgICAgICAgICBBTlNJX0dSRUVOX0ZHICtcbiAgICAgICAgICAgIFwicGFzc2VkIFtcIiArXG4gICAgICAgICAgICBfTl9URVNUU19QQVNTRURfICtcbiAgICAgICAgICAgIFwiL1wiICtcbiAgICAgICAgICAgIChfTl9URVNUU19QQVNTRURfICsgX05fVEVTVFNfRkFJTEVEXykgK1xuICAgICAgICAgICAgXCJdIHRlc3RzXCIgK1xuICAgICAgICAgICAgQU5TSV9SRVNFVFxuICAgICAgICApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goKGUpID0+IHtcbiAgICAgIF9TVERJT19NQU5JUF8ucmVzZXQoKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfSk7XG59XG4iXX0=