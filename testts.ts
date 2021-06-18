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
 *  @license LGPL-3.0-or-later                                                *
 *  @copyright (C) 2021 Justin Collier <m@jpcx.dev>                           *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or modify    *
 *    it under the terms of the GNU Lesser General Public License as          *
 *    published by the Free Software Foundation, either version 3 of the      *
 *    License, or (at your option) any later version.                         *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the internalied warranty of      *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *  You should have received a copy of the GNU Lesser General Public License **
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.  ***
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * ****/

import * as fs from "fs";
import * as path from "path";

export type TestBodySync<T> = (test: TestAPI) => T;
export type TestBodyAsync<T> = (test: TestAPI) => Promise<T>;
export type TestBody<T> = TestBodySync<T> | TestBodyAsync<T>;
export type Predicate<T extends Array<any>> = (...args: T) => any;

export interface ErrorSub extends Error {}
export interface ErrorSubConstructor {
  new (...args: any[]): ErrorSub;
  prototype: ErrorSub;
}

/** Registers a new test.  */
export type TestAPI = typeof test;
/** Registers a new test.  */
export declare const test: {
  /**
   * Registers a new test.
   * @param    description  - any string description to describe the test.
   * @param    body         - execution body that should throw on failure.
   */
  <T>(description: string, body: TestBody<T>): Promise<T>;
  /** Describe an expected throw */
  throws: {
    (constructor: ErrorSubConstructor, message?: string): TestAPI;
    (message: string): TestAPI;
    (isCorrectThrow: Predicate<[ErrorSub | any]>): TestAPI;
    (): TestAPI;
    <T>(description: string, body: TestBody<T>): Promise<T>;
  };
  /**
   * Delete stack traces (setting=true).
   * Optionally pass this settings to children (passToChildren=true)
   */
  deleteStacks(setting?: boolean, passToChildren?: boolean): void;
  /** Optionally set an execution priority (setting=0) */
  priority(setting?: number): void;
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
const STDIO_MANIP = new StdioManipulator();
const TEST_PROMISES: WeakSet<Promise<any>> = new WeakSet();
let N_TESTS_PASSED = 0;
let N_TESTS_FAILED = 0;

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

function testsBySortedPriority(
  tests: Test<any>[]
): Array<[number, Test<any>[]]> {
  return tests
    .reduce((a, test) => {
      const existingIdx = a.findIndex((x) => x[0] === test.priority);
      if (existingIdx !== -1) {
        a[existingIdx][1].push(test);
      } else {
        a.push([test.priority, [test]]);
      }
      return a;
    }, [] as Array<[number, Test<any>[]]>)
    .sort((a, b) => (a[0] <= b[0] ? -1 : 1));
}

class Test<T> {
  /* public get test(): TestAPI { */

  /* } */
  public get priority() {
    return this.#priority;
  }
  public get passed() {
    return this.#passed;
  }

  public async execute(): Promise<T> {
    try {
      return this.#handleSuccessfulExecution(
        await this.#body(
          makeAPI(
            (child) => this.#children.push(child),
            (priority) => {
              this.#priority = priority;
            },
            this.#deleteStacks
          )
        )
      );
    } catch (e) {
      this.#handleFailedExecution(e);
      throw e;
    }
  }
  public async executeChildren(): Promise<void> {
    for (const ch of this.#children) {
      try {
        await ch.execute();
      } catch (_) {
        if (this.#passed) {
          this.#passed = false;
          --N_TESTS_PASSED;
          ++N_TESTS_FAILED;
        }
      }
    }
  }
  public async log(): Promise<void> {
    let anyChildrenFailed = false;
    if (this.#children.length) {
      console.log(TEST + " " + this.#description);
    } else {
      if (this.#passed) {
        console.log(PASS + " " + this.#description);
      } else {
        console.error(FAIL + " " + this.#description);

        STDIO_MANIP.indent += 2;
        if (this.#error) {
          if (this.#deleteStacks && this.#error instanceof Error)
            delete this.#error.stack;
          console.error(this.#error);
        }
        if (this.#throws) {
          if (
            this.#throws.message ||
            this.#throws.constructedBy ||
            this.#throws.predicate
          ) {
            console.error("[expected throw]:");
            console.error(this.#throws);
          } else {
            console.error("[expected throw]");
          }
        }
        STDIO_MANIP.indent -= 2;
      }
    }
    let nChildrenBefore = this.#children.length;
    for (const pc of testsBySortedPriority(this.#children)) {
      for (const child of pc[1]) {
        STDIO_MANIP.indent += 2;
        await child.log();
        anyChildrenFailed = anyChildrenFailed || !child.passed;
        STDIO_MANIP.indent -= 2;
      }
    }
    if (this.#children.length > nChildrenBefore)
      throw new TesttsTypeError(
        "found a subchild attached to a non-immediate parent... " +
          "check for missing `test` parameters"
      );
    if (anyChildrenFailed && this.#passed) {
      // if any children failed but this test body did not, report failure
      --N_TESTS_PASSED;
      ++N_TESTS_FAILED;
      this.#passed = false;
      console.error(FAIL);
    } else if (this.#children.length && !this.#passed) {
      // else if there was child output for a failed parent, report failure
      process.stdout.write(FAIL + " ");
      STDIO_MANIP.indent += 2;
      if (this.#error) {
        STDIO_MANIP.indentNewlinesOnly = true;
        console.error(this.#error);
        STDIO_MANIP.indentNewlinesOnly = false;
      }
      if (this.#throws) {
        if (
          this.#throws.message ||
          this.#throws.constructedBy ||
          this.#throws.predicate
        ) {
          console.error("[expected throw]:");
          console.error(this.#throws);
        } else {
          console.error("[expected throw]");
        }
      }
      STDIO_MANIP.indent -= 2;
    }
  }

  constructor(
    description: string,
    body: TestBody<T>,
    throws?: ThrowDescriptor,
    deleteStacks?: boolean
  ) {
    this.#description = description;
    this.#throws = throws;
    this.#deleteStacks = deleteStacks;
    this.#body = body;
  }

  #handleSuccessfulExecution = (result: T): T => {
    if (!this.#throws) {
      ++N_TESTS_PASSED;
      this.#passed = true;
    } else {
      ++N_TESTS_FAILED;
      this.#passed = false;
    }
    return result;
  };

  #handleFailedExecution = (err: any): void => {
    this.#error = err;
    if (this.#throws) {
      if (
        this.#throws.message ||
        this.#throws.constructedBy ||
        this.#throws.predicate
      ) {
        // throw was described; check the descriptor
        if (this.#throws.predicate) {
          this.#passed = !!this.#throws.predicate(err);
        } else if (this.#throws.constructedBy && this.#throws.message) {
          this.#passed =
            err instanceof this.#throws.constructedBy &&
            err.message === this.#throws.message;
        } else if (this.#throws.constructedBy) {
          this.#passed = err instanceof this.#throws.constructedBy;
        } else if (this.#throws.message) {
          this.#passed = err.message === this.#throws.message;
        } else {
          this.#passed = false;
        }
      } else {
        this.#passed = true;
      }
    } else {
      this.#passed = false;
    }
    if (!this.#passed) {
      ++N_TESTS_PASSED;
    } else {
      ++N_TESTS_FAILED;
    }
  };

  #priority = 0;
  #description: string;
  #deleteStacks?: boolean;
  #passed = false;
  #error: any | null = null;
  #throws?: ThrowDescriptor;
  #children: Test<any>[] = [];
  #body: TestBody<T>;
}

function makeAPI(
  registerChild: <T>(child: Test<T>) => void,
  registerPriority: (priority: number) => void,
  deleteStacks?: boolean
): TestAPI {
  function throws(constructor: ErrorSubConstructor, message?: string): TestAPI;
  function throws(message: string): TestAPI;
  function throws(isCorrectThrow: Predicate<[ErrorSub | any]>): TestAPI;
  function throws(): TestAPI;
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
      if (
        throwOrTestDescr === Error ||
        throwOrTestDescr.prototype instanceof Error
      ) {
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
    let passDeleteStacks = true;
    const test = <T>(description: string, body: TestBody<T>): Promise<T> => {
      if (typeof body !== "function")
        throw new TesttsArgumentError(
          "tests with descriptions require a test body"
        );
      const t = new Test(
        description,
        body,
        expectedThrow,
        passDeleteStacks ? deleteStacks : false
      );
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

async function globalTestLauncher() {
  // catch any unhandled rejections thrown by tests
  process.addListener("unhandledRejection", (details, promise) => {
    // only log unhandled rejections if they don't directly belong to a test
    if (!TEST_PROMISES.has(promise)) {
      STDIO_MANIP.reset();
      console.error(
        "[testts] Error: Unhandled promise rejection. Exiting. See below:"
      );
      console.error(details);
      process.exit(1);
    }
  });

  // shift all test output by 1
  STDIO_MANIP.indent = 1;

  // check for options
  let matcher: string | undefined = undefined;
  for (let i = 2; i < process.argv.length - 1; ++i) {
    if (
      process.argv[i].trim() === "--match" ||
      process.argv[i].trim() === "-m"
    ) {
      matcher = process.argv[i + 1];
      process.argv.splice(i, 2);
    }
  }

  const paths = await findTestPaths(matcher);
  const fileTests: Test<void>[] = [];
  for (const p of paths) {
    const t = new Test(
      ANSI_CYAN_FG + path.relative(process.cwd(), p) + ANSI_RESET,
      (test) => {
        module.exports = {
          test,
        };
        require(p);
      }
    );
    await t.execute();
    fileTests.push(t);
  }
  console.log(testsBySortedPriority(fileTests));
  for (const pt of testsBySortedPriority(fileTests)) {
    for (const t of pt[1]) {
      await t.executeChildren();
      await t.log();
    }
  }
}

if (process.argv.length >= 3) {
  globalTestLauncher()
    .then(() => {
      STDIO_MANIP.reset();
      if (N_TESTS_FAILED) {
        console.error(
          "\n" +
            ANSI_RED_FG +
            "passed [" +
            N_TESTS_PASSED +
            "/" +
            (N_TESTS_PASSED + N_TESTS_FAILED) +
            "] tests" +
            ANSI_RESET
        );
        process.exit(1);
      } else {
        console.error(
          "\n" +
            ANSI_GREEN_FG +
            "passed [" +
            N_TESTS_PASSED +
            "/" +
            (N_TESTS_PASSED + N_TESTS_FAILED) +
            "] tests" +
            ANSI_RESET
        );
        process.exit(0);
      }
    })
    .catch((e) => {
      STDIO_MANIP.reset();
      console.error(e);
      process.exit(1);
    });
}
