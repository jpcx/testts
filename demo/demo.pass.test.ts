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

// -- This is a demonstration of testts -- //

import * as assert from "assert";
import { test } from "@jpcx/testts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("synchronous testing", () => {
  // tests pass if they do not throw
  // throw new Error();
});

test("asynchronous testing", async () => {
  await sleep(400);
});

test("nested sync testing", (test) => {
  test("level 1", (test) => {
    test("level 2", (test) => {
      test("level 3", () => {});
    });
  });
});

test("nested async testing", async (test) => {
  await sleep(800);
  test("level 1", async (test) => {
    await sleep(400);
    test("level 2", async (test) => {
      await sleep(400);
      test("level 3", async () => {
        await sleep(400);
      });
    });
  });
});

test("test for expected throws", (test) => {
  test.throws("example 1", () => {
    throw "anything";
  });
  test.throws()("example 2", () => {
    throw "anything";
  });
  test.throws("expected msg")("example 3", () => {
    throw new Error("expected msg");
  });
  test.throws(TypeError)("example 4", () => {
    throw new TypeError();
  });
  test.throws(TypeError, "expected msg")("example 4", () => {
    throw new TypeError("expected msg");
  });
});

test("using test return promises", async (test) => {
  const untyped: Object = { foo: "bar" };
  // typedVal has type { foo: 'bar' }
  const typedVal = await test("matches the expected structure", () => {
    type Expected = { foo: "bar" };
    // assert that all keys are 'foo'
    assert(!Object.keys(untyped).some((x) => x !== "foo"));
    // assert that .foo is 'bar'
    assert((untyped as Expected).foo === "bar");
    return untyped as Expected;
  });
  test("if typedVal was not typed correctly, TS compiler would throw", () => {
    assert(typedVal.foo === "bar");
  });

  let didComplete = false;
  await test("wait for a test to complete before testing again", async () => {
    await sleep(2400);
    didComplete = true;
  });
  test("this is definitely executed after the previous test", () => {
    assert(didComplete);
  });
});
