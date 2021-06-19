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

import { test } from "@jpcx/testts";
import * as assert from "assert";

const PRIORITY = 8;

test(`test prioritized file execution (priority ${PRIORITY})`, () => {
  assert(
    (<any>global)._testts_test_global_priority_test ===
      ((PRIORITY as number) === 0 ? undefined : PRIORITY - 1)
  );
  (<any>global)._testts_test_global_priority_test = PRIORITY;
});
