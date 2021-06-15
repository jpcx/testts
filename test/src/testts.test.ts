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
 *  @copyright (C) 2020, 2021 @author Justin Collier <m@jpcx.dev>             *
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

import { test } from "testts";

import * as assert from "assert";

const _EXPECTED_FAILED_TESTS_: Promise<any>[] = [];
const _FAILED_TESTS_: Promise<any>[] = [];

// @ts-ignore
if (global.testtsExpectedOtherFileFailure) {
  // @ts-ignore
  _EXPECTED_FAILED_TESTS_.push(global.testtsExpectedOtherFileFailure);
} else {
  // @ts-ignore
  global.testtsReportExpectedFailure = (testProm: Promise<any>) =>
    _EXPECTED_FAILED_TESTS_.push(testProm);
}

// @ts-ignore
if (global.testtsOtherFileFailure) {
  // @ts-ignore
  _FAILED_TESTS_.push(global.testtsOtherFileFailure);
} else {
  // @ts-ignore
  global.testtsReportFailure = (testProm: Promise<any>) =>
    _FAILED_TESTS_.push(testProm);
}

test("executes a synchronous scope", () => {
  return;
});

test("executes an asynchronous scope", async () => {
  return;
});

test("executes an asynchronous scope with waiting", async () => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return;
});

const fail0: Promise<any> = test("asynchronous test fails expectedly", async () => {
  const e = new Error("This is an expected failure");
  delete e.stack;
  throw e;
}).catch(() => _FAILED_TESTS_.push(fail0));
_EXPECTED_FAILED_TESTS_.push(fail0);

test("synchronous test attaches child", (test) => {
  test("child test 0", () => {
    return;
  });
});

test("asynchronous test attaches child", async (test) => {
  test("child test 1", () => {
    return;
  });
});

test("synchronous child of synchronous test fails expectedly", (test) => {
  const fail1: Promise<any> = test("child fails synchronous", () => {
    const e = new Error("This is an expected failure");
    delete e.stack;
    throw e;
  }).catch(() => _FAILED_TESTS_.push(fail1));
  _EXPECTED_FAILED_TESTS_.push(fail1);
});

test("asynchronous child of synchronous test fails expectedly", (test) => {
  const fail2: Promise<any> = test("child fails asynchronous", async () => {
    const e = new Error("This is an expected failure");
    delete e.stack;
    throw e;
  }).catch(() => _FAILED_TESTS_.push(fail2));
  _EXPECTED_FAILED_TESTS_.push(fail2);
});

test("synchronous child of asynchronous test fails expectedly", async (test) => {
  const fail3: Promise<any> = test("child fails synchronous", () => {
    const e = new Error("This is an expected failure");
    delete e.stack;
    throw e;
  }).catch(() => _FAILED_TESTS_.push(fail3));
  _EXPECTED_FAILED_TESTS_.push(fail3);
});

test("asynchronous child of asynchronous test fails expectedly", async (test) => {
  const fail4: Promise<any> = test("child fails synchronous", async () => {
    const e = new Error("This is an expected failure with a stack trace");
    throw e;
  }).catch(() => _FAILED_TESTS_.push(fail4));
  _EXPECTED_FAILED_TESTS_.push(fail4);
});

test("synchronous tests support >1 synchronous children", (test) => {
  test("child 0", () => {});
  test("child 1", () => {});
  test("child 2", () => {});
  test("child 3", () => {});
});

test("synchronous tests support >1 asynchronous children", (test) => {
  test("child 0", async () => {});
  test("child 1", async () => {});
  test("child 2", async () => {});
  test("child 3", async () => {});
});

test("asynchronous tests support >1 synchronous children", async (test) => {
  test("child 0", () => {});
  test("child 1", () => {});
  test("child 2", () => {});
  test("child 3", () => {});
});

