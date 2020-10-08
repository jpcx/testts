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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const assert = require("assert");
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
class Test {
    constructor(description, body, dataListener, errListener, expectedThrow, deleteStacks) {
        let _error = null;
        let _passed = false;
        const _children = [];
        this.log = () => __awaiter(this, void 0, void 0, function* () {
            let anyChildrenFailed = false;
            if (_children.length) {
                console.log(TEST + " " + description);
            }
            else {
                if (_passed) {
                    console.log(PASS + " " + description);
                }
                else {
                    console.error(FAIL + " " + description);
                    _STDIO_MANIP_.indent += 2;
                    if (_error) {
                        if (deleteStacks && _error instanceof Error)
                            delete _error.stack;
                        console.error(_error);
                    }
                    if (expectedThrow) {
                        if (expectedThrow.message ||
                            expectedThrow.constructedBy ||
                            expectedThrow.predicate) {
                            console.error("[expected throw]:");
                            console.error(expectedThrow);
                        }
                        else {
                            console.error("[expected throw]");
                        }
                    }
                    _STDIO_MANIP_.indent -= 2;
                }
            }
            let nChildrenBefore = _children.length;
            for (const child of _children) {
                _STDIO_MANIP_.indent += 2;
                yield child.onceReady;
                yield child.log();
                anyChildrenFailed = anyChildrenFailed || !child.passed;
                _STDIO_MANIP_.indent -= 2;
            }
            if (_children.length > nChildrenBefore)
                throw new TesttsTypeError("found a subchild attached to a non-immediate parent... " +
                    "check for missing `test` parameters");
            if (anyChildrenFailed && _passed) {
                --_N_TESTS_PASSED_;
                ++_N_TESTS_FAILED_;
                _passed = false;
                console.error(FAIL);
            }
            else if (_children.length && !_passed) {
                process.stdout.write(FAIL + " ");
                _STDIO_MANIP_.indent += 2;
                if (_error) {
                    _STDIO_MANIP_.indentNewlinesOnly = true;
                    console.error(_error);
                    _STDIO_MANIP_.indentNewlinesOnly = false;
                }
                if (expectedThrow) {
                    if (expectedThrow.message ||
                        expectedThrow.constructedBy ||
                        expectedThrow.predicate) {
                        console.error("[expected throw]:");
                        console.error(expectedThrow);
                    }
                    else {
                        console.error("[expected throw]");
                    }
                }
                _STDIO_MANIP_.indent -= 2;
            }
        });
        const _onceReady = new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield body(makeAPI((v) => _children.push(v), deleteStacks));
                if (!expectedThrow) {
                    ++_N_TESTS_PASSED_;
                    _passed = true;
                    dataListener(result);
                    resolve();
                }
                else {
                    ++_N_TESTS_FAILED_;
                    _passed = false;
                    errListener();
                    resolve();
                }
            }
            catch (e) {
                _error = e;
                if (expectedThrow) {
                    if (expectedThrow.message ||
                        expectedThrow.constructedBy ||
                        expectedThrow.predicate) {
                        if (expectedThrow.predicate) {
                            _passed = !!expectedThrow.predicate(e);
                        }
                        else if (expectedThrow.constructedBy && expectedThrow.message) {
                            _passed =
                                e instanceof expectedThrow.constructedBy &&
                                    e.message === expectedThrow.message;
                        }
                        else if (expectedThrow.constructedBy) {
                            _passed = e instanceof expectedThrow.constructedBy;
                        }
                        else if (expectedThrow.message) {
                            _passed = e.message === expectedThrow.message;
                        }
                        else {
                            _passed = false;
                        }
                    }
                    else {
                        _passed = true;
                    }
                }
                else {
                    _passed = false;
                }
                if (_passed) {
                    ++_N_TESTS_PASSED_;
                    dataListener();
                    resolve();
                }
                else {
                    ++_N_TESTS_FAILED_;
                    errListener(e);
                    resolve();
                }
            }
        }));
        Object.defineProperty(this, "onceReady", {
            get: () => _onceReady,
            enumerable: true,
            configurable: false,
        });
        Object.defineProperty(this, "passed", {
            get: () => _passed,
            enumerable: true,
            configurable: false,
        });
    }
}
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
            if (throwOrTestDescr.prototype instanceof Error) {
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
        const test = (description, body) => {
            if (typeof body !== "function")
                throw new TesttsArgumentError("tests with descriptions require a test body");
            const execution = new Promise((resolve, reject) => {
                const t = new Test(description, body, resolve, reject, expectedThrow, deleteStacks);
                registerChild(t);
            });
            _TEST_PROMISES_.add(execution);
            return execution;
        };
        test.throws = throws;
        test.deleteStacks = (setting = true) => {
            deleteStacks = setting;
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
                console.log("heeey");
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
                    assert,
                };
                require(p);
            }, () => { }, () => { }));
        }
        for (const ft of fileTests) {
            yield ft.onceReady;
            yield ft.log();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQW9DQSx5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLGlDQUFpQztBQW1EakMsTUFBTSxtQkFBb0IsU0FBUSxLQUFLO0lBRXJDLFlBQVksR0FBVyxFQUFFLEtBQWE7UUFDcEMsS0FBSyxDQUFDLDJCQUEyQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLENBQUM7Q0FDRjtBQUNELE1BQU0sbUJBQW9CLFNBQVEsS0FBSztJQUVyQyxZQUFZLEdBQVcsRUFBRSxHQUFHLElBQVc7UUFDckMsS0FBSyxDQUFDLDJCQUEyQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQUNELE1BQU0sZUFBZ0IsU0FBUSxTQUFTO0lBQ3JDLFlBQVksR0FBVztRQUNyQixLQUFLLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQztDQUNGO0FBR0QsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDO0FBQ2hDLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQztBQUNqQyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUM7QUFDL0IsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDO0FBQ2hDLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUM3QixNQUFNLElBQUksR0FBRyxZQUFZLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQztBQUM3QyxNQUFNLElBQUksR0FBRyxhQUFhLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQztBQUM5QyxNQUFNLElBQUksR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQztBQUU1QyxTQUFTLHNCQUFzQixDQUFDLEdBQVcsRUFBRSxPQUFlO0lBQzFELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDOztZQUN0QyxDQUFDLElBQUksSUFBSSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDN0IsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDVCxDQUFDO0FBT0QsTUFBTSxnQkFBZ0I7SUFDcEI7UUFDRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4RCxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQztRQUNoQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDcEMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87WUFDbEIsR0FBRyxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUU7Z0JBQ2pCLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUTtvQkFDdkIsTUFBTSxJQUFJLG1CQUFtQixDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3pELE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDZCxDQUFDO1lBQ0QsVUFBVSxFQUFFLElBQUk7WUFDaEIsWUFBWSxFQUFFLEtBQUs7U0FDcEIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDaEQsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLG1CQUFtQjtZQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRTtnQkFDakIsSUFBSSxPQUFPLENBQUMsS0FBSyxTQUFTO29CQUN4QixNQUFNLElBQUksbUJBQW1CLENBQUMsbUNBQW1DLENBQUMsQ0FBQztnQkFDckUsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFDRCxVQUFVLEVBQUUsSUFBSTtZQUNoQixZQUFZLEVBQUUsS0FBSztTQUNwQixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRTtZQUNoQixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7WUFDL0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQ2pDLENBQUMsQ0FBQztRQUNGLFNBQVMsVUFBVSxDQUFDLEtBQXNDO1lBQ3hELE9BQU8sQ0FBQyxXQUFnQixFQUFFLFlBQWtCLEVBQUUsRUFBUSxFQUFXLEVBQUU7Z0JBQ2pFLE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQjtvQkFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRTlDLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBRTlELFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQzVEO2dCQUNELElBQUksT0FBTyxZQUFZLEtBQUssVUFBVTtvQkFDcEMsT0FBTyxLQUFLLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDOztvQkFDckMsT0FBTyxLQUFLLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNuRCxDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQ0Y7QUFHRCxNQUFNLGFBQWEsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7QUFDN0MsTUFBTSxlQUFlLEdBQTBCLElBQUksT0FBTyxFQUFFLENBQUM7QUFDN0QsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7QUFDekIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7QUFFekIsU0FBZSxhQUFhLENBQzFCLFVBQWtCLGNBQWM7O1FBRWhDLE1BQU0sTUFBTSxHQUFhLE1BQU0sQ0FBQyxHQUFTLEVBQUU7WUFDekMsTUFBTSxDQUFDLEdBQWEsRUFBRSxDQUFDO1lBRXZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtnQkFDNUMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUIsTUFBTSxLQUFLLEdBQWEsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUM1RCxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtvQkFDMUIsSUFBSSxHQUFHO3dCQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzs7d0JBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckIsQ0FBQyxDQUFDLENBQ0gsQ0FBQztnQkFDRixJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDbEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUIsRUFBRSxDQUFDLENBQUM7aUJBQ0w7YUFDRjtZQUNELE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQyxDQUFBLENBQUMsRUFBRSxDQUFDO1FBR0wsU0FBZSxNQUFNLENBQUMsR0FBVzs7Z0JBQy9CLE1BQU0sS0FBSyxHQUFhLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FDNUQsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7b0JBQzFCLElBQUksR0FBRzt3QkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7O3dCQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3JCLENBQUMsQ0FBQyxDQUNILENBQUM7Z0JBQ0YsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQ2xCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7d0JBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQzFFO3FCQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFO29CQUM5QixNQUFNLElBQUksR0FBYSxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQzNELEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO3dCQUM3QixJQUFJLEdBQUc7NEJBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs0QkFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN0QixDQUFDLENBQUMsQ0FDSCxDQUFDO29CQUNGLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSTt3QkFBRSxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN2RDtZQUNILENBQUM7U0FBQTtRQUVELElBQUk7WUFDRixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUMxQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQzthQUM1RDtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixNQUFNLElBQUksbUJBQW1CLENBQzNCLGdEQUFnRCxFQUNoRCxDQUFDLENBQ0YsQ0FBQztTQUNIO1FBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDckIsTUFBTSxJQUFJLG1CQUFtQixDQUMzQixtQkFBbUIsRUFDbkIsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FDekIsQ0FBQztRQUVKLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQVFELE1BQU0sSUFBSTtJQUNSLFlBQ0UsV0FBbUIsRUFDbkIsSUFBaUIsRUFDakIsWUFBZ0MsRUFDaEMsV0FBZ0MsRUFDaEMsYUFBK0IsRUFDL0IsWUFBc0I7UUFFdEIsSUFBSSxNQUFNLEdBQWUsSUFBSSxDQUFDO1FBQzlCLElBQUksT0FBTyxHQUFZLEtBQUssQ0FBQztRQUU3QixNQUFNLFNBQVMsR0FBZ0IsRUFBRSxDQUFDO1FBRWxDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBUyxFQUFFO1lBQ3BCLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1lBQzlCLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDO2FBQ3ZDO2lCQUFNO2dCQUNMLElBQUksT0FBTyxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQztpQkFDdkM7cUJBQU07b0JBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDO29CQUV4QyxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztvQkFDMUIsSUFBSSxNQUFNLEVBQUU7d0JBQ1YsSUFBSSxZQUFZLElBQUksTUFBTSxZQUFZLEtBQUs7NEJBQUUsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDO3dCQUNqRSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUN2QjtvQkFDRCxJQUFJLGFBQWEsRUFBRTt3QkFDakIsSUFDRSxhQUFhLENBQUMsT0FBTzs0QkFDckIsYUFBYSxDQUFDLGFBQWE7NEJBQzNCLGFBQWEsQ0FBQyxTQUFTLEVBQ3ZCOzRCQUNBLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQzs0QkFDbkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQzt5QkFDOUI7NkJBQU07NEJBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO3lCQUNuQztxQkFDRjtvQkFDRCxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztpQkFDM0I7YUFDRjtZQUNELElBQUksZUFBZSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDdkMsS0FBSyxNQUFNLEtBQUssSUFBSSxTQUFTLEVBQUU7Z0JBQzdCLGFBQWEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO2dCQUMxQixNQUFNLEtBQUssQ0FBQyxTQUFTLENBQUM7Z0JBQ3RCLE1BQU0sS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNsQixpQkFBaUIsR0FBRyxpQkFBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZELGFBQWEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO2FBQzNCO1lBQ0QsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLGVBQWU7Z0JBQ3BDLE1BQU0sSUFBSSxlQUFlLENBQ3ZCLHlEQUF5RDtvQkFDdkQscUNBQXFDLENBQ3hDLENBQUM7WUFDSixJQUFJLGlCQUFpQixJQUFJLE9BQU8sRUFBRTtnQkFFaEMsRUFBRSxnQkFBZ0IsQ0FBQztnQkFDbkIsRUFBRSxnQkFBZ0IsQ0FBQztnQkFDbkIsT0FBTyxHQUFHLEtBQUssQ0FBQztnQkFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNyQjtpQkFBTSxJQUFJLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBRXZDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDakMsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7Z0JBQzFCLElBQUksTUFBTSxFQUFFO29CQUNWLGFBQWEsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7b0JBQ3hDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3RCLGFBQWEsQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7aUJBQzFDO2dCQUNELElBQUksYUFBYSxFQUFFO29CQUNqQixJQUNFLGFBQWEsQ0FBQyxPQUFPO3dCQUNyQixhQUFhLENBQUMsYUFBYTt3QkFDM0IsYUFBYSxDQUFDLFNBQVMsRUFDdkI7d0JBQ0EsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO3dCQUNuQyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO3FCQUM5Qjt5QkFBTTt3QkFDTCxPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7cUJBQ25DO2lCQUNGO2dCQUNELGFBQWEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO2FBQzNCO1FBQ0gsQ0FBQyxDQUFBLENBQUM7UUFFRixNQUFNLFVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFPLE9BQU8sRUFBRSxFQUFFO1lBQy9DLElBQUk7Z0JBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQ3ZCLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FDaEQsQ0FBQztnQkFDRixJQUFJLENBQUMsYUFBYSxFQUFFO29CQUNsQixFQUFFLGdCQUFnQixDQUFDO29CQUNuQixPQUFPLEdBQUcsSUFBSSxDQUFDO29CQUNmLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDckIsT0FBTyxFQUFFLENBQUM7aUJBQ1g7cUJBQU07b0JBQ0wsRUFBRSxnQkFBZ0IsQ0FBQztvQkFDbkIsT0FBTyxHQUFHLEtBQUssQ0FBQztvQkFDaEIsV0FBVyxFQUFFLENBQUM7b0JBQ2QsT0FBTyxFQUFFLENBQUM7aUJBQ1g7YUFDRjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQ1gsSUFBSSxhQUFhLEVBQUU7b0JBQ2pCLElBQ0UsYUFBYSxDQUFDLE9BQU87d0JBQ3JCLGFBQWEsQ0FBQyxhQUFhO3dCQUMzQixhQUFhLENBQUMsU0FBUyxFQUN2Qjt3QkFFQSxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUU7NEJBQzNCLE9BQU8sR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDeEM7NkJBQU0sSUFBSSxhQUFhLENBQUMsYUFBYSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUU7NEJBQy9ELE9BQU87Z0NBQ0wsQ0FBQyxZQUFZLGFBQWEsQ0FBQyxhQUFhO29DQUN4QyxDQUFDLENBQUMsT0FBTyxLQUFLLGFBQWEsQ0FBQyxPQUFPLENBQUM7eUJBQ3ZDOzZCQUFNLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRTs0QkFDdEMsT0FBTyxHQUFHLENBQUMsWUFBWSxhQUFhLENBQUMsYUFBYSxDQUFDO3lCQUNwRDs2QkFBTSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUU7NEJBQ2hDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxLQUFLLGFBQWEsQ0FBQyxPQUFPLENBQUM7eUJBQy9DOzZCQUFNOzRCQUNMLE9BQU8sR0FBRyxLQUFLLENBQUM7eUJBQ2pCO3FCQUNGO3lCQUFNO3dCQUNMLE9BQU8sR0FBRyxJQUFJLENBQUM7cUJBQ2hCO2lCQUNGO3FCQUFNO29CQUNMLE9BQU8sR0FBRyxLQUFLLENBQUM7aUJBQ2pCO2dCQUNELElBQUksT0FBTyxFQUFFO29CQUNYLEVBQUUsZ0JBQWdCLENBQUM7b0JBQ25CLFlBQVksRUFBRSxDQUFDO29CQUNmLE9BQU8sRUFBRSxDQUFDO2lCQUNYO3FCQUFNO29CQUNMLEVBQUUsZ0JBQWdCLENBQUM7b0JBQ25CLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDZixPQUFPLEVBQUUsQ0FBQztpQkFDWDthQUNGO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUN2QyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVTtZQUNyQixVQUFVLEVBQUUsSUFBSTtZQUNoQixZQUFZLEVBQUUsS0FBSztTQUNwQixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDcEMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87WUFDbEIsVUFBVSxFQUFFLElBQUk7WUFDaEIsWUFBWSxFQUFFLEtBQUs7U0FDcEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBRUQsU0FBUyxPQUFPLENBQ2QsYUFBMEMsRUFDMUMsWUFBc0I7SUFPdEIsU0FBUyxNQUFNLENBQ2IsZ0JBRytCLEVBQy9CLGFBQW9DO1FBRXBDLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUV2QyxPQUFPLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUN0QjthQUFNLElBQUksT0FBTyxnQkFBZ0IsS0FBSyxRQUFRLEVBQUU7WUFFL0MsSUFBSSxPQUFPLGFBQWEsS0FBSyxVQUFVLEVBQUU7Z0JBRXZDLE9BQU8sU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxDQUFDO2FBQ3ZEO2lCQUFNLElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRTtnQkFFdEMsT0FBTyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO2FBQ2pEO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxtQkFBbUIsQ0FDM0IscUVBQXFFO29CQUNuRSw0QkFBNEIsRUFDOUIsZ0JBQWdCLEVBQ2hCLGFBQWEsQ0FDZCxDQUFDO2FBQ0g7U0FDRjthQUFNLElBQUksT0FBTyxnQkFBZ0IsS0FBSyxVQUFVLEVBQUU7WUFFakQsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLFlBQVksS0FBSyxFQUFFO2dCQUMvQyxJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRTtvQkFFckMsT0FBTyxTQUFTLENBQUM7d0JBQ2YsYUFBYSxFQUFFLGdCQUF1Qzt3QkFDdEQsT0FBTyxFQUFFLGFBQWE7cUJBQ3ZCLENBQUMsQ0FBQztpQkFDSjtxQkFBTSxJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUU7b0JBRXRDLE9BQU8sU0FBUyxDQUFDO3dCQUNmLGFBQWEsRUFBRSxnQkFBdUM7cUJBQ3ZELENBQUMsQ0FBQztpQkFDSjtxQkFBTTtvQkFDTCxNQUFNLElBQUksbUJBQW1CLENBQzNCLGtFQUFrRTt3QkFDaEUsd0JBQXdCLEVBQzFCLGdCQUFnQixFQUNoQixhQUFhLENBQ2QsQ0FBQztpQkFDSDthQUNGO2lCQUFNO2dCQUNMLElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRTtvQkFFL0IsT0FBTyxTQUFTLENBQUM7d0JBQ2YsU0FBUyxFQUFFLGdCQUE0QztxQkFDeEQsQ0FBQyxDQUFDO2lCQUNKO3FCQUFNO29CQUNMLE1BQU0sSUFBSSxtQkFBbUIsQ0FDM0Isa0VBQWtFO3dCQUNoRSw2REFBNkQsRUFDL0QsZ0JBQWdCLEVBQ2hCLGFBQWEsQ0FDZCxDQUFDO2lCQUNIO2FBQ0Y7U0FDRjthQUFNO1lBQ0wsTUFBTSxJQUFJLG1CQUFtQixDQUMzQix1RUFBdUU7Z0JBQ3JFLCtDQUErQyxFQUNqRCxnQkFBZ0IsRUFDaEIsYUFBYSxDQUNkLENBQUM7U0FDSDtJQUNILENBQUM7SUFDRCxTQUFTLFNBQVMsQ0FBQyxhQUErQjtRQUNoRCxNQUFNLElBQUksR0FBRyxDQUFJLFdBQW1CLEVBQUUsSUFBaUIsRUFBYyxFQUFFO1lBQ3JFLElBQUksT0FBTyxJQUFJLEtBQUssVUFBVTtnQkFDNUIsTUFBTSxJQUFJLG1CQUFtQixDQUMzQiw2Q0FBNkMsQ0FDOUMsQ0FBQztZQUNKLE1BQU0sU0FBUyxHQUFlLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUM1RCxNQUFNLENBQUMsR0FBRyxJQUFJLElBQUksQ0FDaEIsV0FBVyxFQUNYLElBQUksRUFDSixPQUFPLEVBQ1AsTUFBTSxFQUNOLGFBQWEsRUFDYixZQUFZLENBQ2IsQ0FBQztnQkFDRixhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7WUFDSCxlQUFlLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9CLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxFQUFFLEVBQUU7WUFDckMsWUFBWSxHQUFHLE9BQU8sQ0FBQztRQUN6QixDQUFDLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLFNBQVMsRUFBRSxDQUFDO0FBQ3JCLENBQUM7QUFFRCxTQUFlLGtCQUFrQjs7UUFFL0IsT0FBTyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUU3RCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDakMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN0QixPQUFPLENBQUMsS0FBSyxDQUNYLGtFQUFrRSxDQUNuRSxDQUFDO2dCQUNGLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDakI7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUdILGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBR3pCLElBQUksT0FBTyxHQUF1QixTQUFTLENBQUM7UUFDNUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtZQUNoRCxJQUNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssU0FBUztnQkFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQy9CO2dCQUNBLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3JCLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzNCO1NBQ0Y7UUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQyxNQUFNLFNBQVMsR0FBaUIsRUFBRSxDQUFDO1FBQ25DLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFO1lBQ3JCLFNBQVMsQ0FBQyxJQUFJLENBQ1osSUFBSSxJQUFJLENBQ04sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsRUFDM0QsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDUCxNQUFNLENBQUMsT0FBTyxHQUFHO29CQUNmLElBQUk7b0JBQ0osTUFBTTtpQkFDUCxDQUFDO2dCQUNGLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLENBQUMsRUFDRCxHQUFHLEVBQUUsR0FBRSxDQUFDLEVBQ1IsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUNULENBQ0YsQ0FBQztTQUNIO1FBQ0QsS0FBSyxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUU7WUFDMUIsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDO1lBQ25CLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQztDQUFBO0FBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7SUFDNUIsa0JBQWtCLEVBQUU7U0FDakIsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixJQUFJLGdCQUFnQixFQUFFO1lBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQ1gsSUFBSTtnQkFDRixXQUFXO2dCQUNYLFVBQVU7Z0JBQ1YsZ0JBQWdCO2dCQUNoQixHQUFHO2dCQUNILENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7Z0JBQ3JDLFNBQVM7Z0JBQ1QsVUFBVSxDQUNiLENBQUM7WUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pCO2FBQU07WUFDTCxPQUFPLENBQUMsS0FBSyxDQUNYLElBQUk7Z0JBQ0YsYUFBYTtnQkFDYixVQUFVO2dCQUNWLGdCQUFnQjtnQkFDaEIsR0FBRztnQkFDSCxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO2dCQUNyQyxTQUFTO2dCQUNULFVBQVUsQ0FDYixDQUFDO1lBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQjtJQUNILENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ1gsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztDQUNOIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqKiogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKlxuICoqKiAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqICAgICAgICAgICAgICA6cCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOnAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgICAgICAgICAgICAgICAgICAgICAgICAgXyAgICAgOnggICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgLm94b3hveHAgICAgICAgICAgLjpveG8gICAgICA6cCAgIDpveG94b3hwIC46b3hvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICA6eG94b3hveCAgLm94ICAgICAueCAgb3hvIHAgICA6eCAgOnhveG94b3ggLnggIG94byBwICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6ZCAgIC54IG94byAgICA6bywgIGB4b2AgLm94b3hveHAgOmQgICAgOm8sICBgeG9gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgLm8gICB4b3ggIDp4b3ggICAgICA6eG94b3hveCAgOnggICA6eG94ICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOnggICAgb3hvICAgOm94ICAgICAgICA6ZCAgICAgOm8gICAgIDpveCAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOm94b3hveG8gICAgICA6eG8gICAgICA6eCAgICAgOnggICAgICAgOnhvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOm94b3hveCAgICAgICAgIDpveCAgICA6byAgICAgOm8gICAgICAgICA6b3ggICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOngsICAgICAgICAub3gsICA6byAgICA6eCAgICAgOnggICAgLm94LCAgOm8gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6cSwgOm94LCAgIC54IGQneG94byB4YCAgICA6byAgICAgOnEsICBkJ3hveG8geGAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAnOnggIDp4b3hveG9gICAgIC5veG9gICAgICA6cSwgICAgJzp4ICAgICAub3hvYCAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICA6eG94b2AgICAgICAgICAgICAgICAnOnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgIEBsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9qcGN4L3Rlc3R0cyAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBsaWNlbnNlIEdQTC0zLjAtb3ItbGF0ZXIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBjb3B5cmlnaHQgKEMpIDIwMjAgQGF1dGhvciBKdXN0aW4gQ29sbGllciA8bUBqcGN4LmRldj4gICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgICAgKlxuICogICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgICAgKlxuICogICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3IgICAgICAgKlxuICogICAgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsICAgICAgICAgKlxuICogICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGludGVybmFsaWVkIHdhcnJhbnR5IG9mICAgICAgKlxuICogICAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZSAgICAgICAgICAgKlxuICogICAgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlICAgICAgICAqKlxuICogIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiAgSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi4gICoqKlxuICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKioqKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSBcImFzc2VydFwiO1xuXG5leHBvcnQgdHlwZSBOb25Qcm9taXNlPFQ+ID0gVCBleHRlbmRzIFByb21pc2U8YW55PiA/IG5ldmVyIDogVDtcbmV4cG9ydCB0eXBlIFRlc3RCb2R5U3luYzxUPiA9ICh0ZXN0OiBBUEkpID0+IE5vblByb21pc2U8VD47XG5leHBvcnQgdHlwZSBUZXN0Qm9keUFzeW5jPFQ+ID0gKHRlc3Q6IEFQSSkgPT4gUHJvbWlzZTxUPjtcbmV4cG9ydCB0eXBlIFRlc3RCb2R5PFQ+ID0gVGVzdEJvZHlTeW5jPFQ+IHwgVGVzdEJvZHlBc3luYzxUPjtcbmV4cG9ydCB0eXBlIFByZWRpY2F0ZTxUIGV4dGVuZHMgQXJyYXk8YW55Pj4gPSAoLi4uYXJnczogVCkgPT4gYW55O1xuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3ViIGV4dGVuZHMgRXJyb3Ige31cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdWJDb25zdHJ1Y3RvciB7XG4gIG5ldyAoLi4uYXJnczogYW55W10pOiBFcnJvclN1YjtcbiAgcHJvdG90eXBlOiBFcnJvclN1Yjtcbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBuZXcgdGVzdC5cbiAqXG4gKiBAcGFyYW0gICAgZGVzY3JpcHRpb24gIC0gYW55IHN0cmluZyBkZXNjcmlwdGlvbiB0byBkZXNjcmliZSB0aGUgdGVzdFxuICogQHBhcmFtICAgIGJvZHkgICAgICAgICAtIGV4ZWN1dGlvbiBib2R5IHRoYXQgc2hvdWxkIHRocm93IG9uIGZhaWx1cmVcbiAqIEBwcm9wZXJ0eSB0aHJvd3MgICAgICAgLSBkZXNjcmliZSBhbiBleHBlY3RlZCB0aHJvd1xuICogQHByb3BlcnR5IGRlbGV0ZVN0YWNrcyAtIG9wdGlvbmFsbHkgZGVsZXRlIHN0YWNrIHRyYWNlczsgZGVsZXRlcyBFcnJvciBzdGFja3NcbiAqIEByZXR1cm4gICBQcm9taXNlPFQ+ICAgLSBwcm9taXNlcyBhbnkgdmFsdWUgcmV0dXJuZWQgYnkgdGhlIGJvZHlcbiAqL1xuZXhwb3J0IHR5cGUgQVBJID0gdHlwZW9mIHRlc3Q7XG4vKipcbiAqIFJlZ2lzdGVycyBhIG5ldyB0ZXN0LlxuICpcbiAqIEBwYXJhbSAgICBkZXNjcmlwdGlvbiAgLSBhbnkgc3RyaW5nIGRlc2NyaXB0aW9uIHRvIGRlc2NyaWJlIHRoZSB0ZXN0XG4gKiBAcGFyYW0gICAgYm9keSAgICAgICAgIC0gZXhlY3V0aW9uIGJvZHkgdGhhdCBzaG91bGQgdGhyb3cgb24gZmFpbHVyZVxuICogQHByb3BlcnR5IHRocm93cyAgICAgICAtIGRlc2NyaWJlIGFuIGV4cGVjdGVkIHRocm93XG4gKiBAcHJvcGVydHkgZGVsZXRlU3RhY2tzIC0gb3B0aW9uYWxseSBkZWxldGUgc3RhY2sgdHJhY2VzOyBkZWxldGVzIEVycm9yIHN0YWNrc1xuICogQHJldHVybiAgIFByb21pc2U8VD4gICAtIHByb21pc2VzIGFueSB2YWx1ZSByZXR1cm5lZCBieSB0aGUgYm9keVxuICovXG5leHBvcnQgZGVjbGFyZSBjb25zdCB0ZXN0OiB7XG4gIDxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD47XG4gIHRocm93czoge1xuICAgIChjb25zdHJ1Y3RvcjogRXJyb3JTdWJDb25zdHJ1Y3RvciwgbWVzc2FnZT86IHN0cmluZyk6IEFQSTtcbiAgICAobWVzc2FnZTogc3RyaW5nKTogQVBJO1xuICAgIChpc0NvcnJlY3RUaHJvdzogUHJlZGljYXRlPFtFcnJvclN1YiB8IGFueV0+KTogQVBJO1xuICAgICgpOiBBUEk7XG4gICAgPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPjtcbiAgfTtcbiAgZGVsZXRlU3RhY2tzKHNldHRpbmc/OiBib29sZWFuKTogdm9pZDtcbn07XG5cbnR5cGUgVGhyb3dEZXNjcmlwdG9yID0ge1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBjb25zdHJ1Y3RlZEJ5PzogRXJyb3JTdWJDb25zdHJ1Y3RvcjtcbiAgcHJlZGljYXRlPzogUHJlZGljYXRlPFtFcnJvciB8IGFueV0+O1xufTtcblxuY2xhc3MgVGVzdHRzSW50ZXJuYWxFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcHVibGljIGNhdXNlPzogRXJyb3I7XG4gIGNvbnN0cnVjdG9yKHdoeTogc3RyaW5nLCBjYXVzZT86IEVycm9yKSB7XG4gICAgc3VwZXIoXCJbdGVzdHRzXSBJbnRlcm5hbCBFcnJvcjogXCIgKyB3aHkpO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuY2xhc3MgVGVzdHRzQXJndW1lbnRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcHVibGljIGFyZ3M6IGFueVtdO1xuICBjb25zdHJ1Y3Rvcih3aHk6IHN0cmluZywgLi4uYXJnczogYW55W10pIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIEFyZ3VtZW50IEVycm9yOiBcIiArIHdoeSk7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgfVxufVxuY2xhc3MgVGVzdHRzVHlwZUVycm9yIGV4dGVuZHMgVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3Iod2h5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIFR5cGUgRXJyb3I6IFwiICsgd2h5KTtcbiAgfVxufVxuXG4vLyBnbG9iYWwgY29uc3RhbnRzXG5jb25zdCBBTlNJX0dSQVlfRkcgPSBcIlxceDFiWzkwbVwiO1xuY29uc3QgQU5TSV9HUkVFTl9GRyA9IFwiXFx4MWJbMzJtXCI7XG5jb25zdCBBTlNJX1JFRF9GRyA9IFwiXFx4MWJbMzFtXCI7XG5jb25zdCBBTlNJX0NZQU5fRkcgPSBcIlxceDFiWzM2bVwiO1xuY29uc3QgQU5TSV9SRVNFVCA9IFwiXFx4MWJbMG1cIjtcbmNvbnN0IFRFU1QgPSBBTlNJX0dSQVlfRkcgKyBcIuKWt1wiICsgQU5TSV9SRVNFVDtcbmNvbnN0IFBBU1MgPSBBTlNJX0dSRUVOX0ZHICsgXCLinJNcIiArIEFOU0lfUkVTRVQ7XG5jb25zdCBGQUlMID0gQU5TSV9SRURfRkcgKyBcIuKcl1wiICsgQU5TSV9SRVNFVDtcblxuZnVuY3Rpb24gYWRkSW5kZW50QWZ0ZXJOZXdsaW5lcyhzdHI6IHN0cmluZywgc3BhY2luZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0ci5zcGxpdChcIlxcblwiKS5yZWR1Y2UoKGEsIHYsIGksIF8pID0+IHtcbiAgICBpZiAoaSA9PT0gMCkgYSArPSB2O1xuICAgIGVsc2UgaWYgKGkgPT09IF8ubGVuZ3RoIC0gMSkgYSArPSBcIlxcblwiICsgdjtcbiAgICBlbHNlIGEgKz0gXCJcXG5cIiArIHNwYWNpbmcgKyB2O1xuICAgIHJldHVybiBhO1xuICB9LCBcIlwiKTtcbn1cblxuaW50ZXJmYWNlIFN0ZGlvTWFuaXB1bGF0b3Ige1xuICBpbmRlbnQ6IG51bWJlcjtcbiAgaW5kZW50TmV3bGluZXNPbmx5OiBib29sZWFuO1xuICByZXNldDogKCkgPT4gdm9pZDtcbn1cbmNsYXNzIFN0ZGlvTWFuaXB1bGF0b3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBjb25zdCBfc2VsZiA9IHRoaXM7XG4gICAgbGV0IF9zdGRvdXQgPSBwcm9jZXNzLnN0ZG91dC53cml0ZS5iaW5kKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICBsZXQgX3N0ZGVyciA9IHByb2Nlc3Muc3RkZXJyLndyaXRlLmJpbmQocHJvY2Vzcy5zdGRvdXQpO1xuICAgIGxldCBfaW5kZW50ID0gMDtcbiAgICBsZXQgX2luZGVudE5ld2xpbmVzT25seSA9IGZhbHNlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImluZGVudFwiLCB7XG4gICAgICBnZXQ6ICgpID0+IF9pbmRlbnQsXG4gICAgICBzZXQ6IChuOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBuICE9PSBcIm51bWJlclwiKVxuICAgICAgICAgIHRocm93IG5ldyBUZXN0dHNJbnRlcm5hbEVycm9yKFwiYmFkIGluZGVudCBhc3NpZ25tZW50XCIpO1xuICAgICAgICBfaW5kZW50ID0gbjtcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpbmRlbnROZXdsaW5lc09ubHlcIiwge1xuICAgICAgZ2V0OiAoKSA9PiBfaW5kZW50TmV3bGluZXNPbmx5LFxuICAgICAgc2V0OiAoYjogbnVtYmVyKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgYiAhPT0gXCJib29sZWFuXCIpXG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXCJiYWQgaW5kZW50TmV3bGluZXNPbmx5IGFzc2lnbm1lbnRcIik7XG4gICAgICAgIF9pbmRlbnROZXdsaW5lc09ubHkgPSBiO1xuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuICAgIHRoaXMucmVzZXQgPSAoKSA9PiB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IF9zdGRvdXQ7XG4gICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZSA9IF9zdGRlcnI7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBtYWtlV3JpdGVyKHdyaXRlOiB0eXBlb2YgX3N0ZG91dCB8IHR5cGVvZiBfc3RkZXJyKSB7XG4gICAgICByZXR1cm4gKGJ1ZmZlck9yU3RyOiBhbnksIGNiT3JFbmNvZGluZz86IGFueSwgY2I/OiBhbnkpOiBib29sZWFuID0+IHtcbiAgICAgICAgY29uc3Qgc3BhY2luZyA9IG5ldyBBcnJheShfc2VsZi5pbmRlbnQpLmZpbGwoXCIgXCIpLmpvaW4oXCJcIik7XG4gICAgICAgIGlmICghX3NlbGYuaW5kZW50TmV3bGluZXNPbmx5KSB3cml0ZShzcGFjaW5nKTtcbiAgICAgICAgLy8gaWYgcHJpbnRpbmcgYSBzdHJpbmcgKHRoYXQgaXMgbm90IG9ubHkgd2hpdGVzcGFjZSlcbiAgICAgICAgaWYgKHR5cGVvZiBidWZmZXJPclN0ciA9PT0gXCJzdHJpbmdcIiAmJiBidWZmZXJPclN0ci5tYXRjaCgvXFxTLykpIHtcbiAgICAgICAgICAvLyByZXBsYWNlIGFueSBuZXdsaW5lcyB3aXRoIG5sK3NwYWNlcyAoZXhjZXB0IGZvciB0aGUgbGFzdCBvbmUpXG4gICAgICAgICAgYnVmZmVyT3JTdHIgPSBhZGRJbmRlbnRBZnRlck5ld2xpbmVzKGJ1ZmZlck9yU3RyLCBzcGFjaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNiT3JFbmNvZGluZyA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICAgIHJldHVybiB3cml0ZShidWZmZXJPclN0ciwgY2JPckVuY29kaW5nKTtcbiAgICAgICAgZWxzZSByZXR1cm4gd3JpdGUoYnVmZmVyT3JTdHIsIGNiT3JFbmNvZGluZywgY2IpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSBtYWtlV3JpdGVyKF9zdGRvdXQpO1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlID0gbWFrZVdyaXRlcihfc3RkZXJyKTtcbiAgfVxufVxuXG4vLyBtdXRhYmxlIGdsb2JhbCBkYXRhXG5jb25zdCBfU1RESU9fTUFOSVBfID0gbmV3IFN0ZGlvTWFuaXB1bGF0b3IoKTtcbmNvbnN0IF9URVNUX1BST01JU0VTXzogV2Vha1NldDxQcm9taXNlPGFueT4+ID0gbmV3IFdlYWtTZXQoKTtcbmxldCBfTl9URVNUU19QQVNTRURfID0gMDtcbmxldCBfTl9URVNUU19GQUlMRURfID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZmluZFRlc3RQYXRocyhcbiAgbWF0Y2hlcjogc3RyaW5nID0gXCJcXFxcLnRlc3RcXFxcLmpzXCJcbik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IGF3YWl0IChhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgXzogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBjb2xsZWN0IGFueSBtYW51YWxseSBzcGVjaWZpZWQgZmlsZXMgZmlyc3RcbiAgICBmb3IgKGxldCBpID0gMjsgaSA8IHByb2Nlc3MuYXJndi5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgY3VyID0gcHJvY2Vzcy5hcmd2W2ldO1xuICAgICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgICAgZnMubHN0YXQoY3VyLCAoZXJyLCBzdGF0KSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycik7XG4gICAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBfLnB1c2gocGF0aC5yZXNvbHZlKGN1cikpO1xuICAgICAgICBwcm9jZXNzLmFyZ3Yuc3BsaWNlKGksIDEpO1xuICAgICAgICAtLWk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBfO1xuICB9KSgpO1xuXG4gIC8vIGRlZmluZSB0aGUgZmlsZSBzZWFyY2ggZnVuY3Rpb25cbiAgYXN5bmMgZnVuY3Rpb24gc2VhcmNoKGN1cjogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3RhdHM6IGZzLlN0YXRzID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgIGZzLmxzdGF0KGN1ciwgKGVyciwgc3RhdCkgPT4ge1xuICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgZWxzZSByZXNvbHZlKHN0YXQpO1xuICAgICAgfSlcbiAgICApO1xuICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHBhdGguYmFzZW5hbWUoY3VyKTtcbiAgICAgIGlmIChuYW1lLm1hdGNoKG5ldyBSZWdFeHAobWF0Y2hlciwgXCJtXCIpKSkgcmVzdWx0LnB1c2gocGF0aC5yZXNvbHZlKGN1cikpO1xuICAgIH0gZWxzZSBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29uc3Qgc3Viczogc3RyaW5nW10gPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgICBmcy5yZWFkZGlyKGN1ciwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgICBlbHNlIHJlc29sdmUoZmlsZXMpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzKSBhd2FpdCBzZWFyY2gocGF0aC5qb2luKGN1ciwgcykpO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpKSB7XG4gICAgICBhd2FpdCBzZWFyY2gocGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0YXJnZXQpIHx8IFwiLi9cIik7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXG4gICAgICBcImVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIHNlYXJjaGluZyBmb3IgdGVzdHNcIixcbiAgICAgIGVcbiAgICApO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5sZW5ndGggPT09IDApXG4gICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICBcImNhbm5vdCBmaW5kIHRlc3RzXCIsXG4gICAgICAuLi5wcm9jZXNzLmFyZ3Yuc2xpY2UoMilcbiAgICApO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmludGVyZmFjZSBUZXN0PFQ+IHtcbiAgcmVhZG9ubHkgb25jZVJlYWR5OiBQcm9taXNlPHZvaWQ+O1xuICByZWFkb25seSBwYXNzZWQ6IGJvb2xlYW47XG4gIGdldFJlc3VsdDogKCkgPT4gVCB8IFByb21pc2U8VD47XG4gIGxvZzogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbn1cbmNsYXNzIFRlc3Q8VD4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgIGJvZHk6IFRlc3RCb2R5PFQ+LFxuICAgIGRhdGFMaXN0ZW5lcjogKGRhdGE/OiBUKSA9PiB2b2lkLFxuICAgIGVyckxpc3RlbmVyOiAoZXJyPzogYW55KSA9PiB2b2lkLFxuICAgIGV4cGVjdGVkVGhyb3c/OiBUaHJvd0Rlc2NyaXB0b3IsXG4gICAgZGVsZXRlU3RhY2tzPzogYm9vbGVhblxuICApIHtcbiAgICBsZXQgX2Vycm9yOiBhbnkgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgX3Bhc3NlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgY29uc3QgX2NoaWxkcmVuOiBUZXN0PGFueT5bXSA9IFtdO1xuXG4gICAgdGhpcy5sb2cgPSBhc3luYyAoKSA9PiB7XG4gICAgICBsZXQgYW55Q2hpbGRyZW5GYWlsZWQgPSBmYWxzZTtcbiAgICAgIGlmIChfY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFRFU1QgKyBcIiBcIiArIGRlc2NyaXB0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChfcGFzc2VkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coUEFTUyArIFwiIFwiICsgZGVzY3JpcHRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoRkFJTCArIFwiIFwiICsgZGVzY3JpcHRpb24pO1xuXG4gICAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgKz0gMjtcbiAgICAgICAgICBpZiAoX2Vycm9yKSB7XG4gICAgICAgICAgICBpZiAoZGVsZXRlU3RhY2tzICYmIF9lcnJvciBpbnN0YW5jZW9mIEVycm9yKSBkZWxldGUgX2Vycm9yLnN0YWNrO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihfZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXhwZWN0ZWRUaHJvdykge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBleHBlY3RlZFRocm93Lm1lc3NhZ2UgfHxcbiAgICAgICAgICAgICAgZXhwZWN0ZWRUaHJvdy5jb25zdHJ1Y3RlZEJ5IHx8XG4gICAgICAgICAgICAgIGV4cGVjdGVkVGhyb3cucHJlZGljYXRlXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd106XCIpO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGV4cGVjdGVkVGhyb3cpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltleHBlY3RlZCB0aHJvd11cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIF9TVERJT19NQU5JUF8uaW5kZW50IC09IDI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGxldCBuQ2hpbGRyZW5CZWZvcmUgPSBfY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBfY2hpbGRyZW4pIHtcbiAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgKz0gMjtcbiAgICAgICAgYXdhaXQgY2hpbGQub25jZVJlYWR5O1xuICAgICAgICBhd2FpdCBjaGlsZC5sb2coKTtcbiAgICAgICAgYW55Q2hpbGRyZW5GYWlsZWQgPSBhbnlDaGlsZHJlbkZhaWxlZCB8fCAhY2hpbGQucGFzc2VkO1xuICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudCAtPSAyO1xuICAgICAgfVxuICAgICAgaWYgKF9jaGlsZHJlbi5sZW5ndGggPiBuQ2hpbGRyZW5CZWZvcmUpXG4gICAgICAgIHRocm93IG5ldyBUZXN0dHNUeXBlRXJyb3IoXG4gICAgICAgICAgXCJmb3VuZCBhIHN1YmNoaWxkIGF0dGFjaGVkIHRvIGEgbm9uLWltbWVkaWF0ZSBwYXJlbnQuLi4gXCIgK1xuICAgICAgICAgICAgXCJjaGVjayBmb3IgbWlzc2luZyBgdGVzdGAgcGFyYW1ldGVyc1wiXG4gICAgICAgICk7XG4gICAgICBpZiAoYW55Q2hpbGRyZW5GYWlsZWQgJiYgX3Bhc3NlZCkge1xuICAgICAgICAvLyBpZiBhbnkgY2hpbGRyZW4gZmFpbGVkIGJ1dCB0aGlzIHRlc3QgYm9keSBkaWQgbm90LCByZXBvcnQgZmFpbHVyZVxuICAgICAgICAtLV9OX1RFU1RTX1BBU1NFRF87XG4gICAgICAgICsrX05fVEVTVFNfRkFJTEVEXztcbiAgICAgICAgX3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICBjb25zb2xlLmVycm9yKEZBSUwpO1xuICAgICAgfSBlbHNlIGlmIChfY2hpbGRyZW4ubGVuZ3RoICYmICFfcGFzc2VkKSB7XG4gICAgICAgIC8vIGVsc2UgaWYgdGhlcmUgd2FzIGNoaWxkIG91dHB1dCBmb3IgYSBmYWlsZWQgcGFyZW50LCByZXBvcnQgZmFpbHVyZVxuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShGQUlMICsgXCIgXCIpO1xuICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudCArPSAyO1xuICAgICAgICBpZiAoX2Vycm9yKSB7XG4gICAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnROZXdsaW5lc09ubHkgPSB0cnVlO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoX2Vycm9yKTtcbiAgICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudE5ld2xpbmVzT25seSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChleHBlY3RlZFRocm93KSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgZXhwZWN0ZWRUaHJvdy5tZXNzYWdlIHx8XG4gICAgICAgICAgICBleHBlY3RlZFRocm93LmNvbnN0cnVjdGVkQnkgfHxcbiAgICAgICAgICAgIGV4cGVjdGVkVGhyb3cucHJlZGljYXRlXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XTpcIik7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGV4cGVjdGVkVGhyb3cpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgLT0gMjtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgX29uY2VSZWFkeSA9IG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBib2R5KFxuICAgICAgICAgIG1ha2VBUEkoKHYpID0+IF9jaGlsZHJlbi5wdXNoKHYpLCBkZWxldGVTdGFja3MpXG4gICAgICAgICk7XG4gICAgICAgIGlmICghZXhwZWN0ZWRUaHJvdykge1xuICAgICAgICAgICsrX05fVEVTVFNfUEFTU0VEXztcbiAgICAgICAgICBfcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICBkYXRhTGlzdGVuZXIocmVzdWx0KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKytfTl9URVNUU19GQUlMRURfO1xuICAgICAgICAgIF9wYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICBlcnJMaXN0ZW5lcigpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBfZXJyb3IgPSBlO1xuICAgICAgICBpZiAoZXhwZWN0ZWRUaHJvdykge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGV4cGVjdGVkVGhyb3cubWVzc2FnZSB8fFxuICAgICAgICAgICAgZXhwZWN0ZWRUaHJvdy5jb25zdHJ1Y3RlZEJ5IHx8XG4gICAgICAgICAgICBleHBlY3RlZFRocm93LnByZWRpY2F0ZVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gdGhyb3cgd2FzIGRlc2NyaWJlZDsgY2hlY2sgdGhlIGRlc2NyaXB0b3JcbiAgICAgICAgICAgIGlmIChleHBlY3RlZFRocm93LnByZWRpY2F0ZSkge1xuICAgICAgICAgICAgICBfcGFzc2VkID0gISFleHBlY3RlZFRocm93LnByZWRpY2F0ZShlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhwZWN0ZWRUaHJvdy5jb25zdHJ1Y3RlZEJ5ICYmIGV4cGVjdGVkVGhyb3cubWVzc2FnZSkge1xuICAgICAgICAgICAgICBfcGFzc2VkID1cbiAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgZXhwZWN0ZWRUaHJvdy5jb25zdHJ1Y3RlZEJ5ICYmXG4gICAgICAgICAgICAgICAgZS5tZXNzYWdlID09PSBleHBlY3RlZFRocm93Lm1lc3NhZ2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV4cGVjdGVkVGhyb3cuY29uc3RydWN0ZWRCeSkge1xuICAgICAgICAgICAgICBfcGFzc2VkID0gZSBpbnN0YW5jZW9mIGV4cGVjdGVkVGhyb3cuY29uc3RydWN0ZWRCeTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhwZWN0ZWRUaHJvdy5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgIF9wYXNzZWQgPSBlLm1lc3NhZ2UgPT09IGV4cGVjdGVkVGhyb3cubWVzc2FnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF9wYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX3Bhc3NlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIF9wYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoX3Bhc3NlZCkge1xuICAgICAgICAgICsrX05fVEVTVFNfUEFTU0VEXztcbiAgICAgICAgICBkYXRhTGlzdGVuZXIoKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKytfTl9URVNUU19GQUlMRURfO1xuICAgICAgICAgIGVyckxpc3RlbmVyKGUpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwib25jZVJlYWR5XCIsIHtcbiAgICAgIGdldDogKCkgPT4gX29uY2VSZWFkeSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwicGFzc2VkXCIsIHtcbiAgICAgIGdldDogKCkgPT4gX3Bhc3NlZCxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VBUEkoXG4gIHJlZ2lzdGVyQ2hpbGQ6IDxUPihjaGlsZDogVGVzdDxUPikgPT4gdm9pZCxcbiAgZGVsZXRlU3RhY2tzPzogYm9vbGVhblxuKTogQVBJIHtcbiAgZnVuY3Rpb24gdGhyb3dzKGNvbnN0cnVjdG9yOiBFcnJvclN1YkNvbnN0cnVjdG9yLCBtZXNzYWdlPzogc3RyaW5nKTogQVBJO1xuICBmdW5jdGlvbiB0aHJvd3MobWVzc2FnZTogc3RyaW5nKTogQVBJO1xuICBmdW5jdGlvbiB0aHJvd3MoaXNDb3JyZWN0VGhyb3c6IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPik6IEFQSTtcbiAgZnVuY3Rpb24gdGhyb3dzKCk6IEFQSTtcbiAgZnVuY3Rpb24gdGhyb3dzPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPjtcbiAgZnVuY3Rpb24gdGhyb3dzPFQ+KFxuICAgIHRocm93T3JUZXN0RGVzY3I/OlxuICAgICAgfCBzdHJpbmdcbiAgICAgIHwgRXJyb3JTdWJDb25zdHJ1Y3RvclxuICAgICAgfCBQcmVkaWNhdGU8W0Vycm9yU3ViIHwgYW55XT4sXG4gICAgbWVzc2FnZU9yQm9keT86IHN0cmluZyB8IFRlc3RCb2R5PFQ+XG4gICkge1xuICAgIGlmICghdGhyb3dPclRlc3REZXNjciAmJiAhbWVzc2FnZU9yQm9keSkge1xuICAgICAgLy8gaWYgbm8gYXJndW1lbnRzIHdlcmUgcHJvdmlkZWQsIHNpbXBseSBjcmVhdGUgYSB0ZXN0IGV4cGVjdGluZyB0aHJvd1xuICAgICAgcmV0dXJuIGdlblRlc3RGbih7fSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhyb3dPclRlc3REZXNjciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgLy8gaWYgYXJnMCBpcyBhIHN0cmluZywgaXQgaXMgZWl0aGVyIGFuIGVycm9yIG1lc3NhZ2Ugb3IgdGVzdCBkZXNjcmlwdGlvblxuICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlT3JCb2R5ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgLy8gYXJnMCBpcyBhIHRlc3QgZGVzY3JpcHRpb247IGFyZzEgaXMgYSB0ZXN0IGJvZHlcbiAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7fSkodGhyb3dPclRlc3REZXNjciwgbWVzc2FnZU9yQm9keSk7XG4gICAgICB9IGVsc2UgaWYgKG1lc3NhZ2VPckJvZHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBhcmcwIGlzIGEgbWVzc2FnZTsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7IG1lc3NhZ2U6IHRocm93T3JUZXN0RGVzY3IgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGEgbmV3IHRlc3QgYm9keSBhcyBpdHMgc2Vjb25kIGFyZ3VtZW50IGlmIHRoZSBcIiArXG4gICAgICAgICAgICBcImZpcnN0IGFyZ3VtZW50IGlzIGEgc3RyaW5nXCIsXG4gICAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgICBtZXNzYWdlT3JCb2R5XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhyb3dPclRlc3REZXNjciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBpZiBhcmcwIGlzIGEgZnVuY3Rpb24sIGl0IGlzIGVpdGhlciBhIHRocm93IHByZWRpY2F0ZSBvciBjb25zdHJ1Y3RvclxuICAgICAgaWYgKHRocm93T3JUZXN0RGVzY3IucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlT3JCb2R5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgLy8gYXJnMCBpcyBhbiBlcnJvciBjb25zdHJ1Y3RvcjsgYXJnMSBhbiBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7XG4gICAgICAgICAgICBjb25zdHJ1Y3RlZEJ5OiB0aHJvd09yVGVzdERlc2NyIGFzIEVycm9yU3ViQ29uc3RydWN0b3IsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlT3JCb2R5LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2VPckJvZHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIGFyZzAgaXMgYW4gZXJyb3IgY29uc3RydWN0b3I7IGFyZzEgaXMgdW51c2VkXG4gICAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7XG4gICAgICAgICAgICBjb25zdHJ1Y3RlZEJ5OiB0aHJvd09yVGVzdERlc2NyIGFzIEVycm9yU3ViQ29uc3RydWN0b3IsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGVpdGhlciBhbiBlcnJvciBtZXNzYWdlIG9yIGEgbmV3IHRlc3QgYm9keSBcIiArXG4gICAgICAgICAgICAgIFwiYXMgaXRzIHNlY29uZCBhcmd1bWVudFwiLFxuICAgICAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gYXJnMCBpcyBhbiBlcnJvciBwcmVkaWNhdGU7IGFyZzEgaXMgdW51c2VkXG4gICAgICAgICAgcmV0dXJuIGdlblRlc3RGbih7XG4gICAgICAgICAgICBwcmVkaWNhdGU6IHRocm93T3JUZXN0RGVzY3IgYXMgUHJlZGljYXRlPFtFcnJvciB8IGFueV0+LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgICAgXCJ0ZXN0LnRocm93cyByZXF1aXJlcyBhbiBlbXB0eSBzZWNvbmQgYXJndW1lbnQgaWYgdGhlIGZpcnN0IGlzIGEgXCIgK1xuICAgICAgICAgICAgICBcInRocm93IHByZWRpY2F0ZSAoYSBmdW5jdGlvbiB0aGF0IGRvZXMgbm90IGNvbnN0cnVjdCBFcnJvcnMpXCIsXG4gICAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSwgZXJyb3IgY29uc3RydWN0b3IsIHByZWRpY2F0ZSwgXCIgK1xuICAgICAgICAgIFwib3IgbmV3IHRlc3QgZGVzY3JpcHRpb24gYXMgaXRzIGZpcnN0IGFyZ3VtZW50XCIsXG4gICAgICAgIHRocm93T3JUZXN0RGVzY3IsXG4gICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGdlblRlc3RGbihleHBlY3RlZFRocm93PzogVGhyb3dEZXNjcmlwdG9yKSB7XG4gICAgY29uc3QgdGVzdCA9IDxUPihkZXNjcmlwdGlvbjogc3RyaW5nLCBib2R5OiBUZXN0Qm9keTxUPik6IFByb21pc2U8VD4gPT4ge1xuICAgICAgaWYgKHR5cGVvZiBib2R5ICE9PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgIFwidGVzdHMgd2l0aCBkZXNjcmlwdGlvbnMgcmVxdWlyZSBhIHRlc3QgYm9keVwiXG4gICAgICAgICk7XG4gICAgICBjb25zdCBleGVjdXRpb246IFByb21pc2U8VD4gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHQgPSBuZXcgVGVzdChcbiAgICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgICBib2R5LFxuICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgcmVqZWN0LFxuICAgICAgICAgIGV4cGVjdGVkVGhyb3csXG4gICAgICAgICAgZGVsZXRlU3RhY2tzXG4gICAgICAgICk7XG4gICAgICAgIHJlZ2lzdGVyQ2hpbGQodCk7XG4gICAgICB9KTtcbiAgICAgIF9URVNUX1BST01JU0VTXy5hZGQoZXhlY3V0aW9uKTtcbiAgICAgIHJldHVybiBleGVjdXRpb247XG4gICAgfTtcbiAgICB0ZXN0LnRocm93cyA9IHRocm93cztcbiAgICB0ZXN0LmRlbGV0ZVN0YWNrcyA9IChzZXR0aW5nID0gdHJ1ZSkgPT4ge1xuICAgICAgZGVsZXRlU3RhY2tzID0gc2V0dGluZztcbiAgICB9O1xuICAgIHJldHVybiB0ZXN0O1xuICB9XG4gIHJldHVybiBnZW5UZXN0Rm4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2xvYmFsVGVzdExhdW5jaGVyKCkge1xuICAvLyBjYXRjaCBhbnkgdW5oYW5kbGVkIHJlamVjdGlvbnMgdGhyb3duIGJ5IHRlc3RzXG4gIHByb2Nlc3MuYWRkTGlzdGVuZXIoXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgKGRldGFpbHMsIHByb21pc2UpID0+IHtcbiAgICAvLyBvbmx5IGxvZyB1bmhhbmRsZWQgcmVqZWN0aW9ucyBpZiB0aGV5IGRvbid0IGRpcmVjdGx5IGJlbG9uZyB0byBhIHRlc3RcbiAgICBpZiAoIV9URVNUX1BST01JU0VTXy5oYXMocHJvbWlzZSkpIHtcbiAgICAgIF9TVERJT19NQU5JUF8ucmVzZXQoKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiW3Rlc3R0c10gRXJyb3I6IFVuaGFuZGxlZCBwcm9taXNlIHJlamVjdGlvbi4gRXhpdGluZy4gU2VlIGJlbG93OlwiXG4gICAgICApO1xuICAgICAgY29uc29sZS5lcnJvcihkZXRhaWxzKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHNoaWZ0IGFsbCB0ZXN0IG91dHB1dCBieSAxXG4gIF9TVERJT19NQU5JUF8uaW5kZW50ID0gMTtcblxuICAvLyBjaGVjayBmb3Igb3B0aW9uc1xuICBsZXQgbWF0Y2hlcjogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMjsgaSA8IHByb2Nlc3MuYXJndi5sZW5ndGggLSAxOyArK2kpIHtcbiAgICBpZiAoXG4gICAgICBwcm9jZXNzLmFyZ3ZbaV0udHJpbSgpID09PSBcIi0tbWF0Y2hcIiB8fFxuICAgICAgcHJvY2Vzcy5hcmd2W2ldLnRyaW0oKSA9PT0gXCItbVwiXG4gICAgKSB7XG4gICAgICBjb25zb2xlLmxvZyhcImhlZWV5XCIpO1xuICAgICAgbWF0Y2hlciA9IHByb2Nlc3MuYXJndltpICsgMV07XG4gICAgICBwcm9jZXNzLmFyZ3Yuc3BsaWNlKGksIDIpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHBhdGhzID0gYXdhaXQgZmluZFRlc3RQYXRocyhtYXRjaGVyKTtcbiAgY29uc3QgZmlsZVRlc3RzOiBUZXN0PHZvaWQ+W10gPSBbXTtcbiAgZm9yIChjb25zdCBwIG9mIHBhdGhzKSB7XG4gICAgZmlsZVRlc3RzLnB1c2goXG4gICAgICBuZXcgVGVzdChcbiAgICAgICAgQU5TSV9DWUFOX0ZHICsgcGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBwKSArIEFOU0lfUkVTRVQsXG4gICAgICAgICh0ZXN0KSA9PiB7XG4gICAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgICAgICB0ZXN0LFxuICAgICAgICAgICAgYXNzZXJ0LFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmVxdWlyZShwKTtcbiAgICAgICAgfSxcbiAgICAgICAgKCkgPT4ge30sXG4gICAgICAgICgpID0+IHt9XG4gICAgICApXG4gICAgKTtcbiAgfVxuICBmb3IgKGNvbnN0IGZ0IG9mIGZpbGVUZXN0cykge1xuICAgIGF3YWl0IGZ0Lm9uY2VSZWFkeTtcbiAgICBhd2FpdCBmdC5sb2coKTtcbiAgfVxufVxuXG5pZiAocHJvY2Vzcy5hcmd2Lmxlbmd0aCA+PSAzKSB7XG4gIGdsb2JhbFRlc3RMYXVuY2hlcigpXG4gICAgLnRoZW4oKCkgPT4ge1xuICAgICAgX1NURElPX01BTklQXy5yZXNldCgpO1xuICAgICAgaWYgKF9OX1RFU1RTX0ZBSUxFRF8pIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICBcIlxcblwiICtcbiAgICAgICAgICAgIEFOU0lfUkVEX0ZHICtcbiAgICAgICAgICAgIFwicGFzc2VkIFtcIiArXG4gICAgICAgICAgICBfTl9URVNUU19QQVNTRURfICtcbiAgICAgICAgICAgIFwiL1wiICtcbiAgICAgICAgICAgIChfTl9URVNUU19QQVNTRURfICsgX05fVEVTVFNfRkFJTEVEXykgK1xuICAgICAgICAgICAgXCJdIHRlc3RzXCIgK1xuICAgICAgICAgICAgQU5TSV9SRVNFVFxuICAgICAgICApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIFwiXFxuXCIgK1xuICAgICAgICAgICAgQU5TSV9HUkVFTl9GRyArXG4gICAgICAgICAgICBcInBhc3NlZCBbXCIgK1xuICAgICAgICAgICAgX05fVEVTVFNfUEFTU0VEXyArXG4gICAgICAgICAgICBcIi9cIiArXG4gICAgICAgICAgICAoX05fVEVTVFNfUEFTU0VEXyArIF9OX1RFU1RTX0ZBSUxFRF8pICtcbiAgICAgICAgICAgIFwiXSB0ZXN0c1wiICtcbiAgICAgICAgICAgIEFOU0lfUkVTRVRcbiAgICAgICAgKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKChlKSA9PiB7XG4gICAgICBfU1RESU9fTUFOSVBfLnJlc2V0KCk7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH0pO1xufVxuIl19