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
    constructor(description, body, dataListener, errListener, expectedThrow) {
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
                const result = yield body(makeAPI((v) => _children.push(v)));
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
function makeAPI(registerChild) {
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
                const t = new Test(description, body, resolve, reject, expectedThrow);
                registerChild(t);
            });
            _TEST_PROMISES_.add(execution);
            return execution;
        };
        test.throws = throws;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQW9DQSx5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLGlDQUFpQztBQWdEakMsTUFBTSxtQkFBb0IsU0FBUSxLQUFLO0lBRXJDLFlBQVksR0FBVyxFQUFFLEtBQWE7UUFDcEMsS0FBSyxDQUFDLDJCQUEyQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLENBQUM7Q0FDRjtBQUNELE1BQU0sbUJBQW9CLFNBQVEsS0FBSztJQUVyQyxZQUFZLEdBQVcsRUFBRSxHQUFHLElBQVc7UUFDckMsS0FBSyxDQUFDLDJCQUEyQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQUNELE1BQU0sZUFBZ0IsU0FBUSxTQUFTO0lBQ3JDLFlBQVksR0FBVztRQUNyQixLQUFLLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQztDQUNGO0FBR0QsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDO0FBQ2hDLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQztBQUNqQyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUM7QUFDL0IsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDO0FBQ2hDLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUM3QixNQUFNLElBQUksR0FBRyxZQUFZLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQztBQUM3QyxNQUFNLElBQUksR0FBRyxhQUFhLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQztBQUM5QyxNQUFNLElBQUksR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQztBQUU1QyxTQUFTLHNCQUFzQixDQUFDLEdBQVcsRUFBRSxPQUFlO0lBQzFE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RSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztDQUNOIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqKiogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKlxuICoqKiAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqICAgICAgICAgICAgICA6cCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOnAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgICAgICAgICAgICAgICAgICAgICAgICAgXyAgICAgOnggICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgLm94b3hveHAgICAgICAgICAgLjpveG8gICAgICA6cCAgIDpveG94b3hwIC46b3hvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICA6eG94b3hveCAgLm94ICAgICAueCAgb3hvIHAgICA6eCAgOnhveG94b3ggLnggIG94byBwICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6ZCAgIC54IG94byAgICA6bywgIGB4b2AgLm94b3hveHAgOmQgICAgOm8sICBgeG9gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgLm8gICB4b3ggIDp4b3ggICAgICA6eG94b3hveCAgOnggICA6eG94ICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOnggICAgb3hvICAgOm94ICAgICAgICA6ZCAgICAgOm8gICAgIDpveCAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOm94b3hveG8gICAgICA6eG8gICAgICA6eCAgICAgOnggICAgICAgOnhvICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6byAgOm94b3hveCAgICAgICAgIDpveCAgICA6byAgICAgOm8gICAgICAgICA6b3ggICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6eCAgOngsICAgICAgICAub3gsICA6byAgICA6eCAgICAgOnggICAgLm94LCAgOm8gICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICA6cSwgOm94LCAgIC54IGQneG94byB4YCAgICA6byAgICAgOnEsICBkJ3hveG8geGAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAnOnggIDp4b3hveG9gICAgIC5veG9gICAgICA6cSwgICAgJzp4ICAgICAub3hvYCAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICA6eG94b2AgICAgICAgICAgICAgICAnOnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgIEBsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9qcGN4L3Rlc3R0cyAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBsaWNlbnNlIEdQTC0zLjAtb3ItbGF0ZXIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIEBjb3B5cmlnaHQgKEMpIDIwMjAgQGF1dGhvciBKdXN0aW4gQ29sbGllciA8bUBqcGN4LmRldj4gICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgICAgKlxuICogICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgICAgKlxuICogICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3IgICAgICAgKlxuICogICAgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsICAgICAgICAgKlxuICogICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGludGVybmFsaWVkIHdhcnJhbnR5IG9mICAgICAgKlxuICogICAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZSAgICAgICAgICAgKlxuICogICAgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlICAgICAgICAqKlxuICogIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiAgSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi4gICoqKlxuICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKioqKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSBcImFzc2VydFwiO1xuXG5leHBvcnQgdHlwZSBOb25Qcm9taXNlPFQ+ID0gVCBleHRlbmRzIFByb21pc2U8YW55PiA/IG5ldmVyIDogVDtcbmV4cG9ydCB0eXBlIFRlc3RCb2R5U3luYzxUPiA9ICh0ZXN0OiBBUEkpID0+IE5vblByb21pc2U8VD47XG5leHBvcnQgdHlwZSBUZXN0Qm9keUFzeW5jPFQ+ID0gKHRlc3Q6IEFQSSkgPT4gUHJvbWlzZTxUPjtcbmV4cG9ydCB0eXBlIFRlc3RCb2R5PFQ+ID0gVGVzdEJvZHlTeW5jPFQ+IHwgVGVzdEJvZHlBc3luYzxUPjtcbmV4cG9ydCB0eXBlIFByZWRpY2F0ZTxUIGV4dGVuZHMgQXJyYXk8YW55Pj4gPSAoLi4uYXJnczogVCkgPT4gYW55O1xuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3ViIGV4dGVuZHMgRXJyb3Ige31cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdWJDb25zdHJ1Y3RvciB7XG4gIG5ldyAoLi4uYXJnczogYW55W10pOiBFcnJvclN1YjtcbiAgcHJvdG90eXBlOiBFcnJvclN1Yjtcbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBuZXcgdGVzdC5cbiAqXG4gKiBAcGFyYW0gICAgZGVzY3JpcHRpb24gLSBhbnkgc3RyaW5nIGRlc2NyaXB0aW9uIHRvIGRlc2NyaWJlIHRoZSB0ZXN0XG4gKiBAcGFyYW0gICAgYm9keSAgICAgICAgLSBleGVjdXRpb24gYm9keSB0aGF0IHNob3VsZCB0aHJvdyBvbiBmYWlsdXJlXG4gKiBAcHJvcGVydHkgdGhyb3dzICAgICAgLSBkZXNjcmliZSBhbiBleHBlY3RlZCB0aHJvd1xuICogQHJldHVybiAgIFByb21pc2U8VD4gIC0gcHJvbWlzZXMgYW55IHZhbHVlIHJldHVybmVkIGJ5IHRoZSBib2R5XG4gKi9cbmV4cG9ydCB0eXBlIEFQSSA9IHR5cGVvZiB0ZXN0O1xuLyoqXG4gKiBSZWdpc3RlcnMgYSBuZXcgdGVzdC5cbiAqXG4gKiBAcGFyYW0gICAgZGVzY3JpcHRpb24gLSBhbnkgc3RyaW5nIGRlc2NyaXB0aW9uIHRvIGRlc2NyaWJlIHRoZSB0ZXN0XG4gKiBAcGFyYW0gICAgYm9keSAgICAgICAgLSBleGVjdXRpb24gYm9keSB0aGF0IHNob3VsZCB0aHJvdyBvbiBmYWlsdXJlXG4gKiBAcHJvcGVydHkgdGhyb3dzICAgICAgLSBkZXNjcmliZSBhbiBleHBlY3RlZCB0aHJvd1xuICogQHJldHVybiAgIFByb21pc2U8VD4gIC0gcHJvbWlzZXMgYW55IHZhbHVlIHJldHVybmVkIGJ5IHRoZSBib2R5XG4gKi9cbmV4cG9ydCBkZWNsYXJlIGNvbnN0IHRlc3Q6IHtcbiAgPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPjtcbiAgdGhyb3dzOiB7XG4gICAgKGNvbnN0cnVjdG9yOiBFcnJvclN1YkNvbnN0cnVjdG9yLCBtZXNzYWdlPzogc3RyaW5nKTogQVBJO1xuICAgIChtZXNzYWdlOiBzdHJpbmcpOiBBUEk7XG4gICAgKGlzQ29ycmVjdFRocm93OiBQcmVkaWNhdGU8W0Vycm9yU3ViIHwgYW55XT4pOiBBUEk7XG4gICAgKCk6IEFQSTtcbiAgICA8VD4oZGVzY3JpcHRpb246IHN0cmluZywgYm9keTogVGVzdEJvZHk8VD4pOiBQcm9taXNlPFQ+O1xuICB9O1xufTtcblxudHlwZSBUaHJvd0Rlc2NyaXB0b3IgPSB7XG4gIG1lc3NhZ2U/OiBzdHJpbmc7XG4gIGNvbnN0cnVjdGVkQnk/OiBFcnJvclN1YkNvbnN0cnVjdG9yO1xuICBwcmVkaWNhdGU/OiBQcmVkaWNhdGU8W0Vycm9yIHwgYW55XT47XG59O1xuXG5jbGFzcyBUZXN0dHNJbnRlcm5hbEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgY2F1c2U/OiBFcnJvcjtcbiAgY29uc3RydWN0b3Iod2h5OiBzdHJpbmcsIGNhdXNlPzogRXJyb3IpIHtcbiAgICBzdXBlcihcIlt0ZXN0dHNdIEludGVybmFsIEVycm9yOiBcIiArIHdoeSk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG59XG5jbGFzcyBUZXN0dHNBcmd1bWVudEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgYXJnczogYW55W107XG4gIGNvbnN0cnVjdG9yKHdoeTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkge1xuICAgIHN1cGVyKFwiW3Rlc3R0c10gQXJndW1lbnQgRXJyb3I6IFwiICsgd2h5KTtcbiAgICB0aGlzLmFyZ3MgPSBhcmdzO1xuICB9XG59XG5jbGFzcyBUZXN0dHNUeXBlRXJyb3IgZXh0ZW5kcyBUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih3aHk6IHN0cmluZykge1xuICAgIHN1cGVyKFwiW3Rlc3R0c10gVHlwZSBFcnJvcjogXCIgKyB3aHkpO1xuICB9XG59XG5cbi8vIGdsb2JhbCBjb25zdGFudHNcbmNvbnN0IEFOU0lfR1JBWV9GRyA9IFwiXFx4MWJbOTBtXCI7XG5jb25zdCBBTlNJX0dSRUVOX0ZHID0gXCJcXHgxYlszMm1cIjtcbmNvbnN0IEFOU0lfUkVEX0ZHID0gXCJcXHgxYlszMW1cIjtcbmNvbnN0IEFOU0lfQ1lBTl9GRyA9IFwiXFx4MWJbMzZtXCI7XG5jb25zdCBBTlNJX1JFU0VUID0gXCJcXHgxYlswbVwiO1xuY29uc3QgVEVTVCA9IEFOU0lfR1JBWV9GRyArIFwi4pa3XCIgKyBBTlNJX1JFU0VUO1xuY29uc3QgUEFTUyA9IEFOU0lfR1JFRU5fRkcgKyBcIuKck1wiICsgQU5TSV9SRVNFVDtcbmNvbnN0IEZBSUwgPSBBTlNJX1JFRF9GRyArIFwi4pyXXCIgKyBBTlNJX1JFU0VUO1xuXG5mdW5jdGlvbiBhZGRJbmRlbnRBZnRlck5ld2xpbmVzKHN0cjogc3RyaW5nLCBzcGFjaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gc3RyLnNwbGl0KFwiXFxuXCIpLnJlZHVjZSgoYSwgdiwgaSwgXykgPT4ge1xuICAgIGlmIChpID09PSAwKSBhICs9IHY7XG4gICAgZWxzZSBpZiAoaSA9PT0gXy5sZW5ndGggLSAxKSBhICs9IFwiXFxuXCIgKyB2O1xuICAgIGVsc2UgYSArPSBcIlxcblwiICsgc3BhY2luZyArIHY7XG4gICAgcmV0dXJuIGE7XG4gIH0sIFwiXCIpO1xufVxuXG5pbnRlcmZhY2UgU3RkaW9NYW5pcHVsYXRvciB7XG4gIGluZGVudDogbnVtYmVyO1xuICBpbmRlbnROZXdsaW5lc09ubHk6IGJvb2xlYW47XG4gIHJlc2V0OiAoKSA9PiB2b2lkO1xufVxuY2xhc3MgU3RkaW9NYW5pcHVsYXRvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGNvbnN0IF9zZWxmID0gdGhpcztcbiAgICBsZXQgX3N0ZG91dCA9IHByb2Nlc3Muc3Rkb3V0LndyaXRlLmJpbmQocHJvY2Vzcy5zdGRvdXQpO1xuICAgIGxldCBfc3RkZXJyID0gcHJvY2Vzcy5zdGRlcnIud3JpdGUuYmluZChwcm9jZXNzLnN0ZG91dCk7XG4gICAgbGV0IF9pbmRlbnQgPSAwO1xuICAgIGxldCBfaW5kZW50TmV3bGluZXNPbmx5ID0gZmFsc2U7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaW5kZW50XCIsIHtcbiAgICAgIGdldDogKCkgPT4gX2luZGVudCxcbiAgICAgIHNldDogKG46IG51bWJlcikgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIG4gIT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0ludGVybmFsRXJyb3IoXCJiYWQgaW5kZW50IGFzc2lnbm1lbnRcIik7XG4gICAgICAgIF9pbmRlbnQgPSBuO1xuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImluZGVudE5ld2xpbmVzT25seVwiLCB7XG4gICAgICBnZXQ6ICgpID0+IF9pbmRlbnROZXdsaW5lc09ubHksXG4gICAgICBzZXQ6IChiOiBudW1iZXIpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBiICE9PSBcImJvb2xlYW5cIilcbiAgICAgICAgICB0aHJvdyBuZXcgVGVzdHRzSW50ZXJuYWxFcnJvcihcImJhZCBpbmRlbnROZXdsaW5lc09ubHkgYXNzaWdubWVudFwiKTtcbiAgICAgICAgX2luZGVudE5ld2xpbmVzT25seSA9IGI7XG4gICAgICB9LFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgfSk7XG4gICAgdGhpcy5yZXNldCA9ICgpID0+IHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gX3N0ZG91dDtcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlID0gX3N0ZGVycjtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG1ha2VXcml0ZXIod3JpdGU6IHR5cGVvZiBfc3Rkb3V0IHwgdHlwZW9mIF9zdGRlcnIpIHtcbiAgICAgIHJldHVybiAoYnVmZmVyT3JTdHI6IGFueSwgY2JPckVuY29kaW5nPzogYW55LCBjYj86IGFueSk6IGJvb2xlYW4gPT4ge1xuICAgICAgICBjb25zdCBzcGFjaW5nID0gbmV3IEFycmF5KF9zZWxmLmluZGVudCkuZmlsbChcIiBcIikuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKCFfc2VsZi5pbmRlbnROZXdsaW5lc09ubHkpIHdyaXRlKHNwYWNpbmcpO1xuICAgICAgICAvLyBpZiBwcmludGluZyBhIHN0cmluZyAodGhhdCBpcyBub3Qgb25seSB3aGl0ZXNwYWNlKVxuICAgICAgICBpZiAodHlwZW9mIGJ1ZmZlck9yU3RyID09PSBcInN0cmluZ1wiICYmIGJ1ZmZlck9yU3RyLm1hdGNoKC9cXFMvKSkge1xuICAgICAgICAgIC8vIHJlcGxhY2UgYW55IG5ld2xpbmVzIHdpdGggbmwrc3BhY2VzIChleGNlcHQgZm9yIHRoZSBsYXN0IG9uZSlcbiAgICAgICAgICBidWZmZXJPclN0ciA9IGFkZEluZGVudEFmdGVyTmV3bGluZXMoYnVmZmVyT3JTdHIsIHNwYWNpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY2JPckVuY29kaW5nID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgcmV0dXJuIHdyaXRlKGJ1ZmZlck9yU3RyLCBjYk9yRW5jb2RpbmcpO1xuICAgICAgICBlbHNlIHJldHVybiB3cml0ZShidWZmZXJPclN0ciwgY2JPckVuY29kaW5nLCBjYik7XG4gICAgICB9O1xuICAgIH1cbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG1ha2VXcml0ZXIoX3N0ZG91dCk7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUgPSBtYWtlV3JpdGVyKF9zdGRlcnIpO1xuICB9XG59XG5cbi8vIG11dGFibGUgZ2xvYmFsIGRhdGFcbmNvbnN0IF9TVERJT19NQU5JUF8gPSBuZXcgU3RkaW9NYW5pcHVsYXRvcigpO1xuY29uc3QgX1RFU1RfUFJPTUlTRVNfOiBXZWFrU2V0PFByb21pc2U8YW55Pj4gPSBuZXcgV2Vha1NldCgpO1xubGV0IF9OX1RFU1RTX1BBU1NFRF8gPSAwO1xubGV0IF9OX1RFU1RTX0ZBSUxFRF8gPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBmaW5kVGVzdFBhdGhzKFxuICBtYXRjaGVyOiBzdHJpbmcgPSBcIlxcXFwudGVzdFxcXFwuanNcIlxuKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBjb25zdCByZXN1bHQ6IHN0cmluZ1tdID0gYXdhaXQgKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBfOiBzdHJpbmdbXSA9IFtdO1xuICAgIC8vIGNvbGxlY3QgYW55IG1hbnVhbGx5IHNwZWNpZmllZCBmaWxlcyBmaXJzdFxuICAgIGZvciAobGV0IGkgPSAyOyBpIDwgcHJvY2Vzcy5hcmd2Lmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBjdXIgPSBwcm9jZXNzLmFyZ3ZbaV07XG4gICAgICBjb25zdCBzdGF0czogZnMuU3RhdHMgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgICBmcy5sc3RhdChjdXIsIChlcnIsIHN0YXQpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgICBlbHNlIHJlc29sdmUoc3RhdCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIF8ucHVzaChwYXRoLnJlc29sdmUoY3VyKSk7XG4gICAgICAgIHByb2Nlc3MuYXJndi5zcGxpY2UoaSwgMSk7XG4gICAgICAgIC0taTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIF87XG4gIH0pKCk7XG5cbiAgLy8gZGVmaW5lIHRoZSBmaWxlIHNlYXJjaCBmdW5jdGlvblxuICBhc3luYyBmdW5jdGlvbiBzZWFyY2goY3VyOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdGF0czogZnMuU3RhdHMgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgZnMubHN0YXQoY3VyLCAoZXJyLCBzdGF0KSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpO1xuICAgICAgICBlbHNlIHJlc29sdmUoc3RhdCk7XG4gICAgICB9KVxuICAgICk7XG4gICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICBjb25zdCBuYW1lID0gcGF0aC5iYXNlbmFtZShjdXIpO1xuICAgICAgaWYgKG5hbWUubWF0Y2gobmV3IFJlZ0V4cChtYXRjaGVyLCBcIm1cIikpKSByZXN1bHQucHVzaChwYXRoLnJlc29sdmUoY3VyKSk7XG4gICAgfSBlbHNlIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb25zdCBzdWJzOiBzdHJpbmdbXSA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG4gICAgICAgIGZzLnJlYWRkaXIoY3VyLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpO1xuICAgICAgICAgIGVsc2UgcmVzb2x2ZShmaWxlcyk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnMpIGF3YWl0IHNlYXJjaChwYXRoLmpvaW4oY3VyLCBzKSk7XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICBmb3IgKGNvbnN0IHRhcmdldCBvZiBwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpIHtcbiAgICAgIGF3YWl0IHNlYXJjaChwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRhcmdldCkgfHwgXCIuL1wiKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgVGVzdHRzSW50ZXJuYWxFcnJvcihcbiAgICAgIFwiZW5jb3VudGVyZWQgYW4gZXJyb3Igd2hpbGUgc2VhcmNoaW5nIGZvciB0ZXN0c1wiLFxuICAgICAgZVxuICAgICk7XG4gIH1cblxuICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMClcbiAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgIFwiY2Fubm90IGZpbmQgdGVzdHNcIixcbiAgICAgIC4uLnByb2Nlc3MuYXJndi5zbGljZSgyKVxuICAgICk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuaW50ZXJmYWNlIFRlc3Q8VD4ge1xuICByZWFkb25seSBvbmNlUmVhZHk6IFByb21pc2U8dm9pZD47XG4gIHJlYWRvbmx5IHBhc3NlZDogYm9vbGVhbjtcbiAgZ2V0UmVzdWx0OiAoKSA9PiBUIHwgUHJvbWlzZTxUPjtcbiAgbG9nOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xufVxuY2xhc3MgVGVzdDxUPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gICAgYm9keTogVGVzdEJvZHk8VD4sXG4gICAgZGF0YUxpc3RlbmVyOiAoZGF0YT86IFQpID0+IHZvaWQsXG4gICAgZXJyTGlzdGVuZXI6IChlcnI/OiBhbnkpID0+IHZvaWQsXG4gICAgZXhwZWN0ZWRUaHJvdz86IFRocm93RGVzY3JpcHRvclxuICApIHtcbiAgICBsZXQgX2Vycm9yOiBhbnkgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgX3Bhc3NlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgY29uc3QgX2NoaWxkcmVuOiBUZXN0PGFueT5bXSA9IFtdO1xuXG4gICAgdGhpcy5sb2cgPSBhc3luYyAoKSA9PiB7XG4gICAgICBsZXQgYW55Q2hpbGRyZW5GYWlsZWQgPSBmYWxzZTtcbiAgICAgIGlmIChfY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFRFU1QgKyBcIiBcIiArIGRlc2NyaXB0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChfcGFzc2VkKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coUEFTUyArIFwiIFwiICsgZGVzY3JpcHRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoRkFJTCArIFwiIFwiICsgZGVzY3JpcHRpb24pO1xuXG4gICAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgKz0gMjtcbiAgICAgICAgICBpZiAoX2Vycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKF9lcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChleHBlY3RlZFRocm93KSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGV4cGVjdGVkVGhyb3cubWVzc2FnZSB8fFxuICAgICAgICAgICAgICBleHBlY3RlZFRocm93LmNvbnN0cnVjdGVkQnkgfHxcbiAgICAgICAgICAgICAgZXhwZWN0ZWRUaHJvdy5wcmVkaWNhdGVcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XTpcIik7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXhwZWN0ZWRUaHJvdyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW2V4cGVjdGVkIHRocm93XVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgX1NURElPX01BTklQXy5pbmRlbnQgLT0gMjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGV0IG5DaGlsZHJlbkJlZm9yZSA9IF9jaGlsZHJlbi5sZW5ndGg7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIF9jaGlsZHJlbikge1xuICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudCArPSAyO1xuICAgICAgICBhd2FpdCBjaGlsZC5vbmNlUmVhZHk7XG4gICAgICAgIGF3YWl0IGNoaWxkLmxvZygpO1xuICAgICAgICBhbnlDaGlsZHJlbkZhaWxlZCA9IGFueUNoaWxkcmVuRmFpbGVkIHx8ICFjaGlsZC5wYXNzZWQ7XG4gICAgICAgIF9TVERJT19NQU5JUF8uaW5kZW50IC09IDI7XG4gICAgICB9XG4gICAgICBpZiAoX2NoaWxkcmVuLmxlbmd0aCA+IG5DaGlsZHJlbkJlZm9yZSlcbiAgICAgICAgdGhyb3cgbmV3IFRlc3R0c1R5cGVFcnJvcihcbiAgICAgICAgICBcImZvdW5kIGEgc3ViY2hpbGQgYXR0YWNoZWQgdG8gYSBub24taW1tZWRpYXRlIHBhcmVudC4uLiBcIiArXG4gICAgICAgICAgICBcImNoZWNrIGZvciBtaXNzaW5nIGB0ZXN0YCBwYXJhbWV0ZXJzXCJcbiAgICAgICAgKTtcbiAgICAgIGlmIChhbnlDaGlsZHJlbkZhaWxlZCAmJiBfcGFzc2VkKSB7XG4gICAgICAgIC8vIGlmIGFueSBjaGlsZHJlbiBmYWlsZWQgYnV0IHRoaXMgdGVzdCBib2R5IGRpZCBub3QsIHJlcG9ydCBmYWlsdXJlXG4gICAgICAgIC0tX05fVEVTVFNfUEFTU0VEXztcbiAgICAgICAgKytfTl9URVNUU19GQUlMRURfO1xuICAgICAgICBfcGFzc2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoRkFJTCk7XG4gICAgICB9IGVsc2UgaWYgKF9jaGlsZHJlbi5sZW5ndGggJiYgIV9wYXNzZWQpIHtcbiAgICAgICAgLy8gZWxzZSBpZiB0aGVyZSB3YXMgY2hpbGQgb3V0cHV0IGZvciBhIGZhaWxlZCBwYXJlbnQsIHJlcG9ydCBmYWlsdXJlXG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEZBSUwgKyBcIiBcIik7XG4gICAgICAgIF9TVERJT19NQU5JUF8uaW5kZW50ICs9IDI7XG4gICAgICAgIGlmIChfZXJyb3IpIHtcbiAgICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudE5ld2xpbmVzT25seSA9IHRydWU7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihfZXJyb3IpO1xuICAgICAgICAgIF9TVERJT19NQU5JUF8uaW5kZW50TmV3bGluZXNPbmx5ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4cGVjdGVkVGhyb3cpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBleHBlY3RlZFRocm93Lm1lc3NhZ2UgfHxcbiAgICAgICAgICAgIGV4cGVjdGVkVGhyb3cuY29uc3RydWN0ZWRCeSB8fFxuICAgICAgICAgICAgZXhwZWN0ZWRUaHJvdy5wcmVkaWNhdGVcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbZXhwZWN0ZWQgdGhyb3ddOlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXhwZWN0ZWRUaHJvdyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbZXhwZWN0ZWQgdGhyb3ddXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBfU1RESU9fTUFOSVBfLmluZGVudCAtPSAyO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBfb25jZVJlYWR5ID0gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJvZHkobWFrZUFQSSgodikgPT4gX2NoaWxkcmVuLnB1c2godikpKTtcbiAgICAgICAgaWYgKCFleHBlY3RlZFRocm93KSB7XG4gICAgICAgICAgKytfTl9URVNUU19QQVNTRURfO1xuICAgICAgICAgIF9wYXNzZWQgPSB0cnVlO1xuICAgICAgICAgIGRhdGFMaXN0ZW5lcihyZXN1bHQpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICArK19OX1RFU1RTX0ZBSUxFRF87XG4gICAgICAgICAgX3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICAgIGVyckxpc3RlbmVyKCk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIF9lcnJvciA9IGU7XG4gICAgICAgIGlmIChleHBlY3RlZFRocm93KSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgZXhwZWN0ZWRUaHJvdy5tZXNzYWdlIHx8XG4gICAgICAgICAgICBleHBlY3RlZFRocm93LmNvbnN0cnVjdGVkQnkgfHxcbiAgICAgICAgICAgIGV4cGVjdGVkVGhyb3cucHJlZGljYXRlXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyB0aHJvdyB3YXMgZGVzY3JpYmVkOyBjaGVjayB0aGUgZGVzY3JpcHRvclxuICAgICAgICAgICAgaWYgKGV4cGVjdGVkVGhyb3cucHJlZGljYXRlKSB7XG4gICAgICAgICAgICAgIF9wYXNzZWQgPSAhIWV4cGVjdGVkVGhyb3cucHJlZGljYXRlKGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChleHBlY3RlZFRocm93LmNvbnN0cnVjdGVkQnkgJiYgZXhwZWN0ZWRUaHJvdy5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgIF9wYXNzZWQgPVxuICAgICAgICAgICAgICAgIGUgaW5zdGFuY2VvZiBleHBlY3RlZFRocm93LmNvbnN0cnVjdGVkQnkgJiZcbiAgICAgICAgICAgICAgICBlLm1lc3NhZ2UgPT09IGV4cGVjdGVkVGhyb3cubWVzc2FnZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhwZWN0ZWRUaHJvdy5jb25zdHJ1Y3RlZEJ5KSB7XG4gICAgICAgICAgICAgIF9wYXNzZWQgPSBlIGluc3RhbmNlb2YgZXhwZWN0ZWRUaHJvdy5jb25zdHJ1Y3RlZEJ5O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChleHBlY3RlZFRocm93Lm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgX3Bhc3NlZCA9IGUubWVzc2FnZSA9PT0gZXhwZWN0ZWRUaHJvdy5tZXNzYWdlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgX3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3Bhc3NlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfcGFzc2VkKSB7XG4gICAgICAgICAgKytfTl9URVNUU19QQVNTRURfO1xuICAgICAgICAgIGRhdGFMaXN0ZW5lcigpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICArK19OX1RFU1RTX0ZBSUxFRF87XG4gICAgICAgICAgZXJyTGlzdGVuZXIoZSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJvbmNlUmVhZHlcIiwge1xuICAgICAgZ2V0OiAoKSA9PiBfb25jZVJlYWR5LFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJwYXNzZWRcIiwge1xuICAgICAgZ2V0OiAoKSA9PiBfcGFzc2VkLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZUFQSShyZWdpc3RlckNoaWxkOiA8VD4oY2hpbGQ6IFRlc3Q8VD4pID0+IHZvaWQpOiBBUEkge1xuICBmdW5jdGlvbiB0aHJvd3MoY29uc3RydWN0b3I6IEVycm9yU3ViQ29uc3RydWN0b3IsIG1lc3NhZ2U/OiBzdHJpbmcpOiBBUEk7XG4gIGZ1bmN0aW9uIHRocm93cyhtZXNzYWdlOiBzdHJpbmcpOiBBUEk7XG4gIGZ1bmN0aW9uIHRocm93cyhpc0NvcnJlY3RUaHJvdzogUHJlZGljYXRlPFtFcnJvclN1YiB8IGFueV0+KTogQVBJO1xuICBmdW5jdGlvbiB0aHJvd3MoKTogQVBJO1xuICBmdW5jdGlvbiB0aHJvd3M8VD4oZGVzY3JpcHRpb246IHN0cmluZywgYm9keTogVGVzdEJvZHk8VD4pOiBQcm9taXNlPFQ+O1xuICBmdW5jdGlvbiB0aHJvd3M8VD4oXG4gICAgdGhyb3dPclRlc3REZXNjcj86XG4gICAgICB8IHN0cmluZ1xuICAgICAgfCBFcnJvclN1YkNvbnN0cnVjdG9yXG4gICAgICB8IFByZWRpY2F0ZTxbRXJyb3JTdWIgfCBhbnldPixcbiAgICBtZXNzYWdlT3JCb2R5Pzogc3RyaW5nIHwgVGVzdEJvZHk8VD5cbiAgKSB7XG4gICAgaWYgKCF0aHJvd09yVGVzdERlc2NyICYmICFtZXNzYWdlT3JCb2R5KSB7XG4gICAgICAvLyBpZiBubyBhcmd1bWVudHMgd2VyZSBwcm92aWRlZCwgc2ltcGx5IGNyZWF0ZSBhIHRlc3QgZXhwZWN0aW5nIHRocm93XG4gICAgICByZXR1cm4gZ2VuVGVzdEZuKHt9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aHJvd09yVGVzdERlc2NyID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAvLyBpZiBhcmcwIGlzIGEgc3RyaW5nLCBpdCBpcyBlaXRoZXIgYW4gZXJyb3IgbWVzc2FnZSBvciB0ZXN0IGRlc2NyaXB0aW9uXG4gICAgICBpZiAodHlwZW9mIG1lc3NhZ2VPckJvZHkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAvLyBhcmcwIGlzIGEgdGVzdCBkZXNjcmlwdGlvbjsgYXJnMSBpcyBhIHRlc3QgYm9keVxuICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHt9KSh0aHJvd09yVGVzdERlc2NyLCBtZXNzYWdlT3JCb2R5KTtcbiAgICAgIH0gZWxzZSBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIGFyZzAgaXMgYSBtZXNzYWdlOyBhcmcxIGlzIHVudXNlZFxuICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHsgbWVzc2FnZTogdGhyb3dPclRlc3REZXNjciB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUZXN0dHNBcmd1bWVudEVycm9yKFxuICAgICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgYSBuZXcgdGVzdCBib2R5IGFzIGl0cyBzZWNvbmQgYXJndW1lbnQgaWYgdGhlIFwiICtcbiAgICAgICAgICAgIFwiZmlyc3QgYXJndW1lbnQgaXMgYSBzdHJpbmdcIixcbiAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgIG1lc3NhZ2VPckJvZHlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aHJvd09yVGVzdERlc2NyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIGlmIGFyZzAgaXMgYSBmdW5jdGlvbiwgaXQgaXMgZWl0aGVyIGEgdGhyb3cgcHJlZGljYXRlIG9yIGNvbnN0cnVjdG9yXG4gICAgICBpZiAodGhyb3dPclRlc3REZXNjci5wcm90b3R5cGUgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2VPckJvZHkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAvLyBhcmcwIGlzIGFuIGVycm9yIGNvbnN0cnVjdG9yOyBhcmcxIGFuIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIGNvbnN0cnVjdGVkQnk6IHRocm93T3JUZXN0RGVzY3IgYXMgRXJyb3JTdWJDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VPckJvZHksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZU9yQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gYXJnMCBpcyBhbiBlcnJvciBjb25zdHJ1Y3RvcjsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIGNvbnN0cnVjdGVkQnk6IHRocm93T3JUZXN0RGVzY3IgYXMgRXJyb3JTdWJDb25zdHJ1Y3RvcixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgICAgIFwidGVzdC50aHJvd3MgcmVxdWlyZXMgZWl0aGVyIGFuIGVycm9yIG1lc3NhZ2Ugb3IgYSBuZXcgdGVzdCBib2R5IFwiICtcbiAgICAgICAgICAgICAgXCJhcyBpdHMgc2Vjb25kIGFyZ3VtZW50XCIsXG4gICAgICAgICAgICB0aHJvd09yVGVzdERlc2NyLFxuICAgICAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChtZXNzYWdlT3JCb2R5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBhcmcwIGlzIGFuIGVycm9yIHByZWRpY2F0ZTsgYXJnMSBpcyB1bnVzZWRcbiAgICAgICAgICByZXR1cm4gZ2VuVGVzdEZuKHtcbiAgICAgICAgICAgIHByZWRpY2F0ZTogdGhyb3dPclRlc3REZXNjciBhcyBQcmVkaWNhdGU8W0Vycm9yIHwgYW55XT4sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgICBcInRlc3QudGhyb3dzIHJlcXVpcmVzIGFuIGVtcHR5IHNlY29uZCBhcmd1bWVudCBpZiB0aGUgZmlyc3QgaXMgYSBcIiArXG4gICAgICAgICAgICAgIFwidGhyb3cgcHJlZGljYXRlIChhIGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgY29uc3RydWN0IEVycm9ycylcIixcbiAgICAgICAgICAgIHRocm93T3JUZXN0RGVzY3IsXG4gICAgICAgICAgICBtZXNzYWdlT3JCb2R5XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVGVzdHRzQXJndW1lbnRFcnJvcihcbiAgICAgICAgXCJ0ZXN0LnRocm93cyByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlLCBlcnJvciBjb25zdHJ1Y3RvciwgcHJlZGljYXRlLCBcIiArXG4gICAgICAgICAgXCJvciBuZXcgdGVzdCBkZXNjcmlwdGlvbiBhcyBpdHMgZmlyc3QgYXJndW1lbnRcIixcbiAgICAgICAgdGhyb3dPclRlc3REZXNjcixcbiAgICAgICAgbWVzc2FnZU9yQm9keVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZ2VuVGVzdEZuKGV4cGVjdGVkVGhyb3c/OiBUaHJvd0Rlc2NyaXB0b3IpIHtcbiAgICBjb25zdCB0ZXN0ID0gPFQ+KGRlc2NyaXB0aW9uOiBzdHJpbmcsIGJvZHk6IFRlc3RCb2R5PFQ+KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBpZiAodHlwZW9mIGJvZHkgIT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgdGhyb3cgbmV3IFRlc3R0c0FyZ3VtZW50RXJyb3IoXG4gICAgICAgICAgXCJ0ZXN0cyB3aXRoIGRlc2NyaXB0aW9ucyByZXF1aXJlIGEgdGVzdCBib2R5XCJcbiAgICAgICAgKTtcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbjogUHJvbWlzZTxUPiA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgdCA9IG5ldyBUZXN0KGRlc2NyaXB0aW9uLCBib2R5LCByZXNvbHZlLCByZWplY3QsIGV4cGVjdGVkVGhyb3cpO1xuICAgICAgICByZWdpc3RlckNoaWxkKHQpO1xuICAgICAgfSk7XG4gICAgICBfVEVTVF9QUk9NSVNFU18uYWRkKGV4ZWN1dGlvbik7XG4gICAgICByZXR1cm4gZXhlY3V0aW9uO1xuICAgIH07XG4gICAgdGVzdC50aHJvd3MgPSB0aHJvd3M7XG4gICAgcmV0dXJuIHRlc3Q7XG4gIH1cbiAgcmV0dXJuIGdlblRlc3RGbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnbG9iYWxUZXN0TGF1bmNoZXIoKSB7XG4gIC8vIGNhdGNoIGFueSB1bmhhbmRsZWQgcmVqZWN0aW9ucyB0aHJvd24gYnkgdGVzdHNcbiAgcHJvY2Vzcy5hZGRMaXN0ZW5lcihcInVuaGFuZGxlZFJlamVjdGlvblwiLCAoZGV0YWlscywgcHJvbWlzZSkgPT4ge1xuICAgIC8vIG9ubHkgbG9nIHVuaGFuZGxlZCByZWplY3Rpb25zIGlmIHRoZXkgZG9uJ3QgZGlyZWN0bHkgYmVsb25nIHRvIGEgdGVzdFxuICAgIGlmICghX1RFU1RfUFJPTUlTRVNfLmhhcyhwcm9taXNlKSkge1xuICAgICAgX1NURElPX01BTklQXy5yZXNldCgpO1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbdGVzdHRzXSBFcnJvcjogVW5oYW5kbGVkIHByb21pc2UgcmVqZWN0aW9uLiBFeGl0aW5nLiBTZWUgYmVsb3c6XCJcbiAgICAgICk7XG4gICAgICBjb25zb2xlLmVycm9yKGRldGFpbHMpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc2hpZnQgYWxsIHRlc3Qgb3V0cHV0IGJ5IDFcbiAgX1NURElPX01BTklQXy5pbmRlbnQgPSAxO1xuXG4gIC8vIGNoZWNrIGZvciBvcHRpb25zXG4gIGxldCBtYXRjaGVyOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAyOyBpIDwgcHJvY2Vzcy5hcmd2Lmxlbmd0aCAtIDE7ICsraSkge1xuICAgIGlmIChcbiAgICAgIHByb2Nlc3MuYXJndltpXS50cmltKCkgPT09IFwiLS1tYXRjaFwiIHx8XG4gICAgICBwcm9jZXNzLmFyZ3ZbaV0udHJpbSgpID09PSBcIi1tXCJcbiAgICApIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiaGVlZXlcIik7XG4gICAgICBtYXRjaGVyID0gcHJvY2Vzcy5hcmd2W2kgKyAxXTtcbiAgICAgIHByb2Nlc3MuYXJndi5zcGxpY2UoaSwgMik7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcGF0aHMgPSBhd2FpdCBmaW5kVGVzdFBhdGhzKG1hdGNoZXIpO1xuICBjb25zdCBmaWxlVGVzdHM6IFRlc3Q8dm9pZD5bXSA9IFtdO1xuICBmb3IgKGNvbnN0IHAgb2YgcGF0aHMpIHtcbiAgICBmaWxlVGVzdHMucHVzaChcbiAgICAgIG5ldyBUZXN0KFxuICAgICAgICBBTlNJX0NZQU5fRkcgKyBwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHApICsgQU5TSV9SRVNFVCxcbiAgICAgICAgKHRlc3QpID0+IHtcbiAgICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgICAgIHRlc3QsXG4gICAgICAgICAgICBhc3NlcnQsXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXF1aXJlKHApO1xuICAgICAgICB9LFxuICAgICAgICAoKSA9PiB7fSxcbiAgICAgICAgKCkgPT4ge31cbiAgICAgIClcbiAgICApO1xuICB9XG4gIGZvciAoY29uc3QgZnQgb2YgZmlsZVRlc3RzKSB7XG4gICAgYXdhaXQgZnQub25jZVJlYWR5O1xuICAgIGF3YWl0IGZ0LmxvZygpO1xuICB9XG59XG5cbmlmIChwcm9jZXNzLmFyZ3YubGVuZ3RoID49IDMpIHtcbiAgZ2xvYmFsVGVzdExhdW5jaGVyKClcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICBfU1RESU9fTUFOSVBfLnJlc2V0KCk7XG4gICAgICBpZiAoX05fVEVTVFNfRkFJTEVEXykge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIFwiXFxuXCIgK1xuICAgICAgICAgICAgQU5TSV9SRURfRkcgK1xuICAgICAgICAgICAgXCJwYXNzZWQgW1wiICtcbiAgICAgICAgICAgIF9OX1RFU1RTX1BBU1NFRF8gK1xuICAgICAgICAgICAgXCIvXCIgK1xuICAgICAgICAgICAgKF9OX1RFU1RTX1BBU1NFRF8gKyBfTl9URVNUU19GQUlMRURfKSArXG4gICAgICAgICAgICBcIl0gdGVzdHNcIiArXG4gICAgICAgICAgICBBTlNJX1JFU0VUXG4gICAgICAgICk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgXCJcXG5cIiArXG4gICAgICAgICAgICBBTlNJX0dSRUVOX0ZHICtcbiAgICAgICAgICAgIFwicGFzc2VkIFtcIiArXG4gICAgICAgICAgICBfTl9URVNUU19QQVNTRURfICtcbiAgICAgICAgICAgIFwiL1wiICtcbiAgICAgICAgICAgIChfTl9URVNUU19QQVNTRURfICsgX05fVEVTVFNfRkFJTEVEXykgK1xuICAgICAgICAgICAgXCJdIHRlc3RzXCIgK1xuICAgICAgICAgICAgQU5TSV9SRVNFVFxuICAgICAgICApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goKGUpID0+IHtcbiAgICAgIF9TVERJT19NQU5JUF8ucmVzZXQoKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfSk7XG59XG4iXX0=