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

test("synchronous fail", () => {
  throw new Error();
});

test("asynchronous fail", async () => {
  await sleep(400);
  throw new Error();
});

test("nested sync fail", (test) => {
  test("level 1", (test) => {
    test("level 2", (test) => {
      test("level 3", () => {
        throw new Error();
      });
    });
  });
});

test("nested async fail", async (test) => {
  await sleep(800);
  test("level 1", async (test) => {
    await sleep(400);
    test("level 2", async (test) => {
      await sleep(400);
      test("level 3", async () => {
        await sleep(400);
        throw new Error();
      });
    });
  });
});

test("test for expected throws; fail", (test) => {
  test.throws("example 1", () => {});
  test.throws()("example 2", () => {});
  test.throws("expected msg")("example 3", () => {});
  test.throws(TypeError)("example 4", () => {});
  test.throws(TypeError, "expected msg")("example 5", () => {});
});

test("using test return promises; fail", async (test) => {
  const typedVal = await test("matches the expected structure", () => {
    throw new Error();
  });
  test("if typedVal was not typed correctly, TS compiler would throw", () => {
    // @ts-ignore
    assert(typedVal.foo !== "bar");
  });

  await test("wait for a test to complete before testing again", async () => {
    await sleep(2400);
    throw new Error();
  });
  test("this is definitely executed after the previous test", () => {
    assert(false);
  });
});
