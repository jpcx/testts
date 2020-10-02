#!/usr/bin/env node
/**** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 ***              _                                 _                         *
 **              :p                                :p                         *
 *               :x                          _     :x                         *
 *             .oxoxoxp          .:oxo      :p   :oxoxoxp .:oxo               *
 *            :xoxoxox  .ox     .x  oxo p   :x  :xoxoxox .x  oxo p            *
 *               :d   .x oxo    :o,  `xo` .oxoxoxp :d    :o,  `xo`            *
 *               :x  .o   xox  :xox      :xoxoxox  :x   :xox                  *
 *               :o  :x    oxo   :ox        :d     :o     :ox                 *
 *               :x  :oxoxoxo      :xo      :x     :x       :xo               *
 *               :o  :oxoxox         :ox    :o     :o         :ox             *
 *               :x  :x,        .ox,  :o    :x     :x    .ox,  :o             *
 *               :q, :ox,   .x d'xoxo x`    :o     :q,  d'xoxo x`             *
 *               ':x  :xoxoxo`    .oxo`     :q,    ':x     .oxo`              *
 *                     :xoxo`               ':x                               *
 *                                                                            *
 *                    @link https://github.com/jpcx/testts                    *
 *                                                                            *
 *  @license GPL-3.0-or-later                                                 *
 *  @copyright (C) 2020 @author Justin Collier <m@jpcx.dev>                   *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or modify    *
 *    it under the terms of the GNU General Public License as published by    *
 *    the Free Software Foundation, either version 3 of the License, or       *
 *    (at your option) any later version.                                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the internalied warranty of      *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           *
 *    GNU General Public License for more details.                            *
 *                                                                            *
 *  You should have received a copy of the GNU General Public License        **
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.  ***
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * ****/

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";

export type NonPromise<T> = T extends Promise<any> ? never : T;
export type TestBodySync<T> = (test: API) => NonPromise<T>;
export type TestBodyAsync<T> = (test: API) => Promise<T>;
export type TestBody<T> = TestBodySync<T> | TestBodyAsync<T>;
export type Predicate<T extends Array<any>> = (...args: T) => any;

export interface ErrorSub extends Error {}
export interface ErrorSubConstructor {
  new (...args: any[]): ErrorSub;
  prototype: ErrorSub;
}

/**
 * Registers a new test.
 *
 * @param    description - any string description to describe the test
 * @param    body        - execution body that should throw on failure
 * @property throws      - describe an expected throw
 * @return   Promise<T>  - promises any value returned by the body
 */
export type API = typeof test;
/**
 * Registers a new test.
 *
 * @param    description - any string description to describe the test
 * @param    body        - execution body that should throw on failure
 * @property throws      - describe an expected throw
 * @return   Promise<T>  - promises any value returned by the body
 */
export declare const test: {
  <T>(description: string, body: TestBody<T>): Promise<T>;
  throws: {
    (constructor: ErrorSubConstructor, message?: string): API;
    (message: string): API;
    (isCorrectThrow: Predicate<[ErrorSub | any]>): API;
    (): API;
    <T>(description: string, body: TestBody<T>): Promise<T>;
  };
};

type ThrowDescriptor = {
  message?: string;
  constructedBy?: ErrorSubConstructor;
  predicate?: Predicate<[Error | any]>;
};

class TesttsInternalError extends Error {
  public cause?: Error;
  constructor(why: string, cause?: Error) {
    super("[testts] Internal Error: " + why);
    this.cause = cause;
  }
}
class TesttsArgumentError extends Error {
  public args: any[];
  constructor(why: string, ...args: any[]) {
    super("[testts] Argument Error: " + why);
    this.args = args;
  }
}
class TesttsTypeError extends TypeError {
  constructor(why: string) {
    super("[testts] Type Error: " + why);
  }
}

// global constants
const ANSI_GRAY_FG = "\x1b[90m";
const ANSI_GREEN_FG = "\x1b[32m";
const ANSI_RED_FG = "\x1b[31m";
const ANSI_CYAN_FG = "\x1b[36m";
const ANSI_RESET = "\x1b[0m";
const TEST = ANSI_GRAY_FG + "▷" + ANSI_RESET;
const PASS = ANSI_GREEN_FG + "✓" + ANSI_RESET;
const FAIL = ANSI_RED_FG + "✗" + ANSI_RESET;