test("asynchronous tests support >1 asynchronous children", async (test) => {
  test("child 0", async () => {});
  test("child 1", async () => {});
  test("child 2", async () => {});
  test("child 3", async () => {});
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("asynchronous tests support >1 asynchronous delayed children", async (test) => {
  test("child 0", async () => {
    await sleep(400);
  });
  test("child 1", async () => {
    await sleep(600);
  });
  test("child 2", async () => {
    await sleep(800);
  });
  test("child 3", async () => {
    await sleep(1000);
  });
});

test("synchronous tests support >1 synchronous nesting", (test) => {
  test("nest0", (test) => {
    test("nest1", (test) => {
      test("nest2", (test) => {
        test("nest3", () => {});
      });
    });
  });
});

test("synchronous tests support >1 asynchronous nesting", (test) => {
  test("nest0", async (test) => {
    test("nest1", async (test) => {
      test("nest2", async (test) => {
        test("nest3", async () => {});
      });
    });
  });
});

test("asynchronous tests support >1 synchronous nesting", async (test) => {
  test("nest0", (test) => {
    test("nest1", (test) => {
      test("nest2", (test) => {
        test("nest3", () => {});
      });
    });
  });
});

test("asynchronous tests support >1 asynchronous nesting", async (test) => {
  test("nest0", async (test) => {
    test("nest1", async (test) => {
      test("nest2", async (test) => {
        test("nest3", async () => {});
      });
    });
  });
});

test("asynchronous tests support >1 asynchronous delayed nesting", async (test) => {
  await sleep(1200);
  test("nest0", async (test) => {
    await sleep(200);
    test("nest1", async (test) => {
      await sleep(200);
      test("nest2", async (test) => {
        await sleep(200);
        test("nest3", async () => {});
      });
    });
  });
});

test("synchronous tests return output promise", async (test) => {
  const v = await test("returns a value", () => 42);
  assert(v === 42);
});

test("asynchronous tests return output promise", async (test) => {
  const v = await test("returns a value", async () => 42);
  assert(v === 42);
});

test("synchronous tests dependent on failed test promises fail", async (test) => {
  let failed = false;
  const fail5: Promise<any> = test("pretends to return a value", (): number => {
    const e = new Error("I cause an unhandled rejection");
    delete e.stack;
    throw e;
  }).catch(() => {
    _FAILED_TESTS_.push(fail5);
    failed = true;
  });
  _EXPECTED_FAILED_TESTS_.push(fail5);
  const v = await fail5;
  if (failed) throw "failed as expected";
  assert(v === 42);
});

test("asynchronous tests dependent on failed test promises fail", async (test) => {
  let failed = false;
  const fail6: Promise<any> = test("pretends to return a value", async (): Promise<
    number
  > => {
    const e = new Error("I cause an unhandled rejection");
    delete e.stack;
    throw e;
  }).catch(() => {
    _FAILED_TESTS_.push(fail6);
    failed = true;
  });
  _EXPECTED_FAILED_TESTS_.push(fail6);
  const v = await fail6;
  if (failed) throw "failed as expected";
  assert(v === 42);
});

test("test.throws", (test) => {
  test("sync tests", (test) => {
    test.throws("zero-parens", () => {
      throw new Error();
    });
    const fail7: Promise<any> = test
      .throws("zero-parens non-throw fail", () => {})
      .catch(() => _FAILED_TESTS_.push(fail7));
    _EXPECTED_FAILED_TESTS_.push(fail7);

    test.throws()("zero-arg", () => {
      throw new Error();
    });
    const fail8: Promise<any> = test
      .throws()("zero-arg non-throw fail", () => {})
      .catch(() => _FAILED_TESTS_.push(fail8));
    _EXPECTED_FAILED_TESTS_.push(fail8);

    test.throws("expected error")("message", () => {
      throw new Error("expected error");
    });
    const fail9: Promise<any> = test
      .throws("expected error")("message non-throw fail", () => {})
      .catch(() => _FAILED_TESTS_.push(fail9));
    _EXPECTED_FAILED_TESTS_.push(fail9);
    const fail10: Promise<any> = test
      .throws("expected error")("unexpected message fail", () => {
        const e = new Error("unexpected error");
        delete e.stack;
        throw e;
      })
      .catch(() => _FAILED_TESTS_.push(fail10));
    _EXPECTED_FAILED_TESTS_.push(fail10);

    test.throws(TypeError)("constructor", () => {
      throw new TypeError();
    });
    const fail11: Promise<any> = test
      .throws(TypeError)("constructor non-throw fail", () => {})
      .catch(() => _FAILED_TESTS_.push(fail11));
    _EXPECTED_FAILED_TESTS_.push(fail11);
    const fail12: Promise<any> = test
      .throws(TypeError)("unexpected constructor fail", () => {
        const e = new Error();
        delete e.stack;
        throw e;
      })
      .catch(() => _FAILED_TESTS_.push(fail12));
    _EXPECTED_FAILED_TESTS_.push(fail12);

    test.throws(TypeError, "expected error")("constructor and message", () => {
      throw new TypeError("expected error");
    });
    const fail13: Promise<any> = test
      .throws(
        TypeError,
        "expected error"
      )("constructor and message; non-throw fail", () => {})
      .catch(() => _FAILED_TESTS_.push(fail13));
    _EXPECTED_FAILED_TESTS_.push(fail13);
    const fail14: Promise<any> = test
      .throws(TypeError, "expected error")(
        "constructor and message; unexpected message fail",
        () => {
          const e = new TypeError("unexpected error");
          delete e.stack;
          throw e;
        }
      )
      .catch(() => _FAILED_TESTS_.push(fail14));
    _EXPECTED_FAILED_TESTS_.push(fail14);
    const fail15: Promise<any> = test
      .throws(TypeError, "expected error")(
        "constructor and message; unexpected constructor fail",
        () => {
          const e = new Error("expected error");
          delete e.stack;
          throw e;
        }
      )
      .catch(() => _FAILED_TESTS_.push(fail15));
    _EXPECTED_FAILED_TESTS_.push(fail15);
    const fail16: Promise<any> = test
      .throws(TypeError, "expected error")(
        "constructor and message; unexpected message and constructor fail",
        () => {
          const e = new Error("unexpected error");
          delete e.stack;
          throw e;
        }
      )
      .catch(() => _FAILED_TESTS_.push(fail16));
    _EXPECTED_FAILED_TESTS_.push(fail16);

    test.throws((e) => e === 42)("predicate", () => {
      throw 42;
    });
    const fail17: Promise<any> = test
      .throws((e) => e === 42)("predicate non-throw fail", () => {})
      .catch(() => _FAILED_TESTS_.push(fail17));
    _EXPECTED_FAILED_TESTS_.push(fail17);
    const fail18: Promise<any> = test
      .throws((e) => e === 42)("predicate invalidation fail", () => {
        throw "predicate will return false";
      })
      .catch(() => _FAILED_TESTS_.push(fail18));
    _EXPECTED_FAILED_TESTS_.push(fail18);

    test("nesting", (test) => {
      test.throws("level 0: no parens", (test) => {
        test.throws()("level 1: no args", (test) => {
          test.throws("expected")("level 2: message", (test) => {
            test.throws(TypeError)("level 3: constructor", (test) => {
              test.throws(TypeError, "expected")(
                "level 4: constructor and message",
                (test) => {
                  test.throws((e) => e === "expected")(
                    "level 5: predicate",
                    () => {
                      throw "expected";
                    }
                  );
                  throw new TypeError("expected");
                }
              );
              throw new TypeError();
            });
            throw new Error("expected");
          });
          throw new Error();
        });
        throw new Error();
      });
    });
  });
  test("async tests", (test) => {
    test.throws("zero-parens", () => {
      throw new Error();
    });
    const fail19: Promise<any> = test
      .throws("zero-parens non-throw fail", async () => {})
      .catch(() => _FAILED_TESTS_.push(fail19));
    _EXPECTED_FAILED_TESTS_.push(fail19);

    test.throws()("zero-arg", async () => {
      throw new Error();
    });
    const fail20: Promise<any> = test
      .throws()("zero-arg non-throw fail", async () => {})
      .catch(() => _FAILED_TESTS_.push(fail20));
    _EXPECTED_FAILED_TESTS_.push(fail20);

    test.throws("expected error")("message", async () => {
      throw new Error("expected error");
    });
    const fail21: Promise<any> = test
      .throws("expected error")("message non-throw fail", async () => {})
      .catch(() => _FAILED_TESTS_.push(fail21));
    _EXPECTED_FAILED_TESTS_.push(fail21);
    const fail22: Promise<any> = test
      .throws("expected error")("unexpected message fail", async () => {
        const e = new Error("unexpected error");
        delete e.stack;
        throw e;
      })
      .catch(() => _FAILED_TESTS_.push(fail22));
    _EXPECTED_FAILED_TESTS_.push(fail22);

    test.throws(TypeError)("constructor", async () => {
      throw new TypeError();
    });
    const fail23: Promise<any> = test
      .throws(TypeError)("constructor non-throw fail", async () => {})
      .catch(() => _FAILED_TESTS_.push(fail23));
    _EXPECTED_FAILED_TESTS_.push(fail23);
    const fail24: Promise<any> = test
      .throws(TypeError)("unexpected constructor fail", async () => {
        const e = new Error();
        delete e.stack;
        throw e;
      })
      .catch(() => _FAILED_TESTS_.push(fail24));
    _EXPECTED_FAILED_TESTS_.push(fail24);

    test.throws(TypeError, "expected error")(
      "constructor and message",
      async () => {
        throw new TypeError("expected error");
      }
    );
    const fail25: Promise<any> = test
      .throws(
        TypeError,
        "expected error"
      )("constructor and message; non-throw fail", async () => {})
      .catch(() => _FAILED_TESTS_.push(fail25));
    _EXPECTED_FAILED_TESTS_.push(fail25);
    const fail26: Promise<any> = test
      .throws(TypeError, "expected error")(
        "constructor and message; unexpected message fail",
        async () => {
          const e = new TypeError("unexpected error");
          delete e.stack;
          throw e;
        }
      )
      .catch(() => _FAILED_TESTS_.push(fail26));
    _EXPECTED_FAILED_TESTS_.push(fail26);
    const fail27: Promise<any> = test
      .throws(TypeError, "expected error")(
        "constructor and message; unexpected constructor fail",
        async () => {
          const e = new Error("expected error");
          delete e.stack;
          throw e;
        }
      )
      .catch(() => _FAILED_TESTS_.push(fail27));
    _EXPECTED_FAILED_TESTS_.push(fail27);

    test.throws((e) => e === 42)("predicate", async () => {
      throw 42;
    });
    const fail28: Promise<any> = test
      .throws((e) => e === 42)("predicate non-throw fail", async () => {})
      .catch(() => _FAILED_TESTS_.push(fail28));
    _EXPECTED_FAILED_TESTS_.push(fail28);
    const fail29: Promise<any> = test
      .throws((e) => e === 42)("predicate invalidation fail", async () => {
        throw "predicate will return false";
      })
      .catch(() => _FAILED_TESTS_.push(fail29));
    _EXPECTED_FAILED_TESTS_.push(fail29);

    test("nesting", async (test) => {
      test.throws("level 0: no parens", async (test) => {
        test.throws()("level 1: no args", async (test) => {
          test.throws("expected")("level 2: message", async (test) => {
            test.throws(TypeError)("level 3: constructor", async (test) => {
              test.throws(TypeError, "expected")(
                "level 4: constructor and message",
                async (test) => {
                  test.throws((e) => e === "expected")(
                    "level 5: predicate",
                    () => {
                      throw "expected";
                    }
                  );
                  throw new TypeError("expected");
                }
              );
              throw new TypeError();
            });
            throw new Error("expected");
          });
          throw new Error();
        });
        throw new Error();
      });
    });
  });
});

function allExpectedFailureTestsFailed(): boolean {
  if (_EXPECTED_FAILED_TESTS_.length !== 31) return false;
  if (_EXPECTED_FAILED_TESTS_.length !== _FAILED_TESTS_.length) return false;
  for (const expected of _EXPECTED_FAILED_TESTS_) {
    if (!_FAILED_TESTS_.includes(expected)) return false;
  }
  return true;
}

process.addListener("exit", (code) => {
  if (code === 1 && allExpectedFailureTestsFailed()) {
    console.log(
      "\n\x1b[32mtestts test passed!\x1b[0m" +
        "\nwe exited (1) as expected, and failed the correct tests!" +
        '\nyou should see "passed [89/131] tests" above.' +
        "\nif not, please let me know at m@jpcx.dev"
    );
    process.exit(0);
  } else if (code === 1) {
    console.error(
      "\x1b[31mError: testts did not fail the correct tests!\x1b[0m"
    );
    process.exit(1);
  } else if (!code) {
    console.error(
      "\x1b[31mError: expected a non-zero exit for testts tests!\x1b[0m"
    );
    process.exit(1);
  } else {
    console.error("\x1b[31mError: Unknown exit code " + code + "\x1b[0m");
    process.exit(code);
  }
});
