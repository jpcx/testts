#**** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *#
#***         x                              x         x                       *#
#**         xo                             xo        xo                       *#
#*          ox                             ox        ox                       *#
#*        xoxoxoxo              xoxo     xoxoxoxo  xoxoxoxo    xoxo           *#
#*       oxoxoxox     xox      o xoxo x oxoxoxox  oxoxoxox    o xoxo x        *#
#*          xo       x oxo    xo  xoxo     xo        xo      xo  xoxo         *#
#*          ox      o   xox  oxox          ox        ox     oxox              *#
#*          xo     ox    oxo   xox         xo        xo       xox             *#
#*          ox     xoxoxoxo      oxo       ox        ox         oxo           *#
#*          xo     xoxoxox         xox     xo        xo           xox         *#
#*          ox     ox         xoxo  xo     ox        ox      xoxo  xo         *#
#*          xo     xoxo    x o xoxo x      xo        xo     o xoxo x          *#
#*           ox     oxoxoxo     xoxo        ox        ox       xoxo           *#
#*                   oxoxo                                                    *#
#*                                                                            *#
#*                    @link http://github.com/jpcx/testts                     *#
#*                                                                            *#
#*  @license LGPL-3.0-or-later                                                *#
#*  @copyright (C) 2021 Justin Collier <m@jpcx.dev>                           *#
#*                                                                            *#
#*    This program is free software: you can redistribute it and/or modify    *#
#*    it under the terms of the GNU Lesser General Public License as          *#
#*    published by the Free Software Foundation, either version 3 of the      *#
#*    License, or (at your option) any later version.                         *#
#*                                                                            *#
#*    This program is distributed in the hope that it will be useful,         *#
#*    but WITHOUT ANY WARRANTY; without even the internalied warranty of      *#
#*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           *#
#*    GNU Lesser General Public License for more details.                     *#
#*                                                                            *#
#*  You should have received a copy of the GNU Lesser General Public License **#
#*  along with this program.  If not, see <https://www.gnu.org/licenses/>.  ***#
#* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * ****#

all: .build

.build: testts.ts
	touch $@
	npm run-script build

.build_test: .build                                 \
             test/src/testts.test.ts                \
             test/src/testts.multifile.test.ts      \
             test/src/testts.multifile_fail.test.ts \
             test/src/testts.filepriority0.test.ts  \
             test/src/testts.filepriority1.test.ts  \
             test/src/testts.filepriority2.test.ts  \
             test/src/testts.filepriority3.test.ts  \
             test/src/testts.filepriority4.test.ts  \
             test/src/testts.filepriority5.test.ts  \
             test/src/testts.filepriority6.test.ts  \
             test/src/testts.filepriority7.test.ts  \
             test/src/testts.filepriority8.test.ts  \
             test/src/testts.filepriority9.test.ts
	touch $@
	npm run-script build-test

test: .build_test
	npm test

clean:
	${RM} .build
	${RM} .build_test
	npm run-script clean
	npm run-script clean-test

.PHONY: all test clean