function addIndentAfterNewlines(str: string, spacing: string): string {
  return str.split("\n").reduce((a, v, i, _) => {
    if (i === 0) a += v;
    else if (i === _.length - 1) a += "\n" + v;
    else a += "\n" + spacing + v;
    return a;
  }, "");
}

interface StdioManipulator {
  indent: number;
  indentNewlinesOnly: boolean;
  reset: () => void;
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
      set: (n: number) => {
        if (typeof n !== "number")
          throw new TesttsInternalError("bad indent assignment");
        _indent = n;
      },
      enumerable: true,
      configurable: false,
    });
    Object.defineProperty(this, "indentNewlinesOnly", {
      get: () => _indentNewlinesOnly,
      set: (b: number) => {
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
    function makeWriter(write: typeof _stdout | typeof _stderr) {
      return (bufferOrStr: any, cbOrEncoding?: any, cb?: any): boolean => {
        const spacing = new Array(_self.indent).fill(" ").join("");
        if (!_self.indentNewlinesOnly) write(spacing);
        // if printing a string (that is not only whitespace)
        if (typeof bufferOrStr === "string" && bufferOrStr.match(/\S/)) {
          // replace any newlines with nl+spaces (except for the last one)
          bufferOrStr = addIndentAfterNewlines(bufferOrStr, spacing);
        }
        if (typeof cbOrEncoding === "function")
          return write(bufferOrStr, cbOrEncoding);
        else return write(bufferOrStr, cbOrEncoding, cb);
      };
    }
    process.stdout.write = makeWriter(_stdout);
    process.stderr.write = makeWriter(_stderr);
  }
}

// mutable global data
const _STDIO_MANIP_ = new StdioManipulator();
const _TEST_PROMISES_: WeakSet<Promise<any>> = new WeakSet();
let _N_TESTS_PASSED_ = 0;
let _N_TESTS_FAILED_ = 0;

async function findTestPaths(
  matcher: string = "\\.test\\.js"
): Promise<string[]> {
  const result: string[] = await (async () => {
    const _: string[] = [];
    // collect any manually specified files first
    for (let i = 2; i < process.argv.length; ++i) {
      const cur = process.argv[i];
      const stats: fs.Stats = await new Promise((resolve, reject) =>
        fs.lstat(cur, (err, stat) => {
          if (err) reject(err);
          else resolve(stat);
        })
      );
      if (stats.isFile()) {
        _.push(path.resolve(cur));
        process.argv.splice(i, 1);
        --i;
      }
    }
    return _;
  })();

  // define the file search function
  async function search(cur: string) {
    const stats: fs.Stats = await new Promise((resolve, reject) =>
      fs.lstat(cur, (err, stat) => {
        if (err) reject(err);
        else resolve(stat);
      })
    );
    if (stats.isFile()) {
      const name = path.basename(cur);
      if (name.match(new RegExp(matcher, "m"))) result.push(path.resolve(cur));
    } else if (stats.isDirectory()) {
      const subs: string[] = await new Promise((resolve, reject) =>
        fs.readdir(cur, (err, files) => {
          if (err) reject(err);
          else resolve(files);
        })
      );
      for (const s of subs) await search(path.join(cur, s));
    }
  }

  try {
    for (const target of process.argv.slice(2)) {
      await search(path.relative(process.cwd(), target) || "./");
    }
  } catch (e) {
    throw new TesttsInternalError(
      "encountered an error while searching for tests",
      e
    );
  }

  if (result.length === 0)
    throw new TesttsArgumentError(
      "cannot find tests",
      ...process.argv.slice(2)
    );

  return result;
}

interface Test<T> {
  readonly onceReady: Promise<void>;
  readonly passed: boolean;
  getResult: () => T | Promise<T>;
  log: () => Promise<void>;
}
class Test<T> {
  constructor(
    description: string,
    body: TestBody<T>,
    dataListener: (data?: T) => void,
    errListener: (err?: any) => void,
    expectedThrow?: ThrowDescriptor
  ) {
    let _error: any | null = null;
    let _passed: boolean = false;

    const _children: Test<any>[] = [];

    this.log = async () => {
      let anyChildrenFailed = false;
      if (_children.length) {
        console.log(TEST + " " + description);
      } else {
        if (_passed) {
          console.log(PASS + " " + description);
        } else {
          console.error(FAIL + " " + description);

          _STDIO_MANIP_.indent += 2;
          if (_error) {
            console.error(_error);
          }
          if (expectedThrow) {
            if (
              expectedThrow.message ||
              expectedThrow.constructedBy ||
              expectedThrow.predicate
            ) {
              console.error("[expected throw]:");
              console.error(expectedThrow);
            } else {
              console.error("[expected throw]");
            }
          }
          _STDIO_MANIP_.indent -= 2;
        }
      }
      let nChildrenBefore = _children.length;
      for (const child of _children) {
        _STDIO_MANIP_.indent += 2;
        await child.onceReady;
        await child.log();
        anyChildrenFailed = anyChildrenFailed || !child.passed;
        _STDIO_MANIP_.indent -= 2;
      }
      if (_children.length > nChildrenBefore)
        throw new TesttsTypeError(
          "found a subchild attached to a non-immediate parent... " +
            "check for missing `test` parameters"
        );
      if (anyChildrenFailed && _passed) {
        // if any children failed but this test body did not, report failure
        --_N_TESTS_PASSED_;
        ++_N_TESTS_FAILED_;
        _passed = false;
        console.error(FAIL);
      } else if (_children.length && !_passed) {
        // else if there was child output for a failed parent, report failure
        process.stdout.write(FAIL + " ");
        _STDIO_MANIP_.indent += 2;
        if (_error) {
          _STDIO_MANIP_.indentNewlinesOnly = true;
          console.error(_error);
          _STDIO_MANIP_.indentNewlinesOnly = false;
        }
        if (expectedThrow) {
          if (
            expectedThrow.message ||
            expectedThrow.constructedBy ||
            expectedThrow.predicate
          ) {
            console.error("[expected throw]:");
            console.error(expectedThrow);
          } else {
            console.error("[expected throw]");
          }
        }
        _STDIO_MANIP_.indent -= 2;
      }
    };

    const _onceReady = new Promise(async (resolve) => {
      try {
        const result = await body(makeAPI((v) => _children.push(v)));
        if (!expectedThrow) {
          ++_N_TESTS_PASSED_;
          _passed = true;
          dataListener(result);
          resolve();
        } else {
          ++_N_TESTS_FAILED_;
          _passed = false;
          errListener();
          resolve();
        }
      } catch (e) {
        _error = e;
        if (expectedThrow) {
          if (
            expectedThrow.message ||
            expectedThrow.constructedBy ||
            expectedThrow.predicate
          ) {
            // throw was described; check the descriptor
            if (expectedThrow.predicate) {
              _passed = !!expectedThrow.predicate(e);
            } else if (expectedThrow.constructedBy && expectedThrow.message) {
              _passed =
                e instanceof expectedThrow.constructedBy &&
                e.message === expectedThrow.message;
            } else if (expectedThrow.constructedBy) {
              _passed = e instanceof expectedThrow.constructedBy;
            } else if (expectedThrow.message) {
              _passed = e.message === expectedThrow.message;
            } else {
              _passed = false;
            }
          } else {
            _passed = true;
          }
        } else {
          _passed = false;
        }
        if (_passed) {
          ++_N_TESTS_PASSED_;
          dataListener();
          resolve();
        } else {
          ++_N_TESTS_FAILED_;
          errListener(e);
          resolve();
        }
      }
    });

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

function makeAPI(registerChild: <T>(child: Test<T>) => void): API {
  function throws(constructor: ErrorSubConstructor, message?: string): API;
  function throws(message: string): API;
  function throws(isCorrectThrow: Predicate<[ErrorSub | any]>): API;
  function throws(): API;
  function throws<T>(description: string, body: TestBody<T>): Promise<T>;
  function throws<T>(
    throwOrTestDescr?:
      | string
      | ErrorSubConstructor
      | Predicate<[ErrorSub | any]>,
    messageOrBody?: string | TestBody<T>
  ) {
    if (!throwOrTestDescr && !messageOrBody) {
      // if no arguments were provided, simply create a test expecting throw
      return genTestFn({});
    } else if (typeof throwOrTestDescr === "string") {
      // if arg0 is a string, it is either an error message or test description
      if (typeof messageOrBody === "function") {
        // arg0 is a test description; arg1 is a test body
        return genTestFn({})(throwOrTestDescr, messageOrBody);
      } else if (messageOrBody === undefined) {
        // arg0 is a message; arg1 is unused
        return genTestFn({ message: throwOrTestDescr });
      } else {
        throw new TesttsArgumentError(
          "test.throws requires a new test body as its second argument if the " +
            "first argument is a string",
          throwOrTestDescr,
          messageOrBody
        );
      }
    } else if (typeof throwOrTestDescr === "function") {
      // if arg0 is a function, it is either a throw predicate or constructor
      if (throwOrTestDescr.prototype instanceof Error) {
        if (typeof messageOrBody === "string") {
          // arg0 is an error constructor; arg1 an error message
          return genTestFn({
            constructedBy: throwOrTestDescr as ErrorSubConstructor,
            message: messageOrBody,
          });
        } else if (messageOrBody === undefined) {
          // arg0 is an error constructor; arg1 is unused
          return genTestFn({
            constructedBy: throwOrTestDescr as ErrorSubConstructor,
          });
        } else {
          throw new TesttsArgumentError(
            "test.throws requires either an error message or a new test body " +
              "as its second argument",
            throwOrTestDescr,
            messageOrBody
          );
        }
      } else {
        if (messageOrBody === undefined) {
          // arg0 is an error predicate; arg1 is unused
          return genTestFn({
            predicate: throwOrTestDescr as Predicate<[Error | any]>,
          });
        } else {
          throw new TesttsArgumentError(
            "test.throws requires an empty second argument if the first is a " +
              "throw predicate (a function that does not construct Errors)",
            throwOrTestDescr,
            messageOrBody
          );
        }
      }
    } else {
      throw new TesttsArgumentError(
        "test.throws requires an error message, error constructor, predicate, " +
          "or new test description as its first argument",
        throwOrTestDescr,
        messageOrBody
      );
    }
  }
  function genTestFn(expectedThrow?: ThrowDescriptor) {
    const test = <T>(description: string, body: TestBody<T>): Promise<T> => {
      if (typeof body !== "function")
        throw new TesttsArgumentError(
          "tests with descriptions require a test body"
        );
      const execution: Promise<T> = new Promise((resolve, reject) => {
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

async function globalTestLauncher() {
  // catch any unhandled rejections thrown by tests
  process.addListener("unhandledRejection", (details, promise) => {
    // only log unhandled rejections if they don't directly belong to a test
    if (!_TEST_PROMISES_.has(promise)) {
      _STDIO_MANIP_.reset();
      console.error(
        "[testts] Error: Unhandled promise rejection. Exiting. See below:"
      );
      console.error(details);
      process.exit(1);
    }
  });

  // shift all test output by 1
  _STDIO_MANIP_.indent = 1;

  // check for options
  let matcher: string | undefined = undefined;
  for (let i = 2; i < process.argv.length - 1; ++i) {
    if (
      process.argv[i].trim() === "--match" ||
      process.argv[i].trim() === "-m"
    ) {
      console.log("heeey");
      matcher = process.argv[i + 1];
      process.argv.splice(i, 2);
    }
  }

  const paths = await findTestPaths(matcher);
  const fileTests: Test<void>[] = [];
  for (const p of paths) {
    fileTests.push(
      new Test(
        ANSI_CYAN_FG + path.relative(process.cwd(), p) + ANSI_RESET,
        (test) => {
          module.exports = {
            test,
            assert,
          };
          require(p);
        },
        () => {},
        () => {}
      )
    );
  }
  for (const ft of fileTests) {
    await ft.onceReady;
    await ft.log();
  }
}

if (process.argv.length >= 3) {
  globalTestLauncher()
    .then(() => {
      _STDIO_MANIP_.reset();
      if (_N_TESTS_FAILED_) {
        console.error(
          "\n" +
            ANSI_RED_FG +
            "passed [" +
            _N_TESTS_PASSED_ +
            "/" +
            (_N_TESTS_PASSED_ + _N_TESTS_FAILED_) +
            "] tests" +
            ANSI_RESET
        );
        process.exit(1);
      } else {
        console.error(
          "\n" +
            ANSI_GREEN_FG +
            "passed [" +
            _N_TESTS_PASSED_ +
            "/" +
            (_N_TESTS_PASSED_ + _N_TESTS_FAILED_) +
            "] tests" +
            ANSI_RESET
        );
        process.exit(0);
      }
    })
    .catch((e) => {
      _STDIO_MANIP_.reset();
      console.error(e);
      process.exit(1);
    });
}
