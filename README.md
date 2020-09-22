# [testts 0.1.3](https://github.com/jpcx/testts/blob/0.1.3/CHANGELOG.md)

![](https://img.shields.io/github/issues/jpcx/testts)
![](https://img.shields.io/github/forks/jpcx/testts)
![](https://img.shields.io/github/stars/jpcx/testts)
![](https://img.shields.io/github/downloads/jpcx/testts/total)
![](https://img.shields.io/github/license/jpcx/testts)  
![](https://img.shields.io/librariesio/github/jpcx/testts?label=dev-dependencies)
![](https://img.shields.io/github/package-json/dependency-version/jpcx/testts/dev/typescript)
![](https://img.shields.io/github/package-json/dependency-version/jpcx/testts/dev/@types/node)

![](https://github.com/jpcx/testts/blob/assets/logo.png)

## About

testts is an asynchronous, nesting, composable testing framework for TypeScript.

- Intended to be minimal, testts will always be dependency-free
- Tests execute code and are witten to either expect no throw or to describe an expected throw
- Use alongside an assertion library

### Composition

testts facilitates composition within the type system:

- tests are registered and executed asynchronously
- they may be nested indefinitely
- and they return typed promises that resolve to the test body return value

### API

There are two test registrars, `test(descr, body)` and `test.throws(...?)?(descr, body)`

- any test statement, if executed, will be outputted to the console
- promises returned from test registration will resolve or reject when the test passes or fails

### Notes

In order to achieve nesting, test parents must provide a `test` parameter.

- If a `test` parameter is not written, `test` statements will create siblings instead.

Although promises returned by `test` statements can reject, a `process` listener is used to catch unhandled promises.

- **_test statements do not require .catch blocks_**
- If an unhandled rejection belongs to a test it is passed on to the report.
- Any other unhandled rejections cause a non-zero exit.

[See the usage examples for more info](#examples)

![](https://github.com/jpcx/testts/blob/assets/demo/demo.gif)

## Requirements

### Usage

Node.js >=10.0.0

### Development

TypeScript >=3.6  
@types/node >=10.17.35  

A helper Makefile is also included, but is not necessary

<a id="examples" />

## Examples

```
## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ##
## This package uses GitHub packages as its package repository ##
#  add the following info to your ~/.npmrc or [project]/.npmrc  #
#                                                               #
#  echo "@jpcx:registry=https://npm.pkg.github.com/" >> .npmrc  #
#                                                               #
## You also need to be authenticated; see https://git.io/JUzdX ##
## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ##
```

```shell
npm i --save-dev @jpcx/testts
npx testts dist/ # recursively runs tests from any nested *.test.js files

# any number of files/folers may be used as arguments
# manually specified files do not need to conform to the *.test.js requirement
# npx testts dist/my.compiled.test.js dist/my.other.compiled_test.js dist/other/

# there is only one setting available: `npx testts -m(--match) [ECMAScript regex]`
# the default match regex is "\\.test\\.js"
```

```typescript
import { test } from "@jpcx/testts";
import { assert } from "assert";

import { getSampleDB } from "../";

test("simple test", () => {
  assert(true);
  // assert(false); // fails test
});

// all tests return promises (their execution is deferred). In the absence of an
// await statement, tests below will be registered even if the above test fails

test("asynchronous test", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(true);
});

// use a parameter to allow `test` to refer to a parent context
test("nested tests", (test) => {
  test("failure fails parent", () => {
    assert(true);
  });
});

test("dependent testing", async (test) => {
  // tests return promises!!
  const waitforme = await test("nested tested value", () => "yay");

  // TS `typeof waitforme`: 'string'
  test("dependent test", () => assert(waitforme === "yay"));
});

test.throws("unspecified throw expected", () => {
  throw new Error();
});
test.throws("bad")("error message specified", () => {
  throw new Error("bad");
});
test.throws(TypeError)("error constructor specified", () => {
  throw new TypeError();
});
test.throws(TypeError, "bad")(
  "error constructor and messsage specified",
  () => {
    throw new TypeError("bad");
  }
);
test.throws((e: number) => e === 42)("predicate-based specification", () => {
  throw 42;
});
```

## Contributing

Contribution is welcome! Please make a pull request.

## License

Copyright (C) 2020 Justin Collier <m@jpcx.dev>

This program is free software: you can redistribute it and/or modify  
it under the terms of the GNU General Public License as published by  
the Free Software Foundation, either version 3 of the License, or  
(at your option) any later version.

This program is distributed in the hope that it will be useful,  
but WITHOUT ANY WARRANTY; without even the internalied warranty of  
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the  
GNU General Public License for more details.

You should have received a copy of the GNU General Public License  
along with this program. If not, see <https://www.gnu.org/licenses/>.
