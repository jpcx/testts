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
var _Test_handleSuccessfulExecution, _Test_handleFailedExecution, _Test_priority, _Test_description, _Test_deleteStacks, _Test_passed, _Test_error, _Test_throws, _Test_children, _Test_body;
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
    constructor(description, body, throws, deleteStacks) {
        _Test_handleSuccessfulExecution.set(this, (result) => {
            if (!__classPrivateFieldGet(this, _Test_throws, "f")) {
                ++N_TESTS_PASSED;
                __classPrivateFieldSet(this, _Test_passed, true, "f");
            }
            else {
                ++N_TESTS_FAILED;
                __classPrivateFieldSet(this, _Test_passed, false, "f");
            }
            return result;
        });
        _Test_handleFailedExecution.set(this, (err) => {
            __classPrivateFieldSet(this, _Test_error, err, "f");
            if (__classPrivateFieldGet(this, _Test_throws, "f")) {
                if (__classPrivateFieldGet(this, _Test_throws, "f").message ||
                    __classPrivateFieldGet(this, _Test_throws, "f").constructedBy ||
                    __classPrivateFieldGet(this, _Test_throws, "f").predicate) {
                    if (__classPrivateFieldGet(this, _Test_throws, "f").predicate) {
                        __classPrivateFieldSet(this, _Test_passed, !!__classPrivateFieldGet(this, _Test_throws, "f").predicate(err), "f");
                    }
                    else if (__classPrivateFieldGet(this, _Test_throws, "f").constructedBy && __classPrivateFieldGet(this, _Test_throws, "f").message) {
                        __classPrivateFieldSet(this, _Test_passed, err instanceof __classPrivateFieldGet(this, _Test_throws, "f").constructedBy &&
                            err.message === __classPrivateFieldGet(this, _Test_throws, "f").message, "f");
                    }
                    else if (__classPrivateFieldGet(this, _Test_throws, "f").constructedBy) {
                        __classPrivateFieldSet(this, _Test_passed, err instanceof __classPrivateFieldGet(this, _Test_throws, "f").constructedBy, "f");
                    }
                    else if (__classPrivateFieldGet(this, _Test_throws, "f").message) {
                        __classPrivateFieldSet(this, _Test_passed, err.message === __classPrivateFieldGet(this, _Test_throws, "f").message, "f");
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
            if (!__classPrivateFieldGet(this, _Test_passed, "f")) {
                ++N_TESTS_PASSED;
            }
            else {
                ++N_TESTS_FAILED;
            }
        });
        _Test_priority.set(this, 0);
        _Test_description.set(this, void 0);
        _Test_deleteStacks.set(this, void 0);
        _Test_passed.set(this, false);
        _Test_error.set(this, null);
        _Test_throws.set(this, void 0);
        _Test_children.set(this, []);
        _Test_body.set(this, void 0);
        __classPrivateFieldSet(this, _Test_description, description, "f");
        __classPrivateFieldSet(this, _Test_throws, throws, "f");
        __classPrivateFieldSet(this, _Test_deleteStacks, deleteStacks, "f");
        __classPrivateFieldSet(this, _Test_body, body, "f");
    }
    get priority() {
        return __classPrivateFieldGet(this, _Test_priority, "f");
    }
    get passed() {
        return __classPrivateFieldGet(this, _Test_passed, "f");
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return __classPrivateFieldGet(this, _Test_handleSuccessfulExecution, "f").call(this, yield __classPrivateFieldGet(this, _Test_body, "f").call(this, makeAPI((child) => __classPrivateFieldGet(this, _Test_children, "f").push(child), (priority) => {
                    __classPrivateFieldSet(this, _Test_priority, priority, "f");
                }, __classPrivateFieldGet(this, _Test_deleteStacks, "f"))));
            }
            catch (e) {
                __classPrivateFieldGet(this, _Test_handleFailedExecution, "f").call(this, e);
                throw e;
            }
        });
    }
    executeChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const ch of __classPrivateFieldGet(this, _Test_children, "f")) {
                try {
                    yield ch.execute();
                }
                catch (_) {
                    if (__classPrivateFieldGet(this, _Test_passed, "f")) {
                        __classPrivateFieldSet(this, _Test_passed, false, "f");
                        --N_TESTS_PASSED;
                        ++N_TESTS_FAILED;
                    }
                }
            }
        });
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
            for (const pc of testsBySortedPriority(__classPrivateFieldGet(this, _Test_children, "f"))) {
                for (const child of pc[1]) {
                    STDIO_MANIP.indent += 2;
                    yield child.log();
                    anyChildrenFailed = anyChildrenFailed || !child.passed;
                    STDIO_MANIP.indent -= 2;
                }
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
_Test_handleSuccessfulExecution = new WeakMap(), _Test_handleFailedExecution = new WeakMap(), _Test_priority = new WeakMap(), _Test_description = new WeakMap(), _Test_deleteStacks = new WeakMap(), _Test_passed = new WeakMap(), _Test_error = new WeakMap(), _Test_throws = new WeakMap(), _Test_children = new WeakMap(), _Test_body = new WeakMap();
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
            const t = new Test(description, body, expectedThrow, passDeleteStacks ? deleteStacks : false);
            registerChild(t);
            const execution = t.execute();
            TEST_PROMISES.add(execution);
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
        const paths = yield findTestPaths(matcher);
        const fileTests = [];
        for (const p of paths) {
            const t = new Test(ANSI_CYAN_FG + path.relative(process.cwd(), p) + ANSI_RESET, (test) => {
                module.exports = {
                    test,
                };
                require(p);
            });
            yield t.execute();
            fileTests.push(t);
        }
        console.log(testsBySortedPriority(fileTests));
        for (const pt of testsBySortedPriority(fileTests)) {
            for (const t of pt[1]) {
                yield t.executeChildren();
                yield t.log();
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9DQSx5QkFBeUI7QUFDekIsNkJBQTZCO0FBOEM3QixNQUFNLG1CQUFvQixTQUFRLEtBQUs7SUFFckMsWUFBWSxHQUFXLEVBQUUsS0FBYTtRQUNwQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxtQkFBb0IsU0FBUSxLQUFLO0lBRXJDLFlBQVksR0FBVyxFQUFFLEdBQUcsSUFBVztRQUNyQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBQ0QsTUFBTSxlQUFnQixTQUFRLFNBQVM7SUFDckMsWUFBWSxHQUFXO1FBQ3JCLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFHRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDO0FBQ2pDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxVQUFVLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDO0FBQzdCLE1BQU0sSUFBSSxHQUFHLFlBQVksR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQzlDLE1BQU0sSUFBSSxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBRTVDLFNBQVMsc0JBQXNCLENBQUMsR0FBVyxFQUFFLE9BQWU7SUFDMUQs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QUFjO2dCQUNkLEdBQUc7Z0JBQ0gsQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO2dCQUNqQyxTQUFTO2dCQUNULFVBQVUsQ0FDYixDQUFDO1lBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQjthQUFNO1lBQ0wsT0FBTyxDQUFDLEtBQUssQ0FDWCxJQUFJO2dCQUNGLGFBQWE7Z0JBQ2IsVUFBVTtnQkFDVixjQUFjO2dCQUNkLEdBQUc7Z0JBQ0gsQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO2dCQUNqQyxTQUFTO2dCQUNULFVBQVUsQ0FDYixDQUFDO1lBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQjtJQUNILENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ1gsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztDQUNOIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqKiogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKlxuICoqKiAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqICAgICAgICAgICAgICA6cCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOnAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgICAgICAgICAgICAgICAgICAgICAgICAgXyAgICAgOnggICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgLm94b3hveHAgICAgICAgICAgLjpveG8gICAgICA6cCAgIDpveG94b3hwIC46b3hvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICA6eG94b3hveCAgLm94ICAgICAueCAgb3hvIHAgICA6eCAgOnhveG94b3ggLnggIG94byBwICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6ZCAgIC54IG94byAgICA6bywgIGB4b2AgLm94b3hveHAgOmQgICAgOm8sICBgeG9gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgLm8gICB4b3ggIDp4b3ggICAgICA6eG94b3hveCAgOnggICA6eG94ICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOnggICAgb3hvICAgOm94ICAgICAgICA6ZCAgICAgOm8gICAgIDpveCAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOm94b3hveG8gICAgICA6eG8gICAgICA6eCAgICAgOnggICAgICAgOnhvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOm94b3hveCAgICAgICAgIDpveCAgICA6byAgICAgOm8gICAgICAgICA6b3ggICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOngsICAgICAgICAub3gsICA6byAgICA6eCAgICAgOnggICAgLm94LCAgOm8gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6cSwgOm94LCAgIC54IGQneG94byB4YCAgICA6byAgICAgOnEsICBkJ3hveG8geGAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAnOnggIDp4b3hveG9gICAgIC5veG9gICAgICA6cSwgICAgJzp4ICAgICAub3hvYCAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICA6eG94b2AgICAgICAgICAgICAgICAnOnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgIEBsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9qcGN4L3Rlc3R0cyAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBsaWNlbnNlIExHUEwtMy4wLW9yLWxhdGVyICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBjb3B5cmlnaHQgKEMpIDIwMjEgSnVzdGluIENvbGxpZXIgPG1AanBjeC5kZXY+ICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgICAgKlxuICogICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgICAgICAgICAgKlxuICogICAgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlICAgICAgKlxuICogICAgTGljZW5zZSwgb3IgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi4gICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsICAgICAgICAgKlxuICogICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGludGVybmFsaWVkIHdhcnJhbnR5IG9mICAgICAgKlxuICogICAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZSAgICAgICAgICAgKlxuICogICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSAqKlxuICogIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiAgSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi4gICoqKlxuICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKioqKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmV4cG9ydCB0eXBlIFRlc3RCb2R5U3luYzxUPiA9ICh0ZXN0OiBUZXN0QVBJKSA9PiBUO1xuZXhwb3J0IHR5cGUgVGVzdEJvZHlBc3luYzxUPiA9ICh0ZXN0OiBUZXN0QVBJKSA9PiBQcm9taXNlPFQ+O1xuZXhwb3J0IHR5cGUgVGVzdEJvZHk8VD4gPSBUZXN0Qm9keVN5bmM8VD4gfCBUZXN0Qm9keUFzeW5jPFQ+O1xuZXhwb3J0IHR5cGUgUHJlZGljYXRlPFQgZXh0ZW5kcyBBcnJheTxhbnk+PiA9ICguLi5hcmdzOiBUKSA9PiBhbnk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdWIgZXh0ZW5kcyBFcnJvciB7fVxuZXhwb3J0IGludGVyZmFjZSBFcnJvclN1YkNvbnN0cnVjdG9yIHtcbiAgbmV3ICguLi5hcmdzOiBhbnlbXSk6IEVycm9yU3ViO1xuICBwcm90b3R5cGU6IEVycm9yU3ViO1xufVxuXG4vKiogUmVnaXN0ZXJzIGEgbmV3IHRlc3QuICAqL1xuZXhwb3J0IHR5cGUgVGVzdEFQSSA9IHR5cGVvZiB0ZXN0O1xuLyoqIFJlZ2lzdGVycyBhIG5ldyB0ZXN0LiAgKi9cbmV4cG9ydCBkZWNsYXJlIGNvbnN0IHRlc3Q6IHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIG5ldyB0ZXN0LlxuICAgKiBAcGFyYW0gICAgZGVzY3JpcHRpb24gIC0gYW55IHN0cmluZyBkZXNjcmlwdGlvbiB0byBkZXNjcmliZSB0aGUgdGVzdC5cbiAgICogQHBhcmFtICAgIGJvZHkgICAgICAgICAtIGV4ZWN1dGlvbiBib2R5IHRoYXQgc2hvdWxkIHRocm93IG9uIGZhaWx1cmUuXG4gICAqL1xuICA8VD4oZGVzY3JpcHRpb246IHN0cmluZywgYm9keTogVGVzdEJvZHk8VD4pOiBQcm9taXNlPFQ+O1xuICAvKiogRGVzY3JpYmUgYW4gZXhwZWN0ZWQgdGhyb3cgKi9cbiAgdGhyb3dzOiB7XG4gICAgKGNvbnN0cnVjdG9yOiBFcnJvclN1YkNvbnN0cnVjdG9yLCBtZXNzYWdlPzogc3RyaW5nKTogVGVzdEFQSTtcbiAgICAobWVzc2FnZTogc3RyaW5nKTogVGVzdEFQSTtcbiAgICAoaXNDb3JyZWN0VGhyb3c6IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPik6IFRlc3RBUEk7XG4gICAgKCk6IFRlc3RBUEk7XG4gICAgPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPjtcbiAgfTtcbiAgLyoqXG4gICAqIERlbGV0ZSBzdGFjayB0cmFjZXMgKHNldHRpbmc9dHJ1ZSkuXG4gICAqIE9wdGlvbmFsbHkgcGFzcyB0aGlzIHNldHRpbmdzIHRvIGNoaWxkcmVuIChwYXNzVG9DaGlsZHJlbj10cnVlKVxuICAgKi9cbiAgZGVsZXRlU3RhY2tzKHNldHRpbmc/OiBib29sZWFuLCBwYXNzVG9DaGlsZHJlbj86IGJvb2xlYW4pOiB2b2lkO1xuICAvKiogT3B0aW9uYWxseSBzZXQgYW4gZXhlY3V0aW9uIHByaW9yaXR5IChzZXR0aW5nPTApICovXG4gIHByaW9yaXR5KHNldHRpbmc/OiBudW1iZXIpOiB2b2lkO1xufTtcblxudHlwZSBUaHJvd0Rlc2NyaXB0b3IgPSB7XG4gIG1lc3NhZ2U/OiBzdHJpbmc7XG4gIGNvbnN0cnVjdGVkQnk/OiBFcnJvclN1YkNvbnN0cnVjdG9yO1xuICBwcmVkaWNhdGU/OiBQcmVkaWNhdGU8W0Vycm9yIHwgYW55XT47XG59O1xuXG5jbGFzcyBUZXN0dHNJbnRlcm5hbEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgY2F1c2U/OiBFcnJvcjtcbiAgY29uc3RydWN0b3Iod2h5OiBzdHJpbmcsIGNhdXNlPzogRXJyb3IpIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIEludGVybmFsIEVycm9yOiBcIiArIHdoeSk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG59XG5jbGFzcyBUZXN0dHNBcmd1bWVudEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgYXJnczogYW55W107XG4gIGNvbnN0cnVjdG9yKHdoeTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkge1xuICAgIHN1cGVyKFwiW3Rlc3R0c10gQXJndW1lbnQgRXJyb3I6IFwiICsgd2h5KTtcbiAgICB0aGlzLmFyZ3MgPSBhcmdzO1xuICB9XG59XG5jbGFzcyBUZXN0dHNUeXBlRXJyb3IgZXh0ZW5kcyBUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih3aHk6IHN0cmluZykge1xuICAgIHN1cGVyKFwiW3Rlc3R0c10gVHlwZSBFcnJvcjogXCIgKyB3aHkpO1xuICB9XG59XG5cbi8vIGdsb2JhbCBjb25zdGFudHNcbmNvbnN0IEFOU0lfR1JBWV9GRyA9IFwiXFx4MWJbOTBtXCI7XG5jb25zdCBBTlNJX0dSRUVOX0ZHID0gXCJcXHgxYlszMm1cIjtcbmNvbnN0IEFOU0lfUkVEX0ZHID0gXCJcXHgxYlszMW1cIjtcbmNvbnN0IEFOU0lfQ1lBTl9GRyA9IFwiXFx4MWJbMzZtXCI7XG5jb25zdCBBTlNJX1JFU0VUID0gXCJcXHgxYlswbVwiO1xuY29uc3QgVEVTVCA9IEFOU0lfR1JBWV9GRyArIFwi4pa3XCIgKyBBTlNJX1JFU0VUO1xuY29uc3QgUEFTUyA9IEFOU0lfR1JFRU5fRkcgKyBcIuKck1wiICsgQU5TSV9SRVNFVDtcbmNvbnN0IEZBSUwgPSBBTlNJX1JFRF9GRyArIFwi4pyXXCIgKyBBTlNJX1JFU0VUO1xuXG5mdW5jdGlvbiBhZGRJbmRlbnRBZnRlck5ld2xpbmVzKHN0cjogc3RyaW5nLCBzcGFjaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gc3RyLnNwbGl0KFwiXFxuXCIpLnJlZHVjZSgoYSwgdiwgaSwgXykgPT4ge1xuICAgIGlmIChpID09PSAwKSBhICs9IHY7XG4gICAgZWxzZSBpZiAoaSA9PT0gXy5sZW5ndGggLSAxKSBhICs9IFwiXFxuXCIgKyB2O1xuICAgIGVsc2UgYSArPSBcIlxcblwiICsgc3BhY2luZyArIHY7XG4gICAgcmV0dXJuIGE7XG4gIH0sIFwiXCIpO1xufVxuXG5pbnRlcmZhY2UgU3RkaW9NYW5pcHVsYXRvciB7XG4gIGluZGVudDogbnVtYmVyO1xuICBpbmRlbnROZXdsaW5lc09ubHk6IGJvb2xlYW47XG4gIHJlc2V0OiAoKSA9PiB2b2lkO1xufVxuY2xhc3MgU3RkaW9NYW5pcHVsYXRvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGNvbnN0IF9zZWxmID0gdGhpcztcbiAgICBsZXQgX3N0ZG91dCA9IHByb2Nlc3Muc3Rkb3V0LndyaXRlLmJpbmQocHJvY2Vzcy5zdGRvdXQpO1xuICAgIGxldCBfc3RkZXJyID0gcHJvY2Vzcy5zdGRlcnIud3JpdGUuYmluZChwcm9jZXNzLnN0ZG91dCk7XG4gICAgbGV0IF9pbmRlbnQgPSAwO1xuICAgIGxldCBfaW5kZW50TmV3bGluZXNPbmx5ID0gZmFsc2U7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaW5kZW50XCIsIHtcbiAgICAgIGdldDogKCkgPT4gX2luZGVudCxcbiAgICAgIHNldDogKG46IG51bWJlcikgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIG4gIT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXCJiYWQgaW5kZW50IGFzc2lnbm1lbnRcIik7XG4gICAgICAgIF9pbmRlbnQgPSBuO1xuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImluZGVudE5ld2xpbmVzT25seVwiLCB7XG4gICAgICBnZXQ6ICgpID0+IF9pbmRlbnROZXdsaW5lc09ubHksXG4gICAgICBzZXQ6IChiOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBiICE9PSBcImJvb2xlYW5cIilcbiAgICAgICAgICB0aHJvdyBuZXcgVGVzdHRzSW50ZXJuYWxFcnJvcihcImJhZCBpbmRlbnROZXdsaW5lc09ubHkgYXNzaWdubWVudFwiKTtcbiAgICAgICAgX2luZGVudE5ld2xpbmVzT25seSA9IGI7XG4gICAgICB9LFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgfSk7XG4gICAgdGhpcy5yZXNldCA9ICgpID0+IHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gX3N0ZG91dDtcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlID0gX3N0ZGVycjtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG1ha2VXcml0ZXIod3JpdGU6IHR5cGVvZiBfc3Rkb3V0IHwgdHlwZW9mIF9zdGRlcnIpIHtcbiAgICAgIHJldHVybiAoYnVmZmVyT3JTdHI6IGFueSwgY2JPckVuY29kaW5nPzogYW55LCBjYj86IGFueSk6IGJvb2xlYW4gPT4ge1xuICAgICAgICBjb25zdCBzcGFjaW5nID0gbmV3IEFycmF5KF9zZWxmLmluZGVudCkuZmlsbChcIiBcIikuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKCFfc2VsZi5pbmRlbnROZXdsaW5lc09ubHkpIHdyaXRlKHNwYWNpbmcpO1xuICAgICAgICAvLyBpZiBwcmludGluZyBhIHN0cmluZyAodGhhdCBpcyBub3Qgb25seSB3aGl0ZXNwYWNlKVxuICAgICAgICBpZiAodHlwZW9mIGJ1ZmZlck9yU3RyID09PSBcInN0cmluZ1wiICYmIGJ1ZmZlck9yU3RyLm1hdGNoKC9cXFMvKSkge1xuICAgICAgICAgIC8vIHJlcGxhY2UgYW55IG5ld2xpbmVzIHdpdGggbmwrc3BhY2VzIChleGNlcHQgZm9yIHRoZSBsYXN0IG9uZSlcbiAgICAgICAgICBidWZmZXJPclN0ciA9IGFkZEluZGVudEFmdGVyTmV3bGluZXMoYnVmZmVyT3JTdHIsIHNwYWNpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY2JPckVuY29kaW5nID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgcmV0dXJuIHdyaXRlKGJ1ZmZlck9yU3RyLCBjYk9yRW5jb2RpbmcpO1xuICAgICAgICBlbHNlIHJldHVybiB3cml0ZShidWZmZXJPclN0ciwgY2JPckVuY29kaW5nLCBjYik7XG4gICAgICB9O1xuICAgIH1cbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG1ha2VXcml0ZXIoX3N0ZG91dCk7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUgPSBtYWtlV3JpdGVyKF9zdGRlcnIpO1xuICB9XG59XG5cbi8vIG11dGFibGUgZ2xvYmFsIGRhdGFcbmNvbnN0IFNURElPX01BTklQID0gbmV3IFN0ZGlvTWFuaXB1bGF0b3IoKTtcbmNvbnN0IFRFU1RfUFJPTUlTRVM6IFdlYWtTZXQ8UHJvbWlzZTxhbnk+PiA9IG5ldyBXZWFrU2V0KCk7XG5sZXQgTl9URVNUU19QQVNTRUQgPSAwO1xubGV0IE5fVEVTVFNfRkFJTEVEID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZmluZFRlc3RQYXRocyhcbiAgbWF0Y2hlcjogc3RyaW5nID0gXCJcXFxcLnRlc3RcXFxcLmpzXCJcbik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IGF3YWl0IChhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgXzogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBjb2xsZWN0IGFueSBtYW51YWxseSBzcGVjaWZpZWQgZmlsZXMgZmlyc3RcbiAgICBmb3IgKGxldCBpID0gMjsgaSA8IHByb2Nlc3MuYXJndi5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgY3VyID0gcHJvY2Vzcy5hcmd2W2ldO1xuICAgICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgICAgZnMubHN0YXQoY3VyLCAoZXJyLCBzdGF0KSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycik7XG4gICAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBfLnB1c2gocGF0aC5yZXNvbHZlKGN1cikpO1xuICAgICAgICBwcm9jZXNzLmFyZ3Yuc3BsaWNlKGksIDEpO1xuICAgICAgICAtLWk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBfO1xuICB9KSgpO1xuXG4gIC8vIGRlZmluZSB0aGUgZmlsZSBzZWFyY2ggZnVuY3Rpb25cbiAgYXN5bmMgZnVuY3Rpb24gc2VhcmNoKGN1cjogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgIGZzLmxzdGF0KGN1ciwgKGVyciwgc3RhdCkgPT4ge1xuICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgfSlcbiAgICApO1xuICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHBhdGguYmFzZW5hbWUoY3VyKTtcbiAgICAgIGlmIChuYW1lLm1hdGNoKG5ldyBSZWdFeHAobWF0Y2hlciwgXCJtXCIpKSkgcmVzdWx0LnB1c2gocGF0aC5yZXNvbHZlKGN1cikpO1xuICAgIH0gZWxzZSBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3Qgc3Viczogc3RyaW5nW10gPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgICBmcy5yZWFkZGlyKGN1ciwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgICBlbHNlIHJlc29sdmUoZmlsZXMpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzKSBhd2FpdCBzZWFyY2gocGF0aC5qb2luKGN1ciwgcykpO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKSB7XG4gICAgICBhd2FpdCBzZWFyY2gocGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0YXJnZXQpIHx8IFwiLi9cIik7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXG4gICAgICBcImVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIHNlYXJjaGluZyBmb3IgdGVzdHNcIixcbiAgICAgIGVcbiAgICApO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5sZW5ndGggPT09IDApXG4gICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICBcImNhbm5vdCBmaW5kIHRlc3RzXCIsXG4gICAgICAuLi5wcm9jZXNzLmFyZ3Yuc2xpY2UoMilcbiAgICApO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHRlc3RzQnlTb3J0ZWRQcmlvcml0eShcbiAgdGVzdHM6IFRlc3Q8YW55PltdXG4pOiBBcnJheTxbbnVtYmVyLCBUZXN0PGFueT5bXV0+IHtcbiAgcmV0dXJuIHRlc3RzXG4gICAgLnJlZHVjZSgoYSwgdGVzdCkgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmdJZHggPSBhLmZpbmRJbmRleCgoeCkgPT4geFswXSA9PT0gdGVzdC5wcmlvcml0eSk7XG4gICAgICBpZiAoZXhpc3RpbmdJZHggIT09IC0xKSB7XG4gICAgICAgIGFbZXhpc3RpbmdJZHhdWzFdLnB1c2godGVzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhLnB1c2goW3Rlc3QucHJpb3JpdHksIFt0ZXN0XV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGE7XG4gICAgfSwgW10gYXMgQXJyYXk8W251bWJlciwgVGVzdDxhbnk+W11dPilcbiAgICAuc29ydCgoYSwgYikgPT4gKGFbMF0gPD0gYlswXSA/IC0xIDogMSkpO1xufVxuXG5jbGFzcyBUZXN0PFQ+IHtcbiAgLyogcHVibGljIGdldCB0ZXN0KCk6IFRlc3RBUEkgeyAqL1xuXG4gIC8qIH0gKi9cbiAgcHVibGljIGdldCBwcmlvcml0eSgpIHtcbiAgICByZXR1cm4gdGhpcy4jcHJpb3JpdHk7XG4gIH1cbiAgcHVibGljIGdldCBwYXNzZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuI3Bhc3NlZDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBleGVjdXRlKCk6IFByb21pc2U8VD4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy4jaGFuZGxlU3VjY2Vzc2Z1bEV4ZWN1dGlvbihcbiAgICAgICAgYXdhaXQgdGhpcy4jYm9keShcbiAgICAgICAgICBtYWtlQVBJKFxuICAgICAgICAgICAgKGNoaWxkKSA9PiB0aGlzLiNjaGlsZHJlbi5wdXNoKGNoaWxkKSxcbiAgICAgICAgICAgIChwcmlvcml0eSkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLiNwcmlvcml0eSA9IHByaW9yaXR5O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRoaXMuI2RlbGV0ZVN0YWNrc1xuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLiNoYW5kbGVGYWlsZWRFeGVjdXRpb24oZSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuICBwdWJsaWMgYXN5bmMgZXhlY3V0ZUNoaWxkcmVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy4jY2hpbGRyZW4pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNoLmV4ZWN1dGUoKTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgaWYgKHRoaXMuI3Bhc3NlZCkge1xuICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICAgIC0tTl9URVNUU19QQVNTRUQ7XG4gICAgICAgICAgKytOX1RFU1RTX0ZBSUxFRDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBwdWJsaWMgYXN5bmMgbG9nKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxldCBhbnlDaGlsZHJlbkZhaWxlZCA9IGZhbHNlO1xuICAgIGlmICh0aGlzLiNjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGNvbnNvbGUubG9nKFRFU1QgKyBcIiBcIiArIHRoaXMuI2Rlc2NyaXB0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuI3Bhc3NlZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhQQVNTICsgXCIgXCIgKyB0aGlzLiNkZXNjcmlwdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKEZBSUwgKyBcIiBcIiArIHRoaXMuI2Rlc2NyaXB0aW9uKTtcblxuICAgICAgICBTVERJT19NQU5JUC5pbmRlbnQgKz0gMjtcbiAgICAgICAgaWYgKHRoaXMuI2Vycm9yKSB7XG4gICAgICAgICAgaWYgKHRoaXMuI2RlbGV0ZVN0YWNrcyAmJiB0aGlzLiNlcnJvciBpbnN0YW5jZW9mIEVycm9yKVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuI2Vycm9yLnN0YWNrO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLiN0aHJvd3MpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0aGlzLiN0aHJvd3MubWVzc2FnZSB8fFxuICAgICAgICAgICAgdGhpcy4jdGhyb3dzLmNvbnN0cnVjdGVkQnkgfHxcbiAgICAgICAgICAgIHRoaXMuI3Rocm93cy5wcmVkaWNhdGVcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbZXhwZWN0ZWQgdGhyb3ddOlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy4jdGhyb3dzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd11cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFNURElPX01BTklQLmluZGVudCAtPSAyO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgbkNoaWxkcmVuQmVmb3JlID0gdGhpcy4jY2hpbGRyZW4ubGVuZ3RoO1xuICAgIGZvciAoY29uc3QgcGMgb2YgdGVzdHNCeVNvcnRlZFByaW9yaXR5KHRoaXMuI2NoaWxkcmVuKSkge1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBwY1sxXSkge1xuICAgICAgICBTVERJT19NQU5JUC5pbmRlbnQgKz0gMjtcbiAgICAgICAgYXdhaXQgY2hpbGQubG9nKCk7XG4gICAgICAgIGFueUNoaWxkcmVuRmFpbGVkID0gYW55Q2hpbGRyZW5GYWlsZWQgfHwgIWNoaWxkLnBhc3NlZDtcbiAgICAgICAgU1RESU9fTUFOSVAuaW5kZW50IC09IDI7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLiNjaGlsZHJlbi5sZW5ndGggPiBuQ2hpbGRyZW5CZWZvcmUpXG4gICAgICB0aHJvdyBuZXcgVGVzdHRzVHlwZUVycm9yKFxuICAgICAgICBcImZvdW5kIGEgc3ViY2hpbGQgYXR0YWNoZWQgdG8gYSBub24taW1tZWRpYXRlIHBhcmVudC4uLiBcIiArXG4gICAgICAgICAgXCJjaGVjayBmb3IgbWlzc2luZyBgdGVzdGAgcGFyYW1ldGVyc1wiXG4gICAgICApO1xuICAgIGlmIChhbnlDaGlsZHJlbkZhaWxlZCAmJiB0aGlzLiNwYXNzZWQpIHtcbiAgICAgIC8vIGlmIGFueSBjaGlsZHJlbiBmYWlsZWQgYnV0IHRoaXMgdGVzdCBib2R5IGRpZCBub3QsIHJlcG9ydCBmYWlsdXJlXG4gICAgICAtLU5fVEVTVFNfUEFTU0VEO1xuICAgICAgKytOX1RFU1RTX0ZBSUxFRDtcbiAgICAgIHRoaXMuI3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgY29uc29sZS5lcnJvcihGQUlMKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuI2NoaWxkcmVuLmxlbmd0aCAmJiAhdGhpcy4jcGFzc2VkKSB7XG4gICAgICAvLyBlbHNlIGlmIHRoZXJlIHdhcyBjaGlsZCBvdXRwdXQgZm9yIGEgZmFpbGVkIHBhcmVudCwgcmVwb3J0IGZhaWx1cmVcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEZBSUwgKyBcIiBcIik7XG4gICAgICBTVERJT19NQU5JUC5pbmRlbnQgKz0gMjtcbiAgICAgIGlmICh0aGlzLiNlcnJvcikge1xuICAgICAgICBTVERJT19NQU5JUC5pbmRlbnROZXdsaW5lc09ubHkgPSB0cnVlO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMuI2Vycm9yKTtcbiAgICAgICAgU1RESU9fTUFOSVAuaW5kZW50TmV3bGluZXNPbmx5ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy4jdGhyb3dzKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICB0aGlzLiN0aHJvd3MubWVzc2FnZSB8fFxuICAgICAgICAgIHRoaXMuI3Rocm93cy5jb25zdHJ1Y3RlZEJ5IHx8XG4gICAgICAgICAgdGhpcy4jdGhyb3dzLnByZWRpY2F0ZVxuICAgICAgICApIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XTpcIik7XG4gICAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLiN0aHJvd3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbZXhwZWN0ZWQgdGhyb3ddXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBTVERJT19NQU5JUC5pbmRlbnQgLT0gMjtcbiAgICB9XG4gIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgIGJvZHk6IFRlc3RCb2R5PFQ+LFxuICAgIHRocm93cz86IFRocm93RGVzY3JpcHRvcixcbiAgICBkZWxldGVTdGFja3M/OiBib29sZWFuXG4gICkge1xuICAgIHRoaXMuI2Rlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgdGhpcy4jdGhyb3dzID0gdGhyb3dzO1xuICAgIHRoaXMuI2RlbGV0ZVN0YWNrcyA9IGRlbGV0ZVN0YWNrcztcbiAgICB0aGlzLiNib2R5ID0gYm9keTtcbiAgfVxuXG4gICNoYW5kbGVTdWNjZXNzZnVsRXhlY3V0aW9uID0gKHJlc3VsdDogVCk6IFQgPT4ge1xuICAgIGlmICghdGhpcy4jdGhyb3dzKSB7XG4gICAgICArK05fVEVTVFNfUEFTU0VEO1xuICAgICAgdGhpcy4jcGFzc2VkID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgKytOX1RFU1RTX0ZBSUxFRDtcbiAgICAgIHRoaXMuI3Bhc3NlZCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gICNoYW5kbGVGYWlsZWRFeGVjdXRpb24gPSAoZXJyOiBhbnkpOiB2b2lkID0+IHtcbiAgICB0aGlzLiNlcnJvciA9IGVycjtcbiAgICBpZiAodGhpcy4jdGhyb3dzKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHRoaXMuI3Rocm93cy5tZXNzYWdlIHx8XG4gICAgICAgIHRoaXMuI3Rocm93cy5jb25zdHJ1Y3RlZEJ5IHx8XG4gICAgICAgIHRoaXMuI3Rocm93cy5wcmVkaWNhdGVcbiAgICAgICkge1xuICAgICAgICAvLyB0aHJvdyB3YXMgZGVzY3JpYmVkOyBjaGVjayB0aGUgZGVzY3JpcHRvclxuICAgICAgICBpZiAodGhpcy4jdGhyb3dzLnByZWRpY2F0ZSkge1xuICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9ICEhdGhpcy4jdGhyb3dzLnByZWRpY2F0ZShlcnIpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuI3Rocm93cy5jb25zdHJ1Y3RlZEJ5ICYmIHRoaXMuI3Rocm93cy5tZXNzYWdlKSB7XG4gICAgICAgICAgdGhpcy4jcGFzc2VkID1cbiAgICAgICAgICAgIGVyciBpbnN0YW5jZW9mIHRoaXMuI3Rocm93cy5jb25zdHJ1Y3RlZEJ5ICYmXG4gICAgICAgICAgICBlcnIubWVzc2FnZSA9PT0gdGhpcy4jdGhyb3dzLm1lc3NhZ2U7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy4jdGhyb3dzLmNvbnN0cnVjdGVkQnkpIHtcbiAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBlcnIgaW5zdGFuY2VvZiB0aGlzLiN0aHJvd3MuY29uc3RydWN0ZWRCeTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLiN0aHJvd3MubWVzc2FnZSkge1xuICAgICAgICAgIHRoaXMuI3Bhc3NlZCA9IGVyci5tZXNzYWdlID09PSB0aGlzLiN0aHJvd3MubWVzc2FnZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLiNwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy4jcGFzc2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4jcGFzc2VkID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy4jcGFzc2VkKSB7XG4gICAgICArK05fVEVTVFNfUEFTU0VEO1xuICAgIH0gZWxzZSB7XG4gICAgICArK05fVEVTVFNfRkFJTEVEO1xuICAgIH1cbiAgfTtcblxuICAjcHJpb3JpdHkgPSAwO1xuICAjZGVzY3JpcHRpb246IHN0cmluZztcbiAgI2RlbGV0ZVN0YWNrcz86IGJvb2xlYW47XG4gICNwYXNzZWQgPSBmYWxzZTtcbiAgI2Vycm9yOiBhbnkgfCBudWxsID0gbnVsbDtcbiAgI3Rocm93cz86IFRocm93RGVzY3JpcHRvcjtcbiAgI2NoaWxkcmVuOiBUZXN0PGFueT5bXSA9IFtdO1xuICAjYm9keTogVGVzdEJvZHk8VD47XG59XG5cbmZ1bmN0aW9uIG1ha2VBUEkoXG4gIHJlZ2lzdGVyQ2hpbGQ6IDxUPihjaGlsZDogVGVzdDxUPikgPT4gdm9pZCxcbiAgcmVnaXN0ZXJQcmlvcml0eTogKHByaW9yaXR5OiBudW1iZXIpID0+IHZvaWQsXG4gIGRlbGV0ZVN0YWNrcz86IGJvb2xlYW5cbik6IFRlc3RBUEkge1xuICBmdW5jdGlvbiB0aHJvd3MoY29uc3RydWN0b3I6IEVycm9yU3ViQ29uc3RydWN0b3IsIG1lc3NhZ2U/OiBzdHJpbmcpOiBUZXN0QVBJO1xuICBmdW5jdGlvbiB0aHJvd3MobWVzc2FnZTogc3RyaW5nKTogVGVzdEFQSTtcbiAgZnVuY3Rpb24gdGhyb3dzKGlzQ29ycmVjdFRocm93OiBQcmVkaWNhdGU8W0Vycm9yU3ViIHwgYW55XT4pOiBUZXN0QVBJO1xuICBmdW5jdGlvbiB0aHJvd3MoKTogVGVzdEFQSTtcbiAgZnVuY3Rpb24gdGhyb3dzPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPjtcbiAgZnVuY3Rpb24gdGhyb3dzPFQ+KFxuICAgIHRocm93T3JUZXN0RGVzY3I/OlxuICAgICAgfCBzdHJpbmdcbiAgICAgIHwgRXJyb3JTdWJDb25zdHJ1Y3RvclxuICAgICAgfCBQcmVkaWNhdGU8W0Vycm9yU3ViIHwgYW55XT4sXG4gICAgbWVzc2FnZU9yQm9keT86IHN0cmluZyB8IFRlc3RCb2R5PFQ+XG4gICkge1xuICAgIGlmICghdGhyb3dPclRlc3REZXNjciAmJiAhbWVzc2FnZU9yQm9keSkge1xuICAgICAgLy8gaWYgbm8gYXJndW1lbnRzIHdlcmUgcHJvdmlkZWQsIHNpbXBseSBjcmVhdGUgYSB0ZXN0IGV4cGVjdGluZyB0aHJvd1xuICAgICAgcmV0dXJuIGdlblRlc3RGbih7fSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhyb3dPclRlc3REZXNjciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgLy8gaWYgYXJnMCBpcyBhIHN0cmluZywgaXQgaXMgZWl0aGVyIGFuIGVycm9yIG1lc3NhZ2Ugb3IgdGVzdCBkZXNjcmlwdGlvblxuICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlT3JCb2R5ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgLy8gYXJnMCBpcyBhIHRlc3QgZGVzY3JpcHRpb247IGFyZzEgaXMgYSB0ZXN0IGJvZHlcbiAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7fSkodGhyb3dPclRlc3REZXNjciwgbWVzc2FnZU9yQm9keSk7XG4gICAgICB9IGVsc2UgaWYgKG1lc3NhZ2VPckJvZHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBhcmcwIGlzIGEgbWVzc2FnZTsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7IG1lc3NhZ2U6IHRocm93T3JUZXN0RGVzY3IgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGEgbmV3IHRlc3QgYm9keSBhcyBpdHMgc2Vjb25kIGFyZ3VtZW50IGlmIHRoZSBcIiArXG4gICAgICAgICAgICBcImZpcnN0IGFyZ3VtZW50IGlzIGEgc3RyaW5nXCIsXG4gICAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgICBtZXNzYWdlT3JCb2R5XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhyb3dPclRlc3REZXNjciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBpZiBhcmcwIGlzIGEgZnVuY3Rpb24sIGl0IGlzIGVpdGhlciBhIHRocm93IHByZWRpY2F0ZSBvciBjb25zdHJ1Y3RvclxuICAgICAgaWYgKFxuICAgICAgICB0aHJvd09yVGVzdERlc2NyID09PSBFcnJvciB8fFxuICAgICAgICB0aHJvd09yVGVzdERlc2NyLnByb3RvdHlwZSBpbnN0YW5jZW9mIEVycm9yXG4gICAgICApIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlT3JCb2R5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgLy8gYXJnMCBpcyBhbiBlcnJvciBjb25zdHJ1Y3RvcjsgYXJnMSBhbiBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7XG4gICAgICAgICAgICBjb25zdHJ1Y3RlZEJ5OiB0aHJvd09yVGVzdERlc2NyIGFzIEVycm9yU3ViQ29uc3RydWN0b3IsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlT3JCb2R5LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2VPckJvZHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIGFyZzAgaXMgYW4gZXJyb3IgY29uc3RydWN0b3I7IGFyZzEgaXMgdW51c2VkXG4gICAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7XG4gICAgICAgICAgICBjb25zdHJ1Y3RlZEJ5OiB0aHJvd09yVGVzdERlc2NyIGFzIEVycm9yU3ViQ29uc3RydWN0b3IsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGVpdGhlciBhbiBlcnJvciBtZXNzYWdlIG9yIGEgbmV3IHRlc3QgYm9keSBcIiArXG4gICAgICAgICAgICAgIFwiYXMgaXRzIHNlY29uZCBhcmd1bWVudFwiLFxuICAgICAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gYXJnMCBpcyBhbiBlcnJvciBwcmVkaWNhdGU7IGFyZzEgaXMgdW51c2VkXG4gICAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7XG4gICAgICAgICAgICBwcmVkaWNhdGU6IHRocm93T3JUZXN0RGVzY3IgYXMgUHJlZGljYXRlPFtFcnJvciB8IGFueV0+LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgICAgXCJ0ZXN0LnRocm93cyByZXF1aXJlcyBhbiBlbXB0eSBzZWNvbmQgYXJndW1lbnQgaWYgdGhlIGZpcnN0IGlzIGEgXCIgK1xuICAgICAgICAgICAgICBcInRocm93IHByZWRpY2F0ZSAoYSBmdW5jdGlvbiB0aGF0IGRvZXMgbm90IGNvbnN0cnVjdCBFcnJvcnMpXCIsXG4gICAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSwgZXJyb3IgY29uc3RydWN0b3IsIHByZWRpY2F0ZSwgXCIgK1xuICAgICAgICAgIFwib3IgbmV3IHRlc3QgZGVzY3JpcHRpb24gYXMgaXRzIGZpcnN0IGFyZ3VtZW50XCIsXG4gICAgICAgIHRocm93T3JUZXN0RGVzY3IsXG4gICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGdlblRlc3RGbihleHBlY3RlZFRocm93PzogVGhyb3dEZXNjcmlwdG9yKSB7XG4gICAgbGV0IHBhc3NEZWxldGVTdGFja3MgPSB0cnVlO1xuICAgIGNvbnN0IHRlc3QgPSA8VD4oZGVzY3JpcHRpb246IHN0cmluZywgYm9keTogVGVzdEJvZHk8VD4pOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgYm9keSAhPT0gXCJmdW5jdGlvblwiKVxuICAgICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgICBcInRlc3RzIHdpdGggZGVzY3JpcHRpb25zIHJlcXVpcmUgYSB0ZXN0IGJvZHlcIlxuICAgICAgICApO1xuICAgICAgY29uc3QgdCA9IG5ldyBUZXN0KFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgYm9keSxcbiAgICAgICAgZXhwZWN0ZWRUaHJvdyxcbiAgICAgICAgcGFzc0RlbGV0ZVN0YWNrcyA/IGRlbGV0ZVN0YWNrcyA6IGZhbHNlXG4gICAgICApO1xuICAgICAgcmVnaXN0ZXJDaGlsZCh0KTtcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbiA9IHQuZXhlY3V0ZSgpO1xuICAgICAgVEVTVF9QUk9NSVNFUy5hZGQoZXhlY3V0aW9uKTtcbiAgICAgIHJldHVybiBleGVjdXRpb247XG4gICAgfTtcbiAgICB0ZXN0LnRocm93cyA9IHRocm93cztcbiAgICB0ZXN0LmRlbGV0ZVN0YWNrcyA9IChzZXR0aW5nID0gdHJ1ZSwgcGFzc1RvQ2hpbGRyZW4gPSB0cnVlKSA9PiB7XG4gICAgICBkZWxldGVTdGFja3MgPSBzZXR0aW5nO1xuICAgICAgcGFzc0RlbGV0ZVN0YWNrcyA9IHBhc3NUb0NoaWxkcmVuO1xuICAgIH07XG4gICAgdGVzdC5wcmlvcml0eSA9IChzZXR0aW5nID0gMCkgPT4ge1xuICAgICAgcmVnaXN0ZXJQcmlvcml0eShzZXR0aW5nKTtcbiAgICB9O1xuICAgIHJldHVybiB0ZXN0O1xuICB9XG4gIHJldHVybiBnZW5UZXN0Rm4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2xvYmFsVGVzdExhdW5jaGVyKCkge1xuICAvLyBjYXRjaCBhbnkgdW5oYW5kbGVkIHJlamVjdGlvbnMgdGhyb3duIGJ5IHRlc3RzXG4gIHByb2Nlc3MuYWRkTGlzdGVuZXIoXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgKGRldGFpbHMsIHByb21pc2UpID0+IHtcbiAgICAvLyBvbmx5IGxvZyB1bmhhbmRsZWQgcmVqZWN0aW9ucyBpZiB0aGV5IGRvbid0IGRpcmVjdGx5IGJlbG9uZyB0byBhIHRlc3RcbiAgICBpZiAoIVRFU1RfUFJPTUlTRVMuaGFzKHByb21pc2UpKSB7XG4gICAgICBTVERJT19NQU5JUC5yZXNldCgpO1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbdGVzdHRzXSBFcnJvcjogVW5oYW5kbGVkIHByb21pc2UgcmVqZWN0aW9uLiBFeGl0aW5nLiBTZWUgYmVsb3c6XCJcbiAgICAgICk7XG4gICAgICBjb25zb2xlLmVycm9yKGRldGFpbHMpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc2hpZnQgYWxsIHRlc3Qgb3V0cHV0IGJ5IDFcbiAgU1RESU9fTUFOSVAuaW5kZW50ID0gMTtcblxuICAvLyBjaGVjayBmb3Igb3B0aW9uc1xuICBsZXQgbWF0Y2hlcjogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMjsgaSA8IHByb2Nlc3MuYXJndi5sZW5ndGggLSAxOyArK2kpIHtcbiAgICBpZiAoXG4gICAgICBwcm9jZXNzLmFyZ3ZbaV0udHJpbSgpID09PSBcIi0tbWF0Y2hcIiB8fFxuICAgICAgcHJvY2Vzcy5hcmd2W2ldLnRyaW0oKSA9PT0gXCItbVwiXG4gICAgKSB7XG4gICAgICBtYXRjaGVyID0gcHJvY2Vzcy5hcmd2W2kgKyAxXTtcbiAgICAgIHByb2Nlc3MuYXJndi5zcGxpY2UoaSwgMik7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcGF0aHMgPSBhd2FpdCBmaW5kVGVzdFBhdGhzKG1hdGNoZXIpO1xuICBjb25zdCBmaWxlVGVzdHM6IFRlc3Q8dm9pZD5bXSA9IFtdO1xuICBmb3IgKGNvbnN0IHAgb2YgcGF0aHMpIHtcbiAgICBjb25zdCB0ID0gbmV3IFRlc3QoXG4gICAgICBBTlNJX0NZQU5fRkcgKyBwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHApICsgQU5TSV9SRVNFVCxcbiAgICAgICh0ZXN0KSA9PiB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICAgIHRlc3QsXG4gICAgICAgIH07XG4gICAgICAgIHJlcXVpcmUocCk7XG4gICAgICB9XG4gICAgKTtcbiAgICBhd2FpdCB0LmV4ZWN1dGUoKTtcbiAgICBmaWxlVGVzdHMucHVzaCh0KTtcbiAgfVxuICBjb25zb2xlLmxvZyh0ZXN0c0J5U29ydGVkUHJpb3JpdHkoZmlsZVRlc3RzKSk7XG4gIGZvciAoY29uc3QgcHQgb2YgdGVzdHNCeVNvcnRlZFByaW9yaXR5KGZpbGVUZXN0cykpIHtcbiAgICBmb3IgKGNvbnN0IHQgb2YgcHRbMV0pIHtcbiAgICAgIGF3YWl0IHQuZXhlY3V0ZUNoaWxkcmVuKCk7XG4gICAgICBhd2FpdCB0LmxvZygpO1xuICAgIH1cbiAgfVxufVxuXG5pZiAocHJvY2Vzcy5hcmd2Lmxlbmd0aCA+PSAzKSB7XG4gIGdsb2JhbFRlc3RMYXVuY2hlcigpXG4gICAgLnRoZW4oKCkgPT4ge1xuICAgICAgU1RESU9fTUFOSVAucmVzZXQoKTtcbiAgICAgIGlmIChOX1RFU1RTX0ZBSUxFRCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIFwiXFxuXCIgK1xuICAgICAgICAgICAgQU5TSV9SRURfRkcgK1xuICAgICAgICAgICAgXCJwYXNzZWQgW1wiICtcbiAgICAgICAgICAgIE5fVEVTVFNfUEFTU0VEICtcbiAgICAgICAgICAgIFwiL1wiICtcbiAgICAgICAgICAgIChOX1RFU1RTX1BBU1NFRCArIE5fVEVTVFNfRkFJTEVEKSArXG4gICAgICAgICAgICBcIl0gdGVzdHNcIiArXG4gICAgICAgICAgICBBTlNJX1JFU0VUXG4gICAgICAgICk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgXCJcXG5cIiArXG4gICAgICAgICAgICBBTlNJX0dSRUVOX0ZHICtcbiAgICAgICAgICAgIFwicGFzc2VkIFtcIiArXG4gICAgICAgICAgICBOX1RFU1RTX1BBU1NFRCArXG4gICAgICAgICAgICBcIi9cIiArXG4gICAgICAgICAgICAoTl9URVNUU19QQVNTRUQgKyBOX1RFU1RTX0ZBSUxFRCkgK1xuICAgICAgICAgICAgXCJdIHRlc3RzXCIgK1xuICAgICAgICAgICAgQU5TSV9SRVNFVFxuICAgICAgICApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goKGUpID0+IHtcbiAgICAgIFNURElPX01BTklQLnJlc2V0KCk7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH0pO1xufVxuIl19